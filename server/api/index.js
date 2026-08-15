// ════════════════════════════════════════════════════════════════
//  Filaha Flock — ingest + REST API
//  - subscribes to MQTT  filaha/<deviceId>/telemetry  (7-byte binary)
//  - unpacks, stores in TimescaleDB, logs threshold alerts
//  - serves a token-protected REST API for the mobile app
// ════════════════════════════════════════════════════════════════
const express = require("express");
const mqtt = require("mqtt");
const { Pool } = require("pg");

const {
  DATABASE_URL,
  MQTT_URL = "mqtt://mqtt:1883",
  MQTT_USER,
  MQTT_PASS,
  API_TOKEN,
  PORT = 8080,
  EXPO_PUSH_ENABLED = "false",
} = process.env;

// Critical thresholds (mirror firmware config.h). The DEVICE sends the SMS/call;
// these only drive the server alert log + optional in-app push.
const TH = {
  nh3: Number(process.env.NH3_DANGER_PPM || 25),
  tempHigh: Number(process.env.TEMP_HIGH_C || 38),
  tempLow: Number(process.env.TEMP_LOW_C || 12),
  co2: Number(process.env.CO2_DANGER_PPM || 2500),
  batLow: Number(process.env.BAT_LOW_PCT || 20),
};

// Same-kind alerts are muted for this long so a sustained condition logs one
// alert per window instead of one per 30-second reading.
const ALERT_COOLDOWN_MIN = Number(process.env.ALERT_COOLDOWN_MIN || 10);

// Watchdog: if a device that was reporting goes silent this long, flag it offline
// (lost signal or power). The device can't tell us — it's dark — so the server does.
const OFFLINE_AFTER_MIN = Number(process.env.OFFLINE_AFTER_MIN || 15);

const pool = new Pool({ connectionString: DATABASE_URL });

// ── 8-byte packet (big-endian) ────────────────────────────────────
//  [0..1] temp  int16  = round(tempC*10)
//  [2]    hum   uint8  = round(hum%)
//  [3..4] co2   uint16 = round(ppm)
//  [5..6] nh3   uint16 = round(ppm*100)
//  [7]    bat   uint8  = battery %   (optional — older 7-byte firmware omits it)
function unpack(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 7) return null;
  return {
    temp_c: buf.readInt16BE(0) / 10,
    humidity: buf.readUInt8(2),
    co2_ppm: buf.readUInt16BE(3),
    nh3_ppm: buf.readUInt16BE(5) / 100,
    // 255 = firmware sentinel for "battery unknown" (USB power, sense dark).
    battery: buf.length >= 8 ? (buf.readUInt8(7) === 255 ? null : buf.readUInt8(7)) : null,
  };
}

function checkThresholds(r) {
  if (r.nh3_ppm >= TH.nh3) return { kind: "nh3", value: r.nh3_ppm, message: `NH3 ${r.nh3_ppm.toFixed(2)} ppm` };
  if (r.temp_c >= TH.tempHigh) return { kind: "temp_high", value: r.temp_c, message: `Temp ${r.temp_c.toFixed(1)}C high` };
  if (r.temp_c <= TH.tempLow) return { kind: "temp_low", value: r.temp_c, message: `Temp ${r.temp_c.toFixed(1)}C low` };
  if (r.co2_ppm >= TH.co2) return { kind: "co2", value: r.co2_ppm, message: `CO2 ${r.co2_ppm} ppm` };
  if (r.battery != null && r.battery > 0 && r.battery <= TH.batLow)
    return { kind: "bat_low", value: r.battery, message: `Batterie faible ${r.battery}%` };
  return null;
}

// In-app push only (never SMS — the device owns SMS/calls). Best-effort.
async function maybePush(deviceId, alert) {
  if (EXPO_PUSH_ENABLED !== "true") return;
  try {
    const { rows } = await pool.query("SELECT push_token FROM devices WHERE device_id=$1 AND push_token IS NOT NULL", [deviceId]);
    if (!rows.length) return;
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: rows[0].push_token, title: `Alerte — ${deviceId}`, body: alert.message, sound: "default", priority: "high" }),
    });
  } catch (e) { console.error("[push] failed", e.message); }
}

// ── ingest ────────────────────────────────────────────────────────
async function ingest(deviceId, buf) {
  const r = unpack(buf);
  if (!r) { console.warn(`[mqtt] bad packet from ${deviceId} (${buf?.length} bytes)`); return; }
  try {
    // Read the previous status BEFORE updating, so we can detect recovery.
    const prev = await pool.query(`SELECT status FROM devices WHERE device_id=$1`, [deviceId]);
    const wasOffline = prev.rows[0]?.status === 'offline';
    await pool.query(
      `INSERT INTO devices(device_id,last_seen,status) VALUES($1,now(),'online')
       ON CONFLICT(device_id) DO UPDATE SET last_seen=now(),
         status = CASE WHEN devices.status='power_cut' THEN devices.status ELSE 'online' END`, [deviceId]);
    if (wasOffline) {
      const msg = 'Capteur de nouveau en ligne';
      await pool.query(`INSERT INTO alerts(device_id,kind,value,message) VALUES($1,'recovered',NULL,$2)`, [deviceId, msg]);
      maybePush(deviceId, { kind: 'recovered', message: msg });
      console.log(`[watchdog] ${deviceId} back online`);
    }
    await pool.query(
      `INSERT INTO readings(device_id,temp_c,humidity,co2_ppm,nh3_ppm,battery) VALUES($1,$2,$3,$4,$5,$6)`,
      [deviceId, r.temp_c, r.humidity, r.co2_ppm, r.nh3_ppm, r.battery]);
    const al = checkThresholds(r);
    if (al) {
      // Cooldown: skip if the same kind fired for this device recently.
      const recent = await pool.query(
        `SELECT 1 FROM alerts WHERE device_id=$1 AND kind=$2
           AND ts > now() - ($3 || ' minutes')::interval LIMIT 1`,
        [deviceId, al.kind, ALERT_COOLDOWN_MIN]);
      if (!recent.rows.length) {
        await pool.query(`INSERT INTO alerts(device_id,kind,value,message) VALUES($1,$2,$3,$4)`,
          [deviceId, al.kind, al.value, al.message]);
        maybePush(deviceId, al);
      }
    }
    console.log(`[mqtt] ${deviceId}  T=${r.temp_c} H=${r.humidity} CO2=${r.co2_ppm} NH3=${r.nh3_ppm} BAT=${r.battery}${al ? "  ALERT:" + al.kind : ""}`);
  } catch (e) { console.error(`[ingest] ${deviceId}`, e.message); }
}

// ── Power events (instant, out-of-band — not the 15s telemetry cadence) ──
// The device publishes to filaha/<id>/event the moment mains power is lost or
// restored (it is still alive and reporting normally on the backup battery).
// This gives the app a near-real-time "power cut" state instead of waiting
// for the device to go fully silent.
async function handlePowerEvent(deviceId, kind) {
  try {
    if (kind === "PWR_OUT") {
      const prev = await pool.query(`SELECT status FROM devices WHERE device_id=$1`, [deviceId]);
      if (prev.rows[0]?.status === "power_cut") return;   // already flagged, avoid duplicate alert
      await pool.query(
        `INSERT INTO devices(device_id,last_seen,status) VALUES($1,now(),'power_cut')
         ON CONFLICT(device_id) DO UPDATE SET last_seen=now(), status='power_cut'`, [deviceId]);
      const msg = "Coupure de courant — fonctionne sur batterie";
      await pool.query(`INSERT INTO alerts(device_id,kind,value,message) VALUES($1,'power_cut',NULL,$2)`, [deviceId, msg]);
      maybePush(deviceId, { kind: "power_cut", message: msg });
      console.log(`[event] ${deviceId} POWER CUT`);
    } else if (kind === "PWR_IN") {
      const prev = await pool.query(`SELECT status FROM devices WHERE device_id=$1`, [deviceId]);
      const wasCut = prev.rows[0]?.status === "power_cut";
      await pool.query(
        `INSERT INTO devices(device_id,last_seen,status) VALUES($1,now(),'online')
         ON CONFLICT(device_id) DO UPDATE SET last_seen=now(), status='online'`, [deviceId]);
      if (wasCut) {
        const msg = "Courant retabli";
        await pool.query(`INSERT INTO alerts(device_id,kind,value,message) VALUES($1,'power_restored',NULL,$2)`, [deviceId, msg]);
        maybePush(deviceId, { kind: "power_restored", message: msg });
        console.log(`[event] ${deviceId} power restored`);
      }
    }
  } catch (e) { console.error(`[event] ${deviceId}`, e.message); }
}

// ── Watchdog ──────────────────────────────────────────────────────
// Flip online→offline for any device silent longer than OFFLINE_AFTER_MIN.
// The UPDATE ... RETURNING fires exactly once per transition (only rows that
// were 'online' flip), so we never spam. Devices that never reported (status
// 'unknown', last_seen NULL) are ignored.
async function checkOffline() {
  try {
    const { rows } = await pool.query(
      `UPDATE devices SET status='offline'
       WHERE status IN ('online','power_cut') AND last_seen < now() - ($1 || ' minutes')::interval
       RETURNING device_id`, [OFFLINE_AFTER_MIN]);
    for (const d of rows) {
      const msg = `Capteur hors ligne — aucune donnee depuis ${OFFLINE_AFTER_MIN} min`;
      await pool.query(`INSERT INTO alerts(device_id,kind,value,message) VALUES($1,'offline',NULL,$2)`, [d.device_id, msg]);
      maybePush(d.device_id, { kind: 'offline', message: msg });
      console.log(`[watchdog] ${d.device_id} went OFFLINE`);
    }
  } catch (e) { console.error('[watchdog]', e.message); }
}
setInterval(checkOffline, 20000);

const client = mqtt.connect(MQTT_URL, { username: MQTT_USER, password: MQTT_PASS, reconnectPeriod: 5000 });
client.on("connect", () => {
  console.log("[mqtt] connected");
  client.subscribe("filaha/+/telemetry");
  client.subscribe("filaha/+/event");
});
client.on("error", (e) => console.error("[mqtt] error", e.message));
client.on("message", (topic, payload) => {
  const evM = topic.match(/^filaha\/([^/]+)\/event$/);
  if (evM) { handlePowerEvent(evM[1], payload.toString("latin1").trim()); return; }
  const m = topic.match(/^filaha\/([^/]+)\/telemetry$/);
  if (!m) return;
  // A7670 firmware hex-encodes the 8-byte packet (16 ASCII chars) because the
  // modem mangles binary payloads with 0x00. Decode it; raw binary still works.
  let buf = payload;
  const s = payload.toString("latin1");
  if (/^[0-9a-fA-F]{14,16}$/.test(s)) buf = Buffer.from(s, "hex");
  ingest(m[1], buf);
});

// ── REST API ──────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", true);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", (req, res, next) => {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!API_TOKEN || t !== API_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
});

app.get("/api/devices", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT d.device_id, d.label, d.wilaya, d.last_seen, d.status,
           r.ts, r.temp_c, r.humidity, r.co2_ppm, r.nh3_ppm, r.battery
    FROM devices d
    LEFT JOIN LATERAL (
      SELECT * FROM readings WHERE device_id=d.device_id ORDER BY ts DESC LIMIT 1
    ) r ON true
    ORDER BY d.device_id`);
  res.json(rows);
});

app.get("/api/devices/:id/latest", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM readings WHERE device_id=$1 ORDER BY ts DESC LIMIT 1`, [req.params.id]);
  res.json(rows[0] || null);
});

app.get("/api/devices/:id/readings", async (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 24, 24 * 30);
  const { rows } = await pool.query(
    `SELECT ts,temp_c,humidity,co2_ppm,nh3_ppm,battery FROM readings
     WHERE device_id=$1 AND ts > now() - ($2 || ' hours')::interval ORDER BY ts ASC`,
    [req.params.id, hours]);
  res.json(rows);
});

app.get("/api/devices/:id/alerts", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `SELECT ts,kind,value,message FROM alerts WHERE device_id=$1 ORDER BY ts DESC LIMIT $2`,
    [req.params.id, limit]);
  res.json(rows);
});

// App registers its Expo push token so the server can send in-app alerts (not SMS).
app.put("/api/devices/:id/push", async (req, res) => {
  await pool.query(`UPDATE devices SET push_token=$2 WHERE device_id=$1`, [req.params.id, req.body?.token || null]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`[api] listening on :${PORT}`));
