/**
 * Locale alternates for public pages (doc 21 §15).
 *
 * Every public page has ONE canonical url (the default-locale form) and one
 * variant per translated locale. The alternates are what the sitemap and the
 * crawler check use, so both must be generated the same way - otherwise the
 * head and the sitemap would advertise different addresses.
 */

import { DEFAULT_LOCALE, LOCALE_PARAM, SEO_LOCALES, type SeoLocale } from './localeUrl';

/** Absolute url for a path against the site's origin. */
export function absoluteUrl(path: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const raw = String(path || '/');
  if (!base) return raw;
  try {
    const url = new URL(raw, base);
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * The locale variants of one path. `en` is the canonical form (no parameter),
 * every other translated locale is the same path plus `?lang=xx`.
 */
export function localeVariants(path: string): Array<{ locale: SeoLocale; href: string }> {
  const raw = String(path || '/');
  const [pathname, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  params.delete(LOCALE_PARAM);
  const base = params.toString() ? `${pathname}?${params.toString()}` : pathname;
  return SEO_LOCALES.map((locale) => ({
    locale,
    href: locale === DEFAULT_LOCALE ? base : `${base}${base.includes('?') ? '&' : '?'}${LOCALE_PARAM}=${locale}`,
  }));
}

/**
 * The hreflang alternates for a page: one per translated locale plus
 * `x-default` pointing at the canonical (default-locale) url.
 */
export function buildLocaleAlternates(path: string, origin?: string): Array<{ hrefLang: string; href: string }> {
  const variants = localeVariants(path);
  const alternates: Array<{ hrefLang: string; href: string }> = variants.map(({ locale, href }) => ({
    hrefLang: locale,
    href: absoluteUrl(href, origin),
  }));
  const canonical = variants.find((v) => v.locale === DEFAULT_LOCALE);
  if (canonical) alternates.push({ hrefLang: 'x-default', href: absoluteUrl(canonical.href, origin) });
  return alternates;
}
