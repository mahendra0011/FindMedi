#!/usr/bin/env node
/**
 * AUTHZ-B-06: route-level authorization coverage inventory.
 *
 * The sweep behind this audit counted 799 route definitions and found 316 that
 * carried `protect` but NO authorization marker on the definition line. Some of
 * those are legitimately self-scoped (`GET /me`, `GET /my-appointments`); others
 * are accidental holes. Nobody could tell which was which, so "is authorization
 * covered?" was unanswerable — and the CI job that does exist
 * (checkAuthzCallerReachability) only catches routes that are OVER-blocked, not
 * ones that are under-blocked.
 *
 * This script classifies every route and compares the result against a committed
 * baseline, so:
 *   - a NEW unclassified route fails CI (it must be tagged before it ships), and
 *   - the tagged/unclassified counts are visible in the PR, which is what turns
 *     "unmeasured" into "measured".
 *
 * Tag grammar (a `// authz:` comment on the line above the route):
 *   // authz: public        no authentication at all (documented + justified)
 *   // authz: self         authenticated, scoped to req.user by the handler
 *   // authz: role         authorize()/restrictTo()/adminOnly on the definition
 *   // authz: object       authorizeObject() on the definition
 *   // authz: facility     sameFacilityStrict()/applyTenantScope in the handler
 *   // authz: inherited    guarded by a router.use(...) above it
 *
 * Usage:
 *   node scripts/check-authz-coverage.mjs            # report + fail on NEW gaps
 *   node scripts/check-authz-coverage.mjs --report   # print the full inventory
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInventory, countByTag, buildOwnershipMatrix, OWNERSHIP_MECHANISMS } from './lib/authzClassify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'src', 'routes');
const BASELINE_FILE = path.join(ROOT, '.authz-coverage-baseline.json');

/**
 * AUTHZ-M-02: the grammar itself lives in lib/authzClassify.mjs so a test can
 * re-derive the manifest and prove the committed file is current. Keeping it
 * inline here would mean the freshness test had to re-implement the classifier,
 * and a second grammar is exactly what this finding is about.
 */
const rows = buildInventory(ROUTES_DIR);
const counts = countByTag(rows);

console.log('AUTHZ coverage inventory (AUTHZ-B-06)');
console.log('-------------------------------------');
for (const [tag, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${tag.padEnd(14)} ${n}`);
}
console.log(`  ${'TOTAL'.padEnd(14)} ${rows.length}`);
const unclassified = rows.filter((r) => r.tag === 'unclassified');
console.log(`\nunclassified (protect but no authorization marker): ${unclassified.length}`);

if (process.argv.includes('--report')) {
  const byFile = new Map();
  for (const r of rows) {
    if (!byFile.has(r.file)) byFile.set(r.file, []);
    byFile.get(r.file).push(r);
  }
  for (const [file, list] of [...byFile.entries()].sort()) {
    const gaps = list.filter((r) => r.tag === 'unclassified');
    console.log(`\n${file} — ${list.length} routes, ${gaps.length} unclassified`);
    for (const r of gaps) console.log(`   L${r.line} ${r.method} ${r.target}`);
  }
}

// ── AUTHZ-M-02: the machine-readable manifest ───────────────────────────────
//
// Everything above this line was console-only. The classification was computed,
// printed, thrown away, and recomputed by hand the next time anybody asked
// "what may call this route?" - which is the exact loop that let AUTHZ-M-01
// drift: eight ownership mechanisms coexisted because nobody had a list that
// showed them side by side.
//
// This file is the artefact the finding asked for. It is emitted on EVERY run
// (not behind a flag) because a manifest that only exists when someone remembers
// to ask for it is documentation, and documentation rots.
//
// Deliberately has NO timestamp: a generated-at line makes every run dirty the
// git diff even when nothing changed, and the diff is the point - a reviewer
// should see a one-line change when one route changes classification.
const MANIFEST_FILE = path.join(ROOT, 'authz-manifest.json');

// AUTHZ-M-07: the matrix half of the manifest - not just WHETHER a route is
// guarded, but BY WHAT. Without this the central layer (authorizeObject) and the
// ten mechanisms that bypass it are indistinguishable in the numbers, which is
// how AUTHZ-M-01 went unaddressed for as long as it did.
const { byMechanism, centralLayer, alternatives, unnamedHandlerGuard, unrecognised } = buildOwnershipMatrix(ROUTES_DIR);
const alternativeRows = Object.entries(alternatives)
  .map(([mechanism, n]) => ({ mechanism, routes: n }))
  .sort((a, b) => b.routes - a.routes);
const objectScopedTotal = centralLayer.length + alternativeRows.reduce((a, b) => a + b.routes, 0);

const manifest = {
  schemaVersion: 1,
  note: 'Generated by scripts/check-authz-coverage.mjs. Do not hand-edit.',
  tags: {
    public: 'no authentication required',
    self: 'the authenticated subject may act on their own data',
    role: 'gated on the role of the caller only',
    object: 'gated on ownership/tenancy of the addressed object',
    facility: 'gated on sharing a facility with the target',
    inherited: 'guard comes from router-level middleware, not the route line',
    unclassified: 'protected but no authorization decision recorded - a GAP',
  },
  total: rows.length,
  counts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),

  // AUTHZ-M-07. `byMechanism` answers "which guard, for every route";
  // `centralLayer` is the single number AUTHZ-M-01 is about - how much of the
  // object-scoped surface actually goes through the central layer rather than a
  // mechanism that grew up alongside it.
  byMechanism,
  centralLayer: {
    mechanism: OWNERSHIP_MECHANISMS[0],
    routes: centralLayer.length,
    objectScopedTotal,
    share: objectScopedTotal ? +(centralLayer.length / objectScopedTotal).toFixed(3) : null,
    alternatives: alternativeRows,
    // Object-scoped, but the guard lives in the handler body behind a pattern
    // the parser matches without naming a mechanism. These are the routes the
    // central-layer migration cannot even identify yet.
    unnamedHandlerGuard,
    note: 'AUTHZ-M-01 is OPEN. The alternatives are not necessarily wrong - several predate authorizeObject and carry domain rules it does not model - but the split was previously invisible, and a route can be guarded twice by two mechanisms whose rules were never reconciled.',
  },
  unrecognised,
  // Sorted so the file is byte-stable across runs regardless of scan order.
  // Locale-independent ASCII order (same comparator as scripts/lib/authzClassify.mjs;
  // localeCompare would disagree with the byte-order assertion in authzManifest.spec.js).
  routes: rows
    .slice()
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line))
    .map((r) => ({ file: r.file, line: r.line, method: r.method, target: r.target, tag: r.tag })),
};

fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nmanifest written: authz-manifest.json (${rows.length} routes)`);

// ── Baseline gate ───────────────────────────────────────────────────────────
// The count may only go DOWN. Migrations tag routes over time; a new gap means a
// route shipped without anyone deciding who may call it.
const totalGaps = unclassified.length;
let baseline = null;
try {
  baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
} catch { /* first run */ }

if (!baseline) {
  fs.writeFileSync(
    BASELINE_FILE,
    `${JSON.stringify({ total: rows.length, unclassified: totalGaps }, null, 2)}\n`
  );
  console.log(`\nbaseline written: ${totalGaps} unclassified of ${rows.length} routes`);
  process.exit(0);
}

if (totalGaps > baseline.unclassified) {
  console.error(
    `\nAUTHZ-B-06 gate FAILED: unclassified routes ${baseline.unclassified} -> ${totalGaps}.`
  );
  for (const r of unclassified.slice(0, 25)) {
    console.error(`  ${r.file}:${r.line}  ${r.method} ${r.target}`);
  }
  console.error('\nEither tag the route with `// authz: public|self|role|object|facility`,');
  console.error('or wire authorizeObject()/authorize() onto it.');
  process.exit(1);
}

console.log(
  `\nAUTHZ-B-06 gate OK — ${totalGaps} unclassified (baseline ${baseline.unclassified}), none added.`
);
process.exit(0);

