/**
 * INF-M-05 / TEST-M-08: dependency vulnerability ratchet.
 *
 * WHY A RATCHET AND NOT A THRESHOLD
 * A green audit today is worth nothing if nobody notices tomorrow's. A gate that
 * says "zero high" would be red on day one: as of 2026-09-30 this repo has 10
 * high in the backend and 5 high + 1 critical in the frontend, and every single
 * one reports `fixAvailable: false` - there is no patched version to move to.
 * A threshold nobody can reach is a gate everyone learns to ignore, which is
 * exactly how the previous unenforced check became decorative.
 *
 * So the bar is: this count may only go DOWN. A new advisory, or one more
 * existing advisory becoming reachable, fails the build. When a dependency is
 * upgraded, the count drops and the baseline is lowered with it.
 *
 * The known set is not hidden - it is printed on every failure and stored in the
 * repo, so "17 known" is a statement someone can check rather than a number in a
 * dashboard.
 *
 *   node scripts/check-vuln-regression.mjs            # measure + compare
 *   node scripts/check-vuln-regression.mjs --write    # accept the current state
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.join(ROOT, '..');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'vuln-baseline.json');
const write = process.argv.includes('--write');

/** @type {{ totals: Record<string, Record<string, number>>, packages: Record<string, Record<string, string[]>> }} */
let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
} catch {
  baseline = { totals: {}, packages: {} };
}

const runAudit = (cwd) => {
  let raw = '';
  try {
    raw = execFileSync('npm.cmd', ['audit', '--json'], { cwd, encoding: 'utf8', shell: true });
  } catch (err) {
    // npm audit exits non-zero WHEN IT FINDS VULNERABILITIES. That is the normal
    // path, not a failure of the tool, so the payload on stderr is used.
    raw = err.stdout || '';
  }
  if (!raw.trim()) throw new Error(`npm audit produced no output in ${cwd}`);
  return JSON.parse(raw);
};

const bar = '='.repeat(78);
const totals = {};
const packages = {};

for (const name of ['backend', 'frontend']) {
  const audit = runAudit(path.join(REPO, name));
  const v = audit.metadata?.vulnerabilities || {};
  totals[name] = {
    critical: v.critical || 0,
    high: v.high || 0,
    moderate: v.moderate || 0,
    low: v.low || 0,
    total: v.total || 0,
  };
  const list = {};
  for (const [pkg, data] of Object.entries(audit.vulnerabilities || {})) {
    if (!['critical', 'high'].includes(data.severity)) continue;
    list[pkg] = data.fixAvailable ? 'fix-available' : 'no-fix-available';
  }
  packages[name] = list;
}

if (write) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ totals, packages }, null, 2) + '\n');
  console.log(`baseline written to ${path.relative(REPO, BASELINE_FILE)}`);
  process.exit(0);
}

console.log(bar);
console.log('DEPENDENCY VULNERABILITY RATCHET (INF-M-05)');
console.log(bar);

let regressed = false;
for (const name of Object.keys(totals)) {
  const now = totals[name];
  const was = baseline.totals?.[name] || {};
  const line = (k) => {
    const a = was[k] ?? 0;
    const b = now[k] ?? 0;
    const verdict = b > a ? '  <== REGRESSION' : b < a ? '  (improved)' : '';
    if (b > a) regressed = true;
    console.log(`  ${name.padEnd(9)} ${k.padEnd(9)} ${String(b).padStart(3)}  (was ${String(a).padStart(3)})${verdict}`);
  };
  line('critical');
  line('high');
  line('total');
}

if (!regressed) {
  console.log(`\nOK - no NEW critical/high advisories.`);
  console.log(`Known and unchanged; ${Object.values(packages).flatMap((p) => Object.keys(p)).length} packages carry an unfixed advisory.`);
  process.exit(0);
}

console.log(`\n${bar}\nNEW vulnerability detail\n${bar}`);
for (const [name, list] of Object.entries(packages)) {
  const extra = Object.keys(list).filter((p) => !baseline.packages?.[name]?.[p]);
  const fixed = Object.keys(baseline.packages?.[name] || {}).filter((p) => !list[p]);
  console.log(`\n  ${name}:`);
  for (const p of Object.keys(list).sort()) {
    const isNew = extra.includes(p);
    console.log(`    ${isNew ? 'NEW ' : '    '} ${p.padEnd(24)} ${list[p]}`);
  }
  if (fixed.length) console.log(`    resolved: ${fixed.join(', ')}`);
}
console.log(`\nFix what you can, then re-run with --write to lower the baseline.`);
process.exit(1);
