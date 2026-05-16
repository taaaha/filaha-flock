import { sensorStatus } from '../utils/thresholds';
import { STATUS } from '../utils/colors';
import { targetTempAt, envTargetsAt, heatStressTHI } from '../utils/poultryData';

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
            .replace('{tier}', hs.tier),
          deviceId: device.id,
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

  // 3) Education: rotate a daily tip if no critical insights yet
  if (out.length === 0 || out.every((o) => o.severity === 'success' || o.severity === 'info')) {
    out.push(dailyTip(now, t, language));
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

// Rotating tip by day-of-year + language
const TIPS = [
  {
    icon: 'droplet',
    titleKey: 'tipWaterTitle',
    bodyKey: 'tipWaterBody',
    fallback: { title: 'Clean water saves lives', body: 'Wash drinkers daily. Birds drink twice as much water as feed — dirty water is the #1 disease vector.' },
  },
  {
    icon: 'thermometer',
    titleKey: 'tipTempTitle',
    bodyKey: 'tipTempBody',
    fallback: { title: 'Watch the chicks, not the thermometer', body: 'Chicks huddled together = too cold. Spread out at the edges = too hot. Evenly distributed = perfect.' },
  },
  {
    icon: 'wind',
    titleKey: 'tipVentilationTitle',
    bodyKey: 'tipVentilationBody',
    fallback: { title: 'Test the air at bird level', body: 'Crouch to where the birds breathe. If your eyes burn, the ammonia is already harming their lungs.' },
  },
  {
    icon: 'shield',
    titleKey: 'tipBiosecurityTitle',
    bodyKey: 'tipBiosecurityBody',
    fallback: { title: 'Biosecurity beats medicine', body: 'No visitors in the coop. Disinfect your boots. Keep wild birds and rodents out. Most outbreaks start with a careless visitor.' },
  },
  {
    icon: 'sun',
    titleKey: 'tipSummerTitle',
    bodyKey: 'tipSummerBody',
    fallback: { title: 'Algerian summers kill birds', body: 'Spray the roof with water in afternoon heat. Feed at dawn and dusk, not noon. Add electrolytes when temps exceed 30°C.' },
  },
  {
    icon: 'feather',
    titleKey: 'tipFeedTitle',
    bodyKey: 'tipFeedBody',
    fallback: { title: 'Fresh feed only', body: 'Wet or moldy feed causes silent mortality through mycotoxins. Distribute small amounts 4–6× daily for chicks.' },
  },
  {
    icon: 'heart',
    titleKey: 'tipObservationTitle',
    bodyKey: 'tipObservationBody',
    fallback: { title: 'Walk the flock every morning', body: 'A lethargic, fluffed-up bird is your earliest warning of an outbreak. Removing it from the flock can save the rest.' },
  },
];

function dailyTip(now, t, language) {
  const dayOfYear = Math.floor((now - new Date(new Date(now).getFullYear(), 0, 0)) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  const title = t(tip.titleKey);
  const body = t(tip.bodyKey);
  return {
    id: 'daily_tip',
    icon: tip.icon,
    severity: 'info',
    title: (title && title !== tip.titleKey) ? title : tip.fallback.title,
    body:  (body  && body  !== tip.bodyKey)  ? body  : tip.fallback.body,
  };
}
