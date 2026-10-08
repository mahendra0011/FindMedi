#!/usr/bin/env node
/**
 * Enum normalisation (rolesmd/subcatogary.md PART D steps 5 & 6).
 *
 * Two data-level cleanups the schema changes deliberately did NOT perform,
 * because deleting an enum value orphans every stored document that still
 * holds it (A1 rule: additions are safe, removals are not):
 *
 *   1. `Medicine.category` — `Vitamin` -> `Vitamins` (A1 #5 duplicate).
 *      Both values stay in the enum so un-migrated rows keep validating.
 *   2. `appointmentModes` on hospitals / facilities / doctors (A1 #10):
 *      `home` -> `home_visit`, `voice` -> `audio`, `call` -> `audio`.
 *      Arrays are de-duplicated, so a row holding `home` AND `home_visit`
 *      collapses to one entry.
 *
 * `offline` is intentionally NOT rewritten: it is still the in-person key
 * `Appointment.appointmentMode`, `appointmentFees.offline` and the clinic UI
 * read, so renaming it would break fee lookup and the settings screen, not
 * just a label. It stays in the enum as the legacy alias of `in_person`.
 *
 * Usage:
 *   node scripts/migrate-enum-normalization.mjs           # dry run (default)
 *   node scripts/migrate-enum-normalization.mjs --apply   # write
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

await mongoose.connect(MONGO_URI);
mongoose.set('autoIndex', false);

const { default: Medicine } = await import('../src/models/Medicine.js');
const { default: Hospital } = await import('../src/models/Hospital.js');
const { default: Facility } = await import('../src/models/Facility.js');
const { default: Doctor } = await import('../src/models/Doctor.js');

console.log(`Enum normalisation (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);

const report = (label, count, detail = '') =>
  console.log(`  ${label.padEnd(34)} ${String(count).padStart(5)}${detail ? `  ${detail}` : ''}`);

// ── 1. Medicine.category: Vitamin -> Vitamins ──────────────────────────────
const vitaminPlan = await Medicine.aggregate([
  { $match: { category: 'Vitamin' } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
]);
const vitaminCount = vitaminPlan.reduce((n, row) => n + row.count, 0);
report('medicine category "Vitamin"', vitaminCount, '-> Vitamins');
if (APPLY && vitaminCount) {
  const res = await Medicine.updateMany({ category: 'Vitamin' }, { $set: { category: 'Vitamins' } });
  report('  medicines rewritten', res.modifiedCount);
}

// ── 2. appointmentModes legacy aliases ─────────────────────────────────────
const MODE_ALIASES = { home: 'home_visit', voice: 'audio', call: 'audio' };

const normaliseModes = (modes) => {
  const out = [];
  for (const raw of Array.isArray(modes) ? modes : []) {
    const next = MODE_ALIASES[raw] || raw;
    if (!out.includes(next)) out.push(next);
  }
  return out;
};

for (const [label, Model] of [['hospitals', Hospital], ['facilities', Facility], ['doctors', Doctor]]) {
  const rows = await Model.find({ appointmentModes: { $in: Object.keys(MODE_ALIASES) } })
    .select('appointmentModes')
    .lean();

  const plan = [];
  for (const row of rows) {
    const next = normaliseModes(row.appointmentModes);
    if (next.join(',') !== (row.appointmentModes || []).join(',')) {
      plan.push({ id: row._id, from: row.appointmentModes.join(','), to: next.join(',') });
    }
  }
  report(`${label} with legacy modes`, plan.length);
  for (const p of plan.slice(0, 10)) console.log(`      ${p.from} -> ${p.to}`);
  if (plan.length > 10) console.log(`      ... and ${plan.length - 10} more`);

  if (APPLY) {
    for (const p of plan) {
      await Model.updateOne({ _id: p.id }, { $set: { appointmentModes: p.to.split(',') } });
    }
  }
}

console.log(APPLY ? '\ndone.' : '\ndry run complete; pass --apply to write.');
await mongoose.disconnect();
process.exit(0);
