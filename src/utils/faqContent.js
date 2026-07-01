// ════════════════════════════════════════════════════════════════
//  Filaha Flock — support knowledge base
//  Powers the in-app FAQ + support bot. Works fully OFFLINE (no server,
//  no API key): the bot keyword-matches the farmer's question against
//  these entries and returns the best answer in their language.
//
//  Each entry:
//    keywords : lowercase match terms (mix AR/FR/EN so any phrasing hits)
//    q/a      : { ar, fr, en } question + answer
// ════════════════════════════════════════════════════════════════

export const SUPPORT_CONTACT = {
  phone: '+213541787699',
  whatsapp: '213541787699',
  email: 'support@filahaflock.com',
};

export const FAQ = [
  {
    id: 'how-it-works',
    keywords: ['how', 'work', 'device', 'boitier', 'appareil', 'capteur', 'sensor', 'comment', 'كيف', 'الجهاز', 'يعمل', 'مستشعر'],
    q: {
      ar: 'كيف يعمل جهاز فلاحة فلوك؟',
      fr: 'Comment fonctionne le boîtier Filaha Flock ?',
      en: 'How does the Filaha Flock device work?',
    },
    a: {
      ar: 'يقيس الجهاز داخل الحظيرة درجة الحرارة والرطوبة وثاني أكسيد الكربون والأمونيا كل دقيقة، ويرسلها عبر الشبكة إلى الخادم. يعرض التطبيق هذه القراءات مباشرة. عند وجود خطر يتصل الجهاز ويرسل رسالة مباشرة إلى هاتفك.',
      fr: "Le boîtier mesure la température, l'humidité, le CO₂ et l'ammoniac dans le poulailler chaque minute et les envoie au serveur via le réseau. L'application affiche ces valeurs en direct. En cas de danger, le boîtier vous appelle et vous envoie un SMS directement.",
      en: 'The device measures temperature, humidity, CO₂ and ammonia inside the coop every minute and sends them to the server over the cellular network. The app shows these live. On danger, the device calls and texts your phone directly.',
    },
  },
  {
    id: 'offline',
    keywords: ['offline', 'hors ligne', 'no data', 'pas de donnee', 'disconnected', 'inactive', 'غير متصل', 'لا توجد بيانات', 'انقطع'],
    q: {
      ar: 'لماذا تظهر الحظيرة "غير متصلة"؟',
      fr: 'Pourquoi mon poulailler est-il « hors ligne » ?',
      en: 'Why is my coop showing "offline"?',
    },
    a: {
      ar: 'يعني أن الخادم لم يستقبل بيانات منذ فترة. الأسباب الشائعة: انقطاع الكهرباء عن الجهاز، أو ضعف إشارة الشبكة في مكان الحظيرة. تحقق من تغذية الجهاز بالطاقة ومن قوة الإشارة. هوائي خارجي يحسّن الإشارة كثيرًا.',
      fr: "Cela signifie que le serveur n'a pas reçu de données depuis un moment. Causes fréquentes : coupure de courant sur le boîtier, ou signal réseau faible à l'emplacement du poulailler. Vérifiez l'alimentation et le signal. Une antenne externe améliore beaucoup la réception.",
      en: "It means the server hasn't received data for a while. Common causes: power lost at the device, or weak cellular signal at the coop. Check the power and the signal. An external antenna improves reception a lot.",
    },
  },
  {
    id: 'battery',
    keywords: ['battery', 'batterie', 'power', 'courant', 'charge', 'بطارية', 'شحن', 'طاقة', 'كهرباء'],
    q: {
      ar: 'ماذا أفعل عند انخفاض البطارية أو انقطاع الكهرباء؟',
      fr: 'Que faire si la batterie est faible ou en cas de coupure de courant ?',
      en: 'What do I do about low battery or a power cut?',
    },
    a: {
      ar: 'يحتوي الجهاز على بطارية احتياطية ويرسل تنبيهًا عند انقطاع الكهرباء. أعد توصيل الطاقة في أقرب وقت. للمزارع ذات الكهرباء غير المستقرة، ننصح ببطارية أكبر أو لوح شمسي صغير.',
      fr: "Le boîtier a une batterie de secours et envoie une alerte en cas de coupure. Rebranchez l'alimentation dès que possible. Pour les fermes à courant instable, prévoyez une batterie plus grande ou un petit panneau solaire.",
      en: 'The device has a backup battery and sends an alert on a power cut. Reconnect power as soon as you can. For farms with unstable power, add a bigger battery or a small solar panel.',
    },
  },
  {
    id: 'add-coop',
    keywords: ['add', 'ajouter', 'new coop', 'nouveau', 'device id', 'اضافة', 'اضف', 'حظيرة جديدة', 'معرف'],
    q: {
      ar: 'كيف أضيف حظيرة جديدة؟',
      fr: 'Comment ajouter un nouveau poulailler ?',
      en: 'How do I add a new coop?',
    },
    a: {
      ar: 'اضغط زر "＋" في الشاشة الرئيسية، ثم أدخل معرّف الجهاز (المكتوب على الجهاز، مثل DEV01) واسم الحظيرة. ستظهر القراءات خلال دقيقة إذا كان الجهاز يعمل.',
      fr: 'Appuyez sur le bouton « ＋ » sur l\'écran principal, puis saisissez l\'identifiant du boîtier (inscrit dessus, ex. DEV01) et le nom du poulailler. Les valeurs apparaissent en une minute si le boîtier est allumé.',
      en: 'Tap the "＋" button on the main screen, then enter the device ID (printed on the device, e.g. DEV01) and a coop name. Readings appear within a minute if the device is on.',
    },
  },
  {
    id: 'alerts-meaning',
    keywords: ['alert', 'alerte', 'danger', 'co2', 'ammonia', 'ammoniac', 'nh3', 'temperature', 'humidity', 'humidite', 'تنبيه', 'خطر', 'أمونيا', 'حرارة', 'رطوبة'],
    q: {
      ar: 'ماذا تعني التنبيهات (CO₂ / أمونيا / حرارة / رطوبة)؟',
      fr: 'Que signifient les alertes (CO₂ / ammoniac / température / humidité) ?',
      en: 'What do the alerts mean (CO₂ / ammonia / temperature / humidity)?',
    },
    a: {
      ar: 'كل تنبيه يعني تجاوز أحد المؤشرات للحد الآمن: ثاني أكسيد الكربون أو الأمونيا مرتفع (تهوية غير كافية)، أو حرارة/رطوبة خطرة على الطيور. افتح بطاقة الحظيرة لرؤية القيمة والإجراء المقترح. البطاقة الحمراء = خطر، البرتقالية = تحذير.',
      fr: "Chaque alerte signale qu'une mesure a dépassé le seuil sûr : CO₂ ou ammoniac élevé (ventilation insuffisante), ou température/humidité dangereuse pour les oiseaux. Ouvrez la carte du poulailler pour voir la valeur et l'action conseillée. Carte rouge = danger, orange = avertissement.",
      en: 'Each alert means a reading crossed the safe threshold: high CO₂ or ammonia (not enough ventilation), or dangerous temperature/humidity for the birds. Open the coop card for the value and the suggested action. Red card = danger, orange = warning.',
    },
  },
  {
    id: 'notifications',
    keywords: ['notification', 'notif', 'not receiving', 'ne recois pas', 'aucune notification', 'اشعار', 'اشعارات', 'لا تصل', 'تنبيهات الهاتف'],
    q: {
      ar: 'لا تصلني إشعارات على الهاتف، ماذا أفعل؟',
      fr: 'Je ne reçois pas de notifications, que faire ?',
      en: "I'm not getting phone notifications, what do I do?",
    },
    a: {
      ar: 'تأكد من السماح للتطبيق بإرسال الإشعارات: الإعدادات ← الأذونات ← الإشعارات. تأكد أيضًا من عدم تفعيل توفير الطاقة الذي يوقف التطبيق. التنبيهات الحرجة تصلك أيضًا كاتصال ورسالة من الجهاز مباشرة.',
      fr: "Vérifiez que l'application est autorisée à envoyer des notifications : Réglages ← Autorisations ← Notifications. Vérifiez aussi qu'aucun mode économie d'énergie ne bloque l'app. Les alertes critiques vous parviennent aussi par appel et SMS directement du boîtier.",
      en: 'Make sure the app is allowed to send notifications: Settings → Permissions → Notifications. Also check that battery-saver isn\'t killing the app. Critical alerts also reach you as a call and SMS straight from the device.',
    },
  },
  {
    id: 'language-theme',
    keywords: ['language', 'langue', 'arabic', 'french', 'theme', 'dark', 'light', 'sombre', 'clair', 'لغة', 'العربية', 'الوضع', 'الليلي'],
    q: {
      ar: 'كيف أغيّر اللغة أو المظهر؟',
      fr: 'Comment changer la langue ou le thème ?',
      en: 'How do I change the language or theme?',
    },
    a: {
      ar: 'من الإعدادات يمكنك اختيار العربية أو الفرنسية أو الإنجليزية، وتبديل المظهر بين الفاتح والداكن.',
      fr: 'Dans Réglages, vous pouvez choisir l\'arabe, le français ou l\'anglais, et basculer le thème entre clair et sombre.',
      en: 'In Settings you can choose Arabic, French or English, and switch the theme between light and dark.',
    },
  },
  {
    id: 'device-call',
    keywords: ['call', 'appel', 'sms', 'message', 'sonne', 'ring', 'emergency', 'urgence', 'اتصال', 'مكالمة', 'رسالة', 'طوارئ'],
    q: {
      ar: 'هل يتصل الجهاز بي عند الطوارئ حتى بدون إنترنت؟',
      fr: "Le boîtier m'appelle-t-il en cas d'urgence même sans Internet ?",
      en: 'Does the device call me in an emergency even without internet?',
    },
    a: {
      ar: 'نعم. عند خطر حقيقي يرسل الجهاز رسالة نصية ويتصل بهاتفك مباشرة عبر شبكة الهاتف — لا يحتاج إنترنت ولا الخادم. هذا خط النجاة حتى في المزارع النائية.',
      fr: "Oui. En cas de danger réel, le boîtier envoie un SMS et appelle votre téléphone directement via le réseau mobile — sans Internet ni serveur. C'est la bouée de secours même dans les fermes isolées.",
      en: 'Yes. On real danger the device sends an SMS and calls your phone directly over the mobile network — no internet or server needed. That is the lifeline even on remote farms.',
    },
  },
  {
    id: 'update',
    keywords: ['update', 'mise a jour', 'version', 'nouvelle version', 'تحديث', 'اصدار'],
    q: {
      ar: 'كيف أحدّث التطبيق؟',
      fr: "Comment mettre à jour l'application ?",
      en: 'How do I update the app?',
    },
    a: {
      ar: 'يتحقق التطبيق تلقائيًا من التحديثات ويعرض لك زر التحديث عند توفره. يمكنك أيضًا التحقق يدويًا من الإعدادات.',
      fr: "L'application vérifie les mises à jour automatiquement et affiche un bouton quand une nouvelle version est prête. Vous pouvez aussi vérifier manuellement dans Réglages.",
      en: 'The app checks for updates automatically and shows an update button when a new version is ready. You can also check manually from Settings.',
    },
  },
];

// ── Simple offline matcher ──────────────────────────────────────────
// Scores each FAQ entry by how many of its keywords appear in the query.
// Returns the best entry (or null if nothing meaningful matched).
export function matchFaq(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.toLowerCase().trim();
  if (!q) return null;
  let best = null;
  let bestScore = 0;
  for (const entry of FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (kw.length >= 2 && q.includes(kw)) score += kw.length >= 4 ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore >= 1 ? best : null;
}
