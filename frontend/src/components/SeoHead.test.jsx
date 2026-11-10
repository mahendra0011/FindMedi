import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import SeoHead from './SeoHead';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('[data-seo-alternate="true"], #fm-jsonld, link[rel="canonical"], meta[name="robots"]').forEach((node) => node.remove());
});

describe('SeoHead', () => {
  it('sets locale, canonical, robots and valid language alternates on public pages', () => {
    render(<SeoHead
      title="FindMedi doctors"
      canonical="https://findmedi.in/doctors"
      locale="hi"
      alternates={[
        { hrefLang: 'en', href: 'https://findmedi.in/doctors' },
        { hrefLang: 'hi', href: 'https://findmedi.in/hi/doctors' },
        { hrefLang: 'x-default', href: 'https://findmedi.in/doctors' },
        { hrefLang: 'en', href: 'https://attacker.example/duplicate' },
        { hrefLang: 'xx<script>', href: 'https://findmedi.in/invalid' },
        { hrefLang: 'fr', href: 'javascript:alert(1)' },
      ]}
    />);

    expect(document.documentElement).toHaveAttribute('lang', 'hi');
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://findmedi.in/doctors');
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    expect([...document.head.querySelectorAll('link[data-seo-alternate="true"]')].map((link) => [link.hreflang, link.href])).toEqual([
      ['en', 'https://findmedi.in/doctors'],
      ['hi', 'https://findmedi.in/hi/doctors'],
      ['x-default', 'https://findmedi.in/doctors'],
    ]);
  });

  it('suppresses structured data and language alternates on noindex pages', () => {
    render(<SeoHead
      title="Private"
      noindex
      jsonLd={{ '@type': 'Physician', name: 'Private record' }}
      alternates={[{ hrefLang: 'en', href: 'https://findmedi.in/private' }]}
    />);

    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
    expect(document.getElementById('fm-jsonld')).not.toBeInTheDocument();
    expect(document.head.querySelectorAll('link[data-seo-alternate="true"]')).toHaveLength(0);
  });

  it('replaces old alternates when the public page changes', () => {
    const { rerender } = render(<SeoHead title="English" alternates={[{ hrefLang: 'en', href: 'https://findmedi.in/en' }]} />);
    rerender(<SeoHead title="Hindi" alternates={[{ hrefLang: 'hi', href: 'https://findmedi.in/hi' }]} />);

    expect(document.head.querySelectorAll('link[data-seo-alternate="true"]')).toHaveLength(1);
    expect(document.head.querySelector('link[data-seo-alternate="true"]')).toHaveAttribute('hreflang', 'hi');
  });
});
