/**
 * Generates assets/icon.png and assets/adaptive-icon.png.
 * Run: node scripts/generateIcon.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length, 0);
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([lb, tb, data, cb]);
}

function makePNG(w, h, drawFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // RGB

  const row = 1 + w * 3;
  const raw = Buffer.allocUnsafe(h * row);
  for (let y = 0; y < h; y++) {
    raw[y * row] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = drawFn(x, y, w, h);
      const o = y * row + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── Helper math ────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function blend(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}

// ── Draw function ──────────────────────────────────────────────────────
// Design: dark navy circle, thin blue ring, white "F" + green leaf accent
function drawIcon(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const R = w * 0.46;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const BG      = [10, 15, 30];       // #0a0f1e
  const ACCENT  = [59, 130, 246];     // #3b82f6 blue
  const GREEN   = [34, 197, 94];      // #22c55e green
  const WHITE   = [240, 245, 252];

  // Outside the icon circle → transparent-ish background (same bg for icon.png)
  if (dist > R * 1.03) return BG;

  // Glow ring (90%–103% radius)
  if (dist > R * 0.89) {
    const t = (dist - R * 0.89) / (R * 0.14);
    const intensity = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
    return blend(
      blend(BG, ACCENT, intensity * 0.85),
      WHITE,
      intensity * 0.08
    );
  }

  // Normalized 0-1 coords within bounding box
  const nx = x / w;
  const ny = y / h;

  // ── Stylized "F" letter ──
  // Letter is centered; stroke width ~ 9%, letter spans ~28-72% width, ~20-80% height
  const sw = 0.082;
  const x0 = 0.265, x1 = 0.735;
  const y0 = 0.205, y1 = 0.795;
  const midY = 0.46; // midbar Y

  const inLeft    = nx >= x0 && nx < x0 + sw && ny >= y0 && ny <= y1;
  const inTop     = nx >= x0 && nx <= x1 && ny >= y0 && ny < y0 + sw;
  const inMid     = nx >= x0 && nx <= x0 + (x1 - x0) * 0.68 && ny >= midY - sw * 0.5 && ny < midY + sw * 0.5;

  if (inLeft || inTop || inMid) {
    // The letter gets a subtle vertical gradient
    const t = (ny - y0) / (y1 - y0);
    return blend(WHITE, blend(WHITE, ACCENT, 0.3), t * 0.25);
  }

  // ── Small green dot accent (bottom-right quadrant — like a "leaf") ──
  const dotCX = cx + R * 0.42, dotCY = cy + R * 0.40;
  const dotR  = R * 0.155;
  const ddx = x - dotCX, ddy = y - dotCY;
  const dotDist = Math.sqrt(ddx * ddx + ddy * ddy);
  if (dotDist <= dotR) {
    const t = dotDist / dotR;
    return blend(GREEN, blend(GREEN, BG, 0.4), t * t);
  }
  // Dot ring
  if (dotDist <= dotR * 1.18) {
    const t = (dotDist - dotR) / (dotR * 0.18);
    return blend(GREEN, BG, t);
  }

  // ── Inner background radial gradient ──
  const innerRatio = dist / R;
  return [
    Math.round(lerp(14, 10, innerRatio)),
    Math.round(lerp(22, 15, innerRatio)),
    Math.round(lerp(45, 30, innerRatio)),
  ];
}

// ── Write files ────────────────────────────────────────────────────────
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const SIZE = 1024;
console.log('Generating icon.png …');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), makePNG(SIZE, SIZE, drawIcon));

console.log('Generating adaptive-icon.png …');
// Adaptive icon: same design, slightly more padding (Android clips to shape)
function drawAdaptive(x, y, w, h) {
  // Scale inward 10% for adaptive icon safe zone
  const scale = 0.82;
  const cx = w / 2, cy = h / 2;
  const nx2 = (x - cx) / scale + cx;
  const ny2 = (y - cy) / scale + cy;
  if (nx2 < 0 || nx2 >= w || ny2 < 0 || ny2 >= h) return [10, 15, 30];
  return drawIcon(Math.round(nx2), Math.round(ny2), w, h);
}
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), makePNG(SIZE, SIZE, drawAdaptive));

console.log('Done! assets/icon.png and assets/adaptive-icon.png created.');
