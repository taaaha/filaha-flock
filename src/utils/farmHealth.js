import { STATUS } from './colors';
import { sensorStatus, deviceStatus } from './thresholds';

/**
 * Compute a 0–100 farm health score from current device state.
 * Algorithm:
 *   - Start at 100.
 *   - Each device contributes equally to the total.
 *   - DANGER coop = 0 points / 100
 *   - WARN coop   = 60 points / 100
 *   - OFFLINE     = 40 points / 100
 *   - POWER_CUT   = 10 points / 100
 *   - OK          = 100 points / 100
 *   - Battery low across coops drops 5 points overall.
 *   - "No devices yet" returns null (handled as setup state).
 */
export function computeFarmHealth(devices, readings, thresholds, powerCut, now) {
  if (!devices || devices.length === 0) return null;
  let total = 0;
  let lowBatteryCount = 0;
  devices.forEach((d) => {
    const list = readings?.[d.id] || [];
    const reading = list.length > 0 ? list[list.length - 1] : null;
    const isPowerCut = !!powerCut?.[d.id];
    const status = deviceStatus(d, reading, thresholds, now, isPowerCut);
    switch (status) {
      case STATUS.OK:        total += 100; break;
      case STATUS.WARN:      total += 60;  break;
      case STATUS.OFFLINE:   total += 40;  break;
      case STATUS.POWER_CUT: total += 10;  break;
      case STATUS.DANGER:    total += 0;   break;
      default:               total += 50;  break;
    }
    if (reading && reading.bat != null && reading.bat <= 20) lowBatteryCount++;
  });
  let score = total / devices.length;
  if (lowBatteryCount > 0) score -= Math.min(10, lowBatteryCount * 5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Returns a label tier and color for a given score. */
export function healthTier(score, colors) {
  if (score == null) return { label: 'noData', tier: 'neutral', color: colors.textSecondary };
  if (score >= 90) return { label: 'excellent', tier: 'ok',      color: colors.ok };
  if (score >= 70) return { label: 'good',      tier: 'ok',      color: colors.okSoft || colors.ok };
  if (score >= 50) return { label: 'fair',      tier: 'warn',    color: colors.warn };
  if (score >= 25) return { label: 'poor',      tier: 'danger',  color: colors.danger };
  return { label: 'critical', tier: 'critical', color: colors.danger };
}
