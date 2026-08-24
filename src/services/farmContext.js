import { envTargetsAt, heatStressTHI } from '../utils/poultryData';

// ─────────────────────────────────────────────────────────────────────
// farmContext — everything the advice engine needs to say something that
// is true about THIS coop, right now, instead of something true in general.
//
// The old engine looked at a single latest value and matched it against a
// fixed threshold, so every farm with a high CO₂ reading got the identical
// sentence. What actually decides the right action is the surrounding
// situation: how fast the value is moving, how long until it becomes
// dangerous, how old the birds are, whether the house is already too cold to
// ventilate, and whether it is the middle of the night. This module computes
// all of that once per device so the advice can be assembled from facts.
// ─────────────────────────────────────────────────────────────────────

const ANALYSIS_WINDOW_MS = 2 * 60 * 60 * 1000;  // look back 2 h for a trend
const MIN_POINTS = 4;                            // fewer than this proves nothing

// Least-squares slope in units-per-hour, computed against real timestamps
// rather than sample index — the device's cadence changes when the network is
// weak, and an index-based slope silently lies when that happens.
function ratePerHour(points) {
  if (!points || points.length < MIN_POINTS) return null;
  const t0 = points[0].t;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of points) {
    const x = (p.t - t0) / 3600000;
    sx += x; sy += p.v; sxx += x * x; sxy += x * p.v;
  }
  const n = points.length;
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const slope = (n * sxy - sx * sy) / denom;
  return isFinite(slope) ? slope : null;
}

// Noise floors: below these a "trend" is just the sensor breathing.
const RATE_NOISE = { co2: 25, nh3: 0.4, temp: 0.3, hum: 1.0 };

function seriesFor(list, key, now) {
  const out = [];
  for (const r of list) {
    const t = r.timestamp;
    const v = r[key];
    if (t == null || v == null || isNaN(v)) continue;
    if (now - t > ANALYSIS_WINDOW_MS) continue;
    out.push({ t, v });
  }
  return out;
}

// How a sensor stands relative to its OWN limits, and where it is heading.
function analyseSensor(list, key, thresholds, now) {
  const series = seriesFor(list, key, now);
  const latest = series.length ? series[series.length - 1] : null;
  if (!latest) return null;

  const th = (thresholds && thresholds[key]) || {};
  const value = latest.v;
  const rate = ratePerHour(series);
  const noise = RATE_NOISE[key] || 0;

  let direction = 'flat';
  if (rate != null && rate >= noise) direction = 'rising';
  else if (rate != null && rate <= -noise) direction = 'falling';

  // Time until the next limit is crossed at the current rate. This is the
  // single most useful number the app can give a farmer: it turns "ammonia is
  // a bit high" into "you have about three hours".
  const limitUp = value < (th.warn ?? Infinity) ? th.warn
                : value < (th.danger ?? Infinity) ? th.danger : null;
  let etaHours = null;
  if (limitUp != null && direction === 'rising' && rate > 0) {
    const h = (limitUp - value) / rate;
    if (h > 0 && h < 48) etaHours = h;
  }
  const limitDown = th.warnLow != null && value > th.warnLow ? th.warnLow
                  : th.dangerLow != null && value > th.dangerLow ? th.dangerLow : null;
  if (etaHours == null && limitDown != null && direction === 'falling' && rate < 0) {
    const h = (limitDown - value) / rate;
    if (h > 0 && h < 48) etaHours = h;
  }

  const over  = th.danger != null && value >= th.danger ? 'danger'
              : th.warn   != null && value >= th.warn   ? 'warn'   : null;
  const under = th.dangerLow != null && value <= th.dangerLow ? 'danger'
              : th.warnLow   != null && value <= th.warnLow   ? 'warn' : null;

  return {
    key, value, rate, direction, etaHours,
    breach: over || under || null,
    breachSide: over ? 'high' : under ? 'low' : null,
    // Fraction of the way to the warn limit — used to rank what deserves
    // attention when nothing has actually broken yet.
    load: th.warn ? value / th.warn : null,
    warn: th.warn, danger: th.danger,
    warnLow: th.warnLow, dangerLow: th.dangerLow,
    samples: series.length,
  };
}

export function ageOfDevice(device, now) {
  if (!device || !device.chickArrivalDate) return null;
  return Math.max(1, Math.floor((now - device.chickArrivalDate) / 86400000) + 1);
}

/**
 * Build the full picture for one coop. Everything downstream reads from this,
 * so advice for two different farms can never come out identical unless the
 * two farms genuinely are in the same state.
 */
export function buildFarmContext({ device, readings, thresholds, now }) {
  const list = (readings && readings[device.id]) || [];
  const age = ageOfDevice(device, now);
  const breed = device.breed || 'broiler';
  const targets = age != null ? envTargetsAt(breed, age) : {};

  const sensors = {};
  for (const key of ['co2', 'nh3', 'temp', 'hum']) {
    const a = analyseSensor(list, key, thresholds, now);
    if (a) sensors[key] = a;
  }

  const latest = list.length ? list[list.length - 1] : null;
  const thi = latest && latest.temp != null && latest.hum != null
    ? heatStressTHI(latest.temp, latest.hum)
    : null;

  // Distance from the age-appropriate target, which is what actually governs
  // whether the house can afford to be ventilated right now.
  const tempTarget = targets.temp != null ? targets.temp : null;
  const tempGap = (sensors.temp && tempTarget != null)
    ? sensors.temp.value - tempTarget
    : null;

  const hour = new Date(now).getHours();
  const isNight = hour >= 21 || hour < 6;

  return {
    device, age, breed, targets, tempTarget, tempGap,
    sensors, latest, thi, hour, isNight,
    // Chicks cannot survive the draft that clears a finisher house. Any
    // ventilation advice has to know which of the two it is talking about.
    isBrooding: age != null && age <= 10,
    hasData: !!latest,
    // Air quality is one problem with two sensors; treat it as one.
    airLoad: Math.max(
      sensors.co2?.load ?? 0,
      sensors.nh3?.load ?? 0,
    ),
    airBreach: sensors.co2?.breach || sensors.nh3?.breach || null,
  };
}
