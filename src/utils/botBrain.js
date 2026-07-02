// ════════════════════════════════════════════════════════════════
//  botBrain — live-data answers for the support assistant.
//
//  Before falling back to the static FAQ, the bot tries to answer from
//  the farmer's OWN data: their coops' latest readings, flock age,
//  age-appropriate targets from the curated dataset, battery, status.
//  Fully offline; answers in the language the question was asked in.
// ════════════════════════════════════════════════════════════════
import { envTargetsAt, targetWeightAt, strainLabel } from './poultryData';

const AR_DIACRITICS = /[ً-ْٰـ]/g;
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(AR_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c');
}
const hasAny = (q, words) => words.some((w) => q.includes(norm(w)));

const L = (lang, ar, fr, en) => (lang === 'ar' ? ar : lang === 'fr' ? fr : en);

function fmtAgo(ts, lang) {
  if (!ts) return '';
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 60) return L(lang, `منذ ${min} دقيقة`, `il y a ${min} min`, `${min} min ago`);
  const h = Math.round(min / 60);
  return L(lang, `منذ ${h} ساعة`, `il y a ${h} h`, `${h} h ago`);
}

function pickDevice(q, devices) {
  // If the farmer names a coop (by name or id), use it; else default to the
  // first coop (and say which one we're talking about).
  for (const d of devices) {
    if (!d) continue;
    const name = norm(d.name); const id = norm(d.id);
    if ((name && q.includes(name)) || (id && q.includes(id))) return d;
  }
  return devices[0] || null;
}

function ageOf(device) {
  if (!device?.chickArrivalDate) return null;
  return Math.max(1, Math.floor((Date.now() - device.chickArrivalDate) / 86400000) + 1);
}

/**
 * Try to answer from live app data. Returns a string or null (→ FAQ next).
 * ctx: { devices, lastReadingFor(deviceId), language }
 */
export function answerLive(query, ctx, lang) {
  const q = ' ' + norm(query) + ' ';
  const devices = ctx.devices || [];

  // Greetings / thanks — a bot that can't say hello feels broken.
  if (/^\s*(سلام|اهلا|مرحبا|صباح|مساء|salut|bonjour|bonsoir|hello|hi|hey)\b/.test(norm(query))) {
    return L(lang,
      'أهلًا بك! اسألني عن حرارة حظيرتك، الرطوبة، البطارية، عمر الكتاكيت، أو أي مشكلة تقنية.',
      'Bonjour ! Demandez-moi la température de votre poulailler, l’humidité, la batterie, l’âge des poussins, ou tout problème technique.',
      'Hello! Ask me your coop’s temperature, humidity, battery, chick age, or any technical problem.');
  }
  if (hasAny(q, ['شكرا', 'يعطيك الصحه', 'merci', 'thanks', 'thank you'])) {
    return L(lang, 'على الرحب والسعة! 🐥', 'Avec plaisir ! 🐥', 'You’re welcome! 🐥');
  }

  if (devices.length === 0) return null;
  const device = pickDevice(q, devices);
  if (!device) return null;
  const r = ctx.lastReadingFor ? ctx.lastReadingFor(device.id) : null;
  const age = ageOf(device);
  const targets = envTargetsAt(device.breed || 'broiler', age != null ? age : 30);
  const noData = L(lang,
    `لا توجد قراءة حديثة من «${device.name}» الآن — تحقق أن الجهاز يعمل.`,
    `Pas de mesure récente de « ${device.name} » — vérifiez que le boîtier fonctionne.`,
    `No recent reading from “${device.name}” — check the device is running.`);

  // Temperature
  if (hasAny(q, ['حراره', 'سخانه', 'temperature', 'temp ', 'chaleur', 'chaud', 'froid', 'برد'])) {
    if (!r || typeof r.temp !== 'number') return noData;
    const tgt = targets.temp != null ? Math.round(targets.temp) : null;
    return L(lang,
      `حرارة «${device.name}» الآن ${r.temp.toFixed(1)}° (${fmtAgo(r.timestamp, lang)}).` + (tgt != null && age != null ? ` الهدف في اليوم ${age} هو ~${tgt}°.` : ''),
      `Température de « ${device.name} » : ${r.temp.toFixed(1)}° (${fmtAgo(r.timestamp, lang)}).` + (tgt != null && age != null ? ` La cible au jour ${age} est ~${tgt}°.` : ''),
      `“${device.name}” temperature: ${r.temp.toFixed(1)}° (${fmtAgo(r.timestamp, lang)}).` + (tgt != null && age != null ? ` Target at day ${age} is ~${tgt}°.` : ''));
  }
  // Humidity
  if (hasAny(q, ['رطوبه', 'humidite', 'humidity', 'humide'])) {
    if (!r || typeof r.hum !== 'number') return noData;
    const tgt = targets.humidity != null ? Math.round(targets.humidity) : null;
    return L(lang,
      `رطوبة «${device.name}» الآن ${Math.round(r.hum)}%` + (tgt != null ? ` والهدف ~${tgt}%.` : '.'),
      `Humidité de « ${device.name} » : ${Math.round(r.hum)}%` + (tgt != null ? ` (cible ~${tgt}%).` : '.'),
      `“${device.name}” humidity: ${Math.round(r.hum)}%` + (tgt != null ? ` (target ~${tgt}%).` : '.'));
  }
  // Ammonia / CO2
  if (hasAny(q, ['امونيا', 'ammoniac', 'ammonia', 'nh3'])) {
    if (!r || typeof r.nh3 !== 'number') return noData;
    return L(lang,
      `الأمونيا في «${device.name}»: ${r.nh3.toFixed(1)} ppm. تحت 15 جيدة، فوق 25 خطر.`,
      `Ammoniac de « ${device.name} » : ${r.nh3.toFixed(1)} ppm. Sous 15 c’est bon, au-dessus de 25 c’est dangereux.`,
      `“${device.name}” ammonia: ${r.nh3.toFixed(1)} ppm. Under 15 is good, over 25 is dangerous.`);
  }
  if (hasAny(q, ['co2', 'ثاني اكسيد'])) {
    if (!r || typeof r.co2 !== 'number') return noData;
    return L(lang,
      `CO₂ في «${device.name}»: ${Math.round(r.co2)} ppm.`,
      `CO₂ de « ${device.name} » : ${Math.round(r.co2)} ppm.`,
      `“${device.name}” CO₂: ${Math.round(r.co2)} ppm.`);
  }
  // Battery
  if (hasAny(q, ['بطاريه', 'شحن', 'batterie', 'battery'])) {
    if (!r || typeof r.bat !== 'number') return noData;
    return L(lang,
      `بطارية جهاز «${device.name}»: ${Math.round(r.bat)}%.`,
      `Batterie du boîtier « ${device.name} » : ${Math.round(r.bat)}%.`,
      `“${device.name}” device battery: ${Math.round(r.bat)}%.`);
  }
  // Age / weight target
  if (hasAny(q, ['عمر', 'يوم كم', 'age', 'jour', 'وزن', 'poids', 'weight'])) {
    if (age == null) {
      return L(lang,
        `لم يُسجّل تاريخ وصول الكتاكيت لـ«${device.name}» — أضفه من تعديل الحظيرة ليحسب العمر والأهداف.`,
        `La date d’arrivée des poussins de « ${device.name} » n’est pas enregistrée — ajoutez-la en modifiant le poulailler.`,
        `“${device.name}” has no chick arrival date — add it by editing the coop to get age and targets.`);
    }
    let s = L(lang,
      `كتاكيت «${device.name}» في اليوم ${age}.`,
      `Les poussins de « ${device.name} » sont au jour ${age}.`,
      `“${device.name}” chicks are on day ${age}.`);
    if (device.strain) {
      const w = targetWeightAt(device.strain, age);
      if (w != null) {
        s += ' ' + L(lang,
          `الوزن المستهدف لسلالة ${strainLabel(device.strain)} في هذا العمر ~${w} غ.`,
          `Poids cible pour la souche ${strainLabel(device.strain)} à cet âge : ~${w} g.`,
          `Target weight for ${strainLabel(device.strain)} at this age: ~${w} g.`);
      }
    }
    return s;
  }
  // Last update / status / general "how is my flock"
  if (hasAny(q, ['اخر قراءه', 'اخر تحديث', 'derniere', 'last reading', 'last update', 'وضع', 'حاله', 'كيف', 'راهي', 'الدجاج', 'comment va', 'how is', 'etat', 'status', 'situation'])) {
    if (!r) return noData;
    const parts = [];
    if (typeof r.temp === 'number') parts.push(`${r.temp.toFixed(1)}°`);
    if (typeof r.hum === 'number') parts.push(`${Math.round(r.hum)}%`);
    if (typeof r.nh3 === 'number') parts.push(`NH₃ ${r.nh3.toFixed(1)}`);
    if (typeof r.co2 === 'number') parts.push(`CO₂ ${Math.round(r.co2)}`);
    if (typeof r.bat === 'number') parts.push(`🔋${Math.round(r.bat)}%`);
    return L(lang,
      `آخر قراءة من «${device.name}» (${fmtAgo(r.timestamp, lang)}): ${parts.join(' · ')}. التفاصيل الكاملة في بطاقة الحظيرة.`,
      `Dernière mesure de « ${device.name} » (${fmtAgo(r.timestamp, lang)}) : ${parts.join(' · ')}. Détails complets sur la carte du poulailler.`,
      `Latest from “${device.name}” (${fmtAgo(r.timestamp, lang)}): ${parts.join(' · ')}. Full details on the coop card.`);
  }
  // How many coops
  if (hasAny(q, ['كم حظيره', 'عدد الحظائر', 'combien de poulailler', 'how many coop'])) {
    return L(lang,
      `عندك ${devices.length} حظيرة مسجلة: ${devices.map((d) => d.name).join('، ')}.`,
      `Vous avez ${devices.length} poulailler(s) : ${devices.map((d) => d.name).join(', ')}.`,
      `You have ${devices.length} coop(s): ${devices.map((d) => d.name).join(', ')}.`);
  }

  return null;   // → FAQ matcher takes over
}
