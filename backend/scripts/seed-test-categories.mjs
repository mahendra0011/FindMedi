#!/usr/bin/env node
/**
 * subcatogary.md §4.1 — Canonical test category tree seed
 * Inserts / updates test categories of type: 'test' in the Category collection.
 *
 * Usage:
 *   node scripts/seed-test-categories.mjs           # dry run (default)
 *   node scripts/seed-test-categories.mjs --apply   # write to DB
 */
import mongoose from 'mongoose';
import { deriveCategoryCode } from '../src/lib/taxonomy.js';

const APPLY = process.argv.includes('--apply');
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Refusing to run.');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
mongoose.set('autoIndex', false);

const { default: Category } = await import('../src/models/Category.js');

console.log(`Seed Test Categories (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);

const CANONICAL_TEST_CATEGORIES = [
  { name: 'Blood Basics', code: 'TEST.BLOOD_BASICS', aliases: ['CBC', 'Hemogram', 'Blood Tests', 'Blood Test'] },
  { name: 'Diabetes', code: 'TEST.DIABETES', aliases: ['Sugar', 'HbA1c', 'Glucose'] },
  { name: 'Lipid & Heart', code: 'TEST.LIPID_HEART', aliases: ['Cholesterol', 'Cardiac Basic', 'Cardiac', 'Lipid Profile'] },
  { name: 'Liver Function', code: 'TEST.LIVER', aliases: ['LFT', 'Liver Function Test', 'Liver Tests'] },
  { name: 'Kidney Function', code: 'TEST.KIDNEY', aliases: ['KFT', 'RFT', 'Renal Function Test', 'Kidney Tests', 'Urine Routine'] },
  { name: 'Thyroid & Hormones', code: 'TEST.THYROID_HORMONES', aliases: ['Thyroid', 'Hormone', 'Hormones', 'TSH'] },
  { name: 'Vitamins & Minerals', code: 'TEST.VITAMINS_MINERALS', aliases: ['Vitamin', 'Vitamins', 'Minerals', 'Vitamin D', 'Vitamin B12'] },
  { name: 'Infection / Serology', code: 'TEST.INFECTION_SEROLOGY', aliases: ['Fever', 'Dengue', 'Malaria', 'Typhoid', 'Serology'] },
  { name: 'Microbiology & Culture', code: 'TEST.MICROBIOLOGY', aliases: ['Culture', 'Microbiology', 'Sensitivity', 'Urine Culture', 'Stool Routine'] },
  { name: 'Allergy Panel', code: 'TEST.ALLERGY', aliases: ['Allergy', 'Food Allergy', 'IgE', 'Allergy Screening'] },
  { name: 'Autoimmune & Arthritis', code: 'TEST.AUTOIMMUNE', aliases: ['Arthritis', 'Autoimmune', 'RA Factor', 'ANA'] },
  { name: 'Cancer Screening Markers', code: 'TEST.CANCER_MARKERS', aliases: ['Cancer', 'Tumor Marker', 'PSA', 'CA 125'] },
  { name: "Women's Health & Prenatal", code: 'TEST.WOMENS_HEALTH', aliases: ['Maternity', 'Prenatal', 'Pregnancy', 'Dual Marker', 'Pap Smear'] },
  { name: "Men's Health", code: 'TEST.MENS_HEALTH', aliases: ['Men Health', 'Semen Analysis'] },
  { name: 'Paediatric Tests', code: 'TEST.PAEDIATRIC', aliases: ['Pediatric', 'Child Tests', 'Newborn Screening'] },
  { name: 'Histopathology & Biopsy', code: 'TEST.HISTOPATHOLOGY', aliases: ['Biopsy', 'Histopathology', 'FNAC', 'Cytology'] },
  { name: 'Genetic & Molecular', code: 'TEST.GENETIC_MOLECULAR', aliases: ['Genetic', 'DNA', 'Molecular', 'Karyotype'] },
  { name: 'Sexual Health Panel', code: 'TEST.STD_SEXUAL_HEALTH', aliases: ['STD', 'Sexual Health', 'HIV', 'VDRL'] },
  { name: 'Toxicology & Drug Screening', code: 'TEST.TOXICOLOGY', aliases: ['Toxicology', 'Drug Screen', 'Alcohol'] },
  { name: 'Functional (ECG/Echo/EEG/TMT)', code: 'TEST.NEURO_CARDIAC_FUNC', aliases: ['ECG', 'Echo', 'TMT', 'EEG', 'Neurological', 'PFT', 'Spirometry'] },
  { name: 'Basic Imaging (X-Ray)', code: 'TEST.IMAGING_BASIC', aliases: ['X-Ray', 'Basic Imaging', 'Radiology'] },
  { name: 'Advanced Imaging (MRI/CT/USG)', code: 'TEST.IMAGING_ADVANCED', aliases: ['MRI', 'CT Scan', 'Ultrasound', 'Advanced Imaging', 'Mammography', 'PET Scan'] },
  { name: 'Preventive Health Packages', code: 'TEST.HEALTH_PACKAGES', aliases: ['Health Package', 'Health Packages', 'Preventive Health Packages', 'Checkup'] },
];

let created = 0;
let updated = 0;

for (const cat of CANONICAL_TEST_CATEGORIES) {
  const existing = await Category.findOne({ type: 'test', code: cat.code });
  if (!existing) {
    console.log(`  + CREATE ${cat.code.padEnd(28)} "${cat.name}"`);
    if (APPLY) {
      await Category.create({
        name: cat.name,
        code: cat.code,
        type: 'test',
        aliases: cat.aliases,
        path: cat.code,
        level: 0,
        tier: 'T1',
        isActive: true,
      });
    }
    created++;
  } else {
    const needAliases = cat.aliases.filter(a => !existing.aliases.includes(a));
    if (needAliases.length > 0) {
      console.log(`  ~ UPDATE ${cat.code.padEnd(28)} add aliases [${needAliases.join(', ')}]`);
      if (APPLY) {
        await Category.updateOne(
          { _id: existing._id },
          { $addToSet: { aliases: { $each: needAliases } } }
        );
      }
      updated++;
    }
  }
}

console.log(`\nSummary: created=${created}, updated=${updated}, apply=${APPLY}`);
await mongoose.disconnect();
