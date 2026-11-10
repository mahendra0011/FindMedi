import { useEffect } from 'react';

export interface SeoHeadProps {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  ogImage?: string;
  locale?: string;
  alternates?: Array<{ hrefLang: string; href: string }>;
}

/** Public-page SEO head: title/meta/canonical + JSON-LD (MedicalOrganization/Physician/LocalBusiness/Event). Never render on private/dashboard pages. */
const isSafeAbsoluteUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export default function SeoHead({ title, description, canonical, noindex, jsonLd, ogImage, locale = 'en', alternates = [] }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, create: () => HTMLMetaElement) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) { el = create(); document.head.appendChild(el); }
      return el;
    };
    if (description) {
      setMeta('meta[name="description"]', () => { const m = document.createElement('meta'); m.name = 'description'; return m; }).content = description;
    }
    setMeta('meta[name="robots"]', () => { const m = document.createElement('meta'); m.name = 'robots'; return m; }).content = noindex ? 'noindex,nofollow' : 'index,follow';
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
      link.href = canonical;
    } else if (link) link.remove();
    const SCRIPT_ID = 'fm-jsonld';
    document.getElementById(SCRIPT_ID)?.remove();
    if (jsonLd && !noindex) {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.type = 'application/ld+json';
      s.text = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
    if (ogImage) {
      setMeta('meta[property="og:image"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:image'); return m; }).content = ogImage;
    }
    document.head.querySelectorAll('link[data-seo-alternate="true"]').forEach((el) => el.remove());
    if (!noindex) {
      const seen = new Set<string>();
      alternates.forEach(({ hrefLang, href }) => {
        const language = String(hrefLang || '').trim();
        if (!/^(?:[a-z]{2,3}(?:-[A-Z]{2})?|x-default)$/.test(language) || !isSafeAbsoluteUrl(href) || seen.has(language)) return;
        seen.add(language);
        const alternate = document.createElement('link');
        alternate.rel = 'alternate';
        alternate.setAttribute('hreflang', language);
        alternate.href = href;
        alternate.dataset.seoAlternate = 'true';
        document.head.appendChild(alternate);
      });
    }
    document.documentElement.lang = locale;
  }, [title, description, canonical, noindex, jsonLd, ogImage, locale, alternates]);
  return null;
}

/** Genuine-reviews-only aggregateRating helper (never fabricate ratings). */
export function aggregateRating(ratingAvg?: number, ratingCount?: number) {
  if (!ratingAvg || !ratingCount || ratingCount < 3) return undefined;
  return { '@type': 'AggregateRating', ratingValue: ratingAvg, reviewCount: ratingCount };
}
