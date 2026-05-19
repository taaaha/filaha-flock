import { sensorStatus } from '../utils/thresholds';
import { STATUS } from '../utils/colors';
import { targetTempAt, envTargetsAt, heatStressTHI, VACCINATION } from '../utils/poultryData';

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

const TREND_WINDOW = 8;   // last N readings to compute trend
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

  // 2) Per-device trend analyses
  for (const device of devices) {
    const list = readings?.[device.id] || [];
    if (list.length < TREND_WINDOW) continue;
    const recent = list.slice(-TREND_WINDOW);
    const breed = device.breed || 'broiler';

    // CO2 rising trend
    const co2Trend = trendOf(recent.map((r) => r.co2));
    if (co2Trend.slope > 50 && co2Trend.last >= (thresholds.co2?.warn || 1500) * 0.7) {
      out.push({
        id: `co2_rising_${device.id}`,
        icon: 'wind',
        severity: 'warn',
        title: `${device.name} — ${t('insightCo2RisingTitle') || 'CO₂ is climbing'}`,
        body: t('insightCo2RisingBody') ||
          `CO₂ has risen by about ${Math.round(co2Trend.slope * TREND_WINDOW)} ppm across recent readings. Open vents now to keep the air fresh.`,
        deviceId: device.id,
        topicId: 'ventilation',
        sensorKey: 'co2',
      });
    }

    // NH3 creep
    const nh3Trend = trendOf(recent.map((r) => r.nh3));
    if (nh3Trend.last > (thresholds.nh3?.warn || 25) * 0.7 && nh3Trend.slope > 0.5) {
      out.push({
        id: `nh3_rising_${device.id}`,
        icon: 'alertTriangle',
        severity: 'warn',
        title: `${device.name} — ${t('insightNh3RisingTitle') || 'Ammonia is creeping up'}`,
        body: t('insightNh3RisingBody') ||
          'Ammonia smell may already be sharp at bird level. Replace wet litter and increase ventilation before it harms the lungs.',
        deviceId: device.id,
        topicId: 'ventilation',
        sensorKey: 'nh3',
      });
    }

    // Temperature outside optimal for age
    if (device.chickArrivalDate) {
      const age = Math.max(1, Math.floor((now - device.chickArrivalDate) / 86400000) + 1);
      const target = targetTempAt(breed, age);
      const lastReading = list[list.length - 1];
      if (lastReading && lastReading.temp != null && target != null) {
        const deviation = lastReading.temp - target;
        if (Math.abs(deviation) >= 3) {
          out.push({
            id: `temp_off_${device.id}`,
            icon: 'thermometer',
            severity: Math.abs(deviation) >= 5 ? 'danger' : 'warn',
            title: `${device.name} — ${t('insightTempOffTitle') || 'Temperature off target'}`,
            body: (t('insightTempOffBody') ||
              'Current temp {now}°C, target for day {age} is {target}°C. ')
              .replace('{now}', lastReading.temp.toFixed(1))
              .replace('{age}', age)
              .replace('{target}', target.toFixed(1)) +
              (deviation > 0
                ? (t('insightTempTooHigh') || 'Reduce heating, open vents, spray roof if outdoor temp is high.')
                : (t('insightTempTooLow')  || 'Increase heating, close drafts, check the heater is working.')),
            deviceId: device.id,
            topicId: 'temperature',
            sensorKey: 'temp',
            tool: 'brooder',
          });
        }
      }
    }

    // Heat stress
    const last = list[list.length - 1];
    if (last && last.temp != null && last.hum != null) {
      const hs = heatStressTHI(last.temp, last.hum);
      if (hs && (hs.tier === 'alert' || hs.tier === 'danger' || hs.tier === 'emergency')) {
        out.push({
          id: `thi_${device.id}`,
          icon: 'sun',
          severity: hs.tier === 'emergency' ? 'danger' : (hs.tier === 'danger' ? 'warn' : 'info'),
          title: `${device.name} — ${t('insightHeatStress') || 'Heat stress risk'}`,
          body: (t('insightHeatStressBody') ||
            'THI is {thi} ({tier}). Spray the roof, run fans, and add electrolytes + vitamin C to drinking water.')
            .replace('{thi}', hs.thi)
            .replace('{tier}', t('thi' + hs.tier.charAt(0).toUpperCase() + hs.tier.slice(1)) || hs.tier),
          deviceId: device.id,
          topicId: 'summer',
          sensorKey: 'temp',
        });
      }
    }

    // Battery getting low
    if (last && last.bat != null && last.bat < 30 && last.bat > 0) {
      out.push({
        id: `bat_${device.id}`,
        icon: 'battery',
        severity: last.bat < 15 ? 'danger' : 'warn',
        title: `${device.name} — ${t('insightBatLow') || 'Sensor battery low'}`,
        body: (t('insightBatLowBody') || 'Battery at {pct}%. Replace it soon before the sensor goes offline.')
          .replace('{pct}', Math.round(last.bat)),
        deviceId: device.id,
      });
    }
  }

  // 3) Focus of the day — ALWAYS present and contextual (never a random
  // rotating tip). It's 'info' severity so danger/warn float above it,
  // but the farmer always has a relevant "what to do today" anchor.
  out.push(dailyFocus({ devices, readings, thresholds, now, t }));

  // "Your flock is fine / no problems" must NEVER sit next to something
  // that says "danger is near, act now" — that's the contradiction the
  // user saw. Drop the calm card whenever there is ANY real concern:
  // a danger/warn insight, OR a preventive "approaching danger" focus.
  const hasConcern = out.some((o) =>
    o.severity === 'danger' ||
    o.severity === 'warn' ||
    (o.id && o.id.indexOf('focus_prevent') === 0)
  );
  if (hasConcern) {
    return out.filter((o) => o.id !== 'calm_streak');
  }

  return out;
}

// Simple linear trend slope per index step
function trendOf(values) {
  const clean = values.filter((v) => v != null && !isNaN(v));
  if (clean.length < 2) return { slope: 0, last: clean[clean.length - 1] };
  const n = clean.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += clean[i];
    sumXY += i * clean[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return { slope, last: clean[clean.length - 1] };
}

function countCalmDays(alerts, now) {
  if (!alerts || alerts.length === 0) return 3; // arbitrary cap
  const lastAlert = alerts
    .filter((a) => a.type === 'ALERT')
    .reduce((max, a) => (a.timestamp > max ? a.timestamp : max), 0);
  if (lastAlert === 0) return 7;
  return Math.floor((now - lastAlert) / (24 * 60 * 60 * 1000));
}

function latestReading(readings, id) {
  const l = (readings && readings[id]) || [];
  return l.length ? l[l.length - 1] : null;
}

// The "focus of the day" — derived from the real state of the farm, never
// a random rotation. Priority: (1) a sensor creeping toward its limit,
// (2) seasonal risk for the Algerian climate, (3) the youngest flock's
// phase need. Every variant carries a topicId/deviceId so tapping it
// forwards to the matching issue + guidance.
function dailyFocus({ devices, readings, thresholds, now, t }) {
  const list = devices || [];

  // 1) Preventive: a sensor already 70–99% of its warn threshold.
  let best = null;
  for (const d of list) {
    const r = latestReading(readings, d.id);
    if (!r) continue;
    for (const key of ['nh3', 'co2', 'temp', 'hum']) {
      const v = r[key];
      const warn = thresholds && thresholds[key] && thresholds[key].warn;
      if (v == null || isNaN(v) || !warn) continue;
      const frac = v / warn;
      if (frac >= 0.7 && frac < 1 && (!best || frac > best.frac)) {
        best = { id: d.id, name: d.name, key, frac };
      }
    }
  }
  if (best) {
    return {
      id: `focus_prevent_${best.id}_${best.key}`,
      icon: best.key === 'temp' ? 'thermometer' : best.key === 'hum' ? 'droplet' : 'wind',
      severity: 'info',
      title: `${best.name} — ${t('focusWatch') || 'Worth watching today'}`,
      body: (t('focusApproaching') ||
        '{sensor} is approaching its safe limit. Act early — open the guidance before it becomes a danger.')
        .replace('{sensor}', t(`${best.key}Short`) || best.key),
      deviceId: best.id,
      topicId: best.key === 'temp' ? 'temperature' : 'ventilation',
      sensorKey: best.key,
    };
  }

  // 2) Seasonal — Algerian hot months (May–September).
  const month = new Date(now).getMonth();
  if (month >= 4 && month <= 8) {
    return {
      id: 'focus_season_summer',
      icon: 'sun',
      severity: 'info',
      title: t('tipSummerTitle') || 'Manage the summer heat',
      body: t('tipSummerBody') ||
        'Spray the roof in the afternoon, feed at dawn and dusk, and add electrolytes when it is hot.',
      topicId: 'summer',
    };
  }

  // 3) The youngest flock's current phase need.
  const aged = list
    .map((d) => ({ d, age: ageOf(d, now) }))
    .filter((x) => x.age != null)
    .sort((a, b) => a.age - b.age);
  if (aged.length) {
    const { d, age } = aged[0];
    if (age <= 7) {
      return {
        id: `focus_phase_${d.id}`,
        icon: 'droplet',
        severity: 'info',
        title: `${d.name} — ${t('tipWaterTitle') || 'Clean water saves lives'}`,
        body: t('tipWaterBody') ||
          'Chicks are fragile now — keep water clean and cool, and wash the drinkers every morning.',
        deviceId: d.id,
        topicId: 'health',
      };
    }
    if (age <= 21) {
      return {
        id: `focus_phase_${d.id}`,
        icon: 'wind',
        severity: 'info',
        title: `${d.name} — ${t('tipVentilationTitle') || 'Test the air at bird level'}`,
        body: t('tipVentilationBody') ||
          'Crouch to bird level. If your eyes sting, ammonia is already hurting their lungs — ventilate.',
        deviceId: d.id,
        topicId: 'ventilation',
      };
    }
    return {
      id: `focus_phase_${d.id}`,
      icon: 'heart',
      severity: 'info',
      title: `${d.name} — ${t('tipObservationTitle') || 'Walk the flock every morning'}`,
      body: t('tipObservationBody') ||
        'A lethargic, fluffed-up bird is the earliest outbreak warning. Remove it to protect the rest.',
      deviceId: d.id,
      topicId: 'health',
    };
  }

  // 4) Universal default — water hygiene.
  return {
    id: 'focus_default',
    icon: 'droplet',
    severity: 'info',
    title: t('tipWaterTitle') || 'Clean water saves lives',
    body: t('tipWaterBody') || 'Wash drinkers daily. Dirty water is the number-one disease vector.',
    topicId: 'health',
  };
}
