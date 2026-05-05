export const colors = {
  bg: '#0a0f1e',
  bgElevated: '#0f1626',
  card: '#111827',
  cardElevated: '#1a2235',
  border: '#1f2937',
  borderLight: '#283347',

  ok: '#22c55e',
  warn: '#f59e0b',
  danger: '#ef4444',
  offline: '#6b7280',
  power: '#f97316',
  accent: '#3b82f6',

  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',

  // Sensor accents
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
    case STATUS.OK:
      return colors.ok;
    case STATUS.WARN:
      return colors.warn;
    case STATUS.DANGER:
      return colors.danger;
    case STATUS.POWER_CUT:
      return colors.power;
    case STATUS.OFFLINE:
    default:
      return colors.offline;
  }
}
