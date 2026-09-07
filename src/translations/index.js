import ar from './ar';
import fr from './fr';
import en from './en';

export const LANGS = {
  ar: { name: 'العربية', rtl: true, dict: ar },
  fr: { name: 'Français', rtl: false, dict: fr },
  en: { name: 'English', rtl: false, dict: en },
};

export const DEFAULT_LANG = 'ar';

export function makeT(lang) {
  const dict = (LANGS[lang] || LANGS[DEFAULT_LANG]).dict;
  return function t(key, vars) {
    let value = dict[key];
    if (value === undefined) value = LANGS[DEFAULT_LANG].dict[key];
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
