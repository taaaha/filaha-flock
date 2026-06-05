import { useEffect, useState } from 'react';

// ── Theme palettes ─────────────────────────────────────────────────────
// "Warm Agricultural Daylight" — the app should feel like morning sun on a
// farm, not a crypto dashboard. Light is the home theme (farmers open it in
// daylight); dark is a warm "night barn" charcoal, never cold slate-navy.
//
// Brand is a deep organic LEAF green. Status hues are warmed toward nature:
// terracotta danger, honey warn, vital-leaf ok, taupe offline. Sensor accents
// are softened so the 2×2 tile grid reads calm, not neon.

// ── DARK — "Night Barn" (warm charcoal, lantern-lit) ───────────────────
const DARK = {
  // Backgrounds — warm soil-black, layered
  bg: '#1b1714',
  bgElevated: '#241f19',
  card: '#272019',
  cardElevated: '#322a20',
  cardHover: '#3c3227',

  // Borders — warm, low-contrast
  border: '#3a3228',
  borderLight: '#4c4133',
  borderStrong: '#5f5240',

  // Brand — leaf green (brighter so it lifts off the warm dark)
  accent: '#5fb874',
  accentSoft: '#7ccb8d',
  accentGlow: '#5fb87440',

  // Status — warmed
  ok: '#6cbf72',
  okSoft: '#86d28a',
  warn: '#e0a44e',
  warnSoft: '#edbd6f',
  danger: '#e0654a',
  dangerSoft: '#ec8266',
  offline: '#8a8073',
  power: '#e08a4a',

  // Text — warm off-white, taupe greys
  textPrimary: '#f3ece0',
  textSecondary: '#b6ab98',
  textTertiary: '#8a8073',
  textDim: '#5e5446',

  // Sensor accents — softened
  co2: '#7aa3d8',
  nh3: '#b79ad6',
  temp: '#e89262',
  hum: '#5fb8bf',
  battery: '#e0bb55',

  // Secondary decorative accent — harvest amber (use sparingly; never for UI
  // that competes with the amber `warn` status)
  harvest: '#e0a44e',
  harvestSoft: '#edbd6f',
};

// ── LIGHT — "Warm Agricultural Daylight" (cream paper, leaf green) ──────
const LIGHT = {
  // Backgrounds — warm paper/cream; cards sit a touch lighter so they lift
  bg: '#faf7f0',
  bgElevated: '#fffdfa',
  card: '#fffefb',
  cardElevated: '#f4eee2',   // warm sand — recessed tiles inside white cards
  cardHover: '#ece4d4',

  // Borders — warm sand, soft
  border: '#e8e0d0',
  borderLight: '#d9cdb8',
  borderStrong: '#c3b598',

  // Brand — deep leaf green
  accent: '#3f7d4f',
  accentSoft: '#5a9968',
  accentGlow: '#3f7d4f33',

  // Status — natural/earthy
  ok: '#5a8f4d',
  okSoft: '#74a85f',
  warn: '#cf9322',
  warnSoft: '#e0a838',
  danger: '#c0533a',
  dangerSoft: '#d27259',
  offline: '#9c9183',
  power: '#cf7426',

  // Text — warm charcoal, never slate
  textPrimary: '#2a2420',
  textSecondary: '#6b6253',
  textTertiary: '#938977',
  textDim: '#b9af9d',

  // Sensor accents — softened, distinguishable
  co2: '#5b86c4',
  nh3: '#9b7fc0',
  temp: '#d97a45',
  hum: '#3f9aa3',
  battery: '#bd9633',

  // Secondary decorative accent — harvest amber
  harvest: '#cf8a3a',
  harvestSoft: '#e0a45c',
};

// ── Theme state ────────────────────────────────────────────────────────
// Default theme is LIGHT — most farmers will open the app in daylight.
let activeMode = 'light';
const listeners = new Set();

// Plain mutable object — we swap its contents on theme change.
// Every `import { colors }` shares this same reference; reading `colors.bg`
// at render time always returns the current palette's value.
export const colors = { ...LIGHT };

export function getActiveTheme() { return activeMode; }

// Convenience for StatusBar / native chrome decisions. Screens used to compare
// `colors.bg === '#070b14'` against a hardcoded hex — brittle and now wrong.
export function isDark() { return activeMode === 'dark'; }
export function barStyle() { return activeMode === 'dark' ? 'light-content' : 'dark-content'; }

export function setActiveTheme(mode) {
  if (mode !== 'dark' && mode !== 'light') return;
  if (mode === activeMode) return;
  activeMode = mode;
  const next = mode === 'light' ? LIGHT : DARK;
  // Replace all keys in-place so the same reference reflects the new palette.
  for (const k of Object.keys(colors)) delete colors[k];
  Object.assign(colors, next);
  listeners.forEach((l) => { try { l(mode); } catch (e) {} });
}

export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Status helpers ─────────────────────────────────────────────────────
export const STATUS = {
  OK: 'ok',
  WARN: 'warn',
  DANGER: 'danger',
  OFFLINE: 'offline',
  POWER_CUT: 'powerCut',
};

export function statusColor(status) {
  switch (status) {
    case STATUS.OK: return colors.ok;
    case STATUS.WARN: return colors.warn;
    case STATUS.DANGER: return colors.danger;
    case STATUS.POWER_CUT: return colors.power;
    case STATUS.OFFLINE:
    default: return colors.offline;
  }
}

// ── Shadow presets ─────────────────────────────────────────────────────
// Clean & minimal: barely-there elevation, no neon glow. A calm surface
// reads as "premium" — heavy shadows/glows read as amateur. Editing these
// presets centrally calms every card in the app at once.
// Warm, earthy shadow — a soft brown cast on the cream surface reads natural,
// where a pure-black drop reads digital/cold. Kept low-opacity and calm: a
// premium surface whispers its elevation. Editing these calms every card at once.
const WARM_SHADOW = '#3a2c1a';
export const shadows = {
  sm: {
    shadowColor: WARM_SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: WARM_SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: WARM_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  // Intentionally NOT a glow — a calm soft shadow. Status is communicated by
  // color/borders, never by a neon halo.
  glow: () => ({
    shadowColor: WARM_SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  }),
};

// React hook that forces re-render on theme change. Components don't need
// to use it explicitly — the Proxy will read the new palette anyway — but
// top-level screens should call it so styles recompute.
export function useTheme() {
  const [mode, setMode] = useState(activeMode);
  useEffect(() => subscribeTheme(setMode), []);
  return mode;
}
