export const colors = {
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

  // Sensor accents (kept for SensorMini)
  co2: '#60a5fa',
  nh3: '#a78bfa',
  temp: '#fb923c',
  hum: '#22d3ee',
  battery: '#facc15',
};

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

// Shadow presets for elevation
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
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
