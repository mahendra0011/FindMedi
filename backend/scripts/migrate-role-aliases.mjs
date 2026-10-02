#!/usr/bin/env node
/**
 * AUTHZ-B-05: one-off migration of the deprecated `counselor` role spellings.
 *
 * `User.role` accepted both `counselor` and `counsellor` (plus the
 * `mid_level_counselor` / `senior_counselor` variants). Two spellings meant two
 * classes of account that behaved differently: one passed `authorize()`, the other
 * was denied everything, purely because of the spelling the signup form submitted.
 *
 * The write-path hook in models/User.js now canonicalises on save/update, so new
 * writes are correct. This script fixes the EXISTING rows (and anything written
 * before the hook existed).
 *
 * Usage:
 *   node scripts/migrate-role-aliases.mjs              # dry run (default)
 *   node scripts/migrate-role-aliases.mjs --apply      # perform the update
 *
 * Idempotent: re-running finds nothing to do.
 */
import mongoose from 'mongoose';
import { canonicalRole, ROLE_ALIASES } from '../src/config/permissions.js';

const APPLY = process.argv.includes('--apply');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set — refusing to run.');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
const User = (await import('../src/models/User.js')).default;

const aliases = Object.keys(ROLE_ALIASES);
console.log(`AUTHZ-B-05 role-alias migration (${APPLY ? 'APPLY' : 'DRY RUN'})`);
console.log(`legacy spellings: ${aliases.join(', ')}\n`);

let totalChanged = 0;
for (const alias of aliases) {
  const canonical = ROLE_ALIASES[alias];
  if (canonical === alias) continue;

  const rows = await User.find({ role: alias }).select('_id role').lean();
  if (!rows.length) {
    console.log(`  ${alias.padEnd(22)} 0 rows`);
    continue;
  }

  if (APPLY) {
    const res = await User.updateMany({ role: alias }, { $set: { role: canonical } });
    totalChanged += res.modifiedCount || 0;
    console.log(`  ${alias.padEnd(22)} ${rows.length} -> '${canonical}' (updated ${res.modifiedCount})`);
  } else {
    console.log(`  ${alias.padEnd(22)} ${rows.length} -> '${canonical}'  [dry run]`);
  }
}

console.log(APPLY ? `\ndone — ${totalChanged} users canonicalised.` : '\ndry run complete; pass --apply to write.');

await mongoose.disconnect();
process.exit(0);
