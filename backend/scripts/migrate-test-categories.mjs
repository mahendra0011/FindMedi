#!/usr/bin/env node
/**
 * subcatogary.md §4.1 — Backfill Test.categoryCode from Test.category
 *
 * Usage:
 *   node scripts/migrate-test-categories.mjs           # dry run (default)
 *   node scripts/migrate-test-categories.mjs --apply   # write to DB
 */
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Refusing to run.');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
mongoose.set('autoIndex', false);

const { default: Test } = await import('../src/models/Test.js');
const { default: Category } = await import('../src/models/Category.js');

console.log(`Migrate Test Categories (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);

// Map aliases to category codes
const testCats = await Category.find({ type: 'test' }).lean();
const mapByTerm = new Map();

for (const c of testCats) {
  mapByTerm.set(c.name.toLowerCase().trim(), c.code);
  mapByTerm.set(c.code.toLowerCase().trim(), c.code);
  for (const a of c.aliases || []) {
    mapByTerm.set(a.toLowerCase().trim(), c.code);
  }
}

// Built-in fallback alias table
const FALLBACK_MAP = {
  'blood test': 'TEST.BLOOD_BASICS',
  'blood tests': 'TEST.BLOOD_BASICS',
  'urine/stool': 'TEST.STOOL_URINE',
  'urine/stool tests': 'TEST.STOOL_URINE',
  'basic screening': 'TEST.BLOOD_BASICS',
  'cardiac basic': 'TEST.LIPID_HEART',
  'basic imaging': 'TEST.IMAGING_BASIC',
  'advanced imaging': 'TEST.IMAGING_ADVANCED',
  'advanced/invasive procedures': 'TEST.HISTOPATHOLOGY',
  'advanced cardiac': 'TEST.NEURO_CARDIAC_FUNC',
  'advanced blood/diagnostic panels': 'TEST.GENETIC_MOLECULAR',
  'neurological': 'TEST.NEURO_CARDIAC_FUNC',
  'microbiology/culture tests': 'TEST.MICROBIOLOGY',
  'serology/infectious disease panel': 'TEST.INFECTION_SEROLOGY',
  'fertility & reproductive hormone tests': 'TEST.THYROID_HORMONES',
  'pulmonology/respiratory tests': 'TEST.PULMONOLOGY',
  'arthritis/autoimmune panel': 'TEST.AUTOIMMUNE',
  'prenatal/maternity tests': 'TEST.WOMENS_HEALTH',
  'eye (ophthalmology) tests': 'TEST.OTHER',
  'ent tests': 'TEST.OTHER',
  'dental tests': 'TEST.OTHER',
  'toxicology tests': 'TEST.TOXICOLOGY',
  'preventive health packages': 'TEST.HEALTH_PACKAGES',
  'health package': 'TEST.HEALTH_PACKAGES',
  'health packages': 'TEST.HEALTH_PACKAGES',
  'pathology': 'TEST.BLOOD_BASICS',
  'radiology': 'TEST.IMAGING_BASIC',
  'cardiac': 'TEST.LIPID_HEART',
  'hormone': 'TEST.THYROID_HORMONES',
  'vitamin': 'TEST.VITAMINS_MINERALS',
  'other': 'TEST.OTHER',
};

const tests = await Test.find({}).lean();
let updated = 0;

for (const t of tests) {
  if (t.categoryCode && t.categoryCode.startsWith('TEST.')) continue;
  const raw = String(t.category ?? '').toLowerCase().trim();
  const targetCode = mapByTerm.get(raw) || FALLBACK_MAP[raw] || `TEST.${raw.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  
  if (targetCode && targetCode !== t.categoryCode) {
    console.log(`  ~ Test "${t.name}" (${t.category}) -> ${targetCode}`);
    if (APPLY) {
      await Test.updateOne({ _id: t._id }, { $set: { categoryCode: targetCode } });
    }
    updated++;
  }
}

console.log(`\nSummary: updated=${updated}, apply=${APPLY}`);
await mongoose.disconnect();
