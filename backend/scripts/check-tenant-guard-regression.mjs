#!/usr/bin/env node
/**
 * AUTHZ-B-07 regression guard.
 *
 * The hand-rolled guard `if (req.user.hospitalId && role !== 'superadmin') …`
 * silently becomes "no tenant filter" for any account without a hospitalId,
 * which is how a self-registered hospital_admin (or a rider / assistant / lab
 * staff account) ended up reading platform-wide data on ~20 route files.
 *
 * Migrations to the fail-closed `applyTenantScope()` helper are in progress, so
 * this script compares the per-file occurrence count against a committed
 * BASELINE: the count may go DOWN (a file was migrated) but must never go UP,
 * and a file that is not in the baseline must not contain the pattern at all.
 *
 * Usage:  node scripts/check-tenant-guard-regression.mjs [--write-baseline]
 * Exit 0 = no regression, 1 = new fail-open guard introduced.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');
const baselinePath = join(here, '..', '.tenant-guard-baseline.json');
const PATTERN = /if \(req\.user\.hospitalId &&/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const counts = {};
for (const file of walk(srcDir)) {
  const hits = readFileSync(file, 'utf8').split('\n').filter((l) => PATTERN.test(l) && !l.trim().startsWith('//'));
  if (hits.length) counts[relative(join(here, '..'), file).replace(/\\/g, '/')] = hits.length;
}

if (process.argv.includes('--write-baseline')) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`baseline written: ${Object.keys(counts).length} files, ${Object.values(counts).reduce((a, b) => a + b, 0)} occurrences`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error('No baseline. Run: node scripts/check-tenant-guard-regression.mjs --write-baseline');
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const regressions = [];
for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline[file];
  if (allowed === undefined) regressions.push(`${file}: ${count} new occurrence(s) (file not in baseline)`);
  else if (count > allowed) regressions.push(`${file}: ${count} occurrences (baseline ${allowed})`);
}
for (const file of Object.keys(baseline)) {
  if (counts[file] === undefined) console.log(`  migrated: ${file} (baseline ${baseline[file]} -> 0)`);
}

if (regressions.length) {
  console.error('AUTHZ-B-07 REGRESSION — new fail-open tenant guard(s):\n  ' + regressions.join('\n  '));
  console.error('\nUse applyTenantScope()/callerOwnsTenant() from src/utils/tenantScope.js instead.');
  process.exit(1);
}
console.log(`AUTHZ-B-07 guard OK — ${Object.values(counts).reduce((a, b) => a + b, 0)} legacy occurrence(s) remain, none added.`);
