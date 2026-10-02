#!/usr/bin/env node
/**
 * Permission-matrix sanity gate.
 *
 * WHY THIS FILE EXISTS AT ALL
 * --------------------------
 * `.github/workflows/ci.yml` has had a `permission-matrix-sanity` job that runs
 * `node scripts/checkPermissionMatrix.mjs` — and that script did not exist. The
 * job would have failed with `MODULE_NOT_FOUND` on every run, which is worse
 * than having no gate: it looks like a red build caused by the code under test
 * rather than by a typo in a filename, so the reflex is to re-run or to blame
 * permissions, and the real drift underneath never gets looked at.
 *
 * WHAT IT CHECKS
 * --------------
 * Two ways a role/permission matrix silently rots, both of which present to a
 * user as "this feature is broken" rather than "this is a misconfiguration":
 *
 *   1. A role is missing from the matrix entirely. Every `authorize()` check
 *      denies such an account, so a whole profession's access disappears.
 *      `assertRoleMatrixComplete` already detects this; nothing called it.
 *
 *   2. A route requires a permission that NO role holds. That route is a
 *      permanent 403 for every non-superadmin — the endpoint exists, is
 *      documented, and can never succeed. This is the one worth failing on.
 *
 * The converse (a permission in the matrix no route uses) is reported but does
 * NOT fail: reserved permissions ahead of a route are normal, and a gate that
 * punishes planning would be deleted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROLE_PERMISSIONS,
  CANONICAL_ROLES,
  assertRoleMatrixComplete,
  roleHasPermission,
} from '../src/config/permissions.js';
// Comments are stripped with the SAME helper the route scanner uses, and that
// matters for correctness rather than tidiness: a fix often writes
// `// used to be authorize('records:write')` in its explanation. Scanning raw
// text would then count a permission as "used by a route" that no route
// actually gates on — which does not merely add noise, it SUPPRESSES the
// unreachable-permission report and hides the real drift underneath.
// routeScan's own docblock says it plainly: "A comment is not a control, but it
// very often NAMES one."
import { stripComments } from './lib/routeScan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(__dirname, '..', 'src', 'routes');

const fail = [];
const note = (m) => console.log(`  ${m}`);
const bad = (m) => { fail.push(m); console.error(`  ${m}`); };

// ── 1. every canonical role has a matrix entry ──────────────────────────────
console.log('permission matrix sanity');
console.log('------------------------');
try {
  assertRoleMatrixComplete(ROLE_PERMISSIONS);
  note(`all ${CANONICAL_ROLES.length} canonical roles have a matrix entry`);
} catch (err) {
  bad(err.message);
}

// ── 2. every permission a route requires is actually held by someone ───────
//
// `authorize('a', 'b')` means "a OR b", so a permission is REACHABLE if any
// non-superadmin role holds it. Superadmin carries '*' and would mask the whole
// check, so it is excluded deliberately: the question is whether the feature
// works for anybody who is not the platform owner.
const WORKING_ROLES = CANONICAL_ROLES.filter((r) => r !== 'superadmin');

const used = new Map();   // permission -> [{file, line}]
const opaque = [];        // authorize(...variable) — not statically checkable

for (const file of fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.js'))) {
  const lines = stripComments(fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8')).split('\n');
  lines.forEach((line, i) => {
    const at = line.indexOf('authorize(');
    if (at === -1) return;
    // The call is `authorize(` + argument list; take everything up to the
    // matching `)` or the end of the line, whichever comes first.
    const args = line.slice(at + 'authorize('.length);
    const end = args.indexOf(')');
    const argText = end === -1 ? args : args.slice(0, end);

    const literals = [...argText.matchAll(/'([^']+)'|"([^"]+)"/g)]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    if (literals.length === 0) {
      opaque.push(`${file}:${i + 1}  authorize(${argText.trim().slice(0, 60)})`);
      return;
    }
    for (const perm of literals) {
      if (!used.has(perm)) used.set(perm, []);
      used.get(perm).push(`${file}:${i + 1}`);
    }
  });
}

const unreachable = [];
for (const [perm, sites] of used) {
  const holders = WORKING_ROLES.filter((role) => roleHasPermission(role, perm));
  if (holders.length === 0) unreachable.push({ perm, sites });
}

console.log(`\n  permissions referenced by routes : ${used.size}`);
console.log(`  canonical non-superadmin roles   : ${WORKING_ROLES.length}`);

if (unreachable.length) {
  console.error(`\n  ${unreachable.length} permission(s) required by a route that NO non-superadmin role holds:`);
  for (const u of unreachable) {
    console.error(`    ${u.perm}`);
    console.error(`      used at ${u.sites.slice(0, 4).join(', ')}${u.sites.length > 4 ? ` (+${u.sites.length - 4} more)` : ''}`);
  }
  console.error('\n  These routes are a permanent 403 for every role. Either grant the');
  console.error('  permission to the role that is supposed to use it, or delete the route.');
  fail.push(`${unreachable.length} unreachable permission(s)`);
} else {
  note('\n  every permission a route requires is held by at least one non-superadmin role');
}

if (opaque.length) {
  // NOT a failure. `authorize(...SOME_CONST)` cannot be resolved by reading the
  // call site, and pretending otherwise would either miss real drift or force
  // someone to inline constants to satisfy a linter.
  console.log(`\n  ${opaque.length} authorize() call(s) take a non-literal argument - not statically checked:`);
  for (const o of opaque) console.log(`    ${o}`);
}

// ── 3. permissions in the matrix that no route asks for ────────────────────
// Informational only: reserved-ahead-of-a-route permissions are legitimate.
const declared = new Set(
  Object.values(ROLE_PERMISSIONS).flat().filter((p) => p !== '*')
);
const unused = [...declared].filter((p) => !used.has(p)).sort();
if (unused.length) {
  console.log(`\n  ${unused.length} declared permission(s) not referenced by any route (informational):`);
  console.log(`    ${unused.join(', ')}`);
}

console.log('');
if (fail.length) {
  console.error(`permission matrix gate FAILED (${fail.join('; ')})`);
  process.exit(1);
}
console.log('permission matrix gate OK');
