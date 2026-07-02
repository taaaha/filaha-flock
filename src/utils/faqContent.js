// ════════════════════════════════════════════════════════════════
//  Filaha Flock — support knowledge base + offline matcher
//
//  Fully OFFLINE (no server, no API key): normalizes the farmer's
//  question (Arabic diacritics/alef forms, French accents), detects
//  the language THEY wrote in, scores every entry by keyword and
//  question-text overlap, and answers in their language. When unsure
//  it returns the closest questions as suggestions.
// ════════════════════════════════════════════════════════════════

export const SUPPORT_CONTACT = {
  phone: '+213541787699',
  whatsapp: '213541787699',
  email: 'support@filahaflock.com',
};

// ── Normalization ───────────────────────────────────────────────────
const AR_DIACRITICS = /[ً-ْٰـ]/g;
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(AR_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Language detection (answer in the language the user typed) ──────
const FR_HINTS = new Set(['le','la','les','un','une','des','est','ne','pas','je','mon','ma','mes','pourquoi','comment','que','quoi','qui','ou','avec','pour','dans','sur','il','elle','ca','cette','faire','marche','probleme','appli','application','poulailler','batterie','capteur','alerte','notification','temperature','aide','bonjour','salut','merci']);
const EN_HINTS = new Set(['the','is','are','my','how','why','what','not','no','can','do','does','it','i','to','of','in','on','with','app','device','battery','sensor','alert','help','hello','hi','thanks','working','problem','coop','temperature','notification']);
export function detectLang(query, fallback = 'ar') {
  const raw = String(query || '');
  if (/[؀-ۿ]/.test(raw)) return 'ar';
  const tokens = normalize(raw).split(' ').filter(Boolean);
  let fr = 0; let en = 0;
  for (const t of tokens) {
    if (FR_HINTS.has(t)) fr++;
    if (EN_HINTS.has(t)) en++;
  }
  if (fr === 0 && en === 0) return fallback === 'ar' ? 'ar' : fallback;
  return fr >= en ? 'fr' : 'en';
}

// ── Knowledge base ──────────────────────────────────────────────────
export const FAQ = [
  {
    id: 'how-it-works',
    keywords: ['work', 'works', 'device', 'boitier', 'appareil', 'capteur', 'sensor', 'comment', 'fonctionne', 'كيف', 'الجهاز', 'يعمل', 'مستشعر', 'يشتغل'],
    q: {
      ar: 'كيف يعمل جهاز فلاحة فلوك؟',
      fr: 'Comment fonctionne le boîtier Filaha Flock ?',
      en: 'How does the Filaha Flock device work?',
    },
    a: {
      ar: 'يقيس الجهاز داخل الحظيرة الحرارة والرطوبة وCO₂ والأمونيا كل دقيقة ويرسلها عبر شبكة الهاتف إلى الخادم، فيعرضها التطبيق مباشرة. وعند خطر حقيقي يتصل بك الجهاز ويرسل SMS مباشرة دون حاجة للإنترنت.',
      fr: "Le boîtier mesure chaque minute la température, l'humidité, le CO₂ et l'ammoniac, et les envoie au serveur via le réseau mobile ; l'application les affiche en direct. En cas de danger réel, le boîtier vous appelle et vous envoie un SMS directement, sans Internet.",
      en: 'The device measures temperature, humidity, CO₂ and ammonia every minute and sends them to the server over the mobile network; the app shows them live. On real danger the device calls and texts you directly, no internet needed.',
    },
  },
  {
    id: 'offline',
    keywords: ['offline', 'hors ligne', 'deconnecte', 'no data', 'pas de donnee', 'donnees', 'inactive', 'disparu', 'غير متصل', 'لا توجد بيانات', 'انقطع', 'مقطوع', 'وينراه'],
    q: {
      ar: 'لماذا تظهر الحظيرة "غير متصلة"؟',
      fr: 'Pourquoi mon poulailler est « hors ligne » ?',
      en: 'Why is my coop showing "offline"?',
    },
    a: {
      ar: 'يعني أن الخادم لم يستقبل بيانات منذ فترة. الأسباب الشائعة: انقطاع الكهرباء عن الجهاز، أو ضعف إشارة الشبكة. تحقق من الطاقة والإشارة في مكان الحظيرة — هوائي خارجي مثبت عاليًا يحسّن الاستقبال كثيرًا. عندما يعود الجهاز سترى البيانات تلقائيًا.',
      fr: "Le serveur n'a pas reçu de données depuis un moment. Causes fréquentes : coupure de courant sur le boîtier ou signal réseau faible. Vérifiez l'alimentation et le signal — une antenne externe placée en hauteur améliore beaucoup la réception. Dès que le boîtier revient, les données réapparaissent automatiquement.",
      en: "The server hasn't received data for a while. Common causes: power lost at the device or weak network signal. Check power and signal — an external antenna mounted high improves reception a lot. Data reappears automatically when the device comes back.",
    },
  },
  {
    id: 'battery',
    keywords: ['battery', 'batterie', 'power', 'courant', 'coupure', 'charge', 'solaire', 'بطاريه', 'شحن', 'طاقه', 'كهرباء', 'انقطاع'],
    q: {
      ar: 'البطارية منخفضة أو انقطعت الكهرباء، ماذا أفعل؟',
      fr: 'Batterie faible ou coupure de courant, que faire ?',
      en: 'Low battery or a power cut, what do I do?',
    },
    a: {
      ar: 'الجهاز فيه بطارية احتياطية ويُرسل تنبيهًا عند انقطاع الكهرباء، فيواصل العمل لساعات. أعد التيار في أقرب وقت. إذا كانت الكهرباء غير مستقرة في مزرعتك ننصح ببطارية أكبر أو لوح شمسي صغير — تواصل معنا لتركيبه.',
      fr: "Le boîtier a une batterie de secours et vous alerte dès la coupure ; il continue plusieurs heures. Rebranchez le courant dès que possible. Si votre ferme a un courant instable, prévoyez une batterie plus grande ou un petit panneau solaire — contactez-nous pour l'installation.",
      en: 'The device has a backup battery and alerts you the moment power is cut; it keeps running for hours. Restore power as soon as you can. If your farm has unstable power, consider a bigger battery or a small solar panel — contact us to set it up.',
    },
  },
  {
    id: 'add-coop',
    keywords: ['add', 'ajouter', 'new', 'nouveau', 'id', 'identifiant', 'dev01', 'اضافه', 'اضف', 'جديده', 'معرف', 'نضيف'],
    q: {
      ar: 'كيف أضيف حظيرة جديدة؟',
      fr: 'Comment ajouter un nouveau poulailler ?',
      en: 'How do I add a new coop?',
    },
    a: {
      ar: 'اضغط زر "＋" في الشاشة الرئيسية، أدخل معرّف الجهاز (مكتوب على الجهاز، مثل DEV01) واسم الحظيرة. إذا كان الجهاز يعمل ستظهر القراءات خلال دقيقة.',
      fr: "Appuyez sur « ＋ » sur l'écran principal, saisissez l'identifiant du boîtier (inscrit dessus, ex. DEV01) et le nom du poulailler. Si le boîtier est allumé, les valeurs apparaissent en une minute.",
      en: 'Tap "＋" on the main screen, enter the device ID (printed on the device, e.g. DEV01) and a coop name. If the device is on, readings appear within a minute.',
    },
  },
  {
    id: 'remove-coop',
    keywords: ['delete', 'remove', 'supprimer', 'effacer', 'retirer', 'حذف', 'امسح', 'ازاله', 'نحي'],
    q: {
      ar: 'كيف أحذف حظيرة؟',
      fr: 'Comment supprimer un poulailler ?',
      en: 'How do I remove a coop?',
    },
    a: {
      ar: 'افتح بطاقة الحظيرة من الشاشة الرئيسية، ثم من أعلى الشاشة اختر التعديل واحذفها. سجلّ التنبيهات الخاص بها يُحذف معها.',
      fr: "Ouvrez la carte du poulailler depuis l'écran principal, puis via l'édition en haut de l'écran, supprimez-le. Son historique d'alertes est supprimé avec.",
      en: "Open the coop's card from the main screen, then use edit at the top of the screen to delete it. Its alert history is removed with it.",
    },
  },
  {
    id: 'alerts-meaning',
    keywords: ['alert', 'alerte', 'danger', 'red', 'rouge', 'co2', 'ammonia', 'ammoniac', 'nh3', 'تنبيه', 'خطر', 'احمر', 'أمونيا', 'انذار'],
    q: {
      ar: 'ماذا تعني التنبيهات والألوان (أحمر/برتقالي)؟',
      fr: 'Que signifient les alertes et les couleurs (rouge/orange) ?',
      en: 'What do the alerts and colors mean (red/orange)?',
    },
    a: {
      ar: 'أحمر = خطر: قيمة تجاوزت الحد الخطير (مثل أمونيا مرتفعة أو حرارة قاتلة) — تصرّف فورًا. برتقالي = تحذير: القيمة تقترب من الخطر. أخضر = كل شيء سليم. افتح بطاقة الحظيرة لرؤية القيمة بالضبط والإجراء المقترح.',
      fr: "Rouge = danger : une valeur a dépassé le seuil critique (ammoniac élevé, chaleur mortelle…) — agissez immédiatement. Orange = avertissement : la valeur s'approche du danger. Vert = tout va bien. Ouvrez la carte du poulailler pour la valeur exacte et l'action conseillée.",
      en: 'Red = danger: a value crossed the critical threshold (high ammonia, lethal heat…) — act immediately. Orange = warning: the value is approaching danger. Green = all good. Open the coop card for the exact value and suggested action.',
    },
  },
  {
    id: 'thresholds',
    keywords: ['threshold', 'seuil', 'limit', 'limite', 'change', 'modifier', 'régler', 'regler', 'حد', 'حدود', 'عتبه', 'تعديل', 'اضبط'],
    q: {
      ar: 'كيف أغيّر حدود التنبيه (العتبات)؟',
      fr: "Comment modifier les seuils d'alerte ?",
      en: 'How do I change the alert thresholds?',
    },
    a: {
      ar: 'من الإعدادات ستجد شريط تمرير لكل مؤشر (CO₂، أمونيا، حرارة، رطوبة). القيم الافتراضية مدروسة لدواجن الجزائر، لكن يمكنك تعديلها حسب عمر الكتاكيت وفصل السنة.',
      fr: "Dans Réglages, un curseur existe pour chaque mesure (CO₂, ammoniac, température, humidité). Les valeurs par défaut sont adaptées à l'aviculture algérienne, mais ajustez-les selon l'âge des poussins et la saison.",
      en: 'In Settings there is a slider for each metric (CO₂, ammonia, temperature, humidity). The defaults are tuned for Algerian poultry, but adjust them by chick age and season.',
    },
  },
  {
    id: 'heat-stress',
    keywords: ['heat', 'stress', 'thi', 'chaleur', 'canicule', 'thermique', 'حراري', 'اجهاد', 'حر', 'قيظ'],
    q: {
      ar: 'ما هو الإجهاد الحراري (THI)؟',
      fr: "C'est quoi le stress thermique (THI) ?",
      en: 'What is heat stress (THI)?',
    },
    a: {
      ar: 'الإجهاد الحراري يجمع الحرارة + الرطوبة معًا: حرارة 30° مع رطوبة عالية قد تكون قاتلة حتى لو بدت الحرارة وحدها مقبولة. التطبيق يحسب مؤشر THI تلقائيًا وينبّهك عند الخطر. الحل السريع: تهوية قوية، ماء بارد، وتقليل الكثافة.',
      fr: "Le stress thermique combine chaleur + humidité : 30° avec une forte humidité peut être mortel même si la température seule paraît acceptable. L'application calcule l'indice THI automatiquement et vous alerte. Réflexes : ventilation forte, eau fraîche, réduire la densité.",
      en: 'Heat stress combines heat + humidity: 30° with high humidity can be lethal even when temperature alone looks fine. The app computes the THI index automatically and alerts you. Quick actions: strong ventilation, cool water, lower density.',
    },
  },
  {
    id: 'notifications',
    keywords: ['notification', 'notif', 'recois', 'reçois', 'receiving', 'push', 'اشعار', 'اشعارات', 'لا تصل', 'ما يوصل', 'توصل'],
    q: {
      ar: 'لا تصلني إشعارات على الهاتف، ماذا أفعل؟',
      fr: 'Je ne reçois pas de notifications, que faire ?',
      en: "I'm not getting notifications, what do I do?",
    },
    a: {
      ar: '1) الإعدادات ← الأذونات ← فعّل الإشعارات. 2) فعّل "تجاهل تحسين البطارية" حتى لا يوقف الهاتف التطبيق. 3) تأكد أن التطبيق محدث لآخر نسخة. ملاحظة مهمة: تنبيهات الخطر الحقيقية تصلك أيضًا كاتصال ورسالة SMS من الجهاز نفسه حتى لو أُغلق التطبيق.',
      fr: "1) Réglages ← Autorisations ← activez les notifications. 2) Activez « ignorer l'optimisation batterie » pour que le téléphone ne tue pas l'app. 3) Vérifiez que l'app est à jour. Important : les dangers réels vous parviennent AUSSI par appel et SMS du boîtier lui-même, même app fermée.",
      en: "1) Settings → Permissions → enable notifications. 2) Enable 'ignore battery optimization' so the phone doesn't kill the app. 3) Make sure the app is updated. Important: real dangers ALSO reach you as a call and SMS from the device itself, even with the app closed.",
    },
  },
  {
    id: 'device-call',
    keywords: ['call', 'appel', 'appelle', 'sms', 'message', 'sonne', 'ring', 'urgence', 'emergency', 'internet', 'اتصال', 'مكالمه', 'رساله', 'يتصل', 'طوارئ'],
    q: {
      ar: 'هل يتصل بي الجهاز عند الخطر حتى بدون إنترنت؟',
      fr: "Le boîtier m'appelle-t-il même sans Internet ?",
      en: 'Does the device call me even without internet?',
    },
    a: {
      ar: 'نعم — هذا أهم ما يميز فلاحة فلوك. عند خطر حقيقي يرسل الجهاز SMS ويتصل بهاتفك مباشرة عبر شبكة الهاتف، دون إنترنت ودون خادم. حتى في أعمق الأرياف، إذا كانت هناك إشارة هاتف فالتنبيه سيصلك.',
      fr: "Oui — c'est la force de Filaha Flock. En cas de danger réel, le boîtier envoie un SMS et appelle votre téléphone directement par le réseau mobile, sans Internet ni serveur. Même en zone très rurale, s'il y a du signal téléphonique, l'alerte vous parvient.",
      en: "Yes — that's Filaha Flock's core strength. On real danger the device sends an SMS and calls your phone directly over the mobile network, no internet or server needed. Even deep in the countryside, if there's phone signal, the alert reaches you.",
    },
  },
  {
    id: 'data-freq',
    keywords: ['often', 'frequence', 'fréquence', 'minute', 'update', 'refresh', 'actualise', 'تحديث', 'كل قداش', 'دقيقه', 'وقتاش', 'مده'],
    q: {
      ar: 'كل كم دقيقة تتحدث البيانات؟',
      fr: 'Les données se mettent à jour tous les combien ?',
      en: 'How often does the data update?',
    },
    a: {
      ar: 'يرسل الجهاز قراءة كل دقيقة تقريبًا، ويحدّث التطبيق الشاشة كل 30 ثانية. إذا كانت إشارة الشبكة ضعيفة قد تتأخر بعض القراءات قليلًا — وهذا طبيعي ولا يفوّت أي تنبيه خطر (التنبيهات تمر عبر SMS المباشر).',
      fr: "Le boîtier envoie une mesure environ chaque minute, et l'application rafraîchit toutes les 30 secondes. Avec un signal faible, certaines mesures peuvent arriver en retard — c'est normal et aucun danger n'est raté (les alertes passent par SMS direct).",
      en: 'The device sends a reading about every minute, and the app refreshes every 30 seconds. On weak signal some readings may lag a little — that is normal and no danger is missed (alerts go via direct SMS).',
    },
  },
  {
    id: 'buttons',
    keywords: ['button', 'bouton', 'test', 'mute', 'silence', 'reset', 'redemarrer', 'زر', 'ازرار', 'اختبار', 'كتم', 'صفير', 'بوتون'],
    q: {
      ar: 'ما وظيفة الأزرار على الجهاز؟',
      fr: 'À quoi servent les boutons du boîtier ?',
      en: 'What do the buttons on the device do?',
    },
    a: {
      ar: 'الأحمر: اختبار — يرسل تنبيه تجريبي لهاتفك للتأكد أن كل شيء يعمل. الأزرق: كتم صوت الصفارة 10 دقائق. الأبيض (ضغطة طويلة): إطفاء الجهاز. الأخضر: إعادة تشغيل.',
      fr: 'Rouge : test — envoie une alerte de test sur votre téléphone pour vérifier que tout marche. Bleu : silence du buzzer 10 minutes. Blanc (appui long) : éteindre. Vert : redémarrer.',
      en: 'Red: test — sends a test alert to your phone to confirm everything works. Blue: mutes the buzzer for 10 minutes. White (long press): power off. Green: restart.',
    },
  },
  {
    id: 'wrong-readings',
    keywords: ['wrong', 'incorrect', 'faux', 'fausses', 'bizarre', 'calibration', 'etalonnage', 'خاطئه', 'غلط', 'قيم', 'قراءات', 'مش صحيحه'],
    q: {
      ar: 'القراءات تبدو غير صحيحة، ما الحل؟',
      fr: 'Les valeurs semblent fausses, que faire ?',
      en: 'The readings look wrong, what should I do?',
    },
    a: {
      ar: '1) تأكد أن المستشعر ليس قرب باب أو مروحة أو مصدر حرارة مباشر — يجب أن يكون في وسط الحظيرة على ارتفاع الطيور. 2) امسح الغبار عنه بلطف. 3) أعد تشغيل الجهاز (الزر الأخضر). إذا استمرت المشكلة تواصل معنا — قد يحتاج المستشعر معايرة أو استبدالًا.',
      fr: "1) Vérifiez que le capteur n'est pas près d'une porte, d'un ventilateur ou d'une source de chaleur — il doit être au centre du poulailler, à hauteur des oiseaux. 2) Dépoussiérez-le doucement. 3) Redémarrez le boîtier (bouton vert). Si le problème persiste, contactez-nous — le capteur peut nécessiter un étalonnage ou un remplacement.",
      en: "1) Make sure the sensor isn't near a door, fan or direct heat source — it should sit mid-coop at bird height. 2) Gently dust it off. 3) Restart the device (green button). If it persists, contact us — the sensor may need calibration or replacement.",
    },
  },
  {
    id: 'language-theme',
    keywords: ['language', 'langue', 'arabic', 'arabe', 'francais', 'theme', 'dark', 'sombre', 'mode', 'لغه', 'العربيه', 'فرنسيه', 'مظهر', 'داكن', 'ليلي'],
    q: {
      ar: 'كيف أغيّر اللغة أو المظهر الليلي؟',
      fr: 'Comment changer la langue ou le mode sombre ?',
      en: 'How do I change the language or dark mode?',
    },
    a: {
      ar: 'من الإعدادات: اختر العربية أو الفرنسية أو الإنجليزية، وبدّل بين المظهر الفاتح والداكن. يعاد تشغيل التطبيق تلقائيًا عند تغيير اتجاه اللغة.',
      fr: "Dans Réglages : choisissez arabe, français ou anglais, et basculez entre thème clair et sombre. L'app redémarre automatiquement quand le sens d'écriture change.",
      en: 'In Settings: choose Arabic, French or English, and switch between light and dark theme. The app restarts automatically when the writing direction changes.',
    },
  },
  {
    id: 'update',
    keywords: ['update', 'mise a jour', 'maj', 'version', 'nouvelle', 'تحديث', 'اصدار', 'نسخه', 'جديد'],
    q: {
      ar: 'كيف أحدّث التطبيق؟',
      fr: "Comment mettre à jour l'application ?",
      en: 'How do I update the app?',
    },
    a: {
      ar: 'يتحقق التطبيق تلقائيًا ويعرض زر التحديث عند توفر نسخة جديدة — اضغط عليه فقط. يمكنك أيضًا التحقق يدويًا من أسفل صفحة الإعدادات.',
      fr: "L'app vérifie automatiquement et affiche un bouton quand une nouvelle version est prête — appuyez simplement dessus. Vous pouvez aussi vérifier manuellement en bas des Réglages.",
      en: 'The app checks automatically and shows an update button when a new version is ready — just tap it. You can also check manually at the bottom of Settings.',
    },
  },
  {
    id: 'buy-device',
    keywords: ['buy', 'price', 'prix', 'acheter', 'commander', 'cout', 'coût', 'abonnement', 'subscription', 'شراء', 'سعر', 'ثمن', 'اشتراك', 'نشري'],
    q: {
      ar: 'كيف أشتري جهازًا آخر؟ وما هو الاشتراك؟',
      fr: 'Comment acheter un autre boîtier ? Et l’abonnement ?',
      en: 'How do I buy another device? What about the subscription?',
    },
    a: {
      ar: 'تواصل معنا مباشرة (هاتف أو واتساب بالأعلى) لطلب جهاز إضافي — نركّبه ونفعّله لك. الاشتراك الشهري يغطي شريحة الاتصال والخادم والتنبيهات والدعم.',
      fr: "Contactez-nous directement (téléphone ou WhatsApp en haut) pour commander un boîtier supplémentaire — nous l'installons et l'activons pour vous. L'abonnement mensuel couvre la carte SIM, le serveur, les alertes et le support.",
      en: 'Contact us directly (phone or WhatsApp at the top) to order another device — we install and activate it for you. The monthly subscription covers the SIM, the server, alerts and support.',
    },
  },
];

// ── Matcher ─────────────────────────────────────────────────────────
// Scores each entry by (a) keyword hits and (b) token overlap with the
// entry's question text in all three languages. Returns:
//   { entry, score, suggestions: [next-best entries] }
export function matchFaq(query) {
  const nq = normalize(query);
  if (!nq) return { entry: null, suggestions: [] };
  const qTokens = new Set(nq.split(' ').filter((t) => t.length >= 2));

  const scored = FAQ.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      const nkw = normalize(kw);
      if (!nkw) continue;
      if (nq.includes(nkw)) score += nkw.length >= 4 ? 3 : 2;
    }
    for (const lang of ['ar', 'fr', 'en']) {
      const qt = normalize(entry.q[lang]).split(' ');
      for (const t of qt) {
        if (t.length >= 3 && qTokens.has(t)) score += 1;
      }
    }
    return { entry, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const confident = best && best.score >= 3;
  return {
    entry: confident ? best.entry : null,
    suggestions: scored.slice(0, 3).filter((s) => s.score > 0).map((s) => s.entry),
  };
}
