// Prerenders the HEAD of every public route into the built SPA
// (doc 21 §15: "SSR/prerender").
//
// Usage:
//   node scripts/prerender-routes.mjs --dist frontend/dist \
//     [--base https://findmedi.in] [--data scripts/sitemap-data.json]
//
// A single-page app answers every route with the SAME html, so a crawler
// that does not execute JavaScript sees the home page's title, canonical
// and description for every url - which is how a site ends up with
// thousands of urls canonicalising to "/".
//
// This writes one html file per route (`/about` -> dist/about/index.html)
// with that route's title, description, canonical, hreflang alternates and
// robots tag baked in. The app still hydrates from it; a crawler that does
// not run JavaScript sees a correct head.
//
// The routes come from the sitemap data (the verified live listings) plus
// the static public routes, so the prerendered set and the sitemap always
// describe the same pages.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fb) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const ix = argv.indexOf(`--${name}`);
  if (ix >= 0 && ix + 1 < argv.length) return argv[ix + 1];
  return fb;
};

const dist = arg('dist', 'frontend/dist');
const base = (arg('base', process.env.SITEMAP_BASE ?? 'https://findmedi.in')).replace(/\/$/, '');
const dataPath = arg('data', 'scripts/sitemap-data.json');
const template = path.join(dist, 'index.html');

if (!fs.existsSync(template)) {
  console.error(`prerender-routes: no build found at ${template} (run the frontend build first)`);
  process.exit(1);
}

const LOCALES = ['en', 'hi'];
const DEFAULT_LOCALE = 'en';
const LOCALE_PARAM = 'lang';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const STATIC_ROUTES = [
  { loc: '/', title: 'FindMedi - Find Doctors, Clinics, Labs & Hospitals Near You', description: 'Book doctor appointments, lab tests, medicines, home visits and health camps. Verified doctors, clinics, labs and hospitals across India.' },
  { loc: '/about', title: 'About FindMedi - Verified Healthcare, Transparent Pricing', description: 'How FindMedi works: verified providers, transparent fees, secure records and a care team that answers.' },
  { loc: '/contact', title: 'Contact FindMedi - Support, Grievance & DPO | FindMedi', description: 'Reach FindMedi: support hotline, email, registered office, clinical safety escalation and the DPO grievance office.' },
  { loc: '/privacy', title: 'Privacy Policy | FindMedi', description: 'How FindMedi collects, uses and protects your health data under the DPDP Act 2023.' },
  { loc: '/terms', title: 'Terms of Service | FindMedi', description: 'The terms that govern the use of the FindMedi healthcare platform.' },
  { loc: '/refund-policy', title: 'Refunds & Standby Fees | FindMedi', description: 'When a booking is refunded, how long a refund takes and the standby fee rules.' },
  { loc: '/disclaimer', title: 'Medical Disclaimer | FindMedi', description: 'FindMedi is a healthcare technology platform and not a substitute for professional medical advice.' },
];

const localeVariants = (loc) => {
  const raw = String(loc || '/');
  const [pathname, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  params.delete(LOCALE_PARAM);
  const basePath = params.toString() ? `${pathname}?${params.toString()}` : pathname;
  return LOCALES.map((locale) => ({
    locale,
    href: locale === DEFAULT_LOCALE
      ? basePath
      : `${basePath}${basePath.includes('?') ? '&' : '?'}${LOCALE_PARAM}=${locale}`,
  }));
};

const headFor = (route) => {
  const variants = localeVariants(route.loc);
  const canonical = `${base}${variants.find((v) => v.locale === DEFAULT_LOCALE).href}`;
  const alternates = variants.map(({ locale, href }) =>
    `    <link rel="alternate" hreflang="${locale}" href="${esc(base + href)}" />`).join('\n');
  const xDefault = variants.find((v) => v.locale === DEFAULT_LOCALE);
  return [
    `    <title>${esc(route.title)}</title>`,
    `    <meta name="description" content="${esc(route.description)}" />`,
    `    <meta name="robots" content="index,follow" />`,
    `    <link rel="canonical" href="${esc(canonical)}" />`,
    alternates,
    `    <link rel="alternate" hreflang="x-default" href="${esc(base + xDefault.href)}" />`,
    `    <meta property="og:title" content="${esc(route.title)}" />`,
    `    <meta property="og:description" content="${esc(route.description)}" />`,
    `    <meta property="og:url" content="${esc(canonical)}" />`,
    `    <meta name="twitter:title" content="${esc(route.title)}" />`,
    `    <meta name="twitter:description" content="${esc(route.description)}" />`,
  ].join('\n');
};

const routes = [...STATIC_ROUTES];
if (dataPath && fs.existsSync(dataPath)) {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const item of data.details || []) {
    if (!item || typeof item.loc !== 'string') continue;
    routes.push({
      loc: item.loc,
      title: item.title || 'FindMedi provider | FindMedi',
      description: item.description || 'Verified provider on FindMedi. Check fees, timings and book online.',
    });
  }
}

const html = fs.readFileSync(template, 'utf8');
const headStart = html.indexOf('<head>');
const headEnd = html.indexOf('</head>');
if (headStart === -1 || headEnd === -1) {
  console.error('prerender-routes: the built html has no <head>');
  process.exit(1);
}

// The head of the template minus the tags we re-declare per route.
const templateHead = html.slice(headStart + '<head>'.length, headEnd)
  .replace(/<title>[\s\S]*?<\/title>\s*/g, '')
  .replace(/<meta name="description"[^>]*>\s*/g, '')
  .replace(/<link rel="canonical"[^>]*>\s*/g, '')
  .replace(/<link rel="alternate"[^>]*>\s*/g, '')
  .replace(/<meta name="robots"[^>]*>\s*/g, '')
  .replace(/<meta property="og:title"[^>]*>\s*/g, '')
  .replace(/<meta property="og:description"[^>]*>\s*/g, '')
  .replace(/<meta property="og:url"[^>]*>\s*/g, '')
  .replace(/<meta name="twitter:title"[^>]*>\s*/g, '')
  .replace(/<meta name="twitter:description"[^>]*>\s*/g, '');

let written = 0;
for (const route of routes) {
  const [pathname] = route.loc.split('?');
  const clean = pathname.replace(/^\/+/, '');
  const targetDir = clean ? path.join(dist, clean) : dist;
  fs.mkdirSync(targetDir, { recursive: true });
  const page = `<!doctype html>\n<html lang="${DEFAULT_LOCALE}">\n  <head>${templateHead}\n${headFor(route)}\n  </head>` + html.slice(headEnd + '</head>'.length);
  fs.writeFileSync(path.join(targetDir, 'index.html'), page);
  written += 1;
}

console.log(`prerender-routes: wrote ${written} route head(s) into ${dist}`);
