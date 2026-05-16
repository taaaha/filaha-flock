/**
 * Action steps shown in notifications + SMS when a sensor goes critical.
 * Written for Algerian poultry farmers — practical, immediate, no jargon.
 */

export const ACTION_STEPS = {
  co2: {
    ar: 'افتح كل النوافذ فوراً، شغّل المراوح، وتأكّد من مجاري التهوية',
    en: 'Open all vents NOW. Turn on fans. Check ventilation ducts.',
    fr: 'Ouvrir tous les évents IMMÉDIATEMENT. Démarrer ventilateurs.',
  },
  nh3: {
    ar: 'افتح النوافذ، غيّر الفرشة الرطبة، قلّل عدد الدجاج إذا أمكن',
    en: 'Open vents. Replace wet litter. Reduce density if possible.',
    fr: 'Ouvrir évents. Remplacer la litière humide. Réduire la densité.',
  },
  temp: {
    ar: 'الحرارة مرتفعة: رشّ السقف بالماء، شغّل المراوح، أضف إلكتروليت لماء الشرب',
    en: 'Temp HIGH: spray roof with water, run fans, add electrolytes to drinking water.',
    fr: "Temp élevée: asperger le toit, ventilateurs, électrolytes dans l'eau.",
  },
  temp_low: {
    ar: 'الحرارة منخفضة: شغّل التدفئة، أغلق الأبواب، وتفقّد الصيصان جيداً',
    en: 'Temp LOW: turn on heating, close doors, check young chicks for hypothermia.',
    fr: 'Temp basse: chauffage, fermer portes, vérifier les jeunes poussins.',
  },
  hum: {
    ar: 'الرطوبة عالية: زِد التهوية، تأكّد من عدم تسرّب الماء، وجفّف الفرشة',
    en: 'Humidity HIGH: increase ventilation, check for water leaks, dry the litter.',
    fr: "Humidité élevée: ventilation, vérifier fuites d'eau, sécher la litière.",
  },
  power_cut: {
    ar: '⚡ انقطعت الكهرباء! شغّل المولّد فوراً وراقب الحرارة — الدجاج في خطر',
    en: '⚡ POWER CUT! Start generator NOW. Watch temperature. Flock at risk.',
    fr: '⚡ COUPURE! Démarrer le générateur. Surveiller la température.',
  },
  battery: {
    ar: 'بطارية الجهاز ضعيفة، غيّرها قريباً قبل أن ينقطع الاتصال',
    en: 'Sensor battery low — replace soon before connection drops.',
    fr: 'Batterie capteur faible — remplacer bientôt.',
  },
  generic: {
    ar: 'افحص الحظيرة فوراً وتأكّد من سلامة الدجاج',
    en: 'Check the coop immediately and verify your birds.',
    fr: 'Vérifier le poulailler immédiatement.',
  },
};

export function actionFor(sensorKey, lang = 'en') {
  const k = (sensorKey || 'generic').toLowerCase();
  const map = ACTION_STEPS[k] || ACTION_STEPS.generic;
  return map[lang] || map.en;
}
