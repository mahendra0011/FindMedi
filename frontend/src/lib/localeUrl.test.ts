import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE,
  SEO_LOCALES,
  isSupportedLocale,
  readLocaleFromQuery,
  localeUrl,
  stripLocaleFromPath,
  applyLocaleToUrl,
} from './localeUrl';
import { buildLocaleAlternates, localeVariants } from './seoAlternates';

describe('localeUrl', () => {
  it('keeps the default locale out of the query string', () => {
    expect(localeUrl('/hospitals', DEFAULT_LOCALE)).toBe('/hospitals');
    expect(localeUrl('/hospitals', 'en')).toBe('/hospitals');
  });

  it('adds the locale parameter for a translated locale', () => {
    expect(localeUrl('/hospitals', 'hi')).toBe('/hospitals?lang=hi');
  });

  it('preserves the other query parameters', () => {
    expect(localeUrl('/hospitals?city=bhopal', 'hi')).toBe('/hospitals?city=bhopal&lang=hi');
    expect(localeUrl('/hospitals?city=bhopal&lang=hi', 'en')).toBe('/hospitals?city=bhopal');
  });

  it('replaces an existing locale parameter instead of duplicating it', () => {
    expect(localeUrl('/hospitals?lang=hi', 'en')).toBe('/hospitals');
    expect(localeUrl('/hospitals?lang=en', 'hi')).toBe('/hospitals?lang=hi');
  });

  it('reads a supported locale from the query and ignores the rest', () => {
    expect(readLocaleFromQuery('?lang=hi')).toBe('hi');
    expect(readLocaleFromQuery('?city=bhopal&lang=hi')).toBe('hi');
    expect(readLocaleFromQuery('?lang=de')).toBeNull();
    expect(readLocaleFromQuery('')).toBeNull();
  });

  it('strips only the locale parameter', () => {
    expect(stripLocaleFromPath('/hospitals?lang=hi')).toBe('/hospitals');
    expect(stripLocaleFromPath('/hospitals?city=bhopal&lang=hi')).toBe('/hospitals?city=bhopal');
    expect(stripLocaleFromPath('/hospitals')).toBe('/hospitals');
  });

  it('only trusts the locales the site actually translates', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('hi')).toBe(true);
    expect(isSupportedLocale('mr')).toBe(false);
    expect(SEO_LOCALES).toEqual(['en', 'hi']);
  });
});

describe('applyLocaleToUrl', () => {
  it('rewrites the address bar without a reload', () => {
    const calls: Array<[string | URL | null, string | URL | undefined]> = [];
    const win = {
      location: { pathname: '/hospitals', search: '?city=bhopal' },
      history: {
        state: null,
        replaceState: (a: unknown, b: string, url: string) => { calls.push([url as never, undefined]); },
      },
    } as unknown as Window;

    const next = applyLocaleToUrl('hi', win);
    expect(next).toBe('/hospitals?city=bhopal&lang=hi');
    expect(calls).toHaveLength(1);
  });

  it('drops the parameter when going back to the default locale', () => {
    const win = {
      location: { pathname: '/hospitals', search: '?lang=hi' },
      history: { state: null, replaceState: () => {} },
    } as unknown as Window;
    expect(applyLocaleToUrl('en', win)).toBe('/hospitals');
  });
});

describe('locale alternates', () => {
  it('builds one variant per translated locale plus the canonical one', () => {
    const variants = localeVariants('/doctors/doctor/bhopal/dr-sharma');
    expect(variants.map((v) => v.locale)).toEqual(['en', 'hi']);
    expect(variants[0].href).toBe('/doctors/doctor/bhopal/dr-sharma');
    expect(variants[1].href).toBe('/doctors/doctor/bhopal/dr-sharma?lang=hi');
  });

  it('emits hreflang entries with an x-default pointing at the canonical url', () => {
    const alternates = buildLocaleAlternates('/about', 'https://findmedi.in');
    expect(alternates).toEqual([
      { hrefLang: 'en', href: 'https://findmedi.in/about' },
      { hrefLang: 'hi', href: 'https://findmedi.in/about?lang=hi' },
      { hrefLang: 'x-default', href: 'https://findmedi.in/about' },
    ]);
  });

  it('keeps the other query parameters in every variant', () => {
    const alternates = buildLocaleAlternates('/hospitals?city=bhopal', 'https://findmedi.in');
    expect(alternates[0].href).toBe('https://findmedi.in/hospitals?city=bhopal');
    expect(alternates[1].href).toBe('https://findmedi.in/hospitals?city=bhopal&lang=hi');
  });
});
