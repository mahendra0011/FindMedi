// Exports the VERIFIED live listings for the sitemap (doc 21 §15: "sitemap
// populated from verified live listings").
//
// Usage:
//   node --env-file=.env scripts/export-sitemap-data.mjs \
//     [--out scripts/sitemap-data.json] [--min 3] [--base https://findmedi.in]
//
// Only rows that are actually public are exported:
//   - providers: status = live AND verification.status = verified
//   - doctors:   approved = true AND the linked user is verified
//   - specialties: the canonical taxonomy rows (they are content, not data)
// Anything else (draft, suspended, under review, unverified) is skipped, and
// the listing pages are counted so `generate-sitemap.mjs` can drop the thin
// ones (< --min providers in a city).
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// The Atlas SRV lookup needs a resolver that answers the public record
// (the default Windows resolver does not).
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch { /* keep the system resolvers */ }

const argv = process.argv.slice(2);
const arg = (name, fb) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const ix = argv.indexOf(`--${name}`);
  if (ix >= 0 && ix + 1 < argv.length) return argv[ix + 1];
  return fb;
};

const out = arg('out', 'scripts/sitemap-data.json');
const minProviders = Math.max(1, parseInt(arg('min', '3'), 10) || 3);
const base = (arg('base', process.env.SITEMAP_BASE ?? 'https://findmedi.in')).replace(/\/$/, '');

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

// mongoose lives in the backend's node_modules; resolve it from there so the
// script can stay next to generate-sitemap.mjs.
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRequire = createRequire(path.join(here, '..', 'backend', 'package.json'));
const mongoose = backendRequire('mongoose');

// Load the backend env when the caller did not (the export needs MONGO_URI).
if (!process.env.MONGO_URI) {
  try {
    process.loadEnvFile(path.join(here, '..', 'backend', '.env'));
  } catch { /* no env file - the check below reports it */ }
}
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('export-sitemap-data: MONGO_URI is not set (run with --env-file=backend/.env)');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
const db = mongoose.connection.db;

const listings = [];
const details = [];
let skippedUnverified = 0;

// ── Providers (the live public catalogue) ────────────────────────────────────
const providers = await db.collection('providers').find(
  { status: 'live', 'verification.status': 'verified' },
  { projection: { slug: 1, type: 1, kind: 1, city: 1, 'address.city': 1, name: 1 } },
).toArray();

const providerIdsByCity = new Map();
for (const p of providers) {
  const slug = p.slug || slugify(p.name);
  const city = p.city || p.address?.city || '';
  if (!slug) { skippedUnverified += 1; continue; }
  const type = String(p.type || 'provider').replace(/_/g, ' ');
  const name = p.name ? String(p.name) : 'Provider';
  details.push({
    loc: `/facility/${p.type || 'provider'}/${slug}`,
    title: `${name} | FindMedi`,
    description: `${name} — verified ${type}${city ? ` in ${city}` : ''}. Check fees, timings and book online.`,
  });
  if (city) {
    const key = city.toLowerCase();
    providerIdsByCity.set(key, (providerIdsByCity.get(key) || 0) + 1);
  }
}

// ── Doctors (approved + verified user) ───────────────────────────────────────
// The public url of a doctor is the one the app itself links to
// (`/clinic-doctors/:id` for a clinic doctor, `/hospital-doctors/:id` for a
// hospital one). The `/doctors/:specialty/:city/:slug` shape needs a city
// and a slug that most doctors do not have, so it is NOT exported: a
// sitemap full of 404s is worse than a smaller honest one.
const doctors = await db.collection('doctors').find(
  { approved: true },
  { projection: { name: 1, specialization: 1, city: 1, clinicProfile: 1, facilityId: 1, hospitalId: 1, doctor_type: 1, facilityType: 1 } },
).toArray();

const doctorUserIds = doctors.map((d) => String(d.user_id || '')).filter(Boolean);
const verifiedUserIds = new Set();
if (doctorUserIds.length) {
  const users = await db.collection('users').find(
    { _id: { $in: doctorUserIds.map((id) => { try { return new mongoose.Types.ObjectId(id); } catch { return id; } }) }, isVerified: true },
    { projection: { _id: 1 } },
  ).toArray();
  for (const u of users) verifiedUserIds.add(String(u._id));
}

const doctorCounts = new Map();
for (const d of doctors) {
  const userId = String(d.user_id || '');
  if (userId && !verifiedUserIds.has(userId)) { skippedUnverified += 1; continue; }
  const id = String(d._id || '');
  if (!id) { skippedUnverified += 1; continue; }
  const isClinic = d.doctor_type === 'clinic' || d.facilityType === 'clinic';
  const dName = d.name ? String(d.name) : 'Doctor';
  const dSpec = d.specialization ? String(d.specialization) : '';
  const dCity = d.city || d.clinicProfile?.clinic_city || d.location?.city || '';
  details.push({
    loc: isClinic ? `/clinic-doctors/${id}` : `/hospital-doctors/${id}`,
    title: `${dName}${dSpec ? `, ${dSpec}` : ''} | FindMedi`,
    description: `${dName}${dSpec ? `, ${dSpec}` : ''}${dCity ? ` in ${dCity}` : ''} — verified doctor. Check timings and book online.`,
  });
  const city = d.city || d.clinicProfile?.clinic_city || d.location?.city || '';
  if (city) {
    const key = city.toLowerCase();
    doctorCounts.set(key, (doctorCounts.get(key) || 0) + 1);
  }
}

// ── Listing pages (city hubs) ───────────────────────────────────────────────
const cityCounts = new Map();
for (const [city, count] of providerIdsByCity) cityCounts.set(city, (cityCounts.get(city) || 0) + count);
for (const [city, count] of doctorCounts) cityCounts.set(city, (cityCounts.get(city) || 0) + count);

for (const [city, count] of cityCounts) {
  const citySlug = slugify(city);
  if (!citySlug) continue;
  listings.push({ loc: `/hospitals?city=${encodeURIComponent(city)}`, count });
  listings.push({ loc: `/find-doctor?city=${encodeURIComponent(city)}`, count });
}

// ── Specialty taxonomy (content, always public) ─────────────────────────────
const specialties = await db.collection('specialties').find(
  { status: { $ne: 'hidden' } },
  { projection: { code: 1 } },
).toArray().catch(() => []);
for (const s of specialties) {
  if (s?.code) {
    const code = String(s.code);
    details.push({
      loc: `/browse-specialties/${code}`,
      title: `${code} — Specialists near you | FindMedi`,
      description: `Browse verified ${code} doctors, tests and services near you, and book online.`,
    });
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  base,
  minProviders,
  skippedUnverified,
  listings: listings.filter((l) => l.count >= minProviders),
  listingsBelowThreshold: listings.filter((l) => l.count < minProviders).length,
  details,
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(payload, null, 2));
console.log(`sitemap data written: ${out} (${payload.details.length} details, ${payload.listings.length} listings >= ${minProviders}, ${payload.listingsBelowThreshold} thin listings skipped, ${skippedUnverified} unverified rows skipped)`);

await mongoose.disconnect();
