// Builds the three client-guide HTML files (en / fr / ar).
// Printing to PDF is done separately with a headless browser, because it shapes
// Arabic correctly and lays the page out right-to-left.
//
//   node generate.js            -> build/guide-{en,fr,ar}.html
//
// Every number and behaviour below comes from firmware/src/config.h, main.cpp
// and firmware/HARDWARE.md. If the firmware changes, change it here too.

const fs = require("fs");
const path = require("path");

const PHONE = "+213 541 78 76 99";
const EMAIL = "support@filahaflock.com";
const WEB   = "filahaflock.com";

// ─────────────────────────────────────────────────────────────────
//  CONTENT
// ─────────────────────────────────────────────────────────────────
const C = {};

// ═════════════════════════════ ENGLISH ═════════════════════════════
C.en = {
  lang: "en", dir: "ltr",
  docKind: "Client guide", edition: "Version 1 · October 2026", page: "Page",
  title: "How Filaha Flock works, and how to get the most from it",
  forWho: "For poultry farmers in Algeria",

  intro: [
    "Filaha Flock watches the air in your poultry house day and night. A sealed box fixed to the wall measures temperature, humidity, carbon dioxide (CO₂) and ammonia (NH₃), and keeps an eye on the mains power. When something becomes dangerous it does not wait for you to open an app: it sounds a buzzer in the house, sends you an SMS and rings your phone.",
    "It does this over the mobile network, so it works with no internet on the farm, and it keeps working through a power cut on its own battery.",
  ],
  alertH: "When danger appears",
  steps: [
    "A buzzer sounds inside the house.",
    "An SMS reaches your phone, in plain words, with the problem and the value.",
    "Your phone rings. Everything is retried until it gets through.",
  ],
  notH: "What it does not do",
  notP: "Filaha Flock monitors and warns. It does not switch fans, heaters or feeders on or off, and it does not replace a veterinarian or good ventilation. The decision, and the action, stay with you.",

  recvH: "What you receive",
  recv: [
    ["The box", "A sealed unit that mounts on the wall. Inside: sensors for temperature, humidity, CO₂ and NH₃, a screen showing the live values, a buzzer, four buttons, a backup battery, a SIM card and an antenna."],
    ["Installation", "Our team mounts the box, places the sensors at bird height, connects the power and the antenna, registers your alert phone number and sets up the app on your phone."],
    ["The app", "In Arabic, French or English. Live values for each house, history and reports."],
    ["Warranty and support", "Included with the box. You can reach us by phone and WhatsApp, in Arabic or French."],
  ],
  needH: "What we need from you",
  need: [
    "A mains socket within reach of the box.",
    "Mobile coverage at the spot. We check the signal when we install, and tell you if an outdoor antenna is needed.",
    "A SIM with an active plan. The box uses it for data, SMS and calls; the record on the last page notes who looks after the plan.",
    "A phone number that answers. Alerts go to the number we register, so tell us if it changes.",
  ],

  watchH: "How it watches, and when it warns you",
  cadence: "About every 15 seconds the box takes its readings and sends them to our servers. A warning is raised only when a value stays in the danger zone for two readings in a row, about 30 seconds, so one stray spike never wakes you. Warnings are spaced at least 10 minutes apart.",
  tHead: ["Measurement", "Warning when", "Why it matters"],
  tRows: [
    ["Temperature", "38 °C or above, or 12 °C or below", "Heat stress and chilling hit the flock within hours."],
    ["Humidity", "85 % or above, or 25 % or below", "Wet litter breeds disease; dry air raises dust."],
    ["CO₂", "2,500 ppm or above", "Ventilation is no longer keeping up with the birds."],
    ["Ammonia (NH₃)", "35 ppm or above", "It burns the airways long before you can smell it."],
    ["Mains power", "The power is cut", "The house is running on the box's battery."],
  ],
  tNote: "These are fixed emergency limits built into the box, the same at every age. Guidance that follows the age of your flock is in the app: see the next page.",

  reachH: "What reaches you",
  reach: [
    ["Buzzer", "Sounds in the house so anyone working there knows at once. The blue button silences it for 10 minutes."],
    ["SMS", "A short message in Arabic or French, written to be read in a few seconds."],
    ["Phone call", "Your phone rings for about 20 seconds. Answer or not: the SMS has the details."],
  ],
  retry: "If the mobile network is down at that moment, the message waits and is retried for about 15 minutes until it goes through.",
  moreH: [
    ["A power cut", "You get the same buzzer, SMS and call, and the box carries on measuring from its battery. When the mains returns you receive a confirmation SMS, roughly a minute later on purpose, so that it is never sent by mistake."],
    ["The evening report", "Every evening at 8 pm the box sends one SMS with the latest readings."],
    ["If the connection drops", "The box keeps measuring and stores readings for about 15 minutes, sending them when the link returns. If our servers stay silent for about 30 minutes it restarts itself. Your SMS and call alerts do not depend on the app or on internet."],
  ],

  dayH: "Using it every day",
  screenP: "The screen on the box shows the current readings, so you can check the house without taking out your phone.",
  bHead: ["Button", "What it does"],
  bRows: [
    ["Red — Test", "Sends a test SMS to your phone. Press it once a month to confirm the whole path works."],
    ["Blue — Mute", "Silences the buzzer for 10 minutes."],
    ["White — Power", "Hold for 3 seconds to switch the box off (you receive a shutdown SMS). Press once to wake it."],
    ["Green — Reset", "Restarts the box."],
  ],
  sounds: "One short chirp when the box starts. Two chirps when it has connected to our servers.",
  appH: "The app",
  appP: "Each house appears as a live card on your phone, with current readings, history and reports. The plan you choose decides how many houses you can watch and which reports you get: Basic gives live monitoring, emergency call and SMS, and a daily report; Premium adds weekly and monthly reports, several houses and priority support.",
  appCap: "A real screen from the app.",

  careH: "Looking after it",
  care: [
    "Keep the battery connected at all times. The box needs it during power cuts, and for the strong current its radio draws when it transmits.",
    "Keep the antenna connected and in place.",
    "Keep the SIM plan active, and tell us if you change your alert number.",
    "Wipe dust from the outside with a dry cloth. Do not spray water on the box and do not open it.",
    "Press the red button once a month and check that the SMS arrives.",
  ],
  fixH: "If something looks wrong",
  fHead: ["What you see", "What to do"],
  fRows: [
    ["The screen is off", "Check the socket and the power cable. If the box is on its battery you will have received a power-cut SMS."],
    ["No data in the app", "Wait a few minutes: the box reconnects on its own. Check the antenna is attached and the SIM plan is active. If it stays silent, call us."],
    ["No SMS when you press the red button", "Check the alert number on your record, your phone's signal and the SIM plan, then call us."],
    ["The buzzer will not stop", "It stops when the reading returns to normal. The blue button silences it for 10 minutes."],
    ["An alert you think was false", "Note the time and the value, and call us. We can look at the readings from that moment."],
  ],

  honestH: "What to expect, honestly",
  honest: [
    "Filaha Flock shortens the time between danger and you knowing about it. It cannot prevent every loss.",
    "Alerts depend on mobile coverage and a working SIM. Where coverage is weak, we will tell you at installation.",
    "The box measures the air where it hangs. Placement matters, which is why we do it for you.",
    "Ammonia sensing is new in this pilot phase. Treat NH₃ readings as indicative while the sensor is being validated; the CO₂, temperature, humidity and power alerts do not depend on it.",
    "Filaha Flock was selected into Cohort 1 of the Algerian Agripreneurs programme (InnovAgro, implemented by GIZ) in 2026 and is being proven on its first farms. Your feedback shapes what we build next.",
  ],
  contactH: "Reach us",
  contact: [["Phone and WhatsApp", PHONE], ["Email", EMAIL], ["Website", WEB], ["Based in", "Biskra, Algeria"]],

  recH: "Your installation record",
  recNote: "To be filled in at installation. Keep this page with the guide.",
  recFields: ["Farm", "Wilaya", "Number of houses", "Box ID", "Installed on", "Installed by", "Alert phone 1", "Alert phone 2"],
  recChoice1: ["SIM plan looked after by", ["Filaha Flock", "The farmer"]],
  recChoice2: ["Plan", ["Basic", "Premium"]],
  recNotes: "Notes",
};

// ═════════════════════════════ FRENCH ═════════════════════════════
C.fr = {
  lang: "fr", dir: "ltr",
  docKind: "Guide client", edition: "Version 1 · octobre 2026", page: "Page",
  title: "Comment fonctionne Filaha Flock, et comment en tirer le meilleur",
  forWho: "Pour les éleveurs de volailles en Algérie",

  intro: [
    "Filaha Flock surveille l'air de votre bâtiment d'élevage, jour et nuit. Un boîtier scellé, fixé au mur, mesure la température, l'humidité, le dioxyde de carbone (CO₂) et l'ammoniac (NH₃), et garde un œil sur le courant secteur. Quand quelque chose devient dangereux, il n'attend pas que vous ouvriez une application : une alarme sonne dans le bâtiment, vous recevez un SMS et votre téléphone sonne.",
    "Tout passe par le réseau mobile : aucun internet n'est nécessaire à la ferme, et le boîtier continue sur sa batterie pendant une coupure de courant.",
  ],
  alertH: "Quand un danger apparaît",
  steps: [
    "Une alarme sonne dans le bâtiment.",
    "Un SMS arrive sur votre téléphone, en mots simples, avec le problème et la valeur.",
    "Votre téléphone sonne. Tout est renvoyé jusqu'à ce que ça passe.",
  ],
  notH: "Ce qu'il ne fait pas",
  notP: "Filaha Flock surveille et prévient. Il ne pilote ni ventilateurs, ni chauffages, ni mangeoires, et ne remplace ni le vétérinaire ni une bonne ventilation. La décision, et l'action, restent les vôtres.",

  recvH: "Ce que vous recevez",
  recv: [
    ["Le boîtier", "Une unité scellée, fixée au mur, avec des sondes de température, d'humidité, de CO₂ et de NH₃, un écran, une alarme sonore, quatre boutons, une batterie de secours, une carte SIM et une antenne."],
    ["L'installation", "Notre équipe s'occupe de tout : fixation, sondes à hauteur des animaux, alimentation, antenne, numéro d'alerte et application (le détail est plus bas)."],
    ["L'application", "En arabe, en français ou en anglais. Valeurs en direct pour chaque bâtiment, historique et rapports."],
    ["Garantie et support", "Inclus avec le boîtier. Vous nous joignez par téléphone et WhatsApp, en arabe ou en français."],
  ],
  needH: "Ce qu'il nous faut de votre côté",
  need: [
    "Une prise secteur à portée du boîtier.",
    "Une couverture mobile sur place. Nous vérifions le signal à l'installation et vous disons s'il faut une antenne extérieure.",
    "Une carte SIM avec un forfait actif. Le boîtier s'en sert pour les données, les SMS et les appels ; la fiche de la dernière page indique qui s'occupe du forfait.",
    "Un numéro qui répond. Les alertes partent vers le numéro enregistré : prévenez-nous s'il change.",
  ],

  watchH: "Comment il surveille, et quand il vous prévient",
  cadence: "Environ toutes les 15 secondes, le boîtier prend ses mesures et les envoie à nos serveurs. Une alerte n'est déclenchée que si une valeur reste en zone de danger deux mesures de suite, soit environ 30 secondes : un pic isolé ne vous réveille donc jamais. Deux alertes sont espacées d'au moins 10 minutes.",
  tHead: ["Mesure", "Alerte quand", "Pourquoi c'est important"],
  tRows: [
    ["Température", "38 °C ou plus, ou 12 °C ou moins", "Le stress thermique et le froid frappent le cheptel en quelques heures."],
    ["Humidité", "85 % ou plus, ou 25 % ou moins", "Une litière humide favorise les maladies ; un air sec soulève la poussière."],
    ["CO₂", "2 500 ppm ou plus", "La ventilation ne suit plus la charge du bâtiment."],
    ["Ammoniac (NH₃)", "35 ppm ou plus", "Il brûle les voies respiratoires bien avant qu'une odeur ne vous alerte."],
    ["Courant secteur", "Coupure détectée", "Le bâtiment tourne sur la batterie du boîtier."],
  ],
  tNote: "Ce sont des seuils d'urgence fixes intégrés au boîtier, identiques à tout âge. Les repères qui suivent l'âge de votre cheptel se trouvent dans l'application : voir la page suivante.",

  reachH: "Ce qui vous parvient",
  reach: [
    ["L'alarme", "Elle sonne dans le bâtiment pour que toute personne présente le sache aussitôt. Le bouton bleu la fait taire 10 minutes."],
    ["Le SMS", "Un message court, en arabe ou en français, écrit pour être lu en quelques secondes."],
    ["L'appel", "Votre téléphone sonne environ 20 secondes. Répondez ou non : les détails sont dans le SMS."],
  ],
  retry: "Si le réseau mobile est coupé à ce moment-là, le message attend et est renvoyé pendant environ 15 minutes, jusqu'à ce qu'il passe.",
  moreH: [
    ["Une coupure de courant", "Vous recevez la même alarme, le même SMS et le même appel, et le boîtier continue de mesurer sur sa batterie. Au retour du courant, un SMS de confirmation arrive environ une minute plus tard, volontairement, pour qu'il ne parte jamais par erreur."],
    ["Le rapport du soir", "Chaque soir à 20 h, le boîtier envoie un SMS avec les dernières mesures."],
    ["Si la connexion tombe", "Le boîtier continue de mesurer et garde les mesures environ 15 minutes pour les envoyer au retour de la liaison. Si nos serveurs restent muets environ 30 minutes, il redémarre de lui-même. Vos alertes par SMS et par appel ne dépendent ni de l'application ni d'internet."],
  ],

  dayH: "Au quotidien",
  screenP: "L'écran du boîtier affiche les mesures en cours : vous contrôlez le bâtiment sans sortir votre téléphone.",
  bHead: ["Bouton", "Ce qu'il fait"],
  bRows: [
    ["Rouge — Test", "Envoie un SMS de test à votre téléphone. Appuyez une fois par mois pour vérifier que toute la chaîne fonctionne."],
    ["Bleu — Silence", "Fait taire l'alarme pendant 10 minutes."],
    ["Blanc — Marche/arrêt", "Maintenez 3 secondes pour éteindre le boîtier (vous recevez un SMS d'arrêt). Appuyez une fois pour le réveiller."],
    ["Vert — Redémarrage", "Redémarre le boîtier."],
  ],
  sounds: "Un bip court au démarrage. Deux bips quand le boîtier s'est connecté à nos serveurs.",
  appH: "L'application",
  appP: "Chaque bâtiment apparaît comme une fiche en direct sur votre téléphone, avec les mesures en cours, l'historique et les rapports. L'offre choisie détermine le nombre de bâtiments suivis et les rapports reçus : Basic donne le suivi en direct, l'appel et le SMS d'urgence et un rapport quotidien ; Premium ajoute les rapports hebdomadaires et mensuels, plusieurs bâtiments et un support prioritaire.",
  appCap: "Un écran réel de l'application.",

  careH: "Prendre soin du boîtier",
  care: [
    "Laissez la batterie branchée en permanence. Le boîtier en a besoin pendant les coupures, et pour le fort courant que sa radio appelle quand elle émet.",
    "Laissez l'antenne branchée et en place.",
    "Gardez le forfait de la SIM actif et prévenez-nous si vous changez de numéro d'alerte.",
    "Essuyez la poussière à l'extérieur avec un chiffon sec. N'aspergez pas le boîtier d'eau et ne l'ouvrez pas.",
    "Appuyez sur le bouton rouge une fois par mois et vérifiez que le SMS arrive.",
  ],
  fixH: "Si quelque chose semble anormal",
  fHead: ["Ce que vous voyez", "Que faire"],
  fRows: [
    ["L'écran est éteint", "Vérifiez la prise et le câble d'alimentation. Si le boîtier est sur sa batterie, vous avez reçu un SMS de coupure de courant."],
    ["Aucune donnée dans l'application", "Patientez quelques minutes : le boîtier se reconnecte seul. Vérifiez que l'antenne est branchée et que le forfait de la SIM est actif. S'il reste muet, appelez-nous."],
    ["Pas de SMS quand vous appuyez sur le rouge", "Vérifiez le numéro d'alerte sur votre fiche, le signal de votre téléphone et le forfait de la SIM, puis appelez-nous."],
    ["L'alarme ne s'arrête pas", "Elle s'arrête quand la mesure redevient normale. Le bouton bleu la fait taire 10 minutes."],
    ["Une alerte qui vous semble fausse", "Notez l'heure et la valeur, puis appelez-nous. Nous pouvons consulter les mesures de ce moment-là."],
  ],

  honestH: "Ce qu'il faut en attendre, en toute franchise",
  honest: [
    "Filaha Flock raccourcit le temps entre le danger et le moment où vous l'apprenez. Il ne peut pas éviter toutes les pertes.",
    "Les alertes dépendent de la couverture mobile et d'une SIM qui fonctionne. Là où la couverture est faible, nous vous le disons à l'installation.",
    "Le boîtier mesure l'air à l'endroit où il est accroché. L'emplacement compte, et c'est pourquoi nous nous en chargeons.",
    "La mesure de l'ammoniac est nouvelle dans cette phase pilote. Considérez les valeurs de NH₃ comme indicatives tant que le capteur est en cours de validation ; les alertes de CO₂, de température, d'humidité et de courant n'en dépendent pas.",
    "Filaha Flock a été sélectionné dans la Cohorte 1 du programme Algerian Agripreneurs (InnovAgro, mis en œuvre par la GIZ) en 2026 et s'éprouve sur ses premières fermes. Vos retours orientent ce que nous construisons ensuite.",
  ],
  contactH: "Nous joindre",
  contact: [["Téléphone et WhatsApp", PHONE], ["E-mail", EMAIL], ["Site web", WEB], ["Basés à", "Biskra, Algérie"]],

  recH: "Votre fiche d'installation",
  recNote: "À remplir lors de l'installation. Conservez cette page avec le guide.",
  recFields: ["Ferme", "Wilaya", "Nombre de bâtiments", "N° du boîtier", "Installé le", "Installé par", "Numéro d'alerte 1", "Numéro d'alerte 2"],
  recChoice1: ["Forfait SIM géré par", ["Filaha Flock", "L'éleveur"]],
  recChoice2: ["Offre", ["Basic", "Premium"]],
  recNotes: "Notes",
};

// ═════════════════════════════ ARABIC ═════════════════════════════
C.ar = {
  lang: "ar", dir: "rtl",
  docKind: "دليل العميل", edition: "الإصدار 1 · أكتوبر 2026", page: "صفحة",
  title: "كيف يعمل فلاحة فلوك، وكيف تستفيد منه",
  forWho: "لمربّي الدواجن في الجزائر",

  intro: [
    "يراقب فلاحة فلوك الهواء داخل قاعة الدواجن ليلاً ونهاراً. جهاز محكم الغلق يُثبَّت على الحائط ويقيس الحرارة والرطوبة وثاني أكسيد الكربون (CO₂) والأمونيا (NH₃)، ويراقب الكهرباء أيضاً. وإذا صار شيء خطيراً فهو لا ينتظر أن تفتح التطبيق: تصفّر الصفّارة داخل القاعة، وتصلك رسالة، ويرنّ هاتفك.",
    "يعمل عبر شبكة الهاتف، فلا يحتاج أنترنت في المزرعة، ويواصل العمل أثناء انقطاع الكهرباء على بطاريته.",
  ],
  alertH: "عند وقوع خطر",
  steps: [
    "تصفّر الصفّارة داخل القاعة.",
    "تصلك رسالة قصيرة بكلمات واضحة فيها المشكل والقيمة.",
    "يرنّ هاتفك. وكلّ ذلك يُعاد حتى يصل.",
  ],
  notH: "ما لا يفعله",
  notP: "فلاحة فلوك يراقب وينبّه. هو لا يشغّل المراوح أو المدافئ أو المعالف ولا يطفئها، ولا يغني عن الطبيب البيطري ولا عن التهوية الجيدة. القرار والتنفيذ يبقيان بيدك.",

  recvH: "ماذا تتسلّم",
  recv: [
    ["الجهاز", "وحدة محكمة الغلق تُثبَّت على الحائط. بداخلها حسّاسات للحرارة والرطوبة وCO₂ وNH₃، وشاشة تعرض القراءات الحالية، وصفّارة، وأربعة أزرار، وبطارية احتياطية، وشريحة هاتف، وهوائي."],
    ["التركيب", "يتنقّل فريقنا فيثبّت الجهاز، ويضع الحسّاسات على ارتفاع الدجاج، ويوصّل الكهرباء والهوائي، ويسجّل رقم هاتفك للتنبيهات، ويضع التطبيق في هاتفك."],
    ["التطبيق", "بالعربية أو الفرنسية أو الإنجليزية. قراءات مباشرة لكلّ قاعة، وسجلّ، وتقارير."],
    ["الضمان والدعم", "مشمولان مع الجهاز. تتصل بنا بالهاتف أو واتساب، بالعربية أو الفرنسية."],
  ],
  needH: "ما نحتاجه منك",
  need: [
    "مقبس كهرباء قريب من الجهاز.",
    "تغطية شبكة الهاتف في المكان. نفحص الإشارة عند التركيب ونخبرك إن احتجنا إلى هوائي خارجي.",
    "شريحة بخطّة نشطة. يستعملها الجهاز للبيانات والرسائل والمكالمات، ويبيّن السجلّ في الصفحة الأخيرة من يتكفّل بالخطّة.",
    "رقم هاتف يردّ. التنبيهات تصل إلى الرقم المسجَّل، فأخبرنا إذا تغيّر.",
  ],

  watchH: "كيف يراقب، ومتى ينبّهك",
  cadence: "كلّ 15 ثانية تقريباً يأخذ الجهاز قراءاته ويرسلها إلى خوادمنا. لا يُطلق التنبيه إلا إذا بقيت القيمة في منطقة الخطر قراءتين متتاليتين، أي نحو 30 ثانية، فلا توقظك قراءة شاذّة واحدة. وبين تنبيه وآخر 10 دقائق على الأقل.",
  tHead: ["القياس", "ينبّه عندما", "لماذا يهمّ"],
  tRows: [
    ["الحرارة", "38 °C أو أكثر، أو 12 °C أو أقل", "الإجهاد الحراري والبرد يضربان القطيع في ساعات."],
    ["الرطوبة", "85 % أو أكثر، أو 25 % أو أقل", "الفرشة الرطبة تولّد الأمراض، والهواء الجاف يرفع الغبار."],
    ["CO₂", "2500 ppm أو أكثر", "التهوية لم تعد تواكب عدد الدجاج."],
    ["الأمونيا (NH₃)", "35 ppm أو أكثر", "تحرق الجهاز التنفّسي قبل أن تشمّها بوقت طويل."],
    ["الكهرباء", "انقطاع التيار", "القاعة تعمل على بطارية الجهاز."],
  ],
  tNote: "هذه حدود طوارئ ثابتة مضبوطة في الجهاز، وهي نفسها في كلّ الأعمار. أمّا الإرشاد الذي يتبع عمر قطيعك فتجده في التطبيق: انظر الصفحة التالية.",

  reachH: "ما يصلك",
  reach: [
    ["الصفّارة", "تصفّر داخل القاعة ليعرف كلّ من يعمل فيها فوراً. الزرّ الأزرق يُسكتها 10 دقائق."],
    ["الرسالة", "رسالة قصيرة بالعربية أو الفرنسية، مكتوبة لتُقرأ في ثوانٍ."],
    ["المكالمة", "يرنّ هاتفك نحو 20 ثانية. ردّ أو لا تردّ، فالتفاصيل في الرسالة."],
  ],
  retry: "إذا كانت شبكة الهاتف منقطعة في تلك اللحظة، تنتظر الرسالة ويُعاد إرسالها نحو 15 دقيقة حتى تصل.",
  moreH: [
    ["انقطاع الكهرباء", "تصلك الصفّارة والرسالة والمكالمة نفسها، ويواصل الجهاز القياس على بطاريته. وعند عودة الكهرباء تصلك رسالة تأكيد بعد نحو دقيقة، عن قصد، حتى لا تُرسل بالخطأ أبداً."],
    ["تقرير المساء", "كلّ مساء عند الثامنة يرسل الجهاز رسالة واحدة بآخر القراءات."],
    ["إذا انقطع الاتصال", "يواصل الجهاز القياس ويحفظ القراءات نحو 15 دقيقة ثم يرسلها عند عودة الاتصال. وإذا بقيت خوادمنا صامتة نحو 30 دقيقة يعيد تشغيل نفسه. أمّا تنبيهات الرسالة والمكالمة فلا تعتمد على التطبيق ولا على الأنترنت."],
  ],

  dayH: "الاستعمال اليومي",
  screenP: "الشاشة على الجهاز تعرض القراءات الحالية، فتفحص القاعة دون إخراج هاتفك.",
  bHead: ["الزرّ", "ماذا يفعل"],
  bRows: [
    ["الأحمر — اختبار", "يرسل رسالة اختبار إلى هاتفك. اضغطه مرّة في الشهر لتتأكد أنّ المسار كلّه يعمل."],
    ["الأزرق — إسكات", "يُسكت الصفّارة 10 دقائق."],
    ["الأبيض — التشغيل", "اضغط 3 ثوانٍ لإطفاء الجهاز (تصلك رسالة إطفاء). اضغطه مرّة واحدة لإيقاظه."],
    ["الأخضر — إعادة التشغيل", "يعيد تشغيل الجهاز."],
  ],
  sounds: "صفرة قصيرة واحدة عند تشغيل الجهاز. وصفرتان عندما يتّصل بخوادمنا.",
  appH: "التطبيق",
  appP: "تظهر كلّ قاعة بطاقةً مباشرة في هاتفك، فيها القراءات الحالية والسجلّ والتقارير. والخطّة التي تختارها تحدّد عدد القاعات والتقارير: «أساسي» يعطيك المتابعة المباشرة ومكالمة ورسالة الطوارئ وتقريراً يومياً؛ و«مميّز» يضيف تقارير أسبوعية وشهرية وعدّة قاعات ودعماً بأولوية.",
  appCap: "شاشة حقيقية من التطبيق.",

  careH: "العناية بالجهاز",
  care: [
    "أبقِ البطارية موصولة دائماً. يحتاجها الجهاز عند انقطاع الكهرباء، وللتيار القوي الذي يسحبه مُرسِله عند الإرسال.",
    "أبقِ الهوائي موصولاً في مكانه.",
    "أبقِ خطّة الشريحة نشطة، وأخبرنا إذا غيّرت رقم التنبيهات.",
    "امسح الغبار من الخارج بقطعة جافة. لا ترشّ الماء على الجهاز ولا تفتحه.",
    "اضغط الزرّ الأحمر مرّة في الشهر وتأكّد أنّ الرسالة تصل.",
  ],
  fixH: "إذا بدا شيء غير عادي",
  fHead: ["ما تراه", "ما تفعله"],
  fRows: [
    ["الشاشة مطفأة", "افحص المقبس وسلك الكهرباء. وإذا كان الجهاز على بطاريته فقد وصلتك رسالة انقطاع الكهرباء."],
    ["لا بيانات في التطبيق", "انتظر بضع دقائق: يعيد الجهاز الاتصال بنفسه. تأكّد أنّ الهوائي موصول وأنّ خطّة الشريحة نشطة. وإذا بقي صامتاً فاتصل بنا."],
    ["لا تصلك رسالة عند ضغط الزرّ الأحمر", "تأكّد من رقم التنبيهات في السجلّ ومن إشارة هاتفك ومن خطّة الشريحة، ثم اتصل بنا."],
    ["الصفّارة لا تتوقف", "تتوقف عندما تعود القراءة إلى المعتاد. والزرّ الأزرق يُسكتها 10 دقائق."],
    ["تنبيه تظنّه خاطئاً", "دوّن الوقت والقيمة واتصل بنا. نستطيع الاطلاع على القراءات في تلك اللحظة."],
  ],

  honestH: "ماذا تنتظر، بصراحة",
  honest: [
    "فلاحة فلوك يقصّر المدّة بين وقوع الخطر وعلمك به. لكنه لا يمنع كلّ خسارة.",
    "التنبيهات تعتمد على تغطية الشبكة وعلى شريحة تعمل. وحيث تكون التغطية ضعيفة نخبرك عند التركيب.",
    "الجهاز يقيس الهواء في مكان تعليقه، فمكان التثبيت مهمّ، ولهذا نتولّاه نحن.",
    "استشعار الأمونيا جديد في هذه المرحلة التجريبية. اعتبر قراءات NH₃ إرشادية ما دام الحسّاس قيد التحقّق؛ أمّا تنبيهات CO₂ والحرارة والرطوبة والكهرباء فلا تعتمد عليه.",
    "اختير فلاحة فلوك ضمن الفوج الأول من برنامج Algerian Agripreneurs (InnovAgro، بتنفيذ GIZ) سنة 2026، ويُجرَّب الآن في أولى المزارع. ملاحظاتك تصنع ما نبنيه بعد ذلك.",
  ],
  contactH: "تواصل معنا",
  contact: [["الهاتف وواتساب", PHONE], ["البريد الإلكتروني", EMAIL], ["الموقع", WEB], ["المقرّ", "بسكرة، الجزائر"]],

  recH: "سجلّ تركيبك",
  recNote: "يُملأ عند التركيب. احتفظ بهذه الصفحة مع الدليل.",
  recFields: ["المزرعة", "الولاية", "عدد القاعات", "رقم الجهاز", "تاريخ التركيب", "تمّ التركيب بواسطة", "رقم التنبيه 1", "رقم التنبيه 2"],
  recChoice1: ["خطّة الشريحة يتكفّل بها", ["فلاحة فلوك", "المربّي"]],
  recChoice2: ["الخطّة", ["أساسي", "مميّز"]],
  recNotes: "ملاحظات",
};

// ─────────────────────────────────────────────────────────────────
//  RENDERING
// ─────────────────────────────────────────────────────────────────
// Two sections added after the first layout pass: the first two pages were
// leaving a third of the sheet empty, and these are things a client asks anyway.
const EXTRA = {
  en: {
    glanceH: "At a glance",
    glance: [
      ["It measures", "Temperature, humidity, CO₂, ammonia (NH₃) and the mains power"],
      ["How it reaches you", "Buzzer, SMS and phone call"],
      ["Internet on the farm", "Not needed: it uses the mobile network"],
      ["During a power cut", "Keeps working on its own battery"],
    ],
    dayOneH: "Installation day",
    dayOne: [
      "We check the mobile signal at the spot and choose where the box and the sensors will go.",
      "We mount the box on the wall and place the sensors at bird height.",
      "We connect the power and the antenna, and make sure the battery is in place.",
      "We register your alert phone number and set up the app on your phone, with your breed and the day the chicks arrived.",
      "We send a test with the red button: the test SMS arriving on your phone proves the whole path works.",
    ],
  },
  fr: {
    glanceH: "En un coup d'œil",
    glance: [
      ["Il mesure", "Température, humidité, CO₂, ammoniac (NH₃) et courant secteur"],
      ["Comment il vous joint", "Alarme sonore, SMS et appel"],
      ["Internet à la ferme", "Inutile : il utilise le réseau mobile"],
      ["Pendant une coupure", "Continue sur sa propre batterie"],
    ],
    dayOneH: "Le jour de l'installation",
    dayOne: [
      "Nous vérifions le signal mobile à l'endroit prévu et choisissons l'emplacement du boîtier et des sondes.",
      "Nous fixons le boîtier au mur et plaçons les sondes à hauteur des animaux.",
      "Nous branchons l'alimentation et l'antenne, et nous nous assurons que la batterie est en place.",
      "Nous enregistrons votre numéro d'alerte et installons l'application, avec votre race et le jour d'arrivée des poussins.",
      "Nous lançons un test avec le bouton rouge : le SMS de test qui arrive sur votre téléphone prouve que toute la chaîne fonctionne.",
    ],
  },
  ar: {
    glanceH: "باختصار",
    glance: [
      ["ماذا يقيس", "الحرارة والرطوبة وCO₂ والأمونيا (NH₃) والكهرباء"],
      ["كيف يصلك", "صفّارة ورسالة ومكالمة"],
      ["الأنترنت في المزرعة", "غير لازم: يعمل بشبكة الهاتف"],
      ["أثناء انقطاع الكهرباء", "يواصل العمل على بطاريته"],
    ],
    dayOneH: "يوم التركيب",
    dayOne: [
      "نفحص إشارة شبكة الهاتف في المكان ونختار موضع الجهاز والحسّاسات.",
      "نثبّت الجهاز على الحائط ونضع الحسّاسات على ارتفاع الدجاج.",
      "نوصّل الكهرباء والهوائي ونتأكد أنّ البطارية في مكانها.",
      "نسجّل رقم هاتفك للتنبيهات ونضع التطبيق في هاتفك، مع سلالتك ويوم وصول الكتاكيت.",
      "نجري اختباراً بالزرّ الأحمر: وصول رسالة الاختبار إلى هاتفك يثبت أنّ المسار كلّه يعمل.",
    ],
  },
};
for (const k of Object.keys(EXTRA)) Object.assign(C[k], EXTRA[k]);


const AGE = {
  en: {
    ageH: "Alerts, and the age of your flock",
    ageIntro: "Birds need different conditions as they grow: a day-old chick needs about 33 °C, a six-week-old bird about 20 °C. Filaha Flock handles this in two layers, and it helps to know which does what.",
    ageDefs: [
      ["The box: a safety net", "Its alarm, SMS and call use fixed emergency limits that are the same at every age (the table on the previous page). They are meant to ring only when something is genuinely wrong, and they work with no internet. They do not change with the age of your birds."],
      ["The app: guidance by age", "Once the app knows your breed and the day the chicks arrived, it shows the right target temperature for today, announces each change of phase and each vaccination due, and judges your reports against what suits birds of that age: temperature within a few degrees of the target, humidity within ten points."],
      ["Alert limits in the app", "The colours and alerts in the app follow limits you can adjust in its settings. They are the same for every house and every age, so you can set them to the stage your flock is at."],
    ],
    ageCap: "Targets shown in the app for broilers",
    ageHead: ["Day", "Temperature", "Humidity"],
    ageRows: [["1", "33 °C", "65 %"], ["7", "30 °C", "62 %"], ["14", "28 °C", "60 %"], ["21", "26 °C", "60 %"], ["28", "23 °C", "58 %"], ["42 and after", "20 °C", "58 %"]],
    ageNote: "The app fills in the days between; layers, turkeys and local breeds have their own schedules. These are guidance targets from the main breeders' guides and Algerian technical sources, not alarm limits.",
    ageEnd: "If your flock's arrival date or breed is wrong, correct it in the app or tell us: everything above depends on it.",
  },
  fr: {
    ageH: "Alertes et âge de votre cheptel",
    ageIntro: "Les oiseaux n'ont pas besoin des mêmes conditions tout au long de leur croissance : un poussin d'un jour demande environ 33 °C, un oiseau de six semaines environ 20 °C. Filaha Flock s'y prend à deux niveaux : voici qui fait quoi.",
    ageDefs: [
      ["Le boîtier : un filet de sécurité", "Son alarme, son SMS et son appel utilisent des seuils d'urgence fixes, identiques à tout âge (le tableau de la page précédente). Ils ne sonnent que lorsque quelque chose va vraiment mal, et fonctionnent sans internet. Ils ne changent pas avec l'âge de vos oiseaux."],
      ["L'application : des repères selon l'âge", "Dès qu'elle connaît votre race et le jour d'arrivée des poussins, l'application affiche la température cible du jour, annonce chaque changement de phase et chaque vaccin à faire, et juge vos rapports par rapport à ce qui convient à des oiseaux de cet âge : température à quelques degrés de la cible, humidité à dix points près."],
      ["Les seuils d'alerte de l'application", "Les couleurs et les alertes de l'application suivent des seuils réglables dans ses paramètres. Ils sont les mêmes pour tous les bâtiments et tous les âges ; vous pouvez donc les ajuster au stade de votre cheptel."],
    ],
    ageCap: "Objectifs affichés dans l'application pour le poulet de chair",
    ageHead: ["Jour", "Température", "Humidité"],
    ageRows: [["1", "33 °C", "65 %"], ["7", "30 °C", "62 %"], ["14", "28 °C", "60 %"], ["21", "26 °C", "60 %"], ["28", "23 °C", "58 %"], ["42 et après", "20 °C", "58 %"]],
    ageNote: "L'application complète les jours intermédiaires ; les pondeuses, les dindes et les races locales ont leurs propres courbes. Ce sont des objectifs de référence, tirés des guides des sélectionneurs et de sources techniques algériennes, pas des seuils d'alarme.",
    ageEnd: "Si la date d'arrivée ou la race est fausse, corrigez-la dans l'application ou dites-le-nous : tout ce qui précède en dépend.",
  },
  ar: {
    ageH: "التنبيهات وعمر قطيعك",
    ageIntro: "لا تحتاج الطيور إلى الظروف نفسها طوال نموّها: الكتكوت ابن يوم يحتاج نحو 33 °C، والطائر ابن ستة أسابيع نحو 20 °C. وفلاحة فلوك يعالج ذلك على مستويين، ومن المفيد أن تعرف أيّهما يفعل ماذا.",
    ageDefs: [
      ["الجهاز: شبكة أمان", "صفّارته ورسالته ومكالمته تعتمد حدود طوارئ ثابتة، هي نفسها في كلّ الأعمار (الجدول في الصفحة السابقة). لا ترنّ إلا عندما يكون هناك خطر حقيقي، وتعمل بلا أنترنت. ولا تتغيّر بتغيّر عمر طيورك."],
      ["التطبيق: إرشاد حسب العمر", "عندما يعرف التطبيق سلالتك ويوم وصول الكتاكيت، يعرض لك درجة الحرارة المستهدفة لهذا اليوم، وينبّهك إلى كلّ مرحلة جديدة وكلّ تلقيح مستحق، ويقيّم تقاريرك بما يناسب طيوراً في هذا العمر: الحرارة في حدود درجات قليلة من الهدف، والرطوبة في حدود عشر نقاط."],
      ["حدود التنبيه في التطبيق", "ألوان التطبيق وتنبيهاته تتبع حدوداً يمكنك تعديلها من الإعدادات. وهي نفسها لكلّ القاعات ولكلّ الأعمار، فاضبطها بحسب مرحلة قطيعك."],
    ],
    ageCap: "الأهداف التي يعرضها التطبيق لدجاج اللحم",
    ageHead: ["اليوم", "الحرارة", "الرطوبة"],
    ageRows: [["1", "33 °C", "65 %"], ["7", "30 °C", "62 %"], ["14", "28 °C", "60 %"], ["21", "26 °C", "60 %"], ["28", "23 °C", "58 %"], ["42 فما بعد", "20 °C", "58 %"]],
    ageNote: "يملأ التطبيق الأيام الواقعة بينها، وللدجاج البيّاض والديك الرومي والسلالات المحلية جداولها الخاصة. هذه أهداف إرشادية من أدلّة كبرى شركات الانتقاء ومن مصادر تقنية جزائرية، وليست حدود إنذار.",
    ageEnd: "إذا كان تاريخ وصول القطيع أو سلالته خاطئاً فصحّحه في التطبيق أو أخبرنا: كلّ ما سبق يعتمد عليه.",
  },
};
for (const k of Object.keys(AGE)) Object.assign(C[k], AGE[k]);

// Limits are now set by text message, and the age page moves BEFORE the device details.
const SMSLIM = {
  en: {
    glance: [
      ["It measures", "Temperature, humidity, CO₂, ammonia (NH₃) and the mains power"],
      ["How it reaches you", "Buzzer, SMS and phone call"],
      ["Internet on the farm", "Not needed: it uses the mobile network"],
      ["Alert limits", "You set them yourself, by text message"],
    ],
    ageH: "Your flock's age, and your alert limits",
    ageIntro: "Birds need different conditions as they grow: a day-old chick needs about 33 °C, a six-week-old bird about 20 °C. Filaha Flock follows this in two parts that work together.",
    ageDefs: [
      ["The app: guidance by age", "Once the app knows your breed and the day the chicks arrived, it shows the right target temperature for today, announces each change of phase and each vaccination due, and judges your reports against what suits birds of that age: temperature within a few degrees of the target, humidity within ten points."],
      ["The box: limits you set", "The box's alarm, SMS and call work with no internet. It starts with standard limits, and you change them by text message whenever your flock reaches a new stage; the target the app shows for today tells you where to set them. The next pages explain how."],
      ["Alert limits in the app", "The colours and alerts in the app follow limits you can adjust in its settings. They are the same for every house and every age, so set them to the stage your flock is at."],
    ],
    tHead: ["Measurement", "Standard limit: warns when", "Why it matters"],
    tNote: "These are the standard limits the box starts with. Change them by text message to suit your flock's age: see the next page.",
    smsH: "Setting the limits by text message",
    smsIntro: "Text the box's SIM number from your registered phone. The box replies with what it saved. Change the limits as often as you like; they survive power cuts.",
    smsHead: ["Send (example)", "It sets"],
    smsRows: [
      ["T 20 32", "Temperature: warns below 20 °C or above 32 °C"],
      ["H 40 75", "Humidity: warns below 40 % or above 75 %"],
      ["C 2500", "CO₂: warns at 2,500 ppm or above"],
      ["N 25", "Ammonia (NH₃): warns at 25 ppm or above"],
      ["LIMITS", "The box replies with the limits it is using now"],
      ["RESET", "Back to the standard limits"],
    ],
    smsEx: "You can combine them in one message: T 20 32 H 40 75 C 2500 N 25. Capitals, spaces and commas do not matter. Write with Latin letters and digits, and use a dot for decimals (32.5).",
    smsReply: "The box answers, for example: Filaha DEV01 OK: T20-32 H40-75 C2500 N25. Always check the reply: if something in your message is wrong, nothing is changed and the reply says what to fix.",
    rangesH: "Values the box accepts",
    ranges: [
      ["Temperature", "low 0–40 °C, high 10–50 °C, at least 3 °C apart"],
      ["Humidity", "low 0–60 %, high 40–100 %, at least 10 points apart"],
      ["CO₂", "800–5,000 ppm"],
      ["Ammonia (NH₃)", "5–50 ppm"],
    ],
    rangesNote: "Values outside these ranges are refused, so a typing slip cannot switch an alarm off.",
    smsWho: "Only your registered phone number is obeyed; texts from any other number are ignored.",
    smsWhen: "When to change them: when your flock reaches a new stage. Check today's target temperature in the app, then set the low and high limits a few degrees either side of it. If you are unsure which numbers to use, ask us.",
  },
  fr: {
    glance: [
      ["Il mesure", "Température, humidité, CO₂, ammoniac (NH₃) et courant secteur"],
      ["Comment il vous joint", "Alarme sonore, SMS et appel"],
      ["Internet à la ferme", "Inutile : il utilise le réseau mobile"],
      ["Seuils d'alerte", "Vous les réglez vous-même, par SMS"],
    ],
    ageH: "L'âge de votre cheptel et vos seuils d'alerte",
    ageIntro: "Les oiseaux n'ont pas besoin des mêmes conditions tout au long de leur croissance : un poussin d'un jour demande environ 33 °C, un oiseau de six semaines environ 20 °C. Filaha Flock suit cela en deux parties qui travaillent ensemble.",
    ageDefs: [
      ["L'application : des repères selon l'âge", "Dès qu'elle connaît votre race et le jour d'arrivée des poussins, l'application affiche la température cible du jour, annonce chaque changement de phase et chaque vaccin à faire, et juge vos rapports par rapport à ce qui convient à des oiseaux de cet âge : température à quelques degrés de la cible, humidité à dix points près."],
      ["Le boîtier : des seuils que vous réglez", "L'alarme, le SMS et l'appel du boîtier fonctionnent sans internet. Il démarre avec des seuils standard, et vous les modifiez par SMS chaque fois que votre cheptel change de stade ; la cible du jour affichée dans l'application vous indique où les placer. Les pages suivantes expliquent comment."],
      ["Les seuils d'alerte de l'application", "Les couleurs et les alertes de l'application suivent des seuils réglables dans ses paramètres. Ils sont les mêmes pour tous les bâtiments et tous les âges ; vous pouvez donc les ajuster au stade de votre cheptel."],
    ],
    tHead: ["Mesure", "Seuil standard : alerte quand", "Pourquoi c'est important"],
    tNote: "Ce sont les seuils standard avec lesquels le boîtier démarre. Modifiez-les par SMS selon l'âge de votre cheptel : voir la page suivante.",
    smsH: "Régler les seuils par SMS",
    smsIntro: "Envoyez un SMS au numéro de la SIM du boîtier depuis votre téléphone enregistré. Il répond avec ce qu'il a enregistré. Changez les seuils aussi souvent que vous voulez ; ils résistent aux coupures de courant.",
    smsHead: ["Envoyez (exemple)", "Cela règle"],
    smsRows: [
      ["T 20 32", "Température : alerte sous 20 °C ou au-dessus de 32 °C"],
      ["H 40 75", "Humidité : alerte sous 40 % ou au-dessus de 75 %"],
      ["C 2500", "CO₂ : alerte à partir de 2 500 ppm"],
      ["N 25", "Ammoniac (NH₃) : alerte à partir de 25 ppm"],
      ["LIMITS", "Le boîtier répond avec les seuils qu'il utilise"],
      ["RESET", "Retour aux seuils standard"],
    ],
    smsEx: "Vous pouvez tout combiner dans un seul message : T 20 32 H 40 75 C 2500 N 25. Majuscules, espaces et virgules n'ont pas d'importance. Écrivez avec des lettres latines et des chiffres, et utilisez le point pour les décimales (32.5).",
    smsReply: "Le boîtier répond, par exemple : Filaha DEV01 OK: T20-32 H40-75 C2500 N25. Vérifiez toujours la réponse : si quelque chose est faux dans votre message, rien n'est modifié et la réponse dit quoi corriger.",
    rangesH: "Valeurs acceptées par le boîtier",
    ranges: [
      ["Température", "bas 0–40 °C, haut 10–50 °C, écart d'au moins 3 °C"],
      ["Humidité", "bas 0–60 %, haut 40–100 %, écart d'au moins 10 points"],
      ["CO₂", "800–5 000 ppm"],
      ["Ammoniac (NH₃)", "5–50 ppm"],
    ],
    rangesNote: "Les valeurs hors de ces plages sont refusées : une faute de frappe ne peut donc pas éteindre une alarme.",
    smsWho: "Seul votre numéro de téléphone enregistré est obéi ; les SMS venant d'un autre numéro sont ignorés.",
    smsWhen: "Quand les changer : quand votre cheptel passe à un nouveau stade. Regardez la température cible du jour dans l'application, puis réglez les seuils bas et haut à quelques degrés de part et d'autre. En cas de doute sur les valeurs à choisir, demandez-nous.",
  },
  ar: {
    glance: [
      ["ماذا يقيس", "الحرارة والرطوبة وCO₂ والأمونيا (NH₃) والكهرباء"],
      ["كيف يصلك", "صفّارة ورسالة ومكالمة"],
      ["الأنترنت في المزرعة", "غير لازم: يعمل بشبكة الهاتف"],
      ["حدود التنبيه", "تضبطها أنت برسالة نصية"],
    ],
    ageH: "عمر قطيعك وحدود التنبيه",
    ageIntro: "لا تحتاج الطيور إلى الظروف نفسها طوال نموّها: الكتكوت ابن يوم يحتاج نحو 33 °C، والطائر ابن ستة أسابيع نحو 20 °C. وفلاحة فلوك يتابع ذلك في جزأين يعملان معاً.",
    ageDefs: [
      ["التطبيق: إرشاد حسب العمر", "عندما يعرف التطبيق سلالتك ويوم وصول الكتاكيت، يعرض لك درجة الحرارة المستهدفة لهذا اليوم، وينبّهك إلى كلّ مرحلة جديدة وكلّ تلقيح مستحق، ويقيّم تقاريرك بما يناسب طيوراً في هذا العمر: الحرارة في حدود درجات قليلة من الهدف، والرطوبة في حدود عشر نقاط."],
      ["الجهاز: حدود تضبطها أنت", "صفّارة الجهاز ورسالته ومكالمته تعمل بلا أنترنت. يبدأ بحدود قياسية، وتغيّرها أنت برسالة نصية كلّما انتقل قطيعك إلى مرحلة جديدة؛ والهدف الذي يعرضه التطبيق لهذا اليوم يدلّك أين تضعها. وتشرح الصفحات التالية الطريقة."],
      ["حدود التنبيه في التطبيق", "ألوان التطبيق وتنبيهاته تتبع حدوداً يمكنك تعديلها من الإعدادات. وهي نفسها لكلّ القاعات ولكلّ الأعمار، فاضبطها بحسب مرحلة قطيعك."],
    ],
    tHead: ["القياس", "الحدّ القياسي: ينبّه عندما", "لماذا يهمّ"],
    tNote: "هذه هي الحدود القياسية التي يبدأ بها الجهاز. غيّرها برسالة نصية بحسب عمر قطيعك: انظر الصفحة التالية.",
    smsH: "ضبط الحدود برسالة نصية",
    smsIntro: "أرسل رسالة نصية إلى رقم شريحة الجهاز من هاتفك المسجَّل. يردّ عليك بما حفظه. غيّر الحدود كلّما شئت؛ فهي تبقى محفوظة عند انقطاع الكهرباء.",
    smsHead: ["أرسل (مثال)", "ماذا يضبط"],
    smsRows: [
      ["T 20 32", "الحرارة: ينبّه تحت 20 °C أو فوق 32 °C"],
      ["H 40 75", "الرطوبة: ينبّه تحت 40 % أو فوق 75 %"],
      ["C 2500", "CO₂: ينبّه عند 2500 ppm أو أكثر"],
      ["N 25", "الأمونيا (NH₃): ينبّه عند 25 ppm أو أكثر"],
      ["LIMITS", "يردّ الجهاز بالحدود التي يستعملها الآن"],
      ["RESET", "العودة إلى الحدود القياسية"],
    ],
    smsEx: "يمكنك جمعها في رسالة واحدة: T 20 32 H 40 75 C 2500 N 25. لا فرق بين الحروف الكبيرة والصغيرة ولا في المسافات والفواصل. اكتب بالحروف اللاتينية والأرقام، واستعمل النقطة للكسور (32.5).",
    smsReply: "يردّ الجهاز مثلاً: Filaha DEV01 OK: T20-32 H40-75 C2500 N25. تحقّق دائماً من الردّ: إذا كان في رسالتك خطأ فلا يتغيّر شيء ويقول الردّ ما يجب تصحيحه.",
    rangesH: "القيم التي يقبلها الجهاز",
    ranges: [
      ["الحرارة", "الأدنى 0–40 °C والأعلى 10–50 °C، بفارق 3 °C على الأقل"],
      ["الرطوبة", "الأدنى 0–60 % والأعلى 40–100 %، بفارق 10 نقاط على الأقل"],
      ["CO₂", "800–5000 ppm"],
      ["الأمونيا (NH₃)", "5–50 ppm"],
    ],
    rangesNote: "القيم خارج هذه المجالات تُرفض، فلا يمكن لخطأ في الكتابة أن يُسكت إنذاراً.",
    smsWho: "لا يطيع الجهاز إلا رقم هاتفك المسجَّل؛ والرسائل من أي رقم آخر تُتجاهل.",
    smsWhen: "متى تغيّرها: عندما ينتقل قطيعك إلى مرحلة جديدة. انظر إلى درجة الحرارة المستهدفة لهذا اليوم في التطبيق، ثم اضبط الحدّين الأدنى والأعلى على بعد درجات قليلة من كلّ جانب. وإذا لم تعرف الأرقام التي تختارها فاسألنا.",
  },
};
for (const k of Object.keys(SMSLIM)) Object.assign(C[k], SMSLIM[k]);

// Tone pass. A manual helps the reader succeed with the product; it is not a
// disclaimer. Sponsors and credentials belong on the website, not here.
const TONE = {
  en: {
    notH: "What stays in your hands",
    notP: "Filaha Flock watches and warns; you decide and act. Fans, heaters and feeders stay under your control, and your veterinarian and good ventilation remain your best allies.",
    honestH: "Getting the most from Filaha Flock",
    honest: [
      "Put the sensors where the birds are. The box measures the air where it hangs, so its position matters.",
      "Follow your flock's stage. Text new limits when your birds reach a new phase (page 5).",
      "Look at the app once a day. A minute with the readings and today's target shows how the house is doing, before any alert.",
      "Keep your phone ready. Alerts go to the registered number: keep it charged, with signal, and let the box's call ring through.",
      "Read ammonia as a trend. Watch whether NH₃ is rising, falling or steady, and set its limit to suit your flock.",
      "Tell us what you see. Your feedback shapes what we build next.",
    ],
  },
  fr: {
    notH: "Ce qui reste entre vos mains",
    notP: "Filaha Flock surveille et prévient ; vous décidez et agissez. Ventilateurs, chauffages et mangeoires restent sous votre contrôle, et le vétérinaire comme une bonne ventilation restent vos meilleurs alliés.",
    honestH: "Tirer le meilleur de Filaha Flock",
    honest: [
      "Placez les sondes là où sont les oiseaux. Le boîtier mesure l'air à l'endroit où il est accroché : l'emplacement compte.",
      "Suivez le stade de votre cheptel. Envoyez de nouveaux seuils par SMS quand vos oiseaux changent de phase (page 5).",
      "Ouvrez l'application une fois par jour. Une minute devant les mesures et la cible du jour montre où en est le bâtiment, avant toute alerte.",
      "Gardez votre téléphone prêt. Les alertes vont au numéro enregistré : chargé, avec du réseau, et laissez sonner l'appel du boîtier.",
      "Lisez l'ammoniac comme une tendance. Regardez s'il monte, descend ou reste stable, et réglez son seuil selon votre cheptel.",
      "Dites-nous ce que vous observez. Vos retours orientent ce que nous construisons ensuite.",
    ],
  },
  ar: {
    notH: "ما يبقى بين يديك",
    notP: "فلاحة فلوك يراقب وينبّه؛ وأنت تقرّر وتتصرّف. تبقى المراوح والمدافئ والمعالف تحت تحكّمك، ويبقى الطبيب البيطري والتهوية الجيدة خير عونٍ لك.",
    honestH: "كيف تستفيد من فلاحة فلوك إلى أقصى حدّ",
    honest: [
      "ضع الحسّاسات حيث الطيور. الجهاز يقيس الهواء في مكان تعليقه، فمكانه مهمّ.",
      "تابع مرحلة قطيعك. أرسل حدوداً جديدة برسالة نصية عندما ينتقل قطيعك إلى مرحلة جديدة (الصفحة 5).",
      "افتح التطبيق مرّة في اليوم. دقيقة أمام القراءات وهدف اليوم تُريك حال القاعة قبل أي تنبيه.",
      "أبقِ هاتفك جاهزاً. التنبيهات تصل إلى الرقم المسجَّل: اشحنه وأبقه في تغطية، ودَع مكالمة الجهاز ترنّ.",
      "اقرأ الأمونيا كاتّجاه. راقب هل ترتفع أم تنخفض أم تستقر، واضبط حدّها بما يناسب قطيعك.",
      "أخبرنا بما تلاحظه. ملاحظاتك تصنع ما نبنيه بعد ذلك.",
    ],
  },
};
for (const k of Object.keys(TONE)) Object.assign(C[k], TONE[k]);



const SUB = { "₂": "<sub>2</sub>", "₃": "<sub>3</sub>" };

// Escape, set subscripts as markup (a Unicode subscript can print as a black
// box in some fonts), and in Arabic isolate every Latin/number run so
// "38 °C", "CO2" and the phone number never reorder inside RTL text.
function t(s, rtl) {
  let out = s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  if (rtl) {
    out = out.replace(
      /(\(?[A-Za-z0-9+][A-Za-z0-9₂₃ .,%°\/+@:\-]*[A-Za-z0-9₂₃%°]\)?|\(?[A-Za-z0-9₂₃]\)?)/g,
      (m) => `<bdi dir="ltr">${m}</bdi>`
    );
  }
  return out.replace(/[₂₃]/g, (c) => SUB[c]);
}

function header(L) {
  return `<div class="head">
    <span class="brand">Filaha <b>Flock</b></span>
    <span class="docname">${t(L.docKind, L.dir === "rtl")}</span>
  </div>`;
}
function footer(L, n, total) {
  return `<div class="foot"><span>${WEB} · ${t(L.edition, L.dir === "rtl")}</span><span>${t(L.page, L.dir === "rtl")} <bdi dir="ltr">${n} / ${total}</bdi></span></div>`;
}

function build(L) {
  const R = L.dir === "rtl";
  const x = (s) => t(s, R);
  const TOTAL = 7;

  const defRows = (rows) =>
    rows.map(([a, b]) => `<div class="def"><dt>${x(a)}</dt><dd>${x(b)}</dd></div>`).join("");
  const table = (head, rows, cls = "") =>
    `<table class="${cls}"><thead><tr>${head.map((h) => `<th>${x(h)}</th>`).join("")}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${x(c)}</th>` : `<td>${x(c)}</td>`)).join("")}</tr>`)
      .join("")}</tbody></table>`;
  const ul = (items) => `<ul>${items.map((i) => `<li>${x(i)}</li>`).join("")}</ul>`;

  const pages = [];

  // 1 — what it is
  pages.push(`
    ${header(L)}
    <h1>${x(L.title)}</h1>
    <p class="for">${x(L.forWho)}</p>
    <div class="body">
      ${L.intro.map((p) => `<p>${x(p)}</p>`).join("")}
      <h2>${x(L.alertH)}</h2>
      <ol class="steps">${L.steps.map((s) => `<li>${x(s)}</li>`).join("")}</ol>
      <h2>${x(L.glanceH)}</h2>
      <dl class="glance">${defRows(L.glance)}</dl>
      <h2>${x(L.notH)}</h2>
      <p>${x(L.notP)}</p>
    </div>
    @@FOOT@@`);

  // 2 — what you receive, what we need
  pages.push(`
    ${header(L)}
    <h2 class="top">${x(L.recvH)}</h2>
    <dl>${defRows(L.recv)}</dl>
    <h2>${x(L.needH)}</h2>
    ${ul(L.need)}
    <h2>${x(L.dayOneH)}</h2>
    <ol class="timeline">${L.dayOne.map((s) => `<li>${x(s)}</li>`).join("")}</ol>
    @@FOOT@@`);

  // 3 — the age of the flock, the app, and the box's limits (BEFORE the device details)
  pages.push(`
    ${header(L)}
    <h2 class="top">${x(L.ageH)}</h2>
    <p>${x(L.ageIntro)}</p>
    <dl>${defRows(L.ageDefs)}</dl>
    <p class="note first" style="margin-top:7mm">${x(L.ageCap)}</p>
    ${table(L.ageHead, L.ageRows, "agetable")}
    <p class="note">${x(L.ageNote)}</p>
    <p>${x(L.ageEnd)}</p>
    @@FOOT@@`);

  // 3b — how the box watches, and when it warns you
  pages.push(`
    ${header(L)}
    <h2 class="top">${x(L.watchH)}</h2>
    <p>${x(L.cadence)}</p>
    ${table(L.tHead, L.tRows, "limits")}
    <p class="note">${x(L.tNote)}</p>
    <h2>${x(L.reachH)}</h2>
    <dl>${defRows(L.reach)}</dl>
    <p class="note">${x(L.retry)}</p>
    @@FOOT@@`);

  // 4 — setting the limits by text message
  pages.push(`
    ${header(L)}
    <h2 class="top">${x(L.smsH)}</h2>
    <p>${x(L.smsIntro)}</p>
    ${table(L.smsHead, L.smsRows, "smscmds")}
    <p class="note">${x(L.smsEx)}</p>
    <p>${x(L.smsReply)}</p>
    <h2>${x(L.rangesH)}</h2>
    <dl class="ranges">${defRows(L.ranges)}</dl>
    <p class="note" style="margin-top:3mm">${x(L.rangesNote)} ${x(L.smsWho)}</p>
    <p>${x(L.smsWhen)}</p>
    @@FOOT@@`);

  // 4 — the other situations
  pages.push(`
    ${header(L)}
    <h2 class="top">${x(L.moreH[0][0])}</h2>
    <p>${x(L.moreH[0][1])}</p>
    <h2>${x(L.moreH[1][0])}</h2>
    <p>${x(L.moreH[1][1])}</p>
    <h2>${x(L.moreH[2][0])}</h2>
    <p>${x(L.moreH[2][1])}</p>
    <h2>${x(L.dayH)}</h2>
    <p>${x(L.screenP)}</p>
    ${table(L.bHead, L.bRows, "buttons")}
    <p class="note">${x(L.sounds)}</p>
    @@FOOT@@`);

  // 5 — the app, care
  pages.push(`
    ${header(L)}
    <div class="app">
      <div>
        <h2 class="top">${x(L.appH)}</h2>
        <p>${x(L.appP)}</p>
        <h2>${x(L.careH)}</h2>
        ${ul(L.care)}
      </div>
      <figure>
        <img src="../assets/app_dashboard.jpg" alt="" />
        <figcaption>${x(L.appCap)}</figcaption>
      </figure>
    </div>
    <h2>${x(L.honestH)}</h2>
    ${ul(L.honest)}
    @@FOOT@@`);

  // 6 — if something looks wrong, honest, contact
  pages.push(`
    ${header(L)}
    <h2 class="top">${x(L.fixH)}</h2>
    ${table(L.fHead, L.fRows, "fix")}
    <h2>${x(L.contactH)}</h2>
    <dl class="contact">${L.contact.map(([a, b]) => `<div class="def"><dt>${x(a)}</dt><dd><bdi dir="ltr">${b}</bdi></dd></div>`).join("")}</dl>
    @@FOOT@@`);

  // 7 — the record
  const line = (label) => `<div class="field"><span>${x(label)}</span><i></i></div>`;
  const choice = ([label, opts]) =>
    `<div class="field choice"><span>${x(label)}</span><em>${opts.map((o) => `<b><u></u>${x(o)}</b>`).join("")}</em></div>`;
  pages.push(`
    ${header(L)}
    <h2 class="top">${x(L.recH)}</h2>
    <p class="note first">${x(L.recNote)}</p>
    <div class="fields">${L.recFields.map(line).join("")}</div>
    ${choice(L.recChoice1)}
    ${choice(L.recChoice2)}
    <div class="field notes"><span>${x(L.recNotes)}</span><i></i><i></i><i></i><i></i><i></i></div>
    @@FOOT@@`);

  return `<!doctype html>
<html lang="${L.lang}" dir="${L.dir}">
<head>
<meta charset="utf-8" />
<title>Filaha Flock — ${L.docKind}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="guide.css" />
</head>
<body class="${L.lang}">
${pages.map((p, i) => `<section class="page">${p.replace("@@FOOT@@", footer(L, i + 1, pages.length))}</section>`).join("\n")}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────
//  INTERNATIONAL EDITION
//  Same guide with every Algeria-specific reference removed. Three kinds of
//  change, and only these:
//    1. named places and programmes (Algeria, Biskra, wilaya, "Algerian ...");
//    2. wording that only holds for Algerian farms: "our team installs", the
//       support languages, and SIM / network coverage;
//    3. nothing else - the product facts are identical.
//  The installation steps are written without saying WHO does them, because
//  how a farm abroad is installed has not been defined yet.
// ─────────────────────────────────────────────────────────────────
const INTL = {
  en: {
    edition: "Version 1 · October 2026 · International edition",
    forWho: "For poultry farmers",
    recvPatch: {
      1: ["Installation", "Mounting, sensors, power, antenna, alert number and app set-up: the steps are listed below, and the arrangements for your farm are agreed when you order."],
      3: ["Warranty and support", "Included with the box. You can reach us by phone, WhatsApp and email."],
    },
    needPatch: {
      1: "Mobile coverage at the spot, from an operator that supports the box. We confirm that your country's networks are supported before you order, and check the signal at installation.",
    },
    dayOneH: "Installation",
    dayOne: [
      "The mobile signal is checked at the spot, and the place for the box and the sensors is chosen.",
      "The box is mounted on the wall and the sensors are placed at bird height.",
      "The power and the antenna are connected, and the battery is checked to be in place.",
      "Your alert phone number is registered and the app is set up on your phone, with your breed and the day the chicks arrived.",
      "A test is sent with the red button: the test SMS arriving on your phone proves the whole path works.",
    ],
    reachPatch: { 1: ["SMS", "A short message, currently in Arabic or French, written to be read in a few seconds."] },
    honestPatch: {},
    contactDropLast: true,
    recFieldPatch: { 1: "Region" },
    ageNote: "The app fills in the days between; layers, turkeys and local breeds have their own schedules. These are guidance targets from the main breeders' guides and technical sources, not alarm limits.",
  },
  fr: {
    edition: "Version 1 · octobre 2026 · Édition internationale",
    forWho: "Pour les éleveurs de volailles",
    recvPatch: {
      1: ["L'installation", "Fixation, sondes, alimentation, antenne, numéro d'alerte, application : étapes détaillées plus bas ; modalités convenues à la commande."],
      3: ["Garantie et support", "Inclus avec le boîtier. Vous nous joignez par téléphone, WhatsApp et e-mail."],
    },
    needPatch: {
      1: "Une couverture mobile sur place, auprès d'un opérateur compatible. Nous confirmons avant la commande que les réseaux de votre pays sont pris en charge, et vérifions le signal à l'installation.",
    },
    dayOneH: "L'installation",
    dayOne: [
      "Le signal mobile est vérifié sur place, et l'emplacement du boîtier et des sondes est choisi.",
      "Le boîtier est fixé au mur et les sondes sont placées à hauteur des animaux.",
      "L'alimentation et l'antenne sont branchées, et la présence de la batterie est vérifiée.",
      "Votre numéro d'alerte est enregistré et l'application configurée, avec votre race et le jour d'arrivée des poussins.",
      "Un test est lancé avec le bouton rouge : le SMS de test qui arrive sur votre téléphone prouve que toute la chaîne fonctionne.",
    ],
    reachPatch: { 1: ["Le SMS", "Un message court, actuellement en arabe ou en français, écrit pour être lu en quelques secondes."] },
    honestPatch: {},
    contactDropLast: true,
    recFieldPatch: { 1: "Région" },
    ageNote: "L'application complète les jours intermédiaires ; les pondeuses, les dindes et les races locales ont leurs propres courbes. Ce sont des objectifs de référence, tirés des guides des sélectionneurs et de sources techniques, pas des seuils d'alarme.",
  },
  ar: {
    edition: "الإصدار 1 · أكتوبر 2026 · النسخة الدولية",
    forWho: "لمربّي الدواجن",
    recvPatch: {
      1: ["التركيب", "التثبيت ووضع الحسّاسات والكهرباء والهوائي ورقم التنبيهات وإعداد التطبيق: الخطوات مذكورة أدناه، ويُتَّفق على ترتيبات مزرعتك عند الطلب."],
      3: ["الضمان والدعم", "مشمولان مع الجهاز. تتصل بنا بالهاتف أو واتساب أو البريد الإلكتروني."],
    },
    needPatch: {
      1: "تغطية شبكة الهاتف في المكان، من مشغّل يدعم الجهاز. نتأكد قبل الطلب من أنّ شبكات بلدك مدعومة، ونفحص الإشارة عند التركيب.",
    },
    dayOneH: "التركيب",
    dayOne: [
      "تُفحص إشارة شبكة الهاتف في المكان ويُختار موضع الجهاز والحسّاسات.",
      "يُثبَّت الجهاز على الحائط وتوضع الحسّاسات على ارتفاع الدجاج.",
      "تُوصَّل الكهرباء والهوائي ويُتأكَّد من وجود البطارية في مكانها.",
      "يُسجَّل رقم هاتفك للتنبيهات ويُعدّ التطبيق في هاتفك، مع سلالتك ويوم وصول الكتاكيت.",
      "يُجرى اختبار بالزرّ الأحمر: وصول رسالة الاختبار إلى هاتفك يثبت أنّ المسار كلّه يعمل.",
    ],
    reachPatch: { 1: ["الرسالة", "رسالة قصيرة، بالعربية أو الفرنسية حالياً، مكتوبة لتُقرأ في ثوانٍ."] },
    honestPatch: {},
    contactDropLast: true,
    recFieldPatch: { 1: "المنطقة" },
    ageNote: "يملأ التطبيق الأيام الواقعة بينها، وللدجاج البيّاض والديك الرومي والسلالات المحلية جداولها الخاصة. هذه أهداف إرشادية من أدلّة كبرى شركات الانتقاء ومن مصادر تقنية، وليست حدود إنذار.",
  },
};

function intlOf(base, o) {
  const L = JSON.parse(JSON.stringify(base));
  L.edition = o.edition;
  L.forWho = o.forWho;
  for (const [i, v] of Object.entries(o.recvPatch)) L.recv[i] = v;
  for (const [i, v] of Object.entries(o.needPatch)) L.need[i] = v;
  L.dayOneH = o.dayOneH;
  L.dayOne = o.dayOne;
  for (const [i, v] of Object.entries(o.reachPatch)) L.reach[i] = v;
  for (const [i, v] of Object.entries(o.honestPatch)) L.honest[i] = v;
  if (o.contactDropLast) L.contact = L.contact.slice(0, -1);
  for (const [i, v] of Object.entries(o.recFieldPatch)) L.recFields[i] = v;
  L.ageNote = o.ageNote;
  return L;
}

const outDir = path.join(__dirname, "build");
fs.mkdirSync(outDir, { recursive: true });
for (const k of Object.keys(C)) {
  fs.writeFileSync(path.join(outDir, `guide-${k}.html`), build(C[k]));
  console.log("built", `guide-${k}.html`);
  fs.writeFileSync(path.join(outDir, `guide-intl-${k}.html`), build(intlOf(C[k], INTL[k])));
  console.log("built", `guide-intl-${k}.html`);
}
