#!/usr/bin/env node
/**
 * FindMedi Category Tree Seeder & Validator (Idempotent).
 *
 * Source: rolesmd/FindMedi-Categories-Pruned.md & rolesmd/FindMedi-Category-Seed-Plan.md
 *
 * Usage:
 *   node backend/scripts/seed-category-tree.mjs --dry-run   # Validation & plan print (exits 0 on success)
 *   node backend/scripts/seed-category-tree.mjs --apply     # Write to MongoDB (requires MONGO_URI)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { CATEGORY_TREE } from '../src/data/categoryTree.mjs';
import { CATEGORY_TYPES, CATEGORY_TIERS, CATEGORY_CODE_RE } from '../src/lib/taxonomy.js';

import { configureMongoDns } from '../src/config/mongoDns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
configureMongoDns();

const isApply = process.argv.includes('--apply');
const isDryRun = process.argv.includes('--dry-run') || !isApply;

// Forbidden items from the pruned catalogue's "Jo hata diya gaya" section
const FORBIDDEN_TOKENS = [
  'veterinary', 'pet care', 'tattoo', 'piercing', 'salon', 'pest control',
  'ro purifier', 'purifier service', 'air ambulance', 'medical tourism',
  'cremation', 'funeral', 'crowdfunding', 'medical emi', 'medical loans',
  'insurance comparison', 'insurance advisor', 'cme', 'claims fraud',
  'cord blood bank', 'sowa rigpa', 'reiki', 'energy healing',
];

console.log(`\n======================================================`);
console.log(` FindMedi Category Tree Seeder (${isApply ? 'APPLY' : 'DRY RUN'})`);
console.log(`======================================================\n`);

// ─── 1. In-memory Static Validation ──────────────────────────────────────────
const errors = [];
const codeMap = new Map();

// Check for duplicates, regex validity, types, tiers, and forbidden leakage
for (const [index, item] of CATEGORY_TREE.entries()) {
  const rowId = `Row #${index + 1} (${item.code || 'NO_CODE'})`;

  if (!item.code) {
    errors.push(`${rowId}: code is required`);
    continue;
  }

  if (!CATEGORY_CODE_RE.test(item.code)) {
    errors.push(`${rowId}: code "${item.code}" fails CATEGORY_CODE_RE pattern`);
  }

  if (codeMap.has(item.code)) {
    errors.push(`${rowId}: duplicate code "${item.code}" found`);
  }
  codeMap.set(item.code, item);

  if (!item.name || typeof item.name !== 'string' || item.name.trim().length < 2) {
    errors.push(`${rowId}: name is required (min 2 chars)`);
  }

  if (!CATEGORY_TYPES.includes(item.type)) {
    errors.push(`${rowId}: type "${item.type}" is not in CATEGORY_TYPES`);
  }

  if (item.tier && !CATEGORY_TIERS.includes(item.tier)) {
    errors.push(`${rowId}: tier "${item.tier}" is not in CATEGORY_TIERS`);
  }

  // Check forbidden tokens in name, aliases, code
  const searchable = `${item.code} ${item.name} ${(item.aliases || []).join(' ')}`.toLowerCase();
  for (const forbidden of FORBIDDEN_TOKENS) {
    if (searchable.includes(forbidden)) {
      errors.push(`${rowId}: contains dropped/forbidden term "${forbidden}"`);
    }
  }
}

// Check parent references
for (const item of CATEGORY_TREE) {
  if (item.parent !== null && item.parent !== undefined) {
    if (!codeMap.has(item.parent)) {
      errors.push(`Code "${item.code}": parent code "${item.parent}" does not exist in the tree`);
    }
  }
}

// Compute path and level for each item
function computeLineage(item, visited = new Set()) {
  if (visited.has(item.code)) {
    errors.push(`Cycle detected at "${item.code}"`);
    return { path: item.code, level: 0 };
  }
  visited.add(item.code);

  if (!item.parent) {
    return { path: item.code, level: 0 };
  }

  const parentItem = codeMap.get(item.parent);
  if (!parentItem) {
    return { path: item.code, level: 0 };
  }

  const parentLineage = computeLineage(parentItem, new Set(visited));
  return {
    path: `${parentLineage.path}/${item.code}`,
    level: parentLineage.level + 1,
  };
}

const computedItems = [];
for (const item of CATEGORY_TREE) {
  const { path, level } = computeLineage(item);
  computedItems.push({ ...item, path, level });
}

// ─── 2. Validation Report ────────────────────────────────────────────────────
console.log(`Total categories in catalogue:  ${CATEGORY_TREE.length}`);
console.log(`Root / group categories:        ${computedItems.filter((i) => i.level === 0).length}`);
console.log(`Leaf / sub categories:          ${computedItems.filter((i) => i.level > 0).length}`);
console.log(`Sensitive (T1 / discreet):      ${computedItems.filter((i) => i.isSensitive).length}`);
console.log(`Ad-claims restricted:           ${computedItems.filter((i) => i.adClaimsRestricted).length}`);
console.log(`Roadmap ("soon" status):        ${computedItems.filter((i) => i.soon).length}`);

if (errors.length > 0) {
  console.error(`\n❌ Validation FAILED with ${errors.length} error(s):`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`\n✔ Static validation PASSED: 0 errors, all codes valid, all parents resolved, 0 dropped category leakage.`);

if (isDryRun && !isApply) {
  console.log(`\nDry run completed successfully. Pass --apply to write to database.`);
  process.exit(0);
}

// ─── 3. Database Upsert (--apply mode) ──────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('\n❌ MONGO_URI is not set. Cannot run in --apply mode without MONGO_URI.');
  process.exit(1);
}

console.log(`\nConnecting to MongoDB: ${MONGO_URI.replace(/:[^:]*@/, ':****@')}...`);
await mongoose.connect(MONGO_URI);
mongoose.set('autoIndex', false);

const { default: Category } = await import('../src/models/Category.js');

let createdCount = 0;
let updatedCount = 0;

for (const item of computedItems) {
  const doc = {
    name: item.name,
    nameHi: item.nameHi || '',
    type: item.type,
    aliases: item.aliases || [],
    path: item.path,
    level: item.level,
    tier: item.tier || 'T1',
    regulatedBy: item.regulatedBy || [],
    adClaimsRestricted: Boolean(item.adClaimsRestricted),
    isSensitive: Boolean(item.isSensitive),
    soon: Boolean(item.soon),
    kind: item.kind || '',
    isActive: true,
  };

  const existing = await Category.findOne({ code: item.code });
  if (existing) {
    await Category.updateOne({ _id: existing._id }, { $set: doc }, { overwriteImmutable: true });
    updatedCount += 1;
  } else {
    await Category.create({ code: item.code, ...doc });
    createdCount += 1;
  }
}

// ─── 4. Deactivate / Prune Untracked Categories ─────────────────────────────
const validCodeSet = new Set(computedItems.map((i) => i.code));
const untrackedResult = await Category.updateMany(
  { code: { $nin: Array.from(validCodeSet) }, isActive: true },
  { $set: { isActive: false } }
);

if (process.argv.includes('--delete-untracked')) {
  const deleteResult = await Category.deleteMany({ code: { $nin: Array.from(validCodeSet) } });
  console.log(`  - Deleted Untracked: ${deleteResult.deletedCount}`);
} else if (untrackedResult.modifiedCount > 0) {
  console.log(`  - Deactivated Untracked: ${untrackedResult.modifiedCount}`);
}

console.log(`\n✔ Database Sync Complete:`);
console.log(`  - Active Canonical: ${computedItems.length}`);
console.log(`  - Newly Created:    ${createdCount}`);
console.log(`  - Updated:          ${updatedCount}`);
console.log(`  - Untracked Dropped:${untrackedResult.modifiedCount}`);

await mongoose.disconnect();
console.log('\nFinished successfully.');
process.exit(0);
