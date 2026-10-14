// Generates sitemap XML for public pages (real data only, no thin pages).
// Usage:
//   node scripts/generate-sitemap.mjs [--base https://findmedi.in] [--out frontend/public/sitemap.xml]
//     [--data scripts/sitemap-data.json] [--min 3]
// --data JSON shape (exported from the DB, verified rows only):
//   {
//     "listings": [{ "loc": "/hospitals?city=bhopal&category=dental", "count": 12 }],
//     "details": [{ "loc": "/doctors/dentist/bhopal/dr-sharma-abc123" }]
//   }
// Rules: listing pages with count < --min are SKIPPED (thin content); detail
// pages are included exactly as exported (the export must only contain
// verified providers); dashboards/private routes must never be exported.
// Output is capped at 50,000 urls per the sitemap protocol (extras dropped
// with a warning - split into sitemap index files if this ever triggers).
import fs from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fb) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const ix = argv.indexOf(`--${name}`);
  if (ix >= 0 && ix + 1 < argv.length) return argv[ix + 1];
  return fb;
};

const base = (arg('base', process.env.SITEMAP_BASE ?? 'https://findmedi.in')).replace(/\/$/, '');
const out = arg('out', 'frontend/public/sitemap.xml');
const dataPath = arg('data', '');
const minProviders = Math.max(1, parseInt(arg('min', '3'), 10) || 3);
const URL_CAP = 50000;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Static public routes only - never dashboards, portals, admin or auth pages.
const staticRoutes = ['/', '/about', '/contact', '/privacy', '/terms', '/refund-policy', '/disclaimer'];
const urls = staticRoutes.map((r) => `  <url><loc>${base}${r}</loc><changefreq>weekly</changefreq></url>`);
let skippedThin = 0;

if (dataPath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    console.error(`sitemap: cannot read --data file ${dataPath}: ${err.message}`);
    process.exit(1);
  }
  for (const item of data.listings || []) {
    if (!item || typeof item.loc !== 'string') continue;
    // Thin listing pages (< min verified providers) are excluded - they read
    // as doorway pages to crawlers and dilute crawl budget.
    if ((item.count ?? 0) < minProviders) {
      skippedThin += 1;
      continue;
    }
    urls.push(`  <url><loc>${base}${esc(item.loc)}</loc><changefreq>daily</changefreq></url>`);
  }
  for (const item of data.details || []) {
    if (!item || typeof item.loc !== 'string') continue;
    urls.push(`  <url><loc>${base}${esc(item.loc)}</loc><changefreq>weekly</changefreq></url>`);
  }
}

let capped = 0;
if (urls.length > URL_CAP) {
  capped = urls.length - URL_CAP;
  urls.length = URL_CAP;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(out, xml);
console.log(`sitemap written: ${out} (${urls.length} urls, ${skippedThin} thin listings skipped${capped ? `, ${capped} OVER 50k cap DROPPED` : ''})`);
if (capped > 0) console.error('sitemap: URL cap hit - split into a sitemap index before deploying');
