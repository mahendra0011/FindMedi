import { useEffect } from 'react';

export interface SeoHeadProps {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  ogImage?: string;
  locale?: string;
}

/** Public-page SEO head: title/meta/canonical + JSON-LD (MedicalOrganization/Physician/LocalBusiness/Event). Never render on private/dashboard pages. */
export default function SeoHead({ title, description, canonical, noindex, jsonLd, ogImage, locale = 'en' }: SeoHeadProps) {
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
    document.documentElement.lang = locale;
  }, [title, description, canonical, noindex, jsonLd, ogImage, locale]);
  return null;
}

/** Genuine-reviews-only aggregateRating helper (never fabricate ratings). */
export function aggregateRating(ratingAvg?: number, ratingCount?: number) {
  if (!ratingAvg || !ratingCount || ratingCount < 3) return undefined;
  return { '@type': 'AggregateRating', ratingValue: ratingAvg, reviewCount: ratingCount };
}
