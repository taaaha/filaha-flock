import { STATUS } from './colors';

export const DEFAULT_THRESHOLDS = {
  co2: { warn: 1500, danger: 2500 },
  nh3: { warn: 25, danger: 35 },
  // temp & hum have BOTH directions — too cold/dry is as dangerous as too hot/humid
  temp: { warn: 32, danger: 38, warnLow: 16, dangerLow: 12 },
  hum: { warn: 75, danger: 85, warnLow: 35, dangerLow: 25 },
  battery: { low: 20 },
};

export const SENSOR_LIMITS = {
  co2: { min: 400, max: 5000 },
  nh3: { min: 0, max: 100 },
  temp: { min: 0, max: 50 },
  hum: { min: 0, max: 100 },
};

export const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Temperature-Humidity Index tier. Heat stress is a COMBINED danger that the
// temperature threshold alone misses (28°C at 85% humidity can be lethal to
// birds while 28°C reads only "warn"). Inlined here — same formula/cutoffs as
// poultryData.heatStressTHI — so deviceStatus stays a leaf module with no
// import cycle. Tiers: safe / alert(≥70) / danger(≥75) / emergency(≥83).
export function thiTier(tempC, humidityPct) {
  if (tempC == null || typeof tempC !== 'number' || isNaN(tempC)) return 'safe';
  const rh = (humidityPct == null || isNaN(humidityPct)) ? 60 : humidityPct;
  const thi = tempC - (0.55 - 0.0055 * rh) * (tempC - 14.5);
  if (isNaN(thi)) return 'safe';
  if (thi >= 83) return 'emergency';
  if (thi >= 75) return 'danger';
  if (thi >= 70) return 'alert';
  return 'safe';
}

export function sensorStatus(key, value, thresholds) {
  if (value === null || value === undefined || isNaN(value)) return STATUS.OFFLINE;
  const t = thresholds[key];
  if (!t) return STATUS.OK;
  // High-side breach
  if (t.danger != null && value >= t.danger) return STATUS.DANGER;
  if (t.warn != null && value >= t.warn) return STATUS.WARN;
  // Low-side breach (only sensors with both: temp, hum)
  if (t.dangerLow != null && value <= t.dangerLow) return STATUS.DANGER;
  if (t.warnLow != null && value <= t.warnLow) return STATUS.WARN;
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

  // Heat stress folds into the device status so the coop card, the dashboard
  // danger list, and the alert pipeline all agree.
  const tier = thiTier(lastReading.temp, lastReading.hum);
  if (tier === 'danger' || tier === 'emergency') sensorStatuses.push(STATUS.DANGER);
  else if (tier === 'alert') sensorStatuses.push(STATUS.WARN);

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
