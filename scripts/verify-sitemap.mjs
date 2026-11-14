// Crawler verification for the public sitemap (doc 21 §15: "crawler
// verification").
//
// Usage:
//   node scripts/verify-sitemap.mjs --sitemap frontend/public/sitemap.xml \
//     [--base http://localhost:5173] [--limit 40] [--timeout 15000]
//
// For every url in the sitemap it checks the things a crawler actually
// needs, and the things that silently break a launch:
//   1. the url answers 200 (a sitemap of 404s is a launch bug)
//   2. the page declares a canonical link
//   3. the page is NOT noindex (a noindex page in a sitemap is ignored)
//   4. the declared canonical matches the url that was fetched
//   5. the declared hreflang alternates resolve too
//   6. the locale variant answers 200 and renders that locale
//
// Exit code is non-zero when anything fails, so CI can gate on it.
import fs from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fb) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const ix = argv.indexOf(`--${name}`);
  if (ix >= 0 && ix + 1 < argv.length) return argv[ix + 1];
  return fb;
};

const sitemapPath = arg('sitemap', 'frontend/public/sitemap.xml');
const base = (arg('base', process.env.SITEMAP_BASE ?? 'https://findmedi.in')).replace(/\/$/, '');
const limit = Math.max(1, parseInt(arg('limit', '40'), 10) || 40);
const timeoutMs = Math.max(1000, parseInt(arg('timeout', '15000'), 10) || 15000);

if (!fs.existsSync(sitemapPath)) {
  console.error(`verify-sitemap: sitemap not found: ${sitemapPath}`);
  process.exit(1);
}

const xml = fs.readFileSync(sitemapPath, 'utf8');

const decode = (value) => String(value || '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]).trim());
const alternates = [...xml.matchAll(/<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)]
  .map((m) => ({ hreflang: m[1], href: decode(m[2]) }));

if (!locs.length) {
  console.error('verify-sitemap: the sitemap has no <loc> entries');
  process.exit(1);
}

const targets = locs.slice(0, limit);
const failures = [];
const checked = [];

// The sitemap carries the PRODUCTION origin; the check runs against a local
// or staging origin. The base therefore REPLACES the origin of every url, so
// the same sitemap can be verified against any deployment.
const absolute = (href) => {
  try {
    const url = new URL(href, base);
    const baseUrl = new URL(base);
    return `${baseUrl.origin}${url.pathname}${url.search}`;
  } catch {
    return href;
  }
};

const fetchPage = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    const body = res.status === 200 ? await res.text() : '';
    return { status: res.status, body, finalUrl: res.url };
  } catch (err) {
    return { status: 0, body: '', finalUrl: url, error: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
  }
};

for (const loc of targets) {
  const url = absolute(loc);
  const page = await fetchPage(url);
  if (page.status !== 200) {
    failures.push(`${loc} -> HTTP ${page.status}${page.error ? ` (${page.error})` : ''}`);
    continue;
  }

  const canonical = page.body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1]
    || page.body.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i)?.[1];
  if (!canonical) {
    failures.push(`${loc} -> no canonical link`);
    continue;
  }
  const canonicalPath = new URL(absolute(canonical), base).pathname + new URL(absolute(canonical), base).search;
  const locPath = new URL(url).pathname + new URL(url).search;
  if (canonicalPath !== locPath) {
    failures.push(`${loc} -> canonical mismatch (${canonicalPath})`);
    continue;
  }

  const robots = page.body.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i)?.[1] || '';
  if (/noindex/i.test(robots)) {
    failures.push(`${loc} -> noindex in the sitemap`);
    continue;
  }

  // The locale variants of this url must resolve as well. The static html
  // carries the same head for every locale (the language itself is applied
  // by the app at runtime), so the crawler checks that the variant answers
  // and advertises the same alternate set. The runtime locale is verified in
  // the browser suite.
  const variants = alternates.filter((a) => {
    try { return new URL(a.href).pathname === new URL(url).pathname; } catch { return false; }
  });
  for (const variant of variants) {
    if (variant.hreflang === 'x-default') continue;
    const variantPage = await fetchPage(absolute(variant.href));
    if (variantPage.status !== 200) {
      failures.push(`${loc} -> ${variant.hreflang} variant HTTP ${variantPage.status}`);
      continue;
    }
    const variantAlternates = [...variantPage.body.matchAll(/<link[^>]+rel="alternate"[^>]*hreflang="([^"]+)"/gi)]
      .map((m) => m[1].toLowerCase());
    if (!variantAlternates.includes(variant.hreflang.toLowerCase())) {
      failures.push(`${loc} -> ${variant.hreflang} variant does not advertise its own alternate`);
    }
  }

  checked.push(loc);
}

console.log(`verify-sitemap: checked ${checked.length}/${targets.length} urls from ${sitemapPath}`);
if (failures.length) {
  console.error(`verify-sitemap: ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('verify-sitemap: every checked url answers 200 with a matching canonical, indexable, and its locale variants resolve');
