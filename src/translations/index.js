import ar from './ar';
import fr from './fr';
import en from './en';
import de from './de';

export const LANGS = {
  ar: { name: 'العربية', rtl: true,  dict: ar },
  fr: { name: 'Français', rtl: false, dict: fr },
  en: { name: 'English',  rtl: false, dict: en },
  de: { name: 'Deutsch',  rtl: false, dict: de },
};

export const DEFAULT_LANG = 'ar';

// Where to look when a key is missing from the active dictionary. English
// sits ahead of Arabic deliberately: the old chain fell straight back to
// DEFAULT_LANG, so a single missing key would drop Arabic script into the
// middle of a German or French screen. English is the one language every
// other dictionary was written against, so it is the honest second choice.
const FALLBACK_CHAIN = ['en', 'ar'];

export function makeT(lang) {
  const dict = (LANGS[lang] || LANGS[DEFAULT_LANG]).dict;
  return function t(key, vars) {
    let value = dict[key];
    if (value === undefined) {
      for (const code of FALLBACK_CHAIN) {
        if (code === lang) continue;
        value = LANGS[code].dict[key];
        if (value !== undefined) break;
      }
    }
    if (value === undefined) return key;
    if (vars && typeof value === 'string') {
      Object.keys(vars).forEach((k) => {
        value = value.replace(`{${k}}`, String(vars[k]));
      });
    }
    return value;
  };
}

export function isRTL(lang) {
  return !!(LANGS[lang] || LANGS[DEFAULT_LANG]).rtl;
}
