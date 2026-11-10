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
  'blood test': 'DIAG.TEST.BLOOD_BASICS',
  'blood tests': 'DIAG.TEST.BLOOD_BASICS',
  'urine/stool': 'DIAG.TEST.KIDNEY',
  'urine/stool tests': 'DIAG.TEST.KIDNEY',
  'basic screening': 'DIAG.TEST.BLOOD_BASICS',
  'cardiac basic': 'DIAG.TEST.LIPID_HEART',
  'basic imaging': 'DIAG.IMG.XRAY',
  'advanced imaging': 'DIAG.IMG.CT',
  'advanced/invasive procedures': 'DIAG.TEST.HISTOPATHOLOGY',
  'advanced cardiac': 'DIAG.TEST.NEURO_CARDIAC_FUNC',
  'advanced blood/diagnostic panels': 'DIAG.TEST.GENETIC_MOLECULAR',
  'neurological': 'DIAG.TEST.NEURO_CARDIAC_FUNC',
  'microbiology/culture tests': 'DIAG.TEST.MICROBIOLOGY',
  'serology/infectious disease panel': 'DIAG.TEST.INFECTION_SEROLOGY',
  'fertility & reproductive hormone tests': 'DIAG.TEST.THYROID_HORMONES',
  'pulmonology/respiratory tests': 'DIAG.TEST.NEURO_CARDIAC_FUNC',
  'arthritis/autoimmune panel': 'DIAG.TEST.AUTOIMMUNE',
  'prenatal/maternity tests': 'DIAG.TEST.WOMENS_PRENTAL',
  'eye (ophthalmology) tests': 'DIAG.TEST.NEURO_CARDIAC_FUNC',
  'ent tests': 'DIAG.TEST.NEURO_CARDIAC_FUNC',
  'dental tests': 'DIAG.IMG.XRAY',
  'toxicology tests': 'DIAG.TEST.TOXICOLOGY',
  'preventive health packages': 'DIAG.PACKAGE.BASIC',
  'health package': 'DIAG.PACKAGE.BASIC',
  'health packages': 'DIAG.PACKAGE.BASIC',
  'pathology': 'DIAG.TEST.BLOOD_BASICS',
  'radiology': 'DIAG.IMG.XRAY',
  'cardiac': 'DIAG.TEST.LIPID_HEART',
  'hormone': 'DIAG.TEST.THYROID_HORMONES',
  'vitamin': 'DIAG.TEST.VITAMINS_MINERALS',
};

const tests = await Test.find({}).lean();
let updated = 0;

for (const t of tests) {
  if (t.categoryCode && t.categoryCode.startsWith('DIAG.TEST.')) continue;
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
