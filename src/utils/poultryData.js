/**
 * Filaha Flock — Algerian Poultry Reference Database
 *
 * Strain data, performance standards, feed programs, vaccination calendars,
 * price references, and wilaya climate profiles for every commercially
 * relevant poultry hybrid raised in Algeria (2025–2026).
 *
 * Two benchmarks per broiler strain:
 *  - `standard`: breeder spec (Cobb 2022, Ross 2022, Hubbard 2023, AA Plus 2023)
 *  - `algerianField`: ITELV/OFAL field surveys + 2010s wilaya studies
 *
 * Sources cross-referenced:
 *  - Cobb 500 Broiler Performance & Nutrition Supplement (Cobb-Vantress 2022)
 *  - Ross 308 Performance Objectives (Aviagen 2022)
 *  - Hubbard Efficiency Plus management guide (Hubbard 2023)
 *  - Arbor Acres Plus broiler management handbook
 *  - ISA Brown / Lohmann Brown-Classic / Hy-Line Brown / Novogen Brown management guides
 *  - Hybrid Converter / B.U.T. 6 / Nicholas Select performance objectives
 *  - ITELV "Espace Avicole" technical sheets
 *  - OFAL surveys 1999–2000 + wilaya theses (M'sila, Ouargla, Médéa, Tiaret)
 *  - ONAB hatchery & price disclosures (2023–2025)
 *  - TSA Algérie, Le Soir d'Algérie, agenceecofin, MADR price bulletins
 *  - FNAV declarations 2024–2025, CNIFA conventions
 *  - INRAA / ENSV-Alger / Blida 1 / Mostaganem academic literature
 */

// ─────────────────────────────────────────────────────────────────────
// Breed groups & strains
// ─────────────────────────────────────────────────────────────────────

export const BREEDS = ['broiler', 'layer', 'beldi', 'mixed'];

// Tier 1 strains the user can pick from at coop creation.
export const STRAINS_BY_BREED = {
  broiler: ['cobb500', 'ross308', 'hubbard_eplus', 'arbor_acres', 'sasso_slow', 'hubbard_ja57'],
  layer:   ['isa_brown', 'lohmann_brown', 'hy_line_brown', 'novogen_brown', 'bovans_brown', 'lohmann_lsl', 'hy_line_w36'],
  turkey:  ['hybrid_converter', 'but6', 'nicholas_select'],
  beldi:   ['beldi_local'],
};

export const STRAINS = {
  // ─── BROILERS ─────────────────────────────────────────────────────
  cobb500: {
    label: 'Cobb 500',
    species: 'broiler',
    owner: 'Cobb-Vantress (Tyson)',
    color: 'white',
    // Cobb 500 2022 standard, as-hatched, metric
    growth: [
      { day: 7,  weight: 202,  fcr: 0.89, intake: 180 },
      { day: 14, weight: 470,  fcr: 1.02, intake: 588 },
      { day: 21, weight: 943,  fcr: 1.21, intake: 1142 },
      { day: 28, weight: 1524, fcr: 1.36, intake: 2073 },
      { day: 35, weight: 2191, fcr: 1.50, intake: 3286 },
      { day: 42, weight: 3049, fcr: 1.63, intake: 4975 },
      { day: 49, weight: 3707, fcr: 1.78, intake: 6596 },
      { day: 56, weight: 4309, fcr: 1.93, intake: 8313 },
    ],
    yield: { carcass: 75.5, breast: 26.1, leg: 22.59, wing: 7.57, thigh: 13.55, drumstick: 9.04 },
    field: { age: 62, weight: 2300, fcr: 3.0, mortality: 11, adg: 37 },
    itelv: { age: 49, weight: 1960, fcr: 2.31, mortality: 4.94, adg: 39 },
    notes: 'Most widely placed broiler in Algeria. White, fast-feathering.',
  },
  ross308: {
    label: 'Ross 308',
    species: 'broiler',
    owner: 'Aviagen (EW Group)',
    color: 'white',
    // Ross 308 2022 performance objectives, as-hatched
    growth: [
      { day: 7,  weight: 213,  fcr: 0.78,  intake: 166 },
      { day: 14, weight: 533,  fcr: 1.005, intake: 536 },
      { day: 21, weight: 935,  fcr: 1.20,  intake: 1122 },
      { day: 28, weight: 1470, fcr: 1.35,  intake: 1984 },
      { day: 35, weight: 2100, fcr: 1.45,  intake: 3045 },
      { day: 42, weight: 2800, fcr: 1.55,  intake: 4340 },
      { day: 49, weight: 3500, fcr: 1.70,  intake: 5950 },
      { day: 56, weight: 4150, fcr: 1.85,  intake: 7677 },
    ],
    yield: { carcass: 74.5, breast: 25.5 },
    field: { age: 60, weight: 2350, fcr: 2.9, mortality: 10, adg: 39 },
    itelv: { age: 49, weight: 1960, fcr: 2.31, mortality: 4.94, adg: 39 },
    notes: 'Second-most placed broiler in Algeria. Heavier sibling Ross 708 ≈ +3%.',
  },
  hubbard_eplus: {
    label: 'Hubbard Efficiency Plus',
    species: 'broiler',
    owner: 'Hubbard (Aviagen Group)',
    color: 'white',
    // Hubbard 2023 published targets (single conventional female strategy)
    growth: [
      { day: 7,  weight: 195,  fcr: 0.88 },
      { day: 14, weight: 470,  fcr: 1.04 },
      { day: 21, weight: 920,  fcr: 1.23 },
      { day: 28, weight: 1460, fcr: 1.38 },
      { day: 35, weight: 2090, fcr: 1.49 },
      { day: 42, weight: 2800, fcr: 1.60 },
      { day: 49, weight: 3470, fcr: 1.74 },
    ],
    breederTargets: { eggsPerHHat65wk: 180, saleableChicksPerHH: 150, peakProd: 90 },
    field: { age: 60, weight: 2400, fcr: 2.85, mortality: 9, adg: 40 },
    itelv: { age: 49, weight: 1960, fcr: 2.31, mortality: 4.94 },
    notes: 'Locally produced by Hubbard Algérie (Aïn Oussera, Djelfa). Only national GP capability.',
  },
  arbor_acres: {
    label: 'Arbor Acres Plus',
    species: 'broiler',
    owner: 'Aviagen Group',
    color: 'white',
    growth: [
      { day: 7,  weight: 205,  fcr: 0.85 },
      { day: 14, weight: 520,  fcr: 1.02 },
      { day: 21, weight: 920,  fcr: 1.21 },
      { day: 28, weight: 1450, fcr: 1.36 },
      { day: 35, weight: 2080, fcr: 1.47 },
      { day: 42, weight: 2750, fcr: 1.62 },
    ],
    yield: { breast: 22 },
    field: { age: 60, weight: 2300, fcr: 2.85, mortality: 10 },
    itelv: { age: 49, weight: 1960, fcr: 2.31 },
    notes: 'Multiplied locally at Arbor Acres Algérie / Groupe Kherbouche (Aïn Fezza, Tlemcen).',
  },
  sasso_slow: {
    label: 'Sasso (T44/SA51A)',
    species: 'broiler',
    owner: 'Hendrix Genetics — Sasso',
    color: 'coloured (red/brown plumage)',
    growth: [
      { day: 28, weight: 750  },
      { day: 49, weight: 1500 },
      { day: 70, weight: 2000 },
      { day: 81, weight: 2100 },
    ],
    field: { age: 81, weight: 2100, fcr: 2.7, mortality: 5, adg: 26 },
    notes: 'Slow-growing coloured broiler — "djedj beldi" premium / Label Rouge style markets.',
  },
  hubbard_ja57: {
    label: 'Hubbard JA57 / JA87',
    species: 'broiler',
    owner: 'Hubbard',
    color: 'coloured',
    growth: [
      { day: 35, weight: 1100 },
      { day: 56, weight: 1900 },
      { day: 81, weight: 2200 },
    ],
    field: { age: 81, weight: 2200, fcr: 2.8, mortality: 4, adg: 27 },
    notes: 'Niche premium / free-range Algerian operations.',
  },

  // ─── LAYERS ───────────────────────────────────────────────────────
  isa_brown: {
    label: 'ISA Brown',
    species: 'layer',
    owner: 'Hendrix Genetics',
    color: 'brown egg',
    eggsAt72wk: 314, eggsAt80wk: 360, eggsAt90wk: 412,
    peakProd: 96, ageAt50pctLay: 147,
    avgEggWeight: 62.9, dailyFeed: 112, fcr: 2.05,
    livability72wk: 95, shellStrength: 38,
    bwAt18wk: 1500, bwEnd: 2000,
    notes: 'Brown bird, brown egg, sex-linkable at hatch. Massively imported from Spain (400k/month auth Jan 2024).',
  },
  lohmann_brown: {
    label: 'Lohmann Brown-Classic',
    species: 'layer',
    owner: 'Lohmann Breeders (EW Group)',
    color: 'brown egg',
    eggsAt72wk: 320, eggsAt80wk: 367, eggsAt90wk: 418,
    peakProd: 93, ageAt50pctLay: 145,
    avgEggWeight: 63.5, dailyFeed: 120, fcr: 2.1,
    livability72wk: 96, shellStrength: 40,
    bwAt18wk: 1560, bwEnd: 2000,
    notes: 'EU industry benchmark. Brown plumage.',
  },
  hy_line_brown: {
    label: 'Hy-Line Brown',
    species: 'layer',
    owner: 'Hy-Line International (EW Group)',
    color: 'brown egg',
    eggsAt72wk: 340, eggsAt80wk: 380, eggsAt90wk: 412, eggsAt100wk: 500,
    peakProd: 96, ageAt50pctLay: 147,
    avgEggWeight: 63, dailyFeed: 112, fcr: 2.04,
    livability72wk: 95,
    bwAt18wk: 1750, bwEnd: 1950,
    notes: 'High persistence to 100 weeks. Strong global presence.',
  },
  novogen_brown: {
    label: 'Novogen Brown',
    species: 'layer',
    owner: 'Novogen (EW Group)',
    color: 'brown egg',
    eggsAt72wk: 320, eggsAt85wk: 395,
    peakProd: 95, ageAt50pctLay: 146,
    avgEggWeight: 62.5, dailyFeed: 113, fcr: 2.05,
    livability72wk: 95,
    bwAt18wk: 1650, bwEnd: 1925,
    notes: 'French genetics. Disease-resilient. "Farm" sub-strain (March 2023) for challenging conditions.',
  },
  bovans_brown: {
    label: 'Bovans Brown',
    species: 'layer',
    owner: 'Hendrix Genetics',
    color: 'brown egg',
    eggsAt72wk: 330, eggsAt80wk: 370,
    peakProd: 95, ageAt50pctLay: 148,
    avgEggWeight: 62, dailyFeed: 114, fcr: 2.1,
    livability72wk: 94,
    notes: 'Occasionally imported into Algeria.',
  },
  lohmann_lsl: {
    label: 'Lohmann LSL-Classic',
    species: 'layer',
    owner: 'Lohmann Breeders (EW Group)',
    color: 'white egg',
    eggsAt72wk: 332, eggsAt80wk: 377, eggsAt100wk: 477,
    peakProd: 97, ageAt50pctLay: 142,
    avgEggWeight: 60.8, dailyFeed: 105, fcr: 2.0,
    livability100wk: 92,
    bwAt17wk: 1260, bwEnd: 1720,
    notes: 'White feathers, white egg. Minor in Algeria (market prefers brown).',
  },
  hy_line_w36: {
    label: 'Hy-Line W-36',
    species: 'layer',
    owner: 'Hy-Line International',
    color: 'white egg',
    eggsAt76wk: 364, peakProd: 96, ageAt50pctLay: 142,
    avgEggWeight: 61, dailyFeed: 97, fcr: 1.95,
    livability72wk: 96,
    bwEnd: 1300,
    notes: 'Most feed-efficient option (~97 g/day). Smallest carcass. White egg.',
  },

  // ─── TURKEY ───────────────────────────────────────────────────────
  hybrid_converter: {
    label: 'Hybrid Converter',
    species: 'turkey',
    owner: 'Hendrix Genetics',
    // Hens vs toms
    growth: [
      { day: 56,  weight: 4500  }, // 8 wk
      { day: 84,  weight: 7000  },
      { day: 112, weight: 11000 },
      { day: 140, weight: 18000 },
    ],
    hens: { ageWk: 15, weight: 10000, fcr: 2.27, mortality: 5 },
    toms: { ageWk: 19, weight: 20500, fcr: 2.62, mortality: 8 },
    yield: { breast: 27 },
    notes: 'Industry standard heavy turkey. ConverterNOVO is the current version.',
  },
  but6: {
    label: 'B.U.T. 6 / B.U.T. Premium',
    species: 'turkey',
    owner: 'Aviagen Turkeys',
    hens: { ageWk: 15, weight: 10000, fcr: 2.30, mortality: 5 },
    toms: { ageWk: 20, weight: 21000, fcr: 2.62, mortality: 8 },
    yield: { breast: 28 },
    notes: '"Big 6" colloquial in Algerian trade.',
  },
  nicholas_select: {
    label: 'Nicholas Select',
    species: 'turkey',
    owner: 'Aviagen Turkeys',
    hens: { ageWk: 16, weight: 11000, fcr: 2.10, mortality: 5 },
    toms: { ageWk: 20, weight: 22000, fcr: 2.55, mortality: 8 },
    notes: 'High-yield breast genetics.',
  },

  // ─── BELDI ────────────────────────────────────────────────────────
  beldi_local: {
    label: 'Beldi (Algerian heritage)',
    species: 'beldi',
    owner: 'Local / undefined genetics',
    color: 'mixed plumage',
    growth: [
      { day: 30,  weight: 350 },
      { day: 60,  weight: 700 },
      { day: 90,  weight: 1100 },
      { day: 150, weight: 1700 },
    ],
    eggsPerYear: 150,
    fcr: 4.0,
    notes: 'Slow-growing, disease-resistant, free-range capable. Premium market: 850 DZD/kg live (vs 460 DZD broiler).',
  },
};

// ─────────────────────────────────────────────────────────────────────
// Temperature schedules — consolidated ITELV / Cobb / Ross / Hubbard
// ─────────────────────────────────────────────────────────────────────

export const TEMP_SCHEDULE = {
  broiler: [
    { day: 1,  temp: 33, humidity: 65, lightHrs: 23, intensity: 35, density: 25, ventilation: 0.4 },
    { day: 3,  temp: 32 },
    { day: 7,  temp: 30, humidity: 62, lightHrs: 20, intensity: 25, ventilation: 0.7 },
    { day: 14, temp: 28, humidity: 60, lightHrs: 18, intensity: 25, ventilation: 1.0 },
    { day: 21, temp: 26, humidity: 60, lightHrs: 18, intensity: 15, density: 15, ventilation: 2.0 },
    { day: 28, temp: 23, humidity: 58, lightHrs: 18, intensity: 10, ventilation: 4.0 },
    { day: 35, temp: 21, humidity: 58, lightHrs: 18, intensity: 10, density: 10, ventilation: 5.0 },
    { day: 42, temp: 20, humidity: 58, lightHrs: 18, intensity: 8,  density: 8,  ventilation: 6.0 },
    { day: 56, temp: 20, humidity: 58, lightHrs: 18, ventilation: 8.0 },
  ],
  layer: [
    // Rearing
    { day: 1,   temp: 33, humidity: 60, lightHrs: 22, intensity: 40, density: 25 },
    { day: 7,   temp: 30, humidity: 55, lightHrs: 18, intensity: 25 },
    { day: 21,  temp: 24, humidity: 55, lightHrs: 12, intensity: 10 },
    { day: 42,  temp: 21, humidity: 55, lightHrs: 10, intensity: 8 },
    { day: 70,  temp: 20, humidity: 60, lightHrs: 10 },
    { day: 119, temp: 21, humidity: 60, lightHrs: 12 }, // 17 wk pre-lay
    { day: 126, temp: 22, humidity: 65, lightHrs: 14, density: 8 }, // 18 wk lay start
    { day: 200, temp: 22, humidity: 65, lightHrs: 16 }, // peak
    { day: 504, temp: 22, humidity: 65, lightHrs: 16 }, // 72 wk
  ],
  turkey: [
    { day: 1,   temp: 36, humidity: 65, lightHrs: 23, density: 18 },
    { day: 14,  temp: 32, humidity: 60, lightHrs: 16 },
    { day: 28,  temp: 28, humidity: 60, lightHrs: 16, density: 12 },
    { day: 42,  temp: 24, humidity: 60, lightHrs: 14 },
    { day: 56,  temp: 22, humidity: 58, lightHrs: 14, density: 8 },
    { day: 84,  temp: 20, humidity: 58, lightHrs: 12, density: 6 },
    { day: 112, temp: 18, humidity: 58, lightHrs: 8 }, // dark phase essential for breast yield
    { day: 140, temp: 18, humidity: 58, lightHrs: 8 },
  ],
  beldi: [
    { day: 1,   temp: 32, humidity: 60, lightHrs: 22, density: 15 },
    { day: 14,  temp: 27, humidity: 55, lightHrs: 18, density: 10 },
    { day: 30,  temp: 22, humidity: 55, lightHrs: 14, density: 6 },
    { day: 60,  temp: 18, density: 5 },
    { day: 150, temp: 18 },
  ],
  mixed: [
    { day: 1,  temp: 33 }, { day: 7, temp: 30 }, { day: 14, temp: 27 },
    { day: 21, temp: 24 }, { day: 28, temp: 22 }, { day: 42, temp: 20 },
  ],
};

/**
 * Returns interpolated environment targets at a specific age.
 * Returns: { temp, humidity, lightHrs, intensity, density, ventilation }
 */
export function envTargetsAt(breed, ageDays) {
  const schedule = TEMP_SCHEDULE[breed] || TEMP_SCHEDULE.broiler;
  let a = schedule[0], b = schedule[0];
  for (let i = 0; i < schedule.length - 1; i++) {
    if (ageDays >= schedule[i].day && ageDays <= schedule[i + 1].day) {
      a = schedule[i]; b = schedule[i + 1]; break;
    }
  }
  if (ageDays > schedule[schedule.length - 1].day) {
    a = b = schedule[schedule.length - 1];
  }
  const tInterp = (key) => {
    if (a[key] === undefined && b[key] === undefined) return undefined;
    const aVal = a[key] !== undefined ? a[key] : b[key];
    const bVal = b[key] !== undefined ? b[key] : aVal;
    if (b.day === a.day) return aVal;
    const t = Math.max(0, Math.min(1, (ageDays - a.day) / (b.day - a.day)));
    return aVal + (bVal - aVal) * t;
  };
  return {
    temp:        tInterp('temp'),
    humidity:    tInterp('humidity'),
    lightHrs:    tInterp('lightHrs'),
    intensity:   tInterp('intensity'),
    density:     tInterp('density'),
    ventilation: tInterp('ventilation'),
  };
}

export function targetTempAt(breed, ageDays) {
  return envTargetsAt(breed, ageDays).temp;
}

// ─────────────────────────────────────────────────────────────────────
// Density (birds per m²) — Algerian climate-adjusted
// ─────────────────────────────────────────────────────────────────────

export const DENSITY = {
  broiler: {
    coolClimate: 12,       // 33 kg/m² Cobb max
    hotClimate: 10,        // 25-28 kg/m² recommended for Algerian summer
    recommended: 10,
    itelvField: 8,         // ITELV survey actual avg
    euDerogationMax: 22,   // 42 kg/m² EU derogation upper bound
    sourceNote: 'Cobb 500 guide adjusted for hot Algerian climate, ITELV field avg',
  },
  layer: {
    floor: 8,              // 7-9 birds/m² standard
    cage: 18,              // legacy practice
    aviary: 11,            // 9-12 birds/m² Hy-Line aviary spec
    recommended: 8,
    cageMaxPerHen_cm2: 750, // EU welfare 600-750 cm²
    sourceNote: 'ISA Brown floor system, EU welfare standards',
  },
  beldi: {
    indoor: 5,
    outdoorAccess: 4,
    recommended: 5,
    sourceNote: 'Heritage breeds, FAO smallholder guidance',
  },
  turkey: {
    starter:  18,
    grower:   10,
    growerLate: 6,
    hensFinish: 4,
    tomsFinish: 2,
    recommended: 6,
    sourceNote: 'AV Khider + Hybrid Converter manual',
  },
  mixed: { recommended: 7, sourceNote: 'Avg between breed groups' },
};

// ─────────────────────────────────────────────────────────────────────
// Feed programs (CP %, ME kcal/kg, key minerals)
// ─────────────────────────────────────────────────────────────────────

export const FEED_PROFILE = {
  broiler: {
    cycleDays: 42,
    marketWeightKg: 2.5,
    totalFeedKg: 4.5,
    fcrTarget: 1.7,
    fcrField: 3.0,  // Algerian average
    phases: [
      { name: 'Starter',  days: '1-10',  cp: 23, kcal: 2975, lysDig: 1.38, metCysDig: 1.02, ca: 0.96, avP: 0.48 },
      { name: 'Grower',   days: '11-24', cp: 21, kcal: 3075, lysDig: 1.24, metCysDig: 0.92, ca: 0.87, avP: 0.44 },
      { name: 'Finisher', days: '25-end', cp: 19, kcal: 3175, lysDig: 1.10, metCysDig: 0.83, ca: 0.81, avP: 0.41 },
    ],
    formulation: 'Algerian commercial: maize 60% / soybean meal 22% / fishmeal 4% / by-products 10% / premix-oil-CaCO3 4%',
  },
  layer: {
    cycleDays: 365 + 18 * 7,
    eggsPerYear: 320,
    totalFeedKgPerYear: 42,
    fcrTarget: 2.0,
    phases: [
      { name: 'Chick starter',    days: '1-21',  cp: 20, kcal: 2850, ca: 1.0 },
      { name: 'Pullet grower',    days: '22-70', cp: 17, kcal: 2775, ca: 1.0 },
      { name: 'Pullet developer', days: '71-112', cp: 15.5, kcal: 2750, ca: 1.0 },
      { name: 'Pre-layer',        days: '113-126', cp: 16.5, kcal: 2800, ca: 2.0 },
      { name: 'Layer Phase 1',    days: 'peak-wk45', cp: 17.5, kcal: 2825, ca: 3.9 },
      { name: 'Layer Phase 2',    days: 'wk46-65', cp: 16, kcal: 2800, ca: 4.1 },
      { name: 'Layer Phase 3',    days: 'wk66+', cp: 15.5, kcal: 2775, ca: 4.4 },
    ],
  },
  turkey: {
    cycleDays: 140,
    marketWeightKg: 14,
    fcrTarget: 2.5,
    phases: [
      { name: 'Pre-starter / Starter', days: '1-28', cp: 27, kcal: 2850 },
      { name: 'Grower 1', days: '29-56', cp: 24, kcal: 2950 },
      { name: 'Grower 2', days: '57-84', cp: 22, kcal: 3050 },
      { name: 'Finisher 1', days: '85-112', cp: 20, kcal: 3100 },
      { name: 'Finisher 2', days: '113-140', cp: 18, kcal: 3150 },
      { name: 'Finisher 3', days: '141-end', cp: 16, kcal: 3200 },
    ],
  },
  beldi: {
    cycleDays: 150,
    marketWeightKg: 1.7,
    totalFeedKg: 6.5,
    fcrTarget: 4.0,
    phases: [
      { name: 'Starter',  days: '1-30',   cp: 20, kcal: 2900 },
      { name: 'Grower',   days: '31-90',  cp: 16, kcal: 2800 },
      { name: 'Finisher', days: '91-end', cp: 14, kcal: 2700 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────
// Vaccination calendars — Algerian commercial protocol (ITELV + Ceva)
// ─────────────────────────────────────────────────────────────────────

export const VACCINATION = {
  broiler: [
    { day: 1,   vaccine: 'Marek (HVT)',                   product: 'CEVAC Marek HVT', route: 'SC', notes: 'Hatchery — sub-cutaneous or in-ovo' },
    { day: 1,   vaccine: 'Newcastle + IB',                product: 'Hitchner B1 + H120 / CEVAC UNI L', route: 'Spray', notes: 'Hatchery spray' },
    { day: 7,   vaccine: 'Gumboro (IBD) intermediate',    product: 'CEVAC GUMBO L',   route: 'Water', notes: 'Drinking water — first IBD' },
    { day: 14,  vaccine: 'Gumboro intermediate-plus',     product: 'CEVAC IBD L',     route: 'Water', notes: 'Second IBD vs hyper-virulent variant' },
    { day: 18,  vaccine: 'ND + IB booster',               product: 'LaSota + H120',   route: 'Water', notes: 'Critical respiratory protection' },
    { day: 21,  vaccine: 'Newcastle (Lasota) booster',    product: 'LaSota',          route: 'Spray', notes: 'Pre-finisher protection' },
    { day: 0,   vaccine: 'AI H5/H9 inactivated',          product: 'Inactivated H5/H9', route: 'SC', notes: 'OPTIONAL — only with vet authorization in outbreak zones', optional: true },
  ],
  layer: [
    { day: 1,   vaccine: 'Marek + ND + IB',               product: 'HVT + HB1 + H120', route: 'Hatchery' },
    { day: 7,   vaccine: 'ND + IB',                       product: 'LaSota + H120',   route: 'Water' },
    { day: 14,  vaccine: 'Gumboro (IBD)',                 product: 'CEVAC IBD L',     route: 'Water' },
    { day: 28,  vaccine: 'IBD booster + ND',              product: 'IBD + LaSota',    route: 'Water' },
    { day: 42,  vaccine: 'ILT (laryngotracheitis)',       product: 'CEVAC LT',        route: 'Eye-drop', notes: '6 weeks' },
    { day: 42,  vaccine: 'Fowl pox',                      product: 'CEVAC FP-L',      route: 'WingWeb', notes: '6 weeks' },
    { day: 42,  vaccine: 'Mycoplasma gallisepticum',      product: 'MG inactivated',  route: 'IM',      notes: '6 weeks' },
    { day: 42,  vaccine: 'Salmonella enteritidis',        product: 'Salmonella-SE',   route: 'Water',   notes: '6 weeks — Halal certification' },
    { day: 56,  vaccine: 'ND + IB booster',               product: 'LaSota + H120',   route: 'Water' },
    { day: 70,  vaccine: 'AE (Avian Encephalomyelitis)',  product: 'CEVAC AE',        route: 'Water', notes: '10 weeks' },
    { day: 70,  vaccine: 'Coryza',                        product: 'Inactivated Coryza', route: 'IM', notes: '10 weeks' },
    { day: 98,  vaccine: 'ILT booster',                   product: 'CEVAC LT',        route: 'Eye-drop', notes: '14 weeks' },
    { day: 98,  vaccine: 'MG booster',                    product: 'MG inactivated',  route: 'IM' },
    { day: 98,  vaccine: 'Salmonella booster',            product: 'Salmonella-SE',   route: 'IM' },
    { day: 112, vaccine: 'ND+IB+EDS+IBD inactivated combo',product: 'Oil emulsion combo', route: 'IM', notes: '16 weeks — CRITICAL pre-lay shot' },
    { day: 112, vaccine: 'Coryza booster',                product: 'Inactivated Coryza', route: 'IM' },
    { day: 56,  vaccine: 'AI H9 inactivated',             product: 'AI H9',           route: 'SC', optional: true, notes: 'Outbreak zones' },
    { day: 112, vaccine: 'AI H5 inactivated',             product: 'AI H5',           route: 'SC', optional: true, notes: 'Outbreak zones' },
  ],
  turkey: [
    { day: 1,   vaccine: 'Newcastle (HB1)',               product: 'HB1',             route: 'Spray' },
    { day: 14,  vaccine: 'Hemorrhagic enteritis (HE)',    product: 'HE',              route: 'Water' },
    { day: 21,  vaccine: 'Newcastle booster',             product: 'LaSota',          route: 'Water' },
    { day: 35,  vaccine: 'aMPV / TRT',                    product: 'TRT',             route: 'Spray' },
    { day: 56,  vaccine: 'Erysipelas',                    product: 'Inactivated',     route: 'IM' },
    { day: 70,  vaccine: 'Pasteurella multocida (cholera)', product: 'Inactivated',  route: 'IM' },
  ],
  beldi: [
    { day: 1,   vaccine: 'Newcastle (HB1)',               product: 'HB1',             route: 'Eye-drop' },
    { day: 14,  vaccine: 'Gumboro',                       product: 'CEVAC GUMBO L',   route: 'Water' },
    { day: 21,  vaccine: 'ND Lasota booster',             product: 'LaSota',          route: 'Water' },
    { day: 60,  vaccine: 'Fowl pox',                      product: 'CEVAC FP-L',      route: 'WingWeb', notes: 'Recommended if free-range' },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Market reference prices — Algerian Dinar (Dec 2025 baseline)
// ─────────────────────────────────────────────────────────────────────

export const MARKET_REF = {
  // Day-old chicks (DZD/chick)
  doc_broiler_contracted: { min: 80,  max: 120, mid: 100 },  // ONAB/CNIFA convention
  doc_broiler_open_glut:  { min: 20,  max: 40,  mid: 30  },  // post-Aïd / Dec 2025
  doc_broiler_open_crisis:{ min: 150, max: 200, mid: 175 },  // H5N1 / supply crisis
  doc_broiler_dec2025:    { min: 100, max: 110, mid: 105 },  // current baseline
  pullet_layer_imported_dzd: { min: 26000, max: 33000, mid: 29500 }, // 180-225 EUR Spain
  doc_layer:                 { min: 250, max: 320, mid: 280 },
  doc_beldi:                 { min: 180, max: 220, mid: 200 },
  // Live & retail (DZD/kg unless noted)
  broiler_live_dec2025:     { min: 200, max: 240, mid: 220 },
  broiler_retail_dec2025:   { min: 330, max: 360, mid: 345 },
  beldi_live:               { min: 800, max: 900, mid: 850 },
  egg_retail_dzd_per_unit:  { min: 17,  max: 22,  mid: 18 },
  // Feed
  feed_complete_dzd_per_kg: { min: 75, max: 90, mid: 80 }, // ~8000 DZD/quintal Dec 2025
  feedstuff_corn_dzd_per_kg:    { mid: 55 },
  feedstuff_soybean_dzd_per_kg: { mid: 120 },
  // FX
  usd_dzd: 132,
  eur_dzd: 155,
  // Defaults the calculator uses
  feedPriceDZD: 80,
  broilerLiveDZD: 220,
  beldiLiveDZD: 850,
  eggDZD: 18,
  chickPriceBroilerDZD: 105,
  chickPriceLayerDZD: 280,
  chickPriceBeldiDZD: 200,
  asOf: 'December 2025 — TSA Algérie, FNAV, MADR bulletins',
};

// ─────────────────────────────────────────────────────────────────────
// Algerian wilayas with poultry-relevant climate profiles
// ─────────────────────────────────────────────────────────────────────

/* All 58 Algerian wilayas (provinces) — official numbering since 2021. */
export const WILAYAS = [
  // 1–48 original wilayas
  { id: 'adrar',     code: 1,  name: 'Adrar',              region: 'South',  climate: 'saharan',      summerMax: 46, winterMin: 4 },
  { id: 'chlef',     code: 2,  name: 'Chlef',              region: 'Centre', climate: 'coastal',      summerMax: 36, winterMin: 5 },
  { id: 'laghouat',  code: 3,  name: 'Laghouat',           region: 'South',  climate: 'steppe',       summerMax: 40, winterMin: -1 },
  { id: 'oeb',       code: 4,  name: 'Oum El Bouaghi',     region: 'East',   climate: 'continental',  summerMax: 34, winterMin: -1 },
  { id: 'batna',     code: 5,  name: 'Batna',              region: 'East',   climate: 'continental',  summerMax: 36, winterMin: -2, broilerCapacity: 'high' },
  { id: 'bejaia',    code: 6,  name: 'Béjaïa',             region: 'East',   climate: 'coastal',      summerMax: 32, winterMin: 6 },
  { id: 'biskra',    code: 7,  name: 'Biskra',             region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 5 },
  { id: 'bechar',    code: 8,  name: 'Béchar',             region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 2 },
  { id: 'blida',     code: 9,  name: 'Blida',              region: 'Centre', climate: 'mediterranean',summerMax: 36, winterMin: 5,  broilerCapacity: 'top' },
  { id: 'bouira',    code: 10, name: 'Bouira',             region: 'Centre', climate: 'continental',  summerMax: 36, winterMin: 1,  broilerCapacity: 'top', notes: 'CARRAVIC integrator base' },
  { id: 'tamanrasset',code:11, name: 'Tamanrasset',        region: 'South',  climate: 'saharan',      summerMax: 38, winterMin: 4 },
  { id: 'tebessa',   code: 12, name: 'Tébessa',            region: 'East',   climate: 'continental',  summerMax: 35, winterMin: -1 },
  { id: 'tlemcen',   code: 13, name: 'Tlemcen',            region: 'West',   climate: 'mediterranean',summerMax: 33, winterMin: 6,  notes: 'Arbor Acres Algérie (Aïn Fezza)' },
  { id: 'tiaret',    code: 14, name: 'Tiaret',             region: 'West',   climate: 'highland',     summerMax: 36, winterMin: -1, broilerCapacity: 'top' },
  { id: 'tiziouzou', code: 15, name: 'Tizi-Ouzou',         region: 'Centre', climate: 'mountainous',  summerMax: 32, winterMin: 2,  broilerCapacity: 'high' },
  { id: 'algiers',   code: 16, name: 'Algiers',            region: 'Centre', climate: 'coastal',      summerMax: 32, winterMin: 8 },
  { id: 'djelfa',    code: 17, name: 'Djelfa',             region: 'South',  climate: 'steppe',       summerMax: 40, winterMin: -3, broilerCapacity: 'top', notes: 'Hubbard Algérie GP base (Aïn Oussera)' },
  { id: 'jijel',     code: 18, name: 'Jijel',              region: 'East',   climate: 'coastal',      summerMax: 31, winterMin: 7 },
  { id: 'setif',     code: 19, name: 'Sétif',              region: 'East',   climate: 'continental',  summerMax: 35, winterMin: -2, broilerCapacity: 'top', notes: 'Top broiler wilaya. Cold winters → ascites risk for heavy broilers' },
  { id: 'saida',     code: 20, name: 'Saïda',              region: 'West',   climate: 'highland',     summerMax: 36, winterMin: 0 },
  { id: 'skikda',    code: 21, name: 'Skikda',             region: 'East',   climate: 'coastal',      summerMax: 31, winterMin: 7 },
  { id: 'sba',       code: 22, name: 'Sidi Bel Abbès',     region: 'West',   climate: 'mediterranean',summerMax: 36, winterMin: 4,  turkeyCapacity: 'top' },
  { id: 'annaba',    code: 23, name: 'Annaba',             region: 'East',   climate: 'coastal',      summerMax: 32, winterMin: 7 },
  { id: 'guelma',    code: 24, name: 'Guelma',             region: 'East',   climate: 'continental',  summerMax: 35, winterMin: 2 },
  { id: 'constantine',code:25, name: 'Constantine',        region: 'East',   climate: 'continental',  summerMax: 34, winterMin: 1 },
  { id: 'medea',     code: 26, name: 'Médéa',              region: 'Centre', climate: 'mountainous',  summerMax: 32, winterMin: 0,  broilerCapacity: 'top', turkeyCapacity: 'top', notes: 'AV Khider — sole national turkey breeder' },
  { id: 'mostaganem',code: 27, name: 'Mostaganem',         region: 'West',   climate: 'coastal',      summerMax: 33, winterMin: 7,  broilerCapacity: 'top', notes: 'High humidity → IB/CRD risk' },
  { id: 'msila',     code: 28, name: "M'Sila",             region: 'Centre', climate: 'arid',         summerMax: 42, winterMin: 0,  broilerCapacity: 'high', notes: 'Heat stress emergency from May–Sep' },
  { id: 'mascara',   code: 29, name: 'Mascara',            region: 'West',   climate: 'mediterranean',summerMax: 35, winterMin: 4 },
  { id: 'ouargla',   code: 30, name: 'Ouargla',            region: 'South',  climate: 'saharan',      summerMax: 45, winterMin: 4 },
  { id: 'oran',      code: 31, name: 'Oran',               region: 'West',   climate: 'coastal',      summerMax: 32, winterMin: 8,  broilerCapacity: 'high' },
  { id: 'elbayadh',  code: 32, name: 'El Bayadh',          region: 'West',   climate: 'highland',     summerMax: 36, winterMin: -3 },
  { id: 'illizi',    code: 33, name: 'Illizi',             region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 5 },
  { id: 'bba',       code: 34, name: 'Bordj Bou Arréridj', region: 'East',   climate: 'continental',  summerMax: 35, winterMin: -1, broilerCapacity: 'high' },
  { id: 'boumerdes', code: 35, name: 'Boumerdès',          region: 'Centre', climate: 'coastal',      summerMax: 33, winterMin: 7,  turkeyCapacity: 'top' },
  { id: 'eltarf',    code: 36, name: 'El Tarf',            region: 'East',   climate: 'coastal',      summerMax: 32, winterMin: 7 },
  { id: 'tindouf',   code: 37, name: 'Tindouf',            region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 4 },
  { id: 'tissemsilt',code: 38, name: 'Tissemsilt',         region: 'West',   climate: 'highland',     summerMax: 36, winterMin: 0 },
  { id: 'eloued',    code: 39, name: 'El Oued',            region: 'South',  climate: 'saharan',      summerMax: 46, winterMin: 3,  broilerCapacity: 'high', notes: 'EXTREME summer heat — mandatory cooling' },
  { id: 'khenchela', code: 40, name: 'Khenchela',          region: 'East',   climate: 'mountainous',  summerMax: 34, winterMin: -2 },
  { id: 'soukahras', code: 41, name: 'Souk Ahras',         region: 'East',   climate: 'continental',  summerMax: 34, winterMin: 1 },
  { id: 'tipaza',    code: 42, name: 'Tipaza',             region: 'Centre', climate: 'coastal',      summerMax: 32, winterMin: 7 },
  { id: 'mila',      code: 43, name: 'Mila',               region: 'East',   climate: 'continental',  summerMax: 35, winterMin: -1, turkeyCapacity: 'top' },
  { id: 'ain_defla', code: 44, name: 'Aïn Defla',          region: 'Centre', climate: 'mediterranean',summerMax: 38, winterMin: 4,  broilerCapacity: 'top' },
  { id: 'naama',     code: 45, name: 'Naâma',              region: 'West',   climate: 'highland',     summerMax: 36, winterMin: -2 },
  { id: 'ain_temouchent',code:46, name:'Aïn Témouchent',   region: 'West',   climate: 'coastal',      summerMax: 32, winterMin: 7 },
  { id: 'ghardaia',  code: 47, name: 'Ghardaïa',           region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 4 },
  { id: 'relizane',  code: 48, name: 'Relizane',           region: 'West',   climate: 'mediterranean',summerMax: 36, winterMin: 5 },
  // 49–58 wilayas added in 2019–2021
  { id: 'timimoun',  code: 49, name: 'Timimoun',           region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 4 },
  { id: 'borj_bm',   code: 50, name: 'Bordj Badji Mokhtar',region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 5 },
  { id: 'ouled_djellal',code:51, name:'Ouled Djellal',     region: 'South',  climate: 'steppe',       summerMax: 42, winterMin: 2 },
  { id: 'beni_abbes',code: 52, name: 'Béni Abbès',         region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 4 },
  { id: 'insalah',   code: 53, name: 'In Salah',           region: 'South',  climate: 'saharan',      summerMax: 45, winterMin: 5 },
  { id: 'inguezzam', code: 54, name: 'In Guezzam',         region: 'South',  climate: 'saharan',      summerMax: 42, winterMin: 6 },
  { id: 'touggourt', code: 55, name: 'Touggourt',          region: 'South',  climate: 'saharan',      summerMax: 45, winterMin: 4 },
  { id: 'djanet',    code: 56, name: 'Djanet',             region: 'South',  climate: 'saharan',      summerMax: 42, winterMin: 7 },
  { id: 'elmghair',  code: 57, name: "El M'Ghair",         region: 'South',  climate: 'saharan',      summerMax: 45, winterMin: 4 },
  { id: 'elmeniaa',  code: 58, name: 'El Meniaa',          region: 'South',  climate: 'saharan',      summerMax: 44, winterMin: 4 },
];

// ─────────────────────────────────────────────────────────────────────
// Disease quick-reference (Algeria-specific)
// ─────────────────────────────────────────────────────────────────────

export const DISEASES = [
  {
    id: 'heat_stress',
    name: { en: 'Heat Stress', fr: 'Stress thermique', ar: 'الإجهاد الحراري' },
    severity: 'critical',
    season: 'May–September',
    symptoms: ['panting', 'wings_spread', 'reduced_feed', 'sudden_death_heavy_birds', 'excessive_drinking'],
    triggers: ['ambient > 28°C from D21+', 'high humidity', 'poor ventilation'],
    action: {
      en: '#1 limiting factor in Algerian poultry. Spray roof, add fans, electrolytes + vit C in water, reduce density. Schedule sales so birds are not heavy in July/August.',
      fr: 'Facteur n°1 en Algérie. Asperger toit, ventilateurs, électrolytes + vit C, réduire densité. Programmer ventes pour ne pas avoir oiseaux lourds en juillet/août.',
      ar: 'العامل الأول في الجزائر. رش السقف، شغّل المراوح، إلكتروليت وفيتامين C، قلل الكثافة. خطط البيع كي لا يكون الدجاج كبيراً في يوليو وأغسطس.',
    },
  },
  {
    id: 'coccidiosis',
    name: { en: 'Coccidiosis', fr: 'Coccidiose', ar: 'الكوكسيديا' },
    severity: 'high',
    season: 'all year (wet litter)',
    symptoms: ['bloody_droppings', 'pale_combs', 'reduced_feed', 'wet_litter', 'mortality_2_4_weeks'],
    triggers: ['wet litter', 'dirt-floor "serre-tunnel" buildings', 'overcrowding'],
    action: {
      en: 'First cause of FCR drift in Algeria. Coccidiostat (lasalocid, salinomycin, narasin, diclazuril) in feed or hatchery vaccination at D1. Keep litter dry.',
      fr: 'Première cause de dérive du FCR en Algérie. Coccidiostatique en aliment. Litière sèche.',
      ar: 'السبب الأول في تدهور FCR في الجزائر. مضاد كوكسيديا في العلف. حافظ على الفرشة جافة.',
    },
  },
  {
    id: 'newcastle',
    name: { en: 'Newcastle Disease', fr: 'Maladie de Newcastle', ar: 'مرض نيوكاسل' },
    severity: 'critical',
    season: 'all year',
    symptoms: ['respiratory_distress', 'twisted_neck', 'green_diarrhea', 'sudden_mortality', 'drop_in_eggs'],
    triggers: ['unvaccinated flocks', 'wild bird contact', 'cross-farm contamination'],
    action: {
      en: 'Recurrent in Sétif and Centre regions. Quarantine immediately. Call vet. ND HB1 + LaSota schedule MUST be followed.',
      fr: 'Récurrent à Sétif. Quarantaine immédiate. Vétérinaire. Calendrier ND HB1 + LaSota OBLIGATOIRE.',
      ar: 'متكرر في سطيف. حجر صحي فوري. اتصل بالبيطري. جدول نيوكاسل HB1 + لاسوتا إلزامي.',
    },
  },
  {
    id: 'gumboro',
    name: { en: 'Gumboro (IBD) — hyper-virulent variant', fr: 'Gumboro (IBD) variant hyper-virulent', ar: 'الغامبورو (نوع شديد الضراوة)' },
    severity: 'critical',
    season: 'all year',
    symptoms: ['watery_diarrhea', 'huddling', 'feather_picking', 'high_mortality_3_6_weeks', 'depression'],
    triggers: ['unvaccinated', 'maternal antibody failure'],
    action: {
      en: 'Hyper-virulent strain confirmed circulating in Algeria. Use CEVAC Transmune in-ovo or intermediate-plus IBD at D7 + D14. Supportive vitamins.',
      fr: 'Souche hyper-virulente confirmée. CEVAC Transmune in-ovo ou IBD intermédiaire+ à J7 + J14.',
      ar: 'سلالة شديدة الضراوة مؤكدة. CEVAC Transmune أو IBD متوسط في يوم 7 و14.',
    },
  },
  {
    id: 'cri_mycoplasma',
    name: { en: 'CRD / Mycoplasma', fr: 'CRD / Mycoplasmose', ar: 'الرشح المزمن / الميكوبلازما' },
    severity: 'high',
    season: 'cold months + poor ventilation',
    symptoms: ['sneezing', 'rales', 'nasal_discharge', 'swollen_face', 'reduced_growth'],
    triggers: ['high NH3', 'cold drafts', 'high density', 'serre-tunnel houses'],
    action: {
      en: 'Chronic in informal sector. Antibiotic (tylosin) under vet. Improve ventilation. Reduce ammonia. MG inactivated at wk 6 + 14 for layers.',
      fr: 'Antibiotique sous vétérinaire. Améliorer ventilation. Réduire ammoniac.',
      ar: 'مضاد حيوي (تايلوزين) بإشراف بيطري. حسّن التهوية. قلل الأمونيا.',
    },
  },
  {
    id: 'colibacillosis',
    name: { en: 'Colibacillosis (E. coli)', fr: 'Colibacillose', ar: 'كوليباسيلوز' },
    severity: 'high',
    season: 'all year',
    symptoms: ['airsacculitis', 'pericarditis_on_postmortem', 'reduced_growth', 'higher_mortality'],
    triggers: ['poor water hygiene', 'contaminated litter', 'preceding viral disease'],
    action: {
      en: 'Often secondary to ND/IB/CRD. Clean water + biosecurity. Antibiotic with sensitivity test.',
      fr: 'Souvent secondaire à ND/IB/CRD. Eau propre + biosécurité.',
      ar: 'غالباً ثانوي بعد نيوكاسل/IB/CRD. ماء نظيف + إجراءات الأمان البيولوجي.',
    },
  },
  {
    id: 'ascites',
    name: { en: 'Ascites / Sudden Death', fr: 'Ascite / mort subite', ar: 'الاستسقاء / الموت المفاجئ' },
    severity: 'medium',
    season: 'cold months + altitude',
    symptoms: ['enlarged_abdomen_fluid', 'blue_combs', 'sudden_death_heavy_birds', 'dyspnea'],
    triggers: ['Sétif/Médéa/Aurès altitude', 'cold houses', 'heavy strains > 2.5 kg', 'high-energy feed'],
    action: {
      en: 'Reduce light hours wk 1, slow growth curve in cold weather, improve air quality. Common in Cobb/Ross at altitude.',
      fr: 'Réduire heures de lumière sem 1, ralentir croissance par temps froid.',
      ar: 'قلل ساعات الإضاءة في الأسبوع الأول، أبطئ النمو في البرد.',
    },
  },
  {
    id: 'h5n1',
    name: { en: 'Avian Influenza H5N1 (HPAI)', fr: 'Grippe aviaire H5N1', ar: 'إنفلونزا الطيور H5N1' },
    severity: 'critical',
    season: 'all year — endemic pressure 2021+',
    symptoms: ['massive_sudden_mortality', 'edema_head', 'cyanosis', 'drop_in_eggs', 'neurological_signs'],
    triggers: ['wild bird contact', 'contaminated feed', 'cross-farm'],
    action: {
      en: 'NOTIFIABLE. Call MADR DSV immediately. Stamping-out + perimeter control. Vaccination H5 authorized in some flocks.',
      fr: 'NOTIFIABLE. MADR DSV immédiatement. Abattage + cordon sanitaire.',
      ar: 'مرض إلزامي الإبلاغ. اتصل بمصلحة البيطرة فوراً.',
    },
  },
  {
    id: 'h9n2',
    name: { en: 'Avian Influenza H9N2 (LPAI)', fr: 'Grippe aviaire H9N2', ar: 'إنفلونزا الطيور H9N2' },
    severity: 'high',
    season: 'endemic',
    symptoms: ['respiratory', 'reduced_eggs', 'increased_mortality_with_secondary_infection'],
    triggers: ['endemic in Algeria since 2010s'],
    action: {
      en: 'Vaccinate H9 inactivated at wk 8 + 16 in outbreak zones. Combined with E. coli antibiotic if secondary.',
      fr: 'Vaccin H9 inactivé sem 8 + 16. Antibiotique si E. coli secondaire.',
      ar: 'لقاح H9 معطّل في الأسبوع 8 و16. مضاد حيوي للعدوى الثانوية.',
    },
  },
  {
    id: 'red_mite',
    name: { en: 'Red Mite (Dermanyssus gallinae)', fr: 'Pou rouge', ar: 'القمل الأحمر' },
    severity: 'medium',
    season: 'warm months',
    symptoms: ['restless_hens', 'feather_loss', 'anemia_pale_combs', 'drop_in_eggs', 'visible_mites_at_night'],
    triggers: ['old wooden equipment', 'gaps in walls', 'layer houses especially'],
    action: {
      en: '2024 Algerian study confirmed pathogen reservoir. Acaricide + heat treatment of equipment. Silica dust between cycles.',
      fr: 'Étude algérienne 2024: réservoir de pathogènes. Acaricide + traitement thermique.',
      ar: 'دراسة جزائرية 2024: ناقل للأمراض. مبيد قراد + معالجة حرارية.',
    },
  },
  {
    id: 'salmonella',
    name: { en: 'Salmonella enteritidis / typhimurium', fr: 'Salmonellose', ar: 'السالمونيلا' },
    severity: 'medium',
    season: 'all year',
    symptoms: ['diarrhea', 'reduced_eggs', 'increased_mortality', 'septicemia'],
    triggers: ['contaminated feed', 'wild bird/rodent contact'],
    action: {
      en: 'Halal certification mandate (June 2023) requires monitoring. ONAB lab tests routinely. Vaccinate layer at wk 6 + 14.',
      fr: 'Certification Halal exige surveillance. Vaccination poule pondeuse sem 6 + 14.',
      ar: 'شهادة الحلال تتطلب المراقبة. تطعيم البياض في الأسبوع 6 و14.',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────
// Heat stress evaluation (Temperature-Humidity Index)
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns severity tier for poultry heat stress.
 * Based on T (°C) and RH (%) — THI formula adapted for poultry.
 *  - safe:        THI < 70
 *  - alert:       70-75 (reduce activity)
 *  - danger:      75-83 (production loss)
 *  - emergency:   > 83 (mortality risk, especially heavy birds)
 */
export function heatStressTHI(tempC, humidityPct) {
  try {
    if (tempC == null || typeof tempC !== 'number' || isNaN(tempC)) return null;
    const rh = (humidityPct == null || isNaN(humidityPct)) ? 60 : humidityPct;
    const thi = tempC - (0.55 - 0.0055 * rh) * (tempC - 14.5);
    if (isNaN(thi)) return null;
    let tier = 'safe';
    if (thi >= 83) tier = 'emergency';
    else if (thi >= 75) tier = 'danger';
    else if (thi >= 70) tier = 'alert';
    return { thi: Math.round(thi * 10) / 10, tier };
  } catch (e) { return null; }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Interpolated target weight (grams) for a strain at a given age in days. */
export function targetWeightAt(strainId, ageDays) {
  const s = STRAINS[strainId];
  if (!s || !s.growth) return null;
  const curve = s.growth;
  if (ageDays <= curve[0].day) {
    return Math.round(curve[0].weight * (ageDays / curve[0].day));
  }
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1];
    if (ageDays >= a.day && ageDays <= b.day) {
      const t = (ageDays - a.day) / (b.day - a.day);
      return Math.round(a.weight + (b.weight - a.weight) * t);
    }
  }
  return curve[curve.length - 1].weight;
}

/** Cumulative FCR at age (linearly interpolated from milestones). */
export function targetFCRAt(strainId, ageDays) {
  const s = STRAINS[strainId];
  if (!s || !s.growth) return null;
  const curve = s.growth.filter((p) => p.fcr !== undefined && p.fcr !== null);
  if (curve.length === 0) return null;
  if (ageDays <= curve[0].day) return curve[0].fcr;
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1];
    if (ageDays >= a.day && ageDays <= b.day) {
      const t = (ageDays - a.day) / (b.day - a.day);
      return a.fcr + (b.fcr - a.fcr) * t;
    }
  }
  return curve[curve.length - 1].fcr;
}

// ─────────────────────────────────────────────────────────────────────
// Vaccine localization — translates route, disease keywords, and notes
// ─────────────────────────────────────────────────────────────────────

const ROUTE_I18N = {
  ar: {
    SC: 'تحت الجلد', Spray: 'رشّ', Water: 'في ماء الشرب', WingWeb: 'وخز الجناح',
    IM: 'حقن عضلي', EyeDrop: 'قطرة في العين', Hatchery: 'في المفرخ',
  },
  fr: {
    SC: 'Sous-cutané', Spray: 'Pulvérisation', Water: "Eau de boisson", WingWeb: 'Transfixion alaire',
    IM: 'Intramusculaire', EyeDrop: 'Goutte oculaire', Hatchery: 'Au couvoir',
  },
};

// Disease/keyword → localized term. Applied as word replacements on the
// English vaccine string so "Newcastle (Lasota) booster" becomes natural.
const DISEASE_I18N = {
  ar: {
    'Marek': 'ماريك', 'Newcastle': 'نيوكاسل', 'Gumboro': 'غامبورو',
    'IBD': 'غامبورو', 'Fowl pox': 'جدري الطيور', 'Mycoplasma': 'ميكوبلازما',
    'Salmonella': 'سالمونيلا', 'Coryza': 'الزكام المعدي', 'EDS': 'هبوط البيض',
    'booster': 'جرعة داعمة', 'intermediate': 'متوسط', 'intermediate-plus': 'متوسط مقوّى',
    'enteritidis': '', 'combo': 'مشترك', 'combined': 'مشترك', 'inactivated': 'معطّل',
    'Hemorrhagic enteritis': 'التهاب الأمعاء النزفي',
    'Erysipelas': 'الحمرة', 'Pasteurella multocida': 'الكوليرا (باستوريلا)',
    'Avian Encephalomyelitis': 'التهاب الدماغ والنخاع',
  },
  fr: {
    'Marek': 'Marek', 'Newcastle': 'Newcastle', 'Gumboro': 'Gumboro',
    'Fowl pox': 'Variole aviaire', 'Mycoplasma': 'Mycoplasme',
    'Salmonella': 'Salmonelle', 'Coryza': 'Coryza', 'EDS': 'EDS (chute de ponte)',
    'booster': 'rappel', 'intermediate': 'intermédiaire',
    'Hemorrhagic enteritis': 'Entérite hémorragique',
    'Erysipelas': 'Rouget', 'Pasteurella multocida': 'Choléra (Pasteurella)',
  },
};

const NOTE_I18N = {
  ar: {
    'Hatchery — sub-cutaneous or in-ovo': 'في المفرخ — تحت الجلد أو داخل البيضة',
    'Hatchery spray': 'رشّ في المفرخ',
    'Drinking water — first IBD': 'في ماء الشرب — أول جرعة غامبورو',
    'Second IBD vs hyper-virulent variant': 'الجرعة الثانية ضد السلالة الشديدة الضراوة',
    'Critical respiratory protection': 'حماية مهمة للجهاز التنفسي',
    'Pre-finisher protection': 'حماية قبل مرحلة التسمين',
    'OPTIONAL — only with vet authorization in outbreak zones':
      'اختياري — فقط بإذن بيطري في مناطق انتشار المرض',
    'Outbreak zones': 'مناطق انتشار المرض',
    'CRITICAL pre-lay shot': 'جرعة مهمّة جداً قبل بدء البيض',
    'Halal certification': 'لشهادة الحلال',
    'Hatchery': 'في المفرخ',
  },
  fr: {
    'Hatchery — sub-cutaneous or in-ovo': 'Couvoir — sous-cutané ou in-ovo',
    'Hatchery spray': 'Pulvérisation au couvoir',
    'Drinking water — first IBD': "Eau de boisson — première dose IBD",
    'Second IBD vs hyper-virulent variant': 'Deuxième dose IBD (souche hypervirulente)',
    'Critical respiratory protection': 'Protection respiratoire essentielle',
    'Pre-finisher protection': 'Protection avant finition',
    'OPTIONAL — only with vet authorization in outbreak zones':
      "Optionnel — seulement avec autorisation vétérinaire",
    'Outbreak zones': "Zones d'épidémie",
    'CRITICAL pre-lay shot': 'Injection essentielle avant la ponte',
    'Halal certification': 'Certification Halal',
    'Hatchery': 'Couvoir',
  },
};

export function localizeVaccine(v, language) {
  if (language === 'en' || !language) {
    return { name: v.vaccine, route: v.route || '', notes: v.notes || '' };
  }
  let name = v.vaccine || '';
  const dmap = DISEASE_I18N[language] || {};
  Object.keys(dmap).forEach((en) => {
    if (dmap[en]) name = name.split(en).join(dmap[en]);
  });
  const route = (ROUTE_I18N[language] && ROUTE_I18N[language][v.route]) || v.route || '';
  const nmap = NOTE_I18N[language] || {};
  const notes = nmap[v.notes] || v.notes || '';
  return { name, route, notes };
}

// ─────────────────────────────────────────────────────────────────────
// Disease localization — season + triggers
// ─────────────────────────────────────────────────────────────────────

const SEASON_I18N = {
  ar: {
    'May–September': 'ماي – سبتمبر',
    'all year': 'طوال السنة',
    'all year (wet litter)': 'طوال السنة (الفرشة الرطبة)',
    'cold months + poor ventilation': 'الأشهر الباردة + تهوية ضعيفة',
    'cold months + altitude': 'الأشهر الباردة + المرتفعات',
    'warm months': 'الأشهر الحارة',
    'endemic': 'متوطّن',
    'all year — endemic pressure 2021+': 'طوال السنة — انتشار مستمر منذ 2021',
  },
  fr: {
    'May–September': 'Mai – Septembre',
    'all year': "Toute l'année",
    'all year (wet litter)': "Toute l'année (litière humide)",
    'cold months + poor ventilation': 'Mois froids + mauvaise ventilation',
    'cold months + altitude': 'Mois froids + altitude',
    'warm months': 'Mois chauds',
    'endemic': 'Endémique',
    'all year — endemic pressure 2021+': "Toute l'année — endémique depuis 2021",
  },
};

const TRIGGER_I18N = {
  ar: {
    'ambient > 28°C from D21+': 'حرارة الجو فوق 28°م من اليوم 21',
    'high humidity': 'رطوبة مرتفعة',
    'poor ventilation': 'تهوية ضعيفة',
    'wet litter': 'فرشة رطبة',
    'dirt-floor "serre-tunnel" buildings': 'مبانٍ نفقية بأرضية ترابية',
    'overcrowding': 'اكتظاظ',
    'unvaccinated flocks': 'قطعان غير ملقّحة',
    'unvaccinated': 'عدم التلقيح',
    'wild bird contact': 'مخالطة الطيور البرية',
    'cross-farm contamination': 'انتقال العدوى بين المزارع',
    'maternal antibody failure': 'ضعف المناعة الموروثة',
    'high NH3': 'ارتفاع الأمونيا',
    'cold drafts': 'تيّارات هواء باردة',
    'high density': 'كثافة عالية',
    'serre-tunnel houses': 'العنابر النفقية',
    'poor water hygiene': 'سوء نظافة الماء',
    'contaminated litter': 'فرشة ملوّثة',
    'preceding viral disease': 'مرض فيروسي سابق',
    'Sétif/Médéa/Aurès altitude': 'مرتفعات سطيف/المدية/الأوراس',
    'cold houses': 'عنابر باردة',
    'heavy strains > 2.5 kg': 'سلالات ثقيلة فوق 2.5 كغ',
    'high-energy feed': 'علف عالي الطاقة',
  },
  fr: {
    'ambient > 28°C from D21+': 'Ambiance > 28°C dès J21',
    'high humidity': 'Humidité élevée',
    'poor ventilation': 'Mauvaise ventilation',
    'wet litter': 'Litière humide',
    'dirt-floor "serre-tunnel" buildings': 'Bâtiments tunnel sol en terre',
    'overcrowding': 'Surdensité',
    'unvaccinated flocks': 'Lots non vaccinés',
    'unvaccinated': 'Non vacciné',
    'wild bird contact': 'Contact oiseaux sauvages',
    'cross-farm contamination': 'Contamination inter-fermes',
    'maternal antibody failure': 'Échec anticorps maternels',
    'high NH3': 'NH3 élevé',
    'cold drafts': "Courants d'air froids",
    'high density': 'Densité élevée',
    'serre-tunnel houses': 'Bâtiments tunnel',
    'poor water hygiene': "Mauvaise hygiène de l'eau",
    'contaminated litter': 'Litière contaminée',
    'preceding viral disease': 'Maladie virale préalable',
    'Sétif/Médéa/Aurès altitude': 'Altitude Sétif/Médéa/Aurès',
    'cold houses': 'Bâtiments froids',
    'heavy strains > 2.5 kg': 'Souches lourdes > 2,5 kg',
    'high-energy feed': 'Aliment haute énergie',
  },
};

export function localizeDisease(d, language) {
  if (language === 'en' || !language) {
    return { season: d.season, triggers: d.triggers };
  }
  const smap = SEASON_I18N[language] || {};
  const tmap = TRIGGER_I18N[language] || {};
  return {
    season: smap[d.season] || d.season,
    triggers: (d.triggers || []).map((tr) => tmap[tr] || tr),
  };
}

export function speciesOfStrain(strainId) {
  return STRAINS[strainId]?.species || null;
}

export function strainsFor(breed) {
  return STRAINS_BY_BREED[breed] || [];
}

export function strainLabel(strainId) {
  return STRAINS[strainId]?.label || strainId;
}
