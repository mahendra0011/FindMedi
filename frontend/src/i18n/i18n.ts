// Tiny i18n stub (hi + en) — deliberately NOT react-i18next: no extra
// dependency, no provider boilerplate, works in plain .ts utilities too.
// Dictionaries live in ./locales/*.json; missing keys fall back to English,
// then to the key itself. Persisted in localStorage (`fm_locale`).
import en from './locales/en.json';
import hi from './locales/hi.json';

export type Locale = 'en' | 'hi';

const LOCALE_KEY = 'fm_locale';
const DICTS: Record<Locale, Record<string, string>> = {
  en: en as Record<string, string>,
  hi: hi as Record<string, string>,
};

let current: Locale = 'en';

try {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === 'hi' || saved === 'en') current = saved;
  else if (typeof navigator !== 'undefined' && navigator.language?.startsWith('hi')) current = 'hi';
} catch {
  // storage unavailable — default to English
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore — language just won't persist
  }
  try {
    document.documentElement.lang = locale;
  } catch {
    // non-DOM environment
  }
}

/** Translate a key, e.g. t('action.book'). Falls back en → key. */
export function t(key: string, locale: Locale = current): string {
  return DICTS[locale][key] ?? DICTS.en[key] ?? key;
}

/** All keys available in English (the reference dictionary). */
export function allKeys(): string[] {
  return Object.keys(DICTS.en);
}
