#!/usr/bin/env node
/**
 * R0 taxonomy migration (rolesmd/subcatogary.md PART D step 1).
 *
 * Backfills the new Category lineage fields, drops the legacy unique index that
 * made "Paediatrics under Dentistry" impossible, seeds the canonical specialty
 * rows, and maps Doctor.specialization free text onto Doctor.specialtyCode.
 *
 * Usage:
 *   node scripts/migrate-category-taxonomy.mjs           # dry run (default)
 *   node scripts/migrate-category-taxonomy.mjs --apply   # write
 *
 * Idempotent: re-running reports nothing to change.
 */
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set — refusing to run.');
  process.exit(1);
}

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slug = (type, name) => {
  const prefix = String(type ?? '').toUpperCase().replace(/[^A-Z]/g, '') || 'ITEM';
  const body = String(name ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
  return `${prefix}.${body || 'ITEM'}`;
};

await mongoose.connect(MONGO_URI);
mongoose.set('autoIndex', false);

const { default: Category } = await import('../src/models/Category.js');
const { default: Doctor } = await import('../src/models/Doctor.js');
const { SPECIALTIES, resolveSpecialtyCode } = await import('../src/lib/taxonomy.js');

console.log(`Category taxonomy migration (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);

const report = (label, count, detail = '') =>
  console.log(`  ${label.padEnd(34)} ${String(count).padStart(5)}${detail ? `  ${detail}` : ''}`);

// ── 1. codes ────────────────────────────────────────────────────────────────
const rows = await Category.find({}).select('_id code type name parent path level').lean();
const used = new Map();
for (const row of rows) {
  if (!row.code) continue;
  const taken = used.get(row.type) || new Set();
  taken.add(row.code);
  used.set(row.type, taken);
}
const codePlan = [];
for (const row of rows) {
  if (row.code) continue;
  const taken = used.get(row.type) || new Set();
  const base = slug(row.type, row.name);
  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) candidate = `${base}_${suffix++}`;
  taken.add(candidate);
  used.set(row.type, taken);
  codePlan.push({ id: row._id, code: candidate, name: row.name, type: row.type });
}
report('categories missing code', codePlan.length);
for (const plan of codePlan.slice(0, 20)) console.log(`      ${plan.type.padEnd(12)} ${plan.name} -> ${plan.code}`);
if (codePlan.length > 20) console.log(`      ... and ${codePlan.length - 20} more`);

if (APPLY) {
  for (const plan of codePlan) {
    await Category.updateOne({ _id: plan.id }, { $set: { code: plan.code } }, { overwriteImmutable: true });
  }
}
const codeById = new Map(codePlan.map((p) => [String(p.id), p.code]));
for (const row of rows) if (!row.code) row.code = codeById.get(String(row._id));

// ── 2. path / level ─────────────────────────────────────────────────────────
const byId = new Map(rows.map((r) => [String(r._id), r]));
const lineagePlan = [];
const compute = (row, seen = new Set()) => {
  if (!row || seen.has(String(row._id))) return { path: row?.code || 'ITEM', level: 0 };
  seen.add(String(row._id));
  if (row.parent) {
    const parent = byId.get(String(row.parent));
    if (parent) {
      const above = compute(parent, seen);
      return { path: `${above.path}/${row.code}`, level: above.level + 1 };
    }
  }
  return { path: row.code, level: 0 };
};
for (const row of rows) {
  const next = compute(row);
  if (row.path !== next.path || row.level !== next.level) {
    lineagePlan.push({ id: row._id, ...next });
  }
}
report('path/level corrections', lineagePlan.length);
if (APPLY) {
  for (const plan of lineagePlan) {
    await Category.updateOne({ _id: plan.id }, { $set: { path: plan.path, level: plan.level } }, { overwriteImmutable: true });
  }
}

// ── 3. duplicate names under one parent (would break the new {type,parent,name} index) ──
const dupeKey = new Map();
for (const row of rows) {
  const key = `${row.type}|${row.parent || 'root'}|${String(row.name).toLowerCase()}`;
  dupeKey.set(key, (dupeKey.get(key) || 0) + 1);
}
const dupes = [...dupeKey.entries()].filter(([, count]) => count > 1);
report('duplicate name under same parent', dupes.length, dupes.length ? '(resolve manually)' : '');

// ── 4. indexes ──────────────────────────────────────────────────────────────
const before = await Category.collection.listIndexes();
const legacy = before.filter((idx) => {
  const keys = Object.keys(idx.key);
  return !idx.name.startsWith('_') && idx.unique && keys.length === 2 && keys.includes('name') && keys.includes('type');
});
report('legacy unique {name,type} indexes', legacy.length, legacy.map((i) => i.name).join(', '));
report('current index count', before.length, before.map((i) => i.name).join(', '));

// ── 5. canonical specialties ────────────────────────────────────────────────
let seeded = 0;
let updatedSpecialty = 0;
for (const specialty of SPECIALTIES) {
  const existing = await Category.findOne({
    type: 'specialty',
    $or: [{ code: specialty.code }, { name: new RegExp(`^${escapeRegex(specialty.name)}$`, 'i') }],
  }).select('_id code name').lean();

  if (existing) {
    if (existing.code === specialty.code) continue;
    updatedSpecialty += 1;
    if (APPLY) {
      await Category.updateOne({ _id: existing._id },
        { $set: { code: specialty.code, name: specialty.name, aliases: specialty.aliases, path: specialty.code, level: 0, tier: 'T1' } },
        { overwriteImmutable: true });
    }
  } else {
    seeded += 1;
    if (APPLY) {
      await Category.create({
        type: 'specialty', code: specialty.code, name: specialty.name,
        aliases: specialty.aliases, path: specialty.code, level: 0, tier: 'T1',
      });
    }
  }
}
report('canonical specialties to create', seeded);
report('canonical specialties to re-code', updatedSpecialty);

// ── 6. Doctor.specialization -> specialtyCode ───────────────────────────────
const specializations = await Doctor.distinct('specialization');
let mapped = 0;
let unmapped = 0;
const unmappedValues = [];
for (const value of specializations.filter(Boolean)) {
  const code = resolveSpecialtyCode(value);
  if (!code) {
    unmapped += 1;
    unmappedValues.push(value);
    continue;
  }
  mapped += 1;
  if (APPLY) {
    await Doctor.updateMany(
      { specialization: value, $or: [{ specialtyCode: { $in: ['', null] } }, { specialtyCode: { $exists: false } }] },
      { $set: { specialtyCode: code } },
    );
  }
}
report('distinct specializations mapped', mapped);
report('distinct specializations unmapped', unmapped, unmappedValues.slice(0, 8).join(' | '));
if (unmappedValues.length > 8) console.log(`      ... and ${unmappedValues.length - 8} more`);

// ── apply-only: sync declared indexes, drop the legacy unique index ─────────
if (APPLY) {
  if (dupes.length) {
    console.log('\n  NOT syncing indexes: duplicate names under one parent would break {type,parent,name}.');
    console.log('  Fix the duplicates above, then re-run with --apply.');
  } else {
    const sync = await Category.syncIndexes();
    console.log(`\n  syncIndexes -> ${sync.length} index operation(s) applied.`);
  }
}

console.log(APPLY ? '\ndone.' : '\ndry run complete; pass --apply to write.');
await mongoose.disconnect();
process.exit(0);
