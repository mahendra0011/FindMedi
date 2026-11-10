#!/usr/bin/env node
/**
 * subcatogary.md §4.1 — Canonical test-category ALIAS reconciler.
 *
 * The Category DOCS for type:'test' are owned by the master tree
 * (scripts/seed/seed-category-tree.mjs → DIAG.TEST.*, DIAG.IMG.*, DIAG.PACKAGE.*).
 * This script no longer creates documents (the old TEST.* codes collided with
 * the tree on the unique name_1_type_1 index). It only MERGES the canonical
 * alias sets from doc §4.1 onto the matching DIAG.* nodes, so search keeps
 * working for legacy terms (CBC, HbA1c, ECG, TMT, ...).
 *
 * Usage:
 *   node scripts/seed/seed-test-categories.mjs           # dry run (default)
 *   node scripts/seed/seed-test-categories.mjs --apply   # write to DB
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { configureMongoDns, connectMongooseWithRetry } from '../../src/config/mongoDns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
configureMongoDns();

const APPLY = process.argv.includes('--apply');
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Refusing to run.');
  process.exit(1);
}

await connectMongooseWithRetry(mongoose, MONGO_URI);
mongoose.set('autoIndex', false);

const { default: Category } = await import('../../src/models/Category.js');

console.log(`Seed Test Category Aliases (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);

// Legacy TEST.* code → canonical tree code (aliases preserved from doc §4.1)
const CANONICAL_TEST_ALIASES = [
  { target: 'DIAG.TEST.BLOOD_BASICS', legacy: 'TEST.BLOOD_BASICS', aliases: ['CBC', 'Hemogram', 'Blood Tests', 'Blood Test'] },
  { target: 'DIAG.TEST.DIABETES', legacy: 'TEST.DIABETES', aliases: ['Sugar', 'HbA1c', 'Glucose'] },
  { target: 'DIAG.TEST.LIPID_HEART', legacy: 'TEST.LIPID_HEART', aliases: ['Cholesterol', 'Cardiac Basic', 'Cardiac', 'Lipid Profile'] },
  { target: 'DIAG.TEST.LIVER', legacy: 'TEST.LIVER', aliases: ['LFT', 'Liver Function Test', 'Liver Tests'] },
  { target: 'DIAG.TEST.KIDNEY', legacy: 'TEST.KIDNEY', aliases: ['KFT', 'RFT', 'Renal Function Test', 'Kidney Tests', 'Urine Routine'] },
  { target: 'DIAG.TEST.THYROID_HORMONES', legacy: 'TEST.THYROID_HORMONES', aliases: ['Thyroid', 'Hormone', 'Hormones', 'TSH'] },
  { target: 'DIAG.TEST.VITAMINS_MINERALS', legacy: 'TEST.VITAMINS_MINERALS', aliases: ['Vitamin', 'Vitamins', 'Minerals', 'Vitamin D', 'Vitamin B12'] },
  { target: 'DIAG.TEST.INFECTION_SEROLOGY', legacy: 'TEST.INFECTION_SEROLOGY', aliases: ['Fever', 'Dengue', 'Malaria', 'Typhoid', 'Serology'] },
  { target: 'DIAG.TEST.MICROBIOLOGY', legacy: 'TEST.MICROBIOLOGY', aliases: ['Culture', 'Microbiology', 'Sensitivity', 'Urine Culture', 'Stool Routine'] },
  { target: 'DIAG.TEST.ALLERGY', legacy: 'TEST.ALLERGY', aliases: ['Allergy', 'Food Allergy', 'IgE', 'Allergy Screening'] },
  { target: 'DIAG.TEST.AUTOIMMUNE', legacy: 'TEST.AUTOIMMUNE', aliases: ['Arthritis', 'Autoimmune', 'RA Factor', 'ANA'] },
  { target: 'DIAG.TEST.CANCER_MARKERS', legacy: 'TEST.CANCER_MARKERS', aliases: ['Cancer', 'Tumor Marker', 'PSA', 'CA 125'] },
  { target: 'DIAG.TEST.WOMENS_PRENTAL', legacy: 'TEST.WOMENS_HEALTH', aliases: ['Maternity', 'Prenatal', 'Pregnancy', 'Dual Marker', 'Pap Smear'] },
  { target: 'DIAG.TEST.MENS_HEALTH', legacy: 'TEST.MENS_HEALTH', aliases: ['Men Health', 'Semen Analysis'] },
  { target: 'DIAG.TEST.PAEDIATRIC', legacy: 'TEST.PAEDIATRIC', aliases: ['Pediatric', 'Child Tests', 'Newborn Screening'] },
  { target: 'DIAG.TEST.HISTOPATHOLOGY', legacy: 'TEST.HISTOPATHOLOGY', aliases: ['Biopsy', 'FNAC', 'Cytology'] },
  { target: 'DIAG.TEST.GENETIC_MOLECULAR', legacy: 'TEST.GENETIC_MOLECULAR', aliases: ['Genetic', 'DNA', 'Molecular', 'Karyotype'] },
  { target: 'DIAG.TEST.STD', legacy: 'TEST.STD_SEXUAL_HEALTH', aliases: ['STD', 'Sexual Health', 'HIV', 'VDRL'] },
  { target: 'DIAG.TEST.TOXICOLOGY', legacy: 'TEST.TOXICOLOGY', aliases: ['Toxicology', 'Drug Screen', 'Alcohol'] },
  { target: 'DIAG.TEST.FUNCTIONAL', legacy: 'TEST.NEURO_CARDIAC_FUNC', aliases: ['ECG', 'Echo', 'TMT', 'EEG', 'Neurological', 'PFT', 'Spirometry'] },
  { target: 'DIAG.IMG.XRAY', legacy: 'TEST.IMAGING_BASIC', aliases: ['X-Ray', 'Basic Imaging', 'Radiology'] },
  { target: 'DIAG.IMG.CT', legacy: 'TEST.IMAGING_ADVANCED', aliases: ['CT Scan', 'Advanced Imaging'] },
  { target: 'DIAG.IMG.MRI', legacy: 'TEST.IMAGING_ADVANCED', aliases: ['MRI Scan'] },
  { target: 'DIAG.IMG.ULTRASOUND', legacy: 'TEST.IMAGING_ADVANCED', aliases: ['USG'] },
  { target: 'DIAG.IMG.MAMMOGRAPHY', legacy: 'TEST.IMAGING_ADVANCED', aliases: ['Mammography', 'Breast Screening'] },
  { target: 'DIAG.IMG.PETCT', legacy: 'TEST.IMAGING_ADVANCED', aliases: ['PET Scan'] },
  { target: 'DIAG.PACKAGE.BASIC', legacy: 'TEST.HEALTH_PACKAGES', aliases: ['Health Package', 'Preventive Health Packages', 'Checkup'] },
];

let updated = 0;
let missing = 0;

for (const cat of CANONICAL_TEST_ALIASES) {
  const existing = await Category.findOne({ code: cat.target });
  if (!existing) {
    console.log(`  ! MISSING canonical node ${cat.target} — run seed-category-tree first`);
    missing++;
    continue;
  }
  // Legacy code is kept as an alias too, so anything still storing TEST.* keeps matching
  const need = [...cat.aliases, cat.legacy].filter((a) => !existing.aliases.includes(a));
  if (need.length > 0) {
    console.log(`  ~ MERGE ${cat.target.padEnd(28)} <- ${cat.legacy.padEnd(24)} add [${need.join(', ')}]`);
    if (APPLY) {
      await Category.updateOne(
        { _id: existing._id },
        { $addToSet: { aliases: { $each: need } } },
      );
    }
    updated++;
  }
}

console.log(`\nSummary: merged=${updated}, missing=${missing}, apply=${APPLY}`);
await mongoose.disconnect();
