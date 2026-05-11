/**
 * Curated poultry farming guidance for Algerian smallholders and commercial farms.
 * Sources cross-referenced with standard broiler/layer management practice
 * (Cobb 500, Ross 308, ISA Brown) adapted for Algerian climate and conditions.
 *
 * NOT medical/veterinary advice — practical guidance only. Always consult a
 * qualified vet for diagnostics or treatment decisions.
 */

export const DAILY_TASKS = [
  {
    id: 'water',
    icon: 'droplet',
    title: { ar: 'الماء', en: 'Check water', fr: "Vérifier l'eau" },
    detail: {
      ar: 'تأكد أن الماء نظيف وبارد ومتوفر دائماً. اغسل المسقايات كل صباح. الدجاجة تشرب ضعف ما تأكل.',
      en: 'Water must be clean, cool, and always accessible. Wash drinkers every morning. Birds drink ~2× their feed intake.',
      fr: "L'eau doit être propre, fraîche et toujours accessible. Nettoyer les abreuvoirs chaque matin.",
    },
  },
  {
    id: 'feed',
    icon: 'feather',
    title: { ar: 'العلف', en: 'Check feed', fr: "Vérifier l'aliment" },
    detail: {
      ar: 'تأكد أن العلف طازج وغير متعفّن. لا تترك علفاً رطباً. وزّع العلف 4 إلى 6 مرات في اليوم للصيصان أقل من أسبوعين.',
      en: 'Verify feed is fresh and not moldy. Never leave wet feed. Distribute 4–6 times daily for chicks under 14 days.',
      fr: "L'aliment doit être frais et sans moisissures. Distribuer 4–6 fois par jour pour les poussins.",
    },
  },
  {
    id: 'walk',
    icon: 'activity',
    title: { ar: 'جولة بين القطيع', en: 'Walk through the flock', fr: 'Parcourir le poulailler' },
    detail: {
      ar: 'تجوّل ببطء بين الدجاج كل صباح. لاحظ الطيور الكسولة أو المنفوشة أو التي تنعزل. هذه أولى علامات المرض.',
      en: 'Walk slowly through the flock every morning. Look for lethargic, fluffed-up, or isolated birds — these are early disease signs.',
      fr: "Marcher lentement chaque matin. Repérer les oiseaux léthargiques, ébouriffés ou isolés.",
    },
  },
  {
    id: 'temperature',
    icon: 'thermometer',
    title: { ar: 'درجة الحرارة', en: 'Check temperature', fr: 'Vérifier la température' },
    detail: {
      ar: 'الحرارة تتغيّر مع العمر. الصيصان في الأسبوع الأول تحتاج 32 إلى 34 درجة. الدجاج الكبير يحبّ 18 إلى 24 درجة.',
      en: 'Temperature must match age. Chicks (1–7 days) need 32–34°C. Adult birds prefer 18–24°C.',
      fr: "Adapter à l'âge. Poussins (1–7 jours) : 32–34°C. Adultes : 18–24°C.",
    },
  },
  {
    id: 'ventilation',
    icon: 'wind',
    title: { ar: 'التهوية', en: 'Check ventilation', fr: 'Vérifier la ventilation' },
    detail: {
      ar: 'إذا شممت رائحة الأمونيا قويّة، فالتهوية ضعيفة. افتح الشبابيك شيئاً فشيئاً. الهواء الراكد يجلب أمراض الجهاز التنفسي.',
      en: 'Strong ammonia smell means poor ventilation. Open vents gradually. Stagnant air causes respiratory disease.',
      fr: "Forte odeur d'ammoniac = mauvaise ventilation. Ouvrir progressivement.",
    },
  },
  {
    id: 'dead',
    icon: 'alertCircle',
    title: { ar: 'إزالة الطيور الميتة', en: 'Remove dead birds', fr: 'Retirer les morts' },
    detail: {
      ar: 'انزع أي طائر ميت في الحال وادفنه أو أحرقه بعيداً عن المزرعة. الجثث تنقل الأمراض بسرعة.',
      en: 'Remove dead birds immediately. Bury or burn far from the farm. Carcasses spread disease rapidly.',
      fr: 'Retirer les oiseaux morts immédiatement, loin de la ferme.',
    },
  },
  {
    id: 'litter',
    icon: 'shield',
    title: { ar: 'الفرشة', en: 'Inspect litter', fr: 'Inspecter la litière' },
    detail: {
      ar: 'الفرشة يجب أن تكون جافّة وهشّة. إن كانت رطبة أو متكتّلة فاقلبها أو غيّرها. الفرشة الرطبة = أمونيا + مرض.',
      en: 'Litter must be dry and friable. If wet or caked, turn it or replace it. Wet litter = ammonia + disease.',
      fr: 'Litière sèche et meuble. Si humide, retourner ou remplacer.',
    },
  },
];

export const AGE_PHASES = [
  {
    id: 'brooding',
    range: { ar: 'اليوم 1 إلى 7', en: 'Day 1–7', fr: 'Jours 1–7' },
    title: { ar: 'مرحلة الحضانة', en: 'Brooding phase', fr: 'Phase de démarrage' },
    color: '#fb923c',
    targetTemp: '32–34°C',
    keyPoints: {
      ar: [
        'الحرارة بين 32 و34 درجة، تنزل بدرجتين كل أسبوع',
        'الإضاءة 23 ساعة في اليوم وساعة ظلام',
        'علف "بادئ" نسبة البروتين فيه 22 إلى 23 بالمائة',
        'ماء فاتر بحرارة الغرفة، ليس بارداً',
        'كثافة 25 إلى 30 صوصاً في المتر المربع',
        'راقب سلوك الصيصان: إذا تكدّست في الوسط فالجو بارد، إذا تباعدت بعيداً فالجو حارّ',
      ],
      en: [
        'Temperature 32–34°C, drop 2°C per week',
        'Lighting 23h/day with 1h darkness',
        'Starter feed 22–23% protein',
        'Lukewarm water at room temperature, not cold',
        'Density 25–30 chicks per m²',
        'Watch chick behavior: huddling in center = cold, spreading out = hot',
      ],
      fr: [
        'Température 32–34°C, baisser de 2°C par semaine',
        'Éclairage 23h/jour avec 1h d\'obscurité',
        'Aliment démarrage 22–23% protéine',
        'Eau tiède, pas froide',
        'Densité 25–30 poussins par m²',
        'Observer : entassés au centre = froid, dispersés = chaud',
      ],
    },
  },
  {
    id: 'grower',
    range: { ar: 'اليوم 8 إلى 21', en: 'Day 8–21', fr: 'Jours 8–21' },
    title: { ar: 'مرحلة النموّ', en: 'Grower phase', fr: 'Phase de croissance' },
    color: '#facc15',
    targetTemp: '24–28°C',
    keyPoints: {
      ar: [
        'الحرارة تصل إلى 28 درجة في اليوم 14، ثم 24 درجة في اليوم 21',
        'الإضاءة 20 ساعة في اليوم و4 ساعات ظلام للنوم',
        'علف "نموّ" نسبة البروتين فيه 20 بالمائة',
        'كثافة 15 إلى 18 طيراً في المتر المربع',
        'لقاح الغامبورو يُعطى في اليوم 14',
        'الوزن المستهدف في اليوم 21: من 380 إلى 450 غرام لسلالة كوب 500',
      ],
      en: [
        'Temperature 28°C by day 14, 24°C by day 21',
        'Lighting 20h with 4h darkness for sleep',
        'Grower feed 20% protein',
        'Density 15–18 birds per m²',
        'Gumboro vaccine on day 14',
        'Target weight 380–450 g by day 21 (Cobb 500)',
      ],
      fr: [
        'Température 28°C à jour 14, 24°C à jour 21',
        'Éclairage 20h avec 4h de sommeil',
        'Aliment croissance 20% protéine',
        'Densité 15–18 oiseaux par m²',
        'Vaccin Gumboro au jour 14',
        'Poids cible 380–450 g à jour 21 (Cobb 500)',
      ],
    },
  },
  {
    id: 'finisher',
    range: { ar: 'اليوم 22 إلى 42', en: 'Day 22–42', fr: 'Jours 22–42' },
    title: { ar: 'مرحلة التسمين', en: 'Finisher phase', fr: 'Phase de finition' },
    color: '#22d3ee',
    targetTemp: '18–22°C',
    keyPoints: {
      ar: [
        'الحرارة بين 18 و22 درجة، مع تهوية قوية',
        'علف "ناهي" نسبة البروتين فيه 18 إلى 19 بالمائة',
        'الإضاءة بين 18 و20 ساعة',
        'كثافة 10 إلى 12 طيراً في المتر المربع',
        'وزن السوق في اليوم 42: من 2.0 إلى 2.4 كيلو',
        'أوقف الأدوية 7 أيام قبل الذبح (فترة السحب)',
      ],
      en: [
        'Temperature 18–22°C with strong ventilation',
        'Finisher feed 18–19% protein',
        'Lighting 18–20 hours',
        'Density 10–12 birds per m²',
        'Market weight 2.0–2.4 kg by day 42',
        'Stop medication 7 days before slaughter (withdrawal period)',
      ],
      fr: [
        'Température 18–22°C avec ventilation forte',
        'Aliment finition 18–19% protéine',
        'Éclairage 18–20 heures',
        'Densité 10–12 oiseaux par m²',
        'Poids marché 2.0–2.4 kg à jour 42',
        'Arrêt médicaments 7 jours avant abattage (délai de retrait)',
      ],
    },
  },
];

export const TOPICS = [
  {
    id: 'temperature',
    icon: 'thermometer',
    color: '#fb923c',
    titleKey: 'topicTemperature',
    summary: {
      ar: 'الحرارة هي العامل الأول الذي يحدد بقاء الصيصان ونموها',
      en: 'Temperature is the #1 factor for chick survival and growth',
      fr: 'La température est le facteur n°1 pour la survie et la croissance',
    },
    sections: {
      ar: [
        { h: 'الحرارة المثالية حسب العمر',
          b: 'اليوم 1: 33-35°م • الأسبوع 1: 30-32°م • الأسبوع 2: 28-30°م • الأسبوع 3: 24-26°م • بعد ذلك: 18-22°م' },
        { h: 'علامات أن الحرارة غير مناسبة',
          b: 'الصيصان متكدسة تحت المدفأة = برد. الصيصان متباعدة بعيداً عن المصدر = حر. كلها متوزعة بانتظام = ممتاز.' },
        { h: 'في فصل الصيف الجزائري',
          b: 'افتح كل النوافذ في الفجر. ضع مراوح. رش الأسقف بالماء. أعطي الطيور إلكتروليت في الماء. الذروة بين 12-16 ساعة.' },
        { h: 'في فصل الشتاء',
          b: 'استخدم تدفئة الغاز أو الكهرباء. لا تغلق التهوية كلياً (الأمونيا سترتفع). راقب الفرشة من الرطوبة.' },
      ],
      en: [
        { h: 'Optimal temperature by age',
          b: 'Day 1: 33–35°C • Week 1: 30–32°C • Week 2: 28–30°C • Week 3: 24–26°C • After: 18–22°C' },
        { h: 'Signs the temperature is wrong',
          b: 'Chicks huddled under heater = cold. Chicks spread far from heat = hot. Evenly distributed = perfect.' },
        { h: 'In Algerian summer',
          b: 'Open all vents at dawn. Use fans. Spray roofs with water. Add electrolytes to water. Peak heat 12:00–16:00.' },
        { h: 'In winter',
          b: 'Use gas or electric heaters. Never fully close vents (ammonia builds up). Watch litter for moisture.' },
      ],
      fr: [
        { h: "Température optimale par âge",
          b: 'Jour 1: 33–35°C • Semaine 1: 30–32°C • Semaine 2: 28–30°C • Semaine 3: 24–26°C • Après: 18–22°C' },
        { h: 'Signes que la température est mauvaise',
          b: 'Poussins entassés sous le chauffage = froid. Poussins éloignés = chaud. Bien répartis = parfait.' },
        { h: "En été algérien",
          b: "Ouvrir tous les évents à l'aube. Utiliser des ventilateurs. Asperger les toits. Ajouter des électrolytes à l'eau. Pic 12h–16h." },
        { h: 'En hiver',
          b: "Utiliser chauffages gaz ou électriques. Ne jamais fermer la ventilation. Surveiller l'humidité de la litière." },
      ],
    },
  },
  {
    id: 'ventilation',
    icon: 'wind',
    color: '#22d3ee',
    titleKey: 'topicVentilation',
    summary: {
      ar: 'التهوية الجيدة تمنع الأمونيا، تقلل الأمراض، وتزيد النمو',
      en: 'Good ventilation prevents ammonia, reduces disease, boosts growth',
      fr: 'Une bonne ventilation prévient les maladies et booste la croissance',
    },
    sections: {
      ar: [
        { h: 'حدود الغازات الآمنة',
          b: 'الأمونيا (NH3) أقل من 25 جزء/مليون. ثاني أكسيد الكربون (CO2) أقل من 3000 جزء/مليون. إذا تجاوزت هذه القيم، الإنتاج سينخفض والوفيات سترتفع.' },
        { h: 'كيف تعرف أن الأمونيا مرتفعة',
          b: 'إذا انحنيت إلى مستوى الدجاج وشعرت بحرقة في عينيك أو حلقك = الأمونيا فوق 25. هذا يدمر الرئتين ويفتح الباب للأمراض.' },
        { h: 'حلول عملية',
          b: 'افتح النوافذ ولو قليلاً حتى في الشتاء. غير الفرشة الرطبة فوراً. لا تكتظ الدجاج. استخدم مراوح سقفية للتدوير.' },
      ],
      en: [
        { h: 'Safe gas levels',
          b: 'Ammonia (NH3) below 25 ppm. CO2 below 3000 ppm. Above these, production drops and mortality rises.' },
        { h: 'How to detect high ammonia',
          b: 'Crouch to bird level. Burning eyes or throat = NH3 above 25 ppm. This damages lungs and opens the door to disease.' },
        { h: 'Practical solutions',
          b: 'Crack vents open even in winter. Replace wet litter immediately. Avoid overcrowding. Use ceiling fans for circulation.' },
      ],
      fr: [
        { h: 'Niveaux sûrs',
          b: 'Ammoniac (NH3) < 25 ppm. CO2 < 3000 ppm. Au-dessus, la production chute et la mortalité monte.' },
        { h: "Détecter l'ammoniac",
          b: 'Se baisser au niveau des oiseaux. Yeux ou gorge qui brûlent = NH3 > 25 ppm. Cela endommage les poumons.' },
        { h: 'Solutions pratiques',
          b: "Entrouvrir les évents même en hiver. Remplacer la litière humide. Éviter la surdensité. Ventilateurs de plafond pour brassage." },
      ],
    },
  },
  {
    id: 'vaccination',
    icon: 'shield',
    color: '#10b981',
    titleKey: 'topicVaccination',
    summary: {
      ar: 'برنامج التطعيم القياسي في الجزائر للدجاج اللاحم',
      en: 'Standard vaccination program for broilers in Algeria',
      fr: 'Programme de vaccination standard pour poulets de chair',
    },
    sections: {
      ar: [
        { h: 'اليوم 1', b: 'لقاح نيوكاسل + التهاب الشعب الهوائية (HB1 + H120) — رش أو في ماء الشرب' },
        { h: 'اليوم 7', b: 'إعادة لقاح نيوكاسل (Lasota) في ماء الشرب' },
        { h: 'اليوم 14', b: 'لقاح غامبورو (IBD) — في ماء الشرب' },
        { h: 'اليوم 21', b: 'إعادة لقاح نيوكاسل (Lasota) + IB إذا كانت المنطقة موبوءة' },
        { h: 'اليوم 28', b: 'تعزيز غامبورو إذا لزم الأمر' },
        { h: 'ملاحظات', b: 'لا تخلط اللقاحات بالكلور. اللقاح يجب أن يستخدم خلال ساعتين من الفتح. احفظ في الثلاجة 2-8°م. اطلب نصيحة بيطري للتعديل حسب الوضع المحلي.' },
      ],
      en: [
        { h: 'Day 1', b: 'Newcastle + IB (HB1 + H120) — spray or in drinking water' },
        { h: 'Day 7', b: 'Newcastle booster (Lasota) in drinking water' },
        { h: 'Day 14', b: 'Gumboro (IBD) — in drinking water' },
        { h: 'Day 21', b: 'Newcastle booster (Lasota) + IB if region is at risk' },
        { h: 'Day 28', b: 'Gumboro booster if needed' },
        { h: 'Notes', b: 'Never mix vaccines with chlorinated water. Use within 2 hours of opening. Store at 2–8°C. Consult a local vet for adjustments.' },
      ],
      fr: [
        { h: 'Jour 1', b: 'Newcastle + IB (HB1 + H120) — pulvérisation ou eau de boisson' },
        { h: 'Jour 7', b: 'Rappel Newcastle (Lasota)' },
        { h: 'Jour 14', b: 'Gumboro (IBD) — eau de boisson' },
        { h: 'Jour 21', b: 'Rappel Newcastle + IB si zone à risque' },
        { h: 'Jour 28', b: 'Rappel Gumboro si nécessaire' },
        { h: 'Notes', b: "Ne jamais mélanger avec eau chlorée. Utiliser dans les 2h. Stocker à 2–8°C. Consulter un vétérinaire local." },
      ],
    },
  },
  {
    id: 'health',
    icon: 'heart',
    color: '#ef4444',
    titleKey: 'topicHealth',
    summary: {
      ar: 'علامات المرض المبكرة وكيفية الوقاية',
      en: 'Early disease signs and prevention',
      fr: 'Premiers signes de maladie et prévention',
    },
    sections: {
      ar: [
        { h: 'علامات يجب أن تشعرك بالقلق',
          b: '• الطائر منعزل أو متعكش • انخفاض الأكل أو الشرب • براز مائي أو أخضر • صعوبة تنفس، عطس، حشرجة • انخفاض إنتاج البيض المفاجئ • وفيات أكثر من 1% في اليوم' },
        { h: 'الوقاية أهم من العلاج',
          b: '• حجر صحي للقطعان الجديدة • منع الزوار من دخول العنبر • تطهير الأحذية والمعدات • فأر، ذباب، طيور برية = ناقلات أمراض • ماء نظيف دائماً' },
        { h: 'متى تتصل بالبيطري',
          b: 'فوراً إذا: وفيات مرتفعة، أعراض تنفسية حادة، شلل، أو سلوك غريب. لا تخمن العلاج بنفسك — الأدوية الخاطئة تقتل أكثر.' },
      ],
      en: [
        { h: 'Warning signs',
          b: '• Isolated or fluffed-up bird • Reduced eating or drinking • Watery or green droppings • Difficulty breathing, sneezing, rales • Sudden drop in egg production • Mortality over 1% per day' },
        { h: 'Prevention beats treatment',
          b: '• Quarantine new flocks • No visitors in the house • Disinfect boots and equipment • Mice, flies, wild birds = disease vectors • Always clean water' },
        { h: 'When to call a vet',
          b: 'Immediately if: high mortality, severe respiratory signs, paralysis, or odd behavior. Do not self-medicate — wrong drugs kill more birds.' },
      ],
      fr: [
        { h: "Signes d'alerte",
          b: '• Oiseau isolé ou ébouriffé • Baisse de consommation • Fientes liquides ou vertes • Difficultés respiratoires, éternuements • Chute soudaine de la ponte • Mortalité > 1%/jour' },
        { h: 'Prévention',
          b: '• Quarantaine des nouveaux lots • Pas de visiteurs • Désinfection des bottes et équipements • Rongeurs, mouches, oiseaux sauvages = vecteurs • Eau toujours propre' },
        { h: 'Appeler le vétérinaire',
          b: "Immédiatement si: mortalité élevée, signes respiratoires graves, paralysie. Ne pas s'auto-médicamenter." },
      ],
    },
  },
  {
    id: 'summer',
    icon: 'sun',
    color: '#f59e0b',
    titleKey: 'topicSummer',
    summary: {
      ar: 'الصيف الجزائري قاتل للدواجن — كيف تنقذ قطيعك',
      en: 'Algerian summer kills poultry — how to save your flock',
      fr: "L'été algérien est mortel pour la volaille — comment sauver votre troupeau",
    },
    sections: {
      ar: [
        { h: 'علامات الإجهاد الحراري',
          b: 'الطيور تتنفس بفم مفتوح، أجنحة مفتوحة، خمول، انخفاض الأكل، شرب مفرط، وفيات مفاجئة (خاصة الطيور الكبيرة الأثقل).' },
        { h: 'إجراءات عاجلة',
          b: '• ارش السقف بالماء (تبخير = تبريد) • أضف مراوح • أضف ملح + سكر + فيتامين C في الماء (إلكتروليت) • قلل العلف في الذروة، وزع في الفجر والمساء • قلل الكثافة' },
        { h: 'استعداد قبل الصيف',
          b: '• اعزل السقف بالعزل الحراري • اطل السقف بالأبيض • تأكد أن المراوح تعمل قبل يونيو • خزن الإلكتروليت • جدول البيع بحيث لا يكون الدجاج كبيراً في يوليو وأغسطس' },
      ],
      en: [
        { h: 'Heat stress signs',
          b: 'Open-beak breathing, wings spread, lethargy, reduced eating, excessive drinking, sudden mortality (especially heavier birds).' },
        { h: 'Emergency actions',
          b: '• Spray roof with water (evaporation cools) • Add fans • Electrolytes: salt + sugar + vit C in water • Feed during dawn and evening, not midday • Reduce density' },
        { h: 'Pre-summer preparation',
          b: '• Insulate the roof • Paint roof white • Test all fans before June • Stock electrolytes • Schedule sales so birds aren\'t large in July/August' },
      ],
      fr: [
        { h: 'Signes de stress thermique',
          b: 'Respiration bec ouvert, ailes écartées, léthargie, baisse de consommation, mortalité soudaine.' },
        { h: 'Actions urgentes',
          b: "• Asperger le toit • Ajouter des ventilateurs • Électrolytes: sel + sucre + vit C dans l'eau • Alimenter à l'aube et le soir • Réduire la densité" },
        { h: "Préparation avant l'été",
          b: '• Isoler la toiture • Peindre en blanc • Tester les ventilateurs avant juin • Stocker des électrolytes • Planifier les ventes' },
      ],
    },
  },
  {
    id: 'beldi',
    icon: 'feather',
    color: '#a78bfa',
    titleKey: 'topicBeldi',
    summary: {
      ar: 'الدجاج البلدي الجزائري — مقاوم للأمراض، بطيء النمو، سعر أعلى',
      en: 'Algerian Beldi chicken — disease-resistant, slow-growing, premium price',
      fr: "Poulet Beldi algérien — résistant aux maladies, croissance lente, prix premium",
    },
    sections: {
      ar: [
        { h: 'لماذا البلدي',
          b: 'مقاوم طبيعياً للأمراض المحلية. يحتاج تجهيزات أقل (لا يحتاج تدفئة عالية). لحم وبيض ذات سعر أعلى في السوق. لكن النمو بطيء — يحتاج 4-6 أشهر بدلاً من 6 أسابيع.' },
        { h: 'متطلبات أقل',
          b: '• حرية أكبر، يمكن تربيته نصف طليق • علف 16-18% بروتين كافي • مقاوم للحرارة والبرودة • يأكل من الأرض، يقلل تكلفة العلف' },
        { h: 'تحديات',
          b: '• معدل بيض أقل (150-180 بيضة/سنة بدل 300) • وقت أطول للذبح • يحتاج حماية من الحيوانات المفترسة إذا كان طليقاً' },
      ],
      en: [
        { h: 'Why Beldi',
          b: 'Naturally resistant to local diseases. Less equipment needed (no high heating). Higher market price for meat and eggs. But slow growth — 4–6 months instead of 6 weeks.' },
        { h: 'Lower requirements',
          b: '• Can free-range or semi-range • 16–18% protein feed is enough • Heat and cold resistant • Forages, reduces feed cost' },
        { h: 'Challenges',
          b: '• Lower egg production (150–180/year vs 300) • Longer to market • Needs predator protection if free-range' },
      ],
      fr: [
        { h: 'Pourquoi le Beldi',
          b: 'Résistance naturelle aux maladies locales. Moins d\'équipement. Prix premium. Mais croissance lente — 4–6 mois.' },
        { h: 'Exigences réduites',
          b: '• Plein air possible • Aliment 16–18% protéine • Résistant au chaud et froid • Picore au sol' },
        { h: 'Défis',
          b: '• Ponte réduite (150–180/an) • Temps de croissance long • Protection contre prédateurs' },
      ],
    },
  },
];
