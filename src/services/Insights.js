import { targetTempAt, VACCINATION } from '../utils/poultryData';
import { buildFarmContext } from './farmContext';
import { deviceRecommendations, statusSummary } from './recommendations';

// Phase boundaries (broiler-style). Day at which a new phase begins.
const PHASE_STARTS = [
  { day: 1,  key: 'phaseBrooding' },
  { day: 8,  key: 'phaseGrower' },
  { day: 22, key: 'phaseFinisher' },
];

function ageOf(device, now) {
  if (!device.chickArrivalDate) return null;
  return Math.max(1, Math.floor((now - device.chickArrivalDate) / 86400000) + 1);
}

/**
 * Analyses recent readings and surfaces actionable, educational insights.
 * Each insight has: { id, icon, severity, key, title, body, deviceId? }
 * Insights are language-aware via t().
 *
 * Severities: 'info' | 'success' | 'warn' | 'danger'
 */

const STABLE_DAYS = 3;    // days of all-OK readings to celebrate

export function generateInsights({ devices, readings, thresholds, alerts, now, t, language }) {
  const out = [];
  if (!devices || devices.length === 0) {
    out.push({
      id: 'no_devices',
      icon: 'info',
      severity: 'info',
      title: t('insightSetup') || 'Welcome to Filaha Flock',
      body: t('insightSetupBody') || 'Add your first coop to start monitoring. Tap the + button on the dashboard.',
    });
    return out;
  }

  // 1) Recent danger alerts
  const recent24h = (alerts || []).filter(
    (a) => now - a.timestamp < 24 * 60 * 60 * 1000 && a.type === 'ALERT'
  );
  if (recent24h.length === 0) {
    const days = countCalmDays(alerts, now);
    if (days >= STABLE_DAYS) {
      out.push({
        id: 'calm_streak',
        icon: 'checkCircle',
        severity: 'success',
        title: t('insightCalmTitle') || `${days} ${t('day') || 'days'} ${t('insightCalmStreak') || 'with no alerts'}`,
        body: t('insightCalmBody') || 'Your flock has been stable. Keep up the daily checks.',
      });
    }
  }

  // 1.5) PROACTIVE COACHING — works even for brand-new coops (no readings yet).
  // This is what makes the app actively guide the farmer.
  for (const device of devices) {
    const age = ageOf(device, now);
    if (age == null) continue;
    const breed = device.breed || 'broiler';

    // (a) Phase transition — bird crossed into a new rearing phase today
    const phaseNow = [...PHASE_STARTS].reverse().find((p) => age >= p.day);
    const startedToday = PHASE_STARTS.some((p) => p.day === age);
    if (startedToday && phaseNow) {
      const target = targetTempAt(breed, age);
      out.push({
        id: `phase_${device.id}_${age}`,
        icon: 'target',
        severity: 'info',
        title: `${device.name} — ${t(phaseNow.key) || phaseNow.key}`,
        body: (t('insightPhaseBody') ||
          'New phase from today (day {age}). Adjust the heat zone to about {temp}°C and switch to the matching feed.')
          .replace('{age}', age)
          .replace('{temp}', target != null ? target.toFixed(0) : '—'),
        deviceId: device.id,
        topicId: 'temperature',
        sensorKey: 'temp',
        tool: 'brooder',
      });
    }

    // (b) Vaccination due today or tomorrow
    const schedule = VACCINATION[breed] || VACCINATION.broiler;
    const dueSoon = (schedule || []).find((v) => v.day === age || v.day === age + 1);
    if (dueSoon && !dueSoon.optional) {
      const whenKey = dueSoon.day === age ? 'insightVaccineToday' : 'insightVaccineTomorrow';
      // The vaccine name is universal vet terminology (Gumboro, Newcastle…)
      // and stays as-is; the administration route is localized so no raw
      // English prose leaks into the Arabic UI.
      const ROUTE_KEY = {
        Water: 'vacRouteWater', Spray: 'vacRouteSpray', SC: 'vacRouteSC',
        IM: 'vacRouteIM', 'Eye-drop': 'vacRouteEyeDrop', WingWeb: 'vacRouteWingWeb',
        Hatchery: 'vacRouteHatchery', 'In-ovo': 'vacRouteHatchery',
      };
      const routeLabel = dueSoon.route ? t(ROUTE_KEY[dueSoon.route] || '') : '';
      const whenLabel = t(whenKey) || (dueSoon.day === age ? 'Due today' : 'Due tomorrow');
      out.push({
        id: `vacc_${device.id}_${dueSoon.day}`,
        icon: 'shield',
        severity: dueSoon.day === age ? 'warn' : 'info',
        title: `${device.name} — ${t('insightVaccineTitle') || 'Vaccination due'}`,
        body: `${whenLabel}: ${dueSoon.vaccine}${routeLabel ? ` (${routeLabel})` : ''}`,
        deviceId: device.id,
        topicId: 'vaccination',
        tool: 'vaccine',
      });
    }
  }

  // 2) Per-device situation analysis.
  // The advice below is composed from THIS coop's numbers - how far each
  // sensor is from its own limit, how fast it is moving, how long until it
  // crosses, how old the birds are, and what time it is - and de-conflicted so
  // two rules can never issue opposite instructions. See recommendations.js.
  const contexts = [];
  const calm = [];                       // coops with genuinely nothing wrong
  for (const device of devices) {
    const ctx = buildFarmContext({ device, readings, thresholds, now });
    contexts.push(ctx);
    const recs = deviceRecommendations(ctx, t);
    for (const rec of recs) out.push(rec);
    let concern = recs.some((r) => r.severity === "danger" || r.severity === "warn");

    // Battery is about the box, not the birds, so it stays outside the
    // environmental reasoning.
    const last = ctx.latest;
    if (last && last.bat != null && last.bat < 30 && last.bat > 0) {
      concern = true;
      out.push({
        id: `bat_${device.id}`,
        icon: 'battery',
        severity: last.bat < 15 ? 'danger' : 'warn',
        title: `${device.name} - ${t('insightBatLow') || 'Sensor battery low'}`,
        body: (t('insightBatLowBody') || 'Battery at {pct}%. Replace it soon before the sensor goes offline.')
          .replace('{pct}', Math.round(last.bat)),
        deviceId: device.id,
      });
    }
    if (!concern && ctx.hasData) calm.push(ctx);
  }

  // 3) When nothing is wrong, say where the farm actually stands rather than
  // rotating a generic tip. A canned "wash your drinkers daily" shown for the
  // fortieth time teaches the farmer to ignore the app; his own numbers do not.
  // Judged PER COOP, not globally: a farmer with two houses still deserves to
  // know where the healthy one stands while he deals with the other. The cards
  // are named, so "Coop 2 - nothing needs doing" cannot be read as a verdict on
  // the coop that is in trouble.
  for (const ctx of calm) {
    const ok = statusSummary(ctx, t);
    if (ok) out.push(ok);
  }

  const hasConcern = out.some((o) => o.severity === "danger" || o.severity === "warn");
  if (!hasConcern) {
    // Nothing is wrong anywhere, so point at what is coming instead.
    const upcoming = nextScheduled(devices, now, t);
    if (upcoming) out.push(upcoming);
  }

  // "Your flock is fine" must never sit beside "danger is near, act now".
  if (hasConcern) return out.filter((o) => o.id !== "calm_streak");

  return out;
}

// The next dated event across all coops - the vaccination or phase change the
// farmer should be preparing for. Real, specific and time-bound; the opposite
// of a rotating tip.
function nextScheduled(devices, now, t) {
  let best = null;
  for (const device of devices || []) {
    const age = ageOf(device, now);
    if (age == null) continue;
    const breed = device.breed || "broiler";

    const schedule = VACCINATION[breed] || VACCINATION.broiler;
    for (const v of schedule || []) {
      if (v.optional || v.day <= age + 1) continue;   // today/tomorrow already covered
      const inDays = v.day - age;
      if (inDays > 14) continue;
      if (!best || inDays < best.inDays) {
        best = { inDays, device, kind: "vaccine", label: v.vaccine, icon: "shield", topicId: "vaccination" };
      }
    }

    const nextPhase = PHASE_STARTS.find((p) => p.day > age);
    if (nextPhase) {
      const inDays = nextPhase.day - age;
      if (inDays <= 14 && (!best || inDays < best.inDays)) {
        best = { inDays, device, kind: "phase", label: t(nextPhase.key) || nextPhase.key,
                 icon: "target", topicId: "temperature" };
      }
    }
  }
  if (!best) return null;

  const when = (t("recInDays") || "in {n} days").replace("{n}", best.inDays);
  return {
    id: "next_" + best.kind + "_" + best.device.id + "_" + best.inDays,
    icon: best.icon,
    severity: "info",
    title: best.device.name + " — " + (t("recComingUp") || "Coming up"),
    body: [when, best.label].join(" • "),
    deviceId: best.device.id,
    topicId: best.topicId,
  };
}

function countCalmDays(alerts, now) {
  if (!alerts || alerts.length === 0) return 3; // arbitrary cap
  const lastAlert = alerts
    .filter((a) => a.type === 'ALERT')
    .reduce((max, a) => (a.timestamp > max ? a.timestamp : max), 0);
  if (lastAlert === 0) return 7;
  return Math.floor((now - lastAlert) / (24 * 60 * 60 * 1000));
}
