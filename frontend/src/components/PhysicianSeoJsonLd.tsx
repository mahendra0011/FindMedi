import { useEffect, useMemo } from 'react';

/**
 * Legacy-page SEO head: sets document.title and injects a Physician
 * JSON-LD block while the component is mounted. Used by the legacy
 * doctor detail pages (/clinic-doctors/:id, /hospital-doctors/:id) which
 * are exported in the sitemap and were missing per-page structured data.
 */
export default function PhysicianSeoJsonLd({
  title,
  jsonLd,
}: {
  title: string;
  jsonLd: Record<string, unknown> | null;
}) {
  const serialized = useMemo(() => (jsonLd ? JSON.stringify(jsonLd) : ''), [jsonLd]);

  useEffect(() => {
    document.title = title;
    if (!serialized) return undefined;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-physician-seo', 'true');
    script.textContent = serialized;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [title, serialized]);

  return null;
}
