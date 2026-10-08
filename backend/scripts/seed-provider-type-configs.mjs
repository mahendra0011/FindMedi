#!/usr/bin/env node
/**
 * Seeds the Join-wizard catalogue (rolesmd/2.md 1-4) into provider_typeconfigs.
 *
 * The backend is already config-driven: routes/join.js refuses a typeKey with
 * no active row, routes/providerTypes.js serves the rows to the wizard, and
 * lib/applicationToProvider.js turns whatever a row collects into a Provider.
 * Without this seed there is no data to drive any of it - so the catalogue in
 * lib/providerTypeCatalog.js gets upserted here.
 *
 * Usage:
 *   node scripts/seed-provider-type-configs.mjs           # dry run (default)
 *   node scripts/seed-provider-type-configs.mjs --apply   # write
 *
 * Idempotent: an unchanged row is left alone; a changed definition bumps
 * `version` so applications filed under the old shape stay pinned to it
 * (10.md 2.2 - configVersion on the application).
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

const { default: ProviderTypeConfig } = await import('../src/models/ProviderTypeConfig.js');
const { PROVIDER_TYPE_CATALOG, providerTypeGroups } = await import('../src/lib/providerTypeCatalog.js');

console.log(`Provider type config seed (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);

const report = (label, count, detail = '') =>
  console.log(`  ${label.padEnd(34)} ${String(count).padStart(5)}${detail ? `  ${detail}` : ''}`);

const comparable = (row) => JSON.stringify({
  kind: row.kind, group: row.group, tier: row.tier, label: row.label, icon: row.icon,
  description: row.description, steps: row.steps, fields: row.fields,
  requiredDocs: row.requiredDocs, optionalDocs: row.optionalDocs,
  agreementTemplateId: row.agreementTemplateId, approvalPolicy: row.approvalPolicy,
  commissionDefaults: row.commissionDefaults, isActive: row.isActive,
});

const existing = await ProviderTypeConfig.find({ typeKey: { $in: PROVIDER_TYPE_CATALOG.map((c) => c.typeKey) } })
  .select('typeKey version')
  .lean();
const byKey = new Map(existing.map((row) => [row.typeKey, row]));

const toCreate = [];
const toUpdate = [];
const unchanged = [];
for (const row of PROVIDER_TYPE_CATALOG) {
  const current = byKey.get(row.typeKey);
  if (!current) {
    toCreate.push(row);
    continue;
  }
  // Version only matters when the SHAPE changes; a label tweak still bumps it
  // because the applicant-facing label is part of what they agreed to.
  const currentFull = await ProviderTypeConfig.findOne({ typeKey: row.typeKey }).lean();
  if (comparable(currentFull) === comparable(row)) {
    unchanged.push(row);
  } else {
    toUpdate.push({ ...row, version: (current.version ?? 1) + 1 });
  }
}

report('catalogue rows', PROVIDER_TYPE_CATALOG.length);
report('to create', toCreate.length);
report('to update (version bump)', toUpdate.length);
report('unchanged', unchanged.length);
for (const group of providerTypeGroups()) {
  console.log(`      ${group.group.padEnd(14)} ${String(group.count).padStart(3)}  ${group.types.map((t) => t.typeKey).join(', ')}`);
}

if (APPLY) {
  if (toCreate.length) await ProviderTypeConfig.insertMany(toCreate, { ordered: false });
  for (const row of toUpdate) {
    await ProviderTypeConfig.updateOne(
      { typeKey: row.typeKey },
      { $set: row },
      { overwriteImmutable: true },
    );
  }
  console.log(`\nApplied: ${toCreate.length} created, ${toUpdate.length} updated.`);
} else {
  console.log('\nDry run. Re-run with --apply to write.');
}

await mongoose.disconnect();
