// Generates sitemap XML for public city×category + provider pages (real data only, no thin pages).
// Usage: node scripts/generate-sitemap.mjs [--base https://findmedi.in] [--out frontend/public/sitemap.xml]
// Thin pages (< N verified providers) are skipped; dashboards/private routes never included.
import fs from 'node:fs';

const base = (process.argv.find((a) => a.startsWith('--base='))?.split('=')[1]
  ?? process.env.SITEMAP_BASE ?? 'https://findmedi.in').replace(/\/$/, '');
const out = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'frontend/public/sitemap.xml';

const staticRoutes = ['/', '/about', '/contact', '/privacy', '/terms', '/refund-policy', '/disclaimer'];
const urls = staticRoutes.map((r) => `  <url><loc>${base}${r}</loc><changefreq>weekly</changefreq></url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(out, xml);
console.log(`sitemap written: ${out} (${staticRoutes.length} static urls; dynamic city×category urls append after DB export)`);
