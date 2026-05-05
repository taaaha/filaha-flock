import { STATUS } from './colors';

export const DEFAULT_THRESHOLDS = {
  co2: { warn: 1500, danger: 2500 },
  nh3: { warn: 25, danger: 35 },
  temp: { warn: 32, danger: 38 },
  hum: { warn: 75, danger: 85 },
  battery: { low: 20 },
};

export const SENSOR_LIMITS = {
  co2: { min: 400, max: 5000 },
  nh3: { min: 0, max: 100 },
  temp: { min: 0, max: 50 },
  hum: { min: 0, max: 100 },
};

export const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function sensorStatus(key, value, thresholds) {
  if (value === null || value === undefined || isNaN(value)) return STATUS.OFFLINE;
  const t = thresholds[key];
  if (!t) return STATUS.OK;
  if (value >= t.danger) return STATUS.DANGER;
  if (value >= t.warn) return STATUS.WARN;
  return STATUS.OK;
}

export function batteryStatus(value, thresholds) {
  if (value === null || value === undefined || isNaN(value)) return STATUS.OFFLINE;
  const lowAt = (thresholds && thresholds.battery && thresholds.battery.low) || 20;
  if (value <= 5) return STATUS.DANGER;
  if (value <= lowAt) return STATUS.WARN;
  return STATUS.OK;
}

export function deviceStatus(device, lastReading, thresholds, now = Date.now(), powerCut = false) {
  if (powerCut) return STATUS.POWER_CUT;
  if (!lastReading) return STATUS.OFFLINE;
  if (now - lastReading.timestamp > OFFLINE_THRESHOLD_MS) return STATUS.OFFLINE;

  const sensorStatuses = [
    sensorStatus('co2', lastReading.co2, thresholds),
    sensorStatus('nh3', lastReading.nh3, thresholds),
    sensorStatus('temp', lastReading.temp, thresholds),
    sensorStatus('hum', lastReading.hum, thresholds),
    batteryStatus(lastReading.bat, thresholds),
  ];

  if (sensorStatuses.includes(STATUS.DANGER)) return STATUS.DANGER;
  if (sensorStatuses.includes(STATUS.WARN)) return STATUS.WARN;
  return STATUS.OK;
}

export function statusPriority(status) {
  switch (status) {
    case STATUS.DANGER: return 0;
    case STATUS.POWER_CUT: return 1;
    case STATUS.WARN: return 2;
    case STATUS.OFFLINE: return 3;
    case STATUS.OK: return 4;
    default: return 5;
  }
}
