import { useEffect, useState } from 'react';

// ── Theme palettes ─────────────────────────────────────────────────────
const DARK = {
  // Backgrounds
  bg: '#070b14',
  bgElevated: '#0d1322',
  card: '#11182a',
  cardElevated: '#1a2238',
  cardHover: '#1f293f',

  // Borders
  border: '#1e2a44',
  borderLight: '#2a3a58',
  borderStrong: '#36476b',

  // Brand
  accent: '#3b82f6',
  accentSoft: '#60a5fa',
  accentGlow: '#3b82f680',

  // Status
  ok: '#10b981',
  okSoft: '#34d399',
  warn: '#f59e0b',
  warnSoft: '#fbbf24',
  danger: '#ef4444',
  dangerSoft: '#f87171',
  offline: '#64748b',
  power: '#f97316',

  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textDim: '#475569',

  // Sensor accents
  co2: '#60a5fa',
  nh3: '#a78bfa',
  temp: '#fb923c',
  hum: '#22d3ee',
  battery: '#facc15',
};

const LIGHT = {
  bg: '#f5f7fb',
  bgElevated: '#ffffff',
  card: '#ffffff',
  cardElevated: '#f1f5f9',
  cardHover: '#e2e8f0',

  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  borderStrong: '#94a3b8',

  accent: '#2563eb',
  accentSoft: '#3b82f6',
  accentGlow: '#2563eb40',

  ok: '#059669',
  okSoft: '#10b981',
  warn: '#d97706',
  warnSoft: '#f59e0b',
  danger: '#dc2626',
  dangerSoft: '#ef4444',
  offline: '#64748b',
  power: '#ea580c',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  textDim: '#94a3b8',

  co2: '#2563eb',
  nh3: '#7c3aed',
  temp: '#ea580c',
  hum: '#0891b2',
  battery: '#ca8a04',
};

// ── Theme state ────────────────────────────────────────────────────────
let activeMode = 'dark';
const listeners = new Set();

// Plain mutable object — we swap its contents on theme change.
// Every `import { colors }` shares this same reference; reading `colors.bg`
// at render time always returns the current palette's value.
export const colors = { ...DARK };

export function getActiveTheme() { return activeMode; }

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
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
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
