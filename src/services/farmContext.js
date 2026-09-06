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

// ─────────────────────────────────────────────────────────────────────
// Climate runaway — the feature that earns the device its price.
//
// A threshold tells you the house is already dangerous. A rate tells you it is
// GOING to be, and roughly when. That distinction is not academic: Ryu et al.
// (Front. Vet. Sci. 2020) raised laying hens from THI 24 to 32 within an hour
// and passed 95% mortality in five hours - while a gradual climb to the same
// THI over six hours killed none in the first three. Same final number, wholly
// different outcome. The speed IS the hazard.
//
// That is also the exact signature of equipment failure. A closed, evaporatively
// cooled house in the Gulf sits comfortably at 26 C all summer until the cooling
// stops, and then the indoor climate runs away in a direction no farmer can
// out-work by hand. In a German winter the same thing happens in reverse when a
// brooder fails on a house of day-old chicks.
//
// So this computes how fast the house is moving AWAY from where it should be,
// and how long is left before it becomes lethal at that speed. Sensors alone
// answer that - no forecast, no cloud, no subscription to anything.
// ─────────────────────────────────────────────────────────────────────

// Sustained movement of the heat index, in THI points per hour. Below this it
// is ordinary daily drift; above it something is driving the house.
const THI_DRIFT_NOISE = 1.5;
// The rate at which Ryu's acute group was ramped - about 8 THI points inside an
// hour. Anything approaching this is an equipment failure, not weather.
const THI_ACUTE_PER_H = 5.0;

// THI over the analysis window, so its slope can be measured like any sensor.
function thiSeries(list, now) {
  const out = [];
  for (const r of list) {
    if (r.timestamp == null || r.temp == null || r.hum == null) continue;
    if (now - r.timestamp > ANALYSIS_WINDOW_MS) continue;
    const h = heatStressTHI(r.temp, r.hum);
    if (h) out.push({ t: r.timestamp, v: h.thi });
  }
  return out;
}

/**
 * Is the house running away from its target, and how long is left?
 *
 * `direction` is 'heating' or 'cooling' - which way it is moving, not which
 * way it should. `etaHours` is time until the emergency THI band (>81) at the
 * current rate, which is the number worth waking someone for.
 */
function detectRunaway({ list, now, thi, tempGap, isBrooding }) {
  const series = thiSeries(list, now);
  const rate = ratePerHour(series);
  if (rate == null || !thi) return null;

  const rising = rate > 0;
  const speed = Math.abs(rate);
  if (speed < THI_DRIFT_NOISE) return null;

  // Moving toward the target is recovery, not runaway. Only a house heading
  // the wrong way, or already past its target and still going, counts.
  const awayFromTarget =
    tempGap == null ? true : (rising ? tempGap > -1 : tempGap < 1);
  if (!awayFromTarget) return null;

  // Time until the emergency band at this rate. Only meaningful while rising.
  let etaHours = null;
  if (rising && thi.thi < 81) {
    const h = (81 - thi.thi) / rate;
    if (h > 0 && h < 12) etaHours = h;
  }

  // Cold is the mirror image and is what kills chicks in a German winter, so it
  // gets its own countdown rather than being lumped in with heat.
  let coldEtaHours = null;
  if (!rising && isBrooding && tempGap != null && tempGap > -6) {
    // A brooding house more than 6 C under target is already an emergency; this
    // is the time to reach that line.
    const degPerHour = speed / 1.8;          // THI points -> approx C
    if (degPerHour > 0.1) {
      const h = (tempGap + 6) / degPerHour;
      if (h > 0 && h < 12) coldEtaHours = h;
    }
  }

  const acute = speed >= THI_ACUTE_PER_H;
  return {
    rate,
    speed,
    rising,
    acute,
    etaHours,
    coldEtaHours,
    // Name the cause only when the speed actually justifies the claim. A house
    // drifting 1.5 THI/h on a summer morning is weather; calling that a
    // "cooling failure" would train the farmer to ignore the words that matter
    // on the day the cooling really does stop.
    kind: !(acute || (etaHours != null && etaHours < 3) || coldEtaHours != null)
      ? 'drift'
      : rising ? 'cooling_failure' : (isBrooding ? 'heating_failure' : 'cold_drop'),
    samples: series.length,
  };
}

/**
 * Does this runaway warrant waking someone? Shared by the advice card and the
 * alarm pipeline so the app can never show "your cooling has failed" on screen
 * while staying silent on the phone, or the reverse.
 */
export function isEquipmentFailure(runaway) {
  if (!runaway) return false;
  const eta = runaway.rising ? runaway.etaHours : runaway.coldEtaHours;
  return runaway.acute || (eta != null && eta < 3);
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

  const isBrooding = age != null && age <= 10;
  const runaway = detectRunaway({ list, now, thi, tempGap, isBrooding });

  return {
    device, age, breed, targets, tempTarget, tempGap,
    sensors, latest, thi, hour, isNight,
    // How fast the house is moving away from where it should be, and how long
    // is left at that rate. This is the difference between "it is hot" and
    // "your cooling has failed and you have ninety minutes".
    runaway,
    // Chicks cannot survive the draft that clears a finisher house. Any
    // ventilation advice has to know which of the two it is talking about.
    isBrooding,
    hasData: !!latest,
    // Air quality is one problem with two sensors; treat it as one.
    airLoad: Math.max(
      sensors.co2?.load ?? 0,
      sensors.nh3?.load ?? 0,
    ),
    airBreach: sensors.co2?.breach || sensors.nh3?.breach || null,
  };
}
