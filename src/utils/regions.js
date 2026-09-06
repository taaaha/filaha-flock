import { WILAYAS, wilayaName } from './poultryData';

// ─────────────────────────────────────────────────────────────────────
// regions — the countries Filaha Flock serves, and everything that
// changes when a farmer is in one rather than another.
//
// A country is not just a flag and a dial code. It changes which language
// the app should open in, which administrative unit "where is your farm"
// means, what the air in a poultry house is legally allowed to contain, and
// which failure mode is most likely to kill the flock. Those four things are
// bundled here so the rest of the app can ask one question — "which country?"
// — instead of scattering conditionals.
//
// The air-quality limits are NOT a house style. Germany is bound by EU
// Directive 2007/43/EC, which sets NH3 and CO2 ceilings measured at the
// birds' head height; shipping Algeria's more permissive numbers to a German
// farmer would have the app quietly telling him his house is fine while he is
// out of compliance. Algeria and Qatar have no equivalent binding limit, so
// they use commercial best practice.
// ─────────────────────────────────────────────────────────────────────

// ── Qatar: 8 municipalities (baladiyat) ───────────────────────────────
// Hot desert throughout. The coast is more humid — which matters more than
// raw temperature, because evaporative cooling loses its power as the wet
// bulb rises, and that is exactly what August and September bring.
const QA_REGIONS = [
  { id: 'doha',      code: 1, name: 'Doha',          ar: 'الدوحة',   climate: 'coastal_desert', summerMax: 42, winterMin: 14 },
  { id: 'rayyan',    code: 2, name: 'Al Rayyan',     ar: 'الريان',    climate: 'desert',         summerMax: 43, winterMin: 13 },
  { id: 'wakrah',    code: 3, name: 'Al Wakrah',     ar: 'الوكرة',    climate: 'coastal_desert', summerMax: 42, winterMin: 14 },
  { id: 'khor',      code: 4, name: 'Al Khor',       ar: 'الخور',     climate: 'coastal_desert', summerMax: 42, winterMin: 13 },
  { id: 'ummsalal',  code: 5, name: 'Umm Salal',     ar: 'أم صلال',   climate: 'desert',         summerMax: 43, winterMin: 13 },
  { id: 'daayen',    code: 6, name: 'Al Daayen',     ar: 'الضعاين',   climate: 'coastal_desert', summerMax: 42, winterMin: 14 },
  { id: 'shamal',    code: 7, name: 'Al Shamal',     ar: 'الشمال',    climate: 'coastal_desert', summerMax: 41, winterMin: 13 },
  // Qatar's main livestock and farming belt.
  { id: 'shahaniya', code: 8, name: 'Al Shahaniya',  ar: 'الشحانية',  climate: 'desert',         summerMax: 44, winterMin: 11, farming: true },
];

// ── Germany: 16 federal states ────────────────────────────────────────
// `poultry` is millions of birds held (Destatis, 1 March 2023) — it is why
// Lower Saxony matters far more than Bremen. `hpaiRisk` marks the states on
// the wild-waterbird flyways and coastal wetlands, where autumn and winter
// avian-influenza incursions concentrate.
const DE_REGIONS = [
  { id: 'ni', code: 1,  name: 'Niedersachsen',          en: 'Lower Saxony',          climate: 'temperate_coastal', summerMax: 26, winterMin: -1, poultry: 77.6, hpaiRisk: 'high' },
  { id: 'nw', code: 2,  name: 'Nordrhein-Westfalen',    en: 'North Rhine-Westphalia',climate: 'temperate',         summerMax: 27, winterMin: 0,  poultry: 19.0, hpaiRisk: 'moderate' },
  { id: 'by', code: 3,  name: 'Bayern',                 en: 'Bavaria',               climate: 'temperate_alpine',  summerMax: 27, winterMin: -3, poultry: 14.3, hpaiRisk: 'moderate' },
  { id: 'bw', code: 4,  name: 'Baden-Württemberg',      en: 'Baden-Württemberg',     climate: 'temperate',         summerMax: 27, winterMin: -2, hpaiRisk: 'moderate' },
  { id: 'sh', code: 5,  name: 'Schleswig-Holstein',     en: 'Schleswig-Holstein',    climate: 'temperate_coastal', summerMax: 24, winterMin: 0,  hpaiRisk: 'high' },
  { id: 'mv', code: 6,  name: 'Mecklenburg-Vorpommern', en: 'Mecklenburg-Vorpommern',climate: 'temperate_coastal', summerMax: 24, winterMin: -2, hpaiRisk: 'high' },
  { id: 'bb', code: 7,  name: 'Brandenburg',            en: 'Brandenburg',           climate: 'temperate',         summerMax: 26, winterMin: -3, hpaiRisk: 'high' },
  { id: 'st', code: 8,  name: 'Sachsen-Anhalt',         en: 'Saxony-Anhalt',         climate: 'temperate',         summerMax: 26, winterMin: -2, hpaiRisk: 'moderate' },
  { id: 'sn', code: 9,  name: 'Sachsen',                en: 'Saxony',                climate: 'temperate',         summerMax: 26, winterMin: -3, hpaiRisk: 'moderate' },
  { id: 'th', code: 10, name: 'Thüringen',              en: 'Thuringia',             climate: 'temperate',         summerMax: 25, winterMin: -3, hpaiRisk: 'moderate' },
  { id: 'he', code: 11, name: 'Hessen',                 en: 'Hesse',                 climate: 'temperate',         summerMax: 26, winterMin: -1, hpaiRisk: 'moderate' },
  { id: 'rp', code: 12, name: 'Rheinland-Pfalz',        en: 'Rhineland-Palatinate',  climate: 'temperate',         summerMax: 27, winterMin: -1, hpaiRisk: 'moderate' },
  { id: 'sl', code: 13, name: 'Saarland',               en: 'Saarland',              climate: 'temperate',         summerMax: 26, winterMin: -1, hpaiRisk: 'moderate' },
  { id: 'be', code: 14, name: 'Berlin',                 en: 'Berlin',                climate: 'temperate',         summerMax: 26, winterMin: -2, hpaiRisk: 'moderate' },
  { id: 'hh', code: 15, name: 'Hamburg',                en: 'Hamburg',               climate: 'temperate_coastal', summerMax: 24, winterMin: -1, hpaiRisk: 'high' },
  { id: 'hb', code: 16, name: 'Bremen',                 en: 'Bremen',                climate: 'temperate_coastal', summerMax: 24, winterMin: 0,  hpaiRisk: 'high' },
];

// Algeria's 58 wilayas already live in poultryData; reshaped here so every
// country exposes the same region record and nothing downstream has to care.
const DZ_REGIONS = WILAYAS.map((w) => ({
  id: w.id,
  code: w.code,
  name: w.name,
  ar: wilayaName(w, 'ar'),
  climate: w.climate,
  summerMax: w.summerMax,
  winterMin: w.winterMin,
}));

export const COUNTRIES = {
  dz: {
    id: 'dz',
    flag: '🇩🇿',
    dial: '+213',
    // National significant number after the dial code (Algerian mobiles are
    // 9 digits: 5/6/7 followed by 8 more).
    phoneDigits: 9,
    phoneExample: '551 23 45 67',
    currency: 'DZD',
    currencySymbol: 'DA',
    name: { en: 'Algeria', fr: 'Algérie', ar: 'الجزائر', de: 'Algerien' },
    regionLabel: { en: 'Wilaya', fr: 'Wilaya', ar: 'الولاية', de: 'Provinz' },
    langs: ['ar', 'fr', 'en'],
    defaultLang: 'ar',
    regions: DZ_REGIONS,
    // Commercial best practice — Algeria sets no binding house-air limit.
    thresholds: {
      co2:  { warn: 1500, danger: 2500 },
      nh3:  { warn: 25, danger: 35 },
      temp: { warn: 32, danger: 38, warnLow: 16, dangerLow: 12 },
      hum:  { warn: 75, danger: 85, warnLow: 35, dangerLow: 25 },
      battery: { low: 20 },
    },
    // The failure that actually kills flocks here, used to prioritise advice.
    primaryRisk: 'heat',
    hasMarketData: true,
  },

  qa: {
    id: 'qa',
    flag: '🇶🇦',
    dial: '+974',
    phoneDigits: 8,
    phoneExample: '3312 3456',
    currency: 'QAR',
    currencySymbol: 'QR',
    name: { en: 'Qatar', fr: 'Qatar', ar: 'قطر', de: 'Katar' },
    regionLabel: { en: 'Municipality', fr: 'Municipalité', ar: 'البلدية', de: 'Gemeinde' },
    langs: ['ar', 'en'],
    defaultLang: 'ar',
    regions: QA_REGIONS,
    // Production is almost entirely closed, evaporatively-cooled housing, so
    // NH3 and CO2 are tightened slightly against the Algerian open-house
    // numbers: a sealed house concentrates both far faster.
    thresholds: {
      co2:  { warn: 1500, danger: 2500 },
      nh3:  { warn: 20, danger: 30 },
      temp: { warn: 32, danger: 38, warnLow: 16, dangerLow: 12 },
      hum:  { warn: 75, danger: 85, warnLow: 35, dangerLow: 25 },
      battery: { low: 20 },
    },
    // Summer outdoor highs sit near 41 °C and the record is 50.4 °C. The
    // predictable catastrophe is not the weather itself but cooling or power
    // failure inside a sealed house, which turns a survivable day lethal in
    // hours.
    primaryRisk: 'cooling_failure',
    hasMarketData: false,
  },

  de: {
    id: 'de',
    flag: '🇩🇪',
    dial: '+49',
    phoneDigits: 11,          // German mobiles vary: 10-11 after the dial code
    phoneMinDigits: 10,
    phoneExample: '151 23456789',
    currency: 'EUR',
    currencySymbol: '€',
    name: { en: 'Germany', fr: 'Allemagne', ar: 'ألمانيا', de: 'Deutschland' },
    regionLabel: { en: 'Federal state', fr: 'Land', ar: 'الولاية', de: 'Bundesland' },
    langs: ['de', 'en'],
    defaultLang: 'de',
    regions: DE_REGIONS,
    // LEGALLY BINDING, not preference: EU Directive 2007/43/EC Annex II sets
    // NH3 <= 20 ppm and CO2 <= 3000 ppm at the birds' head height, and caps
    // 48-hour average humidity at 70% when it is below 10 C outside. EFSA
    // recommends a stricter 15 ppm for ammonia, which is used as the warning
    // level so the farmer is told before he is in breach rather than after.
    thresholds: {
      co2:  { warn: 2500, danger: 3000 },
      nh3:  { warn: 15, danger: 20 },
      temp: { warn: 30, danger: 35, warnLow: 15, dangerLow: 10 },
      hum:  { warn: 70, danger: 85, warnLow: 35, dangerLow: 25 },
      battery: { low: 20 },
    },
    // Winter heating failure during brooding is the German analogue of the
    // Gulf's cooling failure; avian influenza is the seasonal overlay.
    primaryRisk: 'cold',
    hasMarketData: false,
  },
};

export const COUNTRY_IDS = ['dz', 'qa', 'de'];
export const DEFAULT_COUNTRY = 'dz';

export function getCountry(id) {
  return COUNTRIES[id] || COUNTRIES[DEFAULT_COUNTRY];
}

/** Localized country name, falling back through English to the raw id. */
export function countryName(id, lang) {
  const c = COUNTRIES[id];
  if (!c) return '';
  return c.name[lang] || c.name.en || c.id;
}

/** What this country calls the thing a farm sits inside ("Wilaya", "Bundesland"…). */
export function regionLabel(countryId, lang) {
  const c = getCountry(countryId);
  return c.regionLabel[lang] || c.regionLabel.en;
}

export function regionsOf(countryId) {
  return getCountry(countryId).regions;
}

export function findRegion(countryId, regionId) {
  if (!regionId) return null;
  return regionsOf(countryId).find((r) => r.id === regionId) || null;
}

/**
 * Localized region name. Arabic names are carried per-region where they
 * exist; German states keep their German name in every language except
 * English, where the familiar English form reads better ("Lower Saxony").
 */
export function regionName(region, lang) {
  if (!region) return '';
  if (lang === 'ar' && region.ar) return region.ar;
  if (lang === 'en' && region.en) return region.en;
  return region.name;
}

/** Every language offered, ordered so the country's own comes first. */
export function langsForCountry(countryId) {
  return getCountry(countryId).langs;
}

/** Default thresholds for a country — see the notes on each entry above. */
export function thresholdsForCountry(countryId) {
  const c = getCountry(countryId);
  // Deep copy: callers edit these, and a shared object would leak one
  // farmer's custom limits into every other farm in the app.
  return JSON.parse(JSON.stringify(c.thresholds));
}

// ── Phone helpers ─────────────────────────────────────────────────────

/** Strip everything that is not a digit. */
export function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

/**
 * Is this a plausible national number for the country? Deliberately lenient —
 * the aim is to catch a farmer who typed six digits or pasted his whole
 * international number twice, not to enforce carrier prefixes we would have
 * to keep updating.
 */
export function isValidPhone(countryId, national) {
  const c = getCountry(countryId);
  const n = digitsOnly(national).length;
  const min = c.phoneMinDigits || c.phoneDigits;
  return n >= min && n <= c.phoneDigits;
}

/** Dial code + national number, the form the device and server both expect. */
export function fullPhone(countryId, national) {
  return `${getCountry(countryId).dial}${digitsOnly(national)}`;
}

/**
 * Split a stored international number back into its parts, so Settings can
 * show it in the same shape the farmer typed it.
 */
export function splitPhone(full) {
  const s = String(full || '').trim();
  for (const id of COUNTRY_IDS) {
    const { dial } = COUNTRIES[id];
    if (s.startsWith(dial)) return { country: id, national: s.slice(dial.length) };
  }
  return { country: null, national: digitsOnly(s) };
}
