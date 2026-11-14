/**
 * Locale URLs for public pages (doc 21 §15 "localized alternates wired to real
 * locale URLs").
 *
 * The app used to keep the language in localStorage only, which means every
 * locale of a page shared ONE url. That is not a crawlable locale URL: a
 * crawler (and a human sharing a link) had no way to ask for the Hindi
 * version of a page, and hreflang alternates would all have pointed at the
 * same address.
 *
 * The locale therefore also lives in the query string - `?lang=hi` - which
 * is what the sitemap alternates and the crawler check use. `?lang=en` is
 * the canonical form of every page; other locales are variants of it.
 */

export const LOCALE_PARAM = 'lang';

/** The default locale: its URL carries no parameter at all. */
export const DEFAULT_LOCALE = 'en';

/**
 * Locales the app ships real content for. The other supported languages
 * (mr/bn/as/or/ta/te) fall back to English for most strings, so pointing a
 * hreflang at them would advertise an English page as a translation.
 */
export const SEO_LOCALES = ['en', 'hi'] as const;

export type SeoLocale = (typeof SEO_LOCALES)[number];

export const isSupportedLocale = (value: unknown): value is SeoLocale =>
  typeof value === 'string' && (SEO_LOCALES as readonly string[]).includes(value);

/** Read `?lang=` from a query string. Returns null when absent/unknown. */
export function readLocaleFromQuery(search: string): SeoLocale | null {
  try {
    const params = new URLSearchParams(search || '');
    const value = params.get(LOCALE_PARAM);
    return isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Build the url of `path` in `locale`. The default locale keeps the clean
 * path (no parameter) so the canonical url of every page stays stable.
 */
export function localeUrl(path: string, locale: SeoLocale | string = DEFAULT_LOCALE): string {
  const raw = String(path || '/');
  const [pathname, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  params.delete(LOCALE_PARAM);
  if (locale && locale !== DEFAULT_LOCALE) {
    params.set(LOCALE_PARAM, locale);
  }
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** The current path without the locale parameter. */
export function stripLocaleFromPath(path: string): string {
  const raw = String(path || '/');
  const [pathname, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  params.delete(LOCALE_PARAM);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * Rewrite the address bar to the given locale (no reload). Returns the new
 * url, or null when the browser is not available.
 */
export function applyLocaleToUrl(locale: SeoLocale | string, win: Window | undefined = typeof window === 'undefined' ? undefined : window): string | null {
  if (!win?.history?.replaceState) return null;
  try {
    const next = localeUrl(`${win.location.pathname}${win.location.search}`, locale);
    win.history.replaceState(win.history.state, '', next);
    return next;
  } catch {
    return null;
  }
}
