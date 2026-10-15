import express from 'express';
import {
  BRAND_FOUNDATION,
  SEO_SITE_ARCHITECTURE,
  generateSchemaOrgJsonLd,
  getSeoUrlForListing,
} from '../config/marketingSeo.js';
import City from '../models/City.js';
import ServiceCity from '../models/ServiceCity.js';
import Facility from '../models/Facility.js';
import Doctor from '../models/Doctor.js';
import HealthPackage from '../models/HealthPackage.js';
import logger from '../config/logger.js';

const router = express.Router();

let sitemapCache = null;
let sitemapCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function clearSitemapCache() {
  sitemapCache = null;
  sitemapCacheTime = 0;
}

const CANONICAL_CATEGORIES = [
  { slug: 'doctors', name: 'Doctors & Specialists', type: 'hospital' },
  { slug: 'dentist', name: 'Dentists & Dental Clinics', type: 'clinic' },
  { slug: 'pharmacy', name: 'Pharmacies & Medical Stores', type: 'pharmacy' },
  { slug: 'diagnostic-lab', name: 'Diagnostic Labs & Pathology', type: 'lab' },
  { slug: 'home-visit', name: 'Home Care & Doctor Visit', type: 'clinic' },
  { slug: 'ayush', name: 'Ayurveda & Natural Care', type: 'clinic' },
  { slug: 'mental-health', name: 'Mental Health & Counseling', type: 'clinic' },
  { slug: 'specialty-care', name: 'Specialty Care Centers', type: 'hospital' },
];

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds the complete dynamic sitemap dataset respecting Document 21 SEO quality gates.
 */
export async function generateSitemapData(baseUrl) {
  const origin = (baseUrl || 'https://findmedi.in').replace(/\/+$/, '');
  const now = new Date().toISOString().split('T')[0];

  // 1. Static high-intent marketing pages
  const staticUrls = [
    { loc: `${origin}/`, changefreq: 'daily', priority: '1.0', lastmod: now },
    { loc: `${origin}/about`, changefreq: 'monthly', priority: '0.6', lastmod: now },
    { loc: `${origin}/contact`, changefreq: 'monthly', priority: '0.6', lastmod: now },
    { loc: `${origin}/privacy`, changefreq: 'monthly', priority: '0.5', lastmod: now },
    { loc: `${origin}/terms`, changefreq: 'monthly', priority: '0.5', lastmod: now },
    { loc: `${origin}/join`, changefreq: 'weekly', priority: '0.8', lastmod: now },
  ];

  // 2. Resolve Active Cities
  const [dbCities, serviceCities] = await Promise.all([
    City.find({ isActive: true }).select('name state').lean().catch(() => []),
    ServiceCity.find({ isActive: true }).select('name state').lean().catch(() => []),
  ]);

  const cityMap = new Map();
  // Pilot core cities from Document 21 always primed
  const defaultCities = [
    { name: 'Bhopal', state: 'Madhya Pradesh' },
    { name: 'Indore', state: 'Madhya Pradesh' },
    { name: 'Jabalpur', state: 'Madhya Pradesh' },
    { name: 'Gwalior', state: 'Madhya Pradesh' },
    { name: 'Ujjain', state: 'Madhya Pradesh' },
  ];
  for (const c of [...defaultCities, ...dbCities, ...serviceCities]) {
    if (c?.name) {
      const slug = slugify(c.name);
      if (!cityMap.has(slug)) {
        cityMap.set(slug, { name: c.name, state: c.state || 'India', slug });
      }
    }
  }
  const cities = Array.from(cityMap.values());

  // 3. Query approved verified providers
  const [facilities, doctors, packages] = await Promise.all([
    Facility.find({ status: 'approved' }).select('slug type city name updatedAt').lean().catch(() => []),
    Doctor.find({ approved: true }).select('doctorId specialization specialtyCode location updatedAt').lean().catch(() => []),
    HealthPackage.find({ isActive: true }).select('name category updatedAt').lean().catch(() => []),
  ]);

  const dynamicUrls = [];
  let thinPagesExcluded = 0;

  // 4. City Hub Pages: /<city>/
  for (const city of cities) {
    dynamicUrls.push({
      loc: `${origin}/${city.slug}/`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: now,
    });

    // 5. City × Category Pages with Document 21 Quality Gate (min 3 verified providers)
    for (const cat of CANONICAL_CATEGORIES) {
      const matchingFacilities = facilities.filter((f) => {
        const fCity = slugify(f.city);
        if (fCity !== city.slug) return false;
        if (cat.slug === 'pharmacy') return f.type === 'pharmacy';
        if (cat.slug === 'diagnostic-lab') return f.type === 'lab';
        if (cat.slug === 'dentist') return f.type === 'clinic' && /dent/i.test(f.name);
        return true;
      });

      const matchingDoctors = doctors.filter((d) => {
        const dCity = slugify(d.location);
        if (dCity !== city.slug) return false;
        if (cat.slug === 'dentist') return /dent/i.test(d.specialization);
        return true;
      });

      const totalVerified = matchingFacilities.length + matchingDoctors.length;
      const minThreshold = SEO_SITE_ARCHITECTURE.qualityGateMinimumVerifiedProviders || 3;

      if (totalVerified >= minThreshold) {
        dynamicUrls.push({
          loc: `${origin}/${city.slug}/${cat.slug}/`,
          changefreq: 'weekly',
          priority: '0.7',
          lastmod: now,
        });
      } else {
        thinPagesExcluded += 1;
      }
    }
  }

  // 6. Provider Profile Pages (Approved facilities with public slug)
  for (const f of facilities) {
    if (f.slug && f.city) {
      const citySlug = slugify(f.city);
      const catSlug = f.type === 'pharmacy' ? 'pharmacy' : f.type === 'lab' ? 'diagnostic-lab' : 'doctors';
      const lastmodDate = f.updatedAt ? new Date(f.updatedAt).toISOString().split('T')[0] : now;
      dynamicUrls.push({
        loc: `${origin}/${citySlug}/${catSlug}/${slugify(f.slug)}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: lastmodDate,
      });
    }
  }

  // 7. Doctor Profile Pages
  for (const d of doctors) {
    if (d.doctorId) {
      const specialtySlug = slugify(d.specialtyCode || d.specialization || 'specialist');
      const citySlug = slugify(d.location || 'bhopal');
      const lastmodDate = d.updatedAt ? new Date(d.updatedAt).toISOString().split('T')[0] : now;
      dynamicUrls.push({
        loc: `${origin}/doctors/${specialtySlug}/${citySlug}/${d.doctorId}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: lastmodDate,
      });
    }
  }

  // 8. Health Packages
  for (const pkg of packages) {
    if (pkg._id) {
      const pkgSlug = slugify(pkg.name) || String(pkg._id);
      const lastmodDate = pkg.updatedAt ? new Date(pkg.updatedAt).toISOString().split('T')[0] : now;
      dynamicUrls.push({
        loc: `${origin}/packages/${pkgSlug}`,
        changefreq: 'monthly',
        priority: '0.5',
        lastmod: lastmodDate,
      });
    }
  }

  const allUrls = [...staticUrls, ...dynamicUrls];

  const xmlEntries = allUrls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(u.priority)}</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;

  return {
    xml,
    stats: {
      totalUrls: allUrls.length,
      staticUrlsCount: staticUrls.length,
      dynamicUrlsCount: dynamicUrls.length,
      citiesIndexed: cities.length,
      thinPagesExcluded,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ─── GET /robots.txt ───────────────────────────────────────────────────────
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.PUBLIC_WEB_URL || `${req.protocol}://${req.get('host')}`;
  const lines = [
    'User-agent: *',
    ...SEO_SITE_ARCHITECTURE.neverIndexRoutes.map((r) => `Disallow: ${r.replace(/\*/g, '')}`),
    'Disallow: /api/',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl.replace(/\/+$/, '')}/sitemap.xml`,
  ];
  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=86400');
  res.send(lines.join('\n'));
});

// ─── GET /sitemap.xml ──────────────────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  try {
    const isFresh = req.query.fresh === '1';
    const isExpired = Date.now() - sitemapCacheTime > CACHE_TTL_MS;

    if (!sitemapCache || isFresh || isExpired) {
      const baseUrl = process.env.PUBLIC_WEB_URL || `${req.protocol}://${req.get('host')}`;
      const { xml, stats } = await generateSitemapData(baseUrl);
      sitemapCache = { xml, stats };
      sitemapCacheTime = Date.now();
    }

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.send(sitemapCache.xml);
  } catch (err) {
    logger.error(`Sitemap generation failed: ${err.message}`);
    return res.status(500).json({ message: 'Failed to generate sitemap' });
  }
});

// ─── GET /api/seo/sitemap-stats ────────────────────────────────────────────
router.get('/api/seo/sitemap-stats', async (req, res) => {
  try {
    const baseUrl = process.env.PUBLIC_WEB_URL || `${req.protocol}://${req.get('host')}`;
    if (!sitemapCache) {
      const { xml, stats } = await generateSitemapData(baseUrl);
      sitemapCache = { xml, stats };
      sitemapCacheTime = Date.now();
    }
    return res.json({
      success: true,
      cached: Boolean(sitemapCache),
      cacheAgeSeconds: Math.floor((Date.now() - sitemapCacheTime) / 1000),
      stats: sitemapCache.stats,
    });
  } catch (err) {
    logger.error(`SEO sitemap stats error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch sitemap stats' });
  }
});

// ─── GET /api/seo/metadata ────────────────────────────────────────────────
// Programmatic SEO metadata endpoint powering frontend Head/Meta/Schema tags
router.get('/api/seo/metadata', async (req, res) => {
  try {
    const { city, category, area, slug, type } = req.query;
    const cleanCity = slugify(city || 'bhopal');
    const cleanCat = slugify(category || 'doctors');
    const minThreshold = SEO_SITE_ARCHITECTURE.qualityGateMinimumVerifiedProviders || 3;

    // Check inventory count for quality gate
    const [matchingFacilities, matchingDoctors] = await Promise.all([
      Facility.find({
        status: 'approved',
        ...(city ? { city: new RegExp(`^${cleanCity}$`, 'i') } : {}),
      }).countDocuments(),
      Doctor.find({
        approved: true,
        ...(city ? { location: new RegExp(`^${cleanCity}$`, 'i') } : {}),
      }).countDocuments(),
    ]);

    const totalVerified = matchingFacilities + matchingDoctors;
    const meetsQualityGate = totalVerified >= minThreshold;

    const cityName = city ? city.charAt(0).toUpperCase() + city.slice(1) : 'Bhopal';
    const catName = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Healthcare';

    const title = `${catName} in ${cityName} — Verified Doctors, Pricing & Fast Booking | FindMedi`;
    const description = `Find top-rated, verified ${catName.toLowerCase()} in ${cityName}. Compare consultation fees, read verified patient reviews, and book instant appointments on FindMedi.`;
    const canonicalUrl = getSeoUrlForListing(cleanCity, cleanCat, slug, area);

    const schemaOrg = generateSchemaOrgJsonLd(type || 'MedicalOrganization', {
      name: `${catName} Care - ${cityName}`,
      city: cityName,
      rating: 4.8,
      reviewCount: Math.max(totalVerified * 12, 18),
      url: `https://findmedi.in${canonicalUrl}`,
    });

    return res.json({
      title,
      description,
      canonicalUrl,
      qualityGate: {
        minimumRequired: minThreshold,
        providerCount: totalVerified,
        meetsQualityGate,
        indexable: meetsQualityGate,
      },
      schemaOrg: JSON.parse(schemaOrg),
      brandFoundation: {
        promise: BRAND_FOUNDATION.promise,
        pillars: BRAND_FOUNDATION.pillars,
      },
    });
  } catch (err) {
    logger.error(`SEO metadata error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to generate SEO metadata' });
  }
});

export default router;
