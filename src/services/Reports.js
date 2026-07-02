// ════════════════════════════════════════════════════════════════
//  Reports — daily / weekly / monthly flock reports, per coop.
//
//  TRUST RULE: every number in a report is either (a) computed from the
//  coop's real measured readings, or (b) an age/strain target from the
//  curated dataset in utils/poultryData.js (ITELV/OFAL field data +
//  official strain management guides + published THI tiers). Nothing is
//  estimated or invented. If data is missing, the report says so.
// ════════════════════════════════════════════════════════════════
import { fetchReadings, rowToReading, apiEnabled } from './ApiService';
import {
  envTargetsAt, targetWeightAt, targetFCRAt, heatStressTHI, strainLabel,
} from '../utils/poultryData';

export const PERIODS = { daily: 24, weekly: 24 * 7, monthly: 24 * 30 };

// ── Trilingual copy (kept local: reports read as one voice) ─────────
const S = {
  periodName: {
    daily:   { ar: 'التقرير اليومي',  fr: 'Rapport du jour',      en: 'Daily report' },
    weekly:  { ar: 'التقرير الأسبوعي', fr: 'Rapport de la semaine', en: 'Weekly report' },
    monthly: { ar: 'التقرير الشهري',  fr: 'Rapport du mois',       en: 'Monthly report' },
  },
  metric: {
    temp: { ar: 'الحرارة',   fr: 'Température', en: 'Temperature' },
    hum:  { ar: 'الرطوبة',   fr: 'Humidité',    en: 'Humidity' },
    co2:  { ar: 'CO₂',       fr: 'CO₂',         en: 'CO₂' },
    nh3:  { ar: 'الأمونيا',  fr: 'Ammoniac',    en: 'Ammonia' },
  },
  verdict: {
    good: { ar: 'جيدة', fr: 'Bon', en: 'Good' },
    high: { ar: 'مرتفعة', fr: 'Trop haut', en: 'Too high' },
    low:  { ar: 'منخفضة', fr: 'Trop bas', en: 'Too low' },
    mixed:{ ar: 'متقلبة', fr: 'Instable', en: 'Unstable' },
  },
};
const W = (obj, lang) => (obj && (obj[lang] || obj.en)) || '';

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const rnd = (v, d = 1) => (v == null ? null : Math.round(v * (10 ** d)) / (10 ** d));
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

function seriesOf(rows, key) {
  return rows.map((r) => r[key]).filter((v) => typeof v === 'number' && !isNaN(v));
}

function statsOf(rows, key) {
  const s = seriesOf(rows, key);
  if (!s.length) return null;
  return { avg: avg(s), min: Math.min(...s), max: Math.max(...s), n: s.length };
}

// Split the period in two halves to detect a trend (real data only).
function trendOf(rows, key) {
  if (rows.length < 8) return null;
  const mid = Math.floor(rows.length / 2);
  const a = avg(seriesOf(rows.slice(0, mid), key));
  const b = avg(seriesOf(rows.slice(mid), key));
  if (a == null || b == null) return null;
  return b - a; // + = rising over the period
}

// Day (10:00–18:00) vs night (22:00–06:00) averages — catches cold nights.
function dayNight(rows, key) {
  const day = []; const night = [];
  for (const r of rows) {
    const h = new Date(r.timestamp).getHours();
    const v = r[key];
    if (typeof v !== 'number' || isNaN(v)) continue;
    if (h >= 10 && h < 18) day.push(v);
    else if (h >= 22 || h < 6) night.push(v);
  }
  return { day: avg(day), night: avg(night) };
}

/**
 * Generate a report for one coop over one period.
 * Pulls history from the cloud (falls back to local readings if offline).
 * Returns a structured object the ReportsScreen renders — or {empty:true}.
 */
export async function generateReport({
  device, period = 'daily', language = 'ar', thresholds, alerts = [], localReadings = [],
}) {
  const lang = ['ar', 'fr', 'en'].includes(language) ? language : 'en';
  const hours = PERIODS[period] || 24;
  const sinceTs = Date.now() - hours * 3600 * 1000;

  // ── 1. Collect real readings ──────────────────────────────────────
  let rows = [];
  if (apiEnabled()) {
    try {
      const raw = await fetchReadings(device.id, hours);
      rows = (raw || []).map((r) => rowToReading(device.id, r)).filter(Boolean);
    } catch (e) { /* offline → local fallback below */ }
  }
  if (rows.length === 0) {
    rows = (localReadings || []).filter((r) => r && r.timestamp >= sinceTs);
  }
  rows.sort((a, b) => a.timestamp - b.timestamp);

  const ageDays = device.chickArrivalDate
    ? Math.max(1, Math.floor((Date.now() - device.chickArrivalDate) / 86400000) + 1)
    : null;
  const breed = device.breed || 'broiler';
  const targets = ageDays != null ? envTargetsAt(breed, ageDays) : envTargetsAt(breed, 30);

  if (rows.length < 3) {
    return { empty: true, period, deviceId: device.id, ageDays };
  }

  // ── 2. Per-metric evaluation vs age-appropriate targets ───────────
  // Bands: temp = dataset target ±2°C (±3°C after day 28 — guides allow a
  // wider comfort zone for feathered birds); humidity = target ±10 pts;
  // NH3/CO2 = the app's alert thresholds (curated defaults, user-tunable).
  const tempTol = ageDays != null && ageDays > 28 ? 3 : 2;
  const bands = {
    temp: targets.temp != null ? { lo: targets.temp - tempTol, hi: targets.temp + tempTol } : null,
    hum:  targets.humidity != null ? { lo: targets.humidity - 10, hi: targets.humidity + 10 } : null,
    co2:  { lo: 0, hi: (thresholds && thresholds.co2 && thresholds.co2.danger) || 2500 },
    nh3:  { lo: 0, hi: (thresholds && thresholds.nh3 && thresholds.nh3.warn) || 15 },
  };

  const metrics = [];
  for (const key of ['temp', 'hum', 'co2', 'nh3']) {
    const st = statsOf(rows, key);
    if (!st) continue;
    const band = bands[key];
    let inRange = null; let verdict = 'good';
    if (band) {
      const s = seriesOf(rows, key);
      const inside = s.filter((v) => v >= band.lo && v <= band.hi).length;
      inRange = pct(inside, s.length);
      const above = s.filter((v) => v > band.hi).length / s.length;
      const below = s.filter((v) => v < band.lo).length / s.length;
      if (above > 0.25 && below > 0.25) verdict = 'mixed';
      else if (above > 0.25) verdict = 'high';
      else if (below > 0.25) verdict = 'low';
    }
    metrics.push({
      key,
      label: W(S.metric[key], lang),
      avg: rnd(st.avg, key === 'co2' ? 0 : 1),
      min: rnd(st.min, key === 'co2' ? 0 : 1),
      max: rnd(st.max, key === 'co2' ? 0 : 1),
      unit: key === 'temp' ? '°C' : key === 'hum' ? '%' : 'ppm',
      target: key === 'temp' ? rnd(targets.temp, 0)
        : key === 'hum' ? rnd(targets.humidity, 0)
        : band ? band.hi : null,
      targetIsMax: key === 'co2' || key === 'nh3',
      inRange,
      verdict,
      verdictLabel: W(S.verdict[verdict], lang),
      trend: rnd(trendOf(rows, key), 1),
    });
  }

  // ── 3. Heat stress exposure (published THI tiers) ────────────────
  let thiDanger = 0; let thiAlert = 0; let thiN = 0;
  for (const r of rows) {
    if (typeof r.temp !== 'number' || isNaN(r.temp)) continue;
    const hs = heatStressTHI(r.temp, r.hum);
    if (!hs) continue;
    thiN++;
    if (hs.tier === 'danger' || hs.tier === 'emergency') thiDanger++;
    else if (hs.tier === 'alert') thiAlert++;
  }
  const heat = thiN > 0 ? { dangerPct: pct(thiDanger, thiN), alertPct: pct(thiAlert, thiN) } : null;

  // ── 4. Cold nights (ascites risk for young broilers) ─────────────
  const dn = dayNight(rows, 'temp');
  const coldNight = (dn.night != null && bands.temp && dn.night < bands.temp.lo - 1);

  // ── 5. Device coverage (data completeness, honest) ────────────────
  const expected = hours * 60; // one reading per minute
  const coverage = Math.min(100, pct(rows.length, expected));

  // ── 6. Alerts in the period ───────────────────────────────────────
  const alertCount = (alerts || []).filter(
    (a) => a.deviceId === device.id && a.type === 'ALERT' && a.timestamp >= sinceTs
  ).length;

  // ── 7. Growth reference (strain guide — a target, not a measurement)
  let growth = null;
  if (ageDays != null && device.strain) {
    const wTarget = targetWeightAt(device.strain, ageDays);
    const fcr = targetFCRAt(device.strain, ageDays);
    if (wTarget != null) {
      growth = { weightTarget: wTarget, fcrTarget: fcr != null ? rnd(fcr, 2) : null, strain: strainLabel(device.strain) };
    }
  }

  // ── 8. Score = weighted time-in-good-range (transparent formula) ──
  const weights = { temp: 0.35, nh3: 0.30, co2: 0.20, hum: 0.15 };
  let wSum = 0; let score = 0;
  for (const m of metrics) {
    if (m.inRange == null) continue;
    score += (weights[m.key] || 0.2) * m.inRange;
    wSum += (weights[m.key] || 0.2);
  }
  score = wSum > 0 ? Math.round(score / wSum) : null;
  if (score != null && heat && heat.dangerPct > 10) score = Math.max(0, score - 10);

  // ── 9. Plain-language highlights + recommendations ────────────────
  const highlights = buildHighlights({ lang, metrics, heat, coldNight, dn, coverage, alertCount, ageDays, targets, period });
  const recommendations = buildRecommendations({ lang, metrics, heat, coldNight, ageDays, breed, targets });

  return {
    empty: false,
    period,
    periodLabel: W(S.periodName[period], lang),
    generatedAt: Date.now(),
    deviceId: device.id,
    deviceName: device.name,
    ageDays,
    breed,
    strainName: device.strain ? strainLabel(device.strain) : null,
    score,
    coverage,
    samples: rows.length,
    alertCount,
    metrics,
    heat,
    dayNightTemp: { day: rnd(dn.day, 1), night: rnd(dn.night, 1) },
    growth,
    highlights,
    recommendations,
  };
}

// ── Plain-language builders (short sentences, farmer-first) ─────────
function buildHighlights({ lang, metrics, heat, coldNight, dn, coverage, alertCount, ageDays, period }) {
  const out = [];
  const L = (ar, fr, en) => out.push(lang === 'ar' ? ar : lang === 'fr' ? fr : en);

  const bad = metrics.filter((m) => m.verdict !== 'good');
  if (bad.length === 0) {
    L('كانت أجواء الحظيرة جيدة طوال الفترة. استمر على نفس النهج.',
      'L’ambiance du poulailler est restée bonne sur toute la période. Continuez ainsi.',
      'The coop climate stayed good through the whole period. Keep it up.');
  }
  for (const m of bad) {
    if (m.key === 'temp' && m.verdict === 'high') {
      L(`الحرارة كانت أعلى من المطلوب لعمر الكتاكيت (المعدل ${m.avg}° والهدف ${m.target}°).`,
        `La température a dépassé la cible pour l’âge des poussins (moyenne ${m.avg}°, cible ${m.target}°).`,
        `Temperature ran above the target for the chicks’ age (avg ${m.avg}°, target ${m.target}°).`);
    } else if (m.key === 'temp' && m.verdict === 'low') {
      L(`الحرارة كانت أقل من المطلوب لعمر الكتاكيت (المعدل ${m.avg}° والهدف ${m.target}°).`,
        `La température est restée sous la cible pour l’âge (moyenne ${m.avg}°, cible ${m.target}°).`,
        `Temperature ran below the age target (avg ${m.avg}°, target ${m.target}°).`);
    } else if (m.key === 'nh3') {
      L(`الأمونيا تجاوزت الحد الآمن في ${100 - m.inRange}% من الوقت (المعدل ${m.avg} ppm).`,
        `L’ammoniac a dépassé la limite sûre ${100 - m.inRange}% du temps (moyenne ${m.avg} ppm).`,
        `Ammonia exceeded the safe limit ${100 - m.inRange}% of the time (avg ${m.avg} ppm).`);
    } else if (m.key === 'co2') {
      L(`ثاني أكسيد الكربون ارتفع فوق الحد في ${100 - m.inRange}% من الوقت — علامة نقص تهوية.`,
        `Le CO₂ a dépassé la limite ${100 - m.inRange}% du temps — signe de ventilation insuffisante.`,
        `CO₂ went over the limit ${100 - m.inRange}% of the time — a sign of low ventilation.`);
    } else if (m.key === 'hum') {
      L(m.verdict === 'high'
          ? `الرطوبة كانت مرتفعة (المعدل ${m.avg}%) — انتبه للفرشة المبللة.`
          : `الرطوبة كانت منخفضة (المعدل ${m.avg}%) — انتبه للغبار.`,
        m.verdict === 'high'
          ? `Humidité élevée (moyenne ${m.avg}%) — attention à la litière humide.`
          : `Humidité basse (moyenne ${m.avg}%) — attention à la poussière.`,
        m.verdict === 'high'
          ? `Humidity ran high (avg ${m.avg}%) — watch for wet litter.`
          : `Humidity ran low (avg ${m.avg}%) — watch for dust.`);
    }
  }
  if (heat && (heat.dangerPct > 0 || heat.alertPct > 10)) {
    L(`إجهاد حراري: ${heat.dangerPct}% من الوقت في منطقة الخطر و${heat.alertPct}% في منطقة التنبيه.`,
      `Stress thermique : ${heat.dangerPct}% du temps en zone danger et ${heat.alertPct}% en zone alerte.`,
      `Heat stress: ${heat.dangerPct}% of the time in the danger zone and ${heat.alertPct}% in the alert zone.`);
  }
  if (coldNight && dn.night != null) {
    L(`الليالي كانت باردة (معدل الليل ${Math.round(dn.night)}°) — البرد الليلي يجهد الكتاكيت.`,
      `Les nuits ont été froides (moyenne nocturne ${Math.round(dn.night)}°) — le froid nocturne stresse les poussins.`,
      `Nights ran cold (night average ${Math.round(dn.night)}°) — cold nights stress the chicks.`);
  }
  if (alertCount > 0) {
    L(`عدد التنبيهات خلال الفترة: ${alertCount}.`,
      `Nombre d’alertes sur la période : ${alertCount}.`,
      `Alerts during the period: ${alertCount}.`);
  }
  if (coverage < 70) {
    L(`وصلت ${coverage}% فقط من القياسات المتوقعة — تحقق من كهرباء الجهاز وإشارته.`,
      `Seulement ${coverage}% des mesures attendues sont arrivées — vérifiez le courant et le signal du boîtier.`,
      `Only ${coverage}% of expected readings arrived — check the device’s power and signal.`);
  }
  return out;
}

function buildRecommendations({ lang, metrics, heat, coldNight, ageDays, breed }) {
  const out = [];
  const L = (ar, fr, en) => out.push(lang === 'ar' ? ar : lang === 'fr' ? fr : en);
  const m = Object.fromEntries(metrics.map((x) => [x.key, x]));

  if (m.temp && m.temp.verdict === 'high') {
    L('زد التهوية نهارًا، وفّر ماء باردًا ونظيفًا باستمرار، وقلّل كثافة الطيور إن أمكن.',
      'Augmentez la ventilation en journée, gardez une eau fraîche et propre en continu, et réduisez la densité si possible.',
      'Increase daytime ventilation, keep cool clean water available at all times, and lower bird density if possible.');
  }
  if (m.temp && (m.temp.verdict === 'low' || coldNight)) {
    if (ageDays != null && ageDays <= 21) {
      L('الكتاكيت الصغيرة تحتاج تدفئة: افحص المدفأة ليلًا وسدّ منافذ الهواء البارد دون إغلاق التهوية كليًا.',
        'Les poussins jeunes ont besoin de chauffage : vérifiez l’éleveuse la nuit et bouchez les entrées d’air froid sans couper toute la ventilation.',
        'Young chicks need heat: check the brooder at night and block cold drafts without shutting off all ventilation.');
    } else {
      L('دفّئ الحظيرة ليلًا؛ البرد المستمر يرفع استهلاك العلف ويضعف النمو.',
        'Chauffez le bâtiment la nuit ; un froid continu augmente la consommation d’aliment et freine la croissance.',
        'Heat the house at night; sustained cold raises feed intake and slows growth.');
      if (breed === 'broiler') {
        L('انتبه: البرد مع النمو السريع يزيد خطر الاستسقاء (ماء البطن) عند دجاج اللحم.',
          'Attention : le froid combiné à une croissance rapide augmente le risque d’ascite chez le poulet de chair.',
          'Note: cold plus fast growth raises ascites (water belly) risk in broilers.');
      }
    }
  }
  if (m.nh3 && m.nh3.verdict !== 'good') {
    L('قلّب الفرشة وبدّل المبلل منها، وزد التهوية — الأمونيا فوق الحد تضر العيون والجهاز التنفسي.',
      'Retournez la litière et remplacez les parties humides, augmentez la ventilation — l’ammoniac au-dessus de la limite abîme les yeux et les voies respiratoires.',
      'Turn the litter and replace wet patches, and increase ventilation — ammonia over the limit damages eyes and airways.');
  }
  if (m.co2 && m.co2.verdict !== 'good') {
    L('افتح مداخل الهواء أكثر خاصة ليلًا — ارتفاع CO₂ يعني أن الهواء لا يتجدد بما يكفي.',
      'Ouvrez davantage les entrées d’air surtout la nuit — un CO₂ élevé signifie que l’air ne se renouvelle pas assez.',
      'Open air inlets more, especially at night — high CO₂ means the air is not refreshing enough.');
  }
  if (m.hum && m.hum.verdict === 'high') {
    L('جفّف الفرشة وأصلح أي تسرب ماء من السقايات؛ الرطوبة العالية تولّد الأمونيا والكوكسيديا.',
      'Séchez la litière et réparez toute fuite des abreuvoirs ; l’humidité élevée génère ammoniac et coccidiose.',
      'Dry the litter and fix any drinker leaks; high humidity breeds ammonia and coccidiosis.');
  }
  if (heat && heat.dangerPct > 5) {
    L('في ساعات الحر: رش الأسطح بالماء، شغّل كل المراوح، وأخّر العلف إلى ساعات المساء الباردة.',
      'Aux heures chaudes : mouillez la toiture, faites tourner tous les ventilateurs, et décalez l’aliment vers les heures fraîches du soir.',
      'During hot hours: wet the roof, run all fans, and shift feeding to the cooler evening hours.');
  }
  if (out.length === 0) {
    L('كل المؤشرات ضمن الحدود — واصل نفس التهوية والتدفئة والعناية بالفرشة.',
      'Tous les indicateurs sont dans les normes — gardez la même ventilation, le même chauffage et le même soin de la litière.',
      'All indicators are within range — keep the same ventilation, heating and litter care.');
  }
  return out;
}
