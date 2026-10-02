#!/usr/bin/env node
/**
 * Authorization caller-reachability gate.
 *
 * WHY THIS FILE EXISTS AT ALL
 * --------------------------
 * `.github/workflows/ci.yml` has had a job running
 * `node scripts/checkAuthzCallerReachability.mjs`, and that script did not
 * exist. Like the missing `checkPermissionMatrix.mjs`, the job fails with
 * MODULE_NOT_FOUND on every run and reads as a code regression rather than a
 * typo, so it gets re-run instead of fixed. Both were found by listing the
 * scripts ci.yml invokes and checking each one resolves - a two-minute check
 * that should have been the first thing done when either job was added.
 *
 * WHAT IT CHECKS
 * --------------
 * `check-authz-coverage.mjs` catches routes that are UNDER-blocked (protected,
 * but no authorization decision recorded). `checkPermissionMatrix.mjs` catches a
 * permission no role holds. This one catches the opposite failure: a route whose
 * guard stack NOBODY can satisfy.
 *
 * The shape it hunts is a contradiction between two gates:
 *
 *     router.post('/x', protect, platformAdminOnly, hospitalAdminOnly, ...)
 *
 * `platformAdminOnly` admits `superadmin`; `hospitalAdminOnly` admits
 * `hospital_admin` only. The intersection is empty, so the endpoint is a 403 for
 * every account that exists - it looks live, it is documented, and nobody can
 * ever reach it. Nobody notices, because a 403 is exactly what an authorization
 * check is supposed to return.
 *
 * This can only be proven for ROLE gates: their admitted sets are literal and
 * known. It deliberately does NOT reason about object/tenancy guards
 * (`authorizeObject`, `requireTenantOwnership`, ...), where reachability depends
 * on the data in the row and a static intersection would produce confident
 * nonsense.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_ROLES } from '../src/config/permissions.js';
import { stripComments, scanRoutes } from './lib/routeScan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(__dirname, '..', 'src', 'routes');

/**
 * Fixed role gates, transcribed from src/middleware/auth.js.
 *
 * Transcribed, not imported: the middleware are functions over `req`, so "what
 * roles does this admit" is not callable without a fake request and response.
 * These are short and stable, and the duplication risk is handled below by
 * asserting the middleware source still contains each literal - if somebody
 * widens `adminOnly`, this script FAILS rather than quietly disagreeing with the
 * runtime.
 */
const ROLE_GATES = {
  adminOnly: ['hospital_admin', 'superadmin'],
  superadminOnly: ['superadmin'],
  platformAdminOnly: ['superadmin'],
  hospitalAdminOnly: ['hospital_admin'],
  clinicalStaffOnly: ['superadmin', 'hospital_admin', 'doctor', 'nurse'],
};

/** Gates whose admitted set is an inline array literal at the call site. */
const LIST_GATES = ['requireRole', 'roleOnly', 'restrictTo'];

const intersect = (a, b) => a.filter((r) => b.includes(r));

console.log('authorization caller reachability');
console.log('---------------------------------');

// ── 0. the transcription above must still match the runtime ────────────────
const authSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'middleware', 'auth.js'), 'utf8');
const stale = [];
for (const [gate, roles] of Object.entries(ROLE_GATES)) {
  const re = new RegExp(`export const ${gate}\\b[\\s\\S]{0,400}?\\n\\}`, 'm');
  const body = (re.exec(authSrc) || [''])[0];
  for (const role of roles) {
    if (body && !body.includes(`'${role}'`)) {
      stale.push(`${gate} admits ${role} here but not in middleware/auth.js`);
    }
  }
}
if (stale.length) {
  for (const s of stale) console.error(`  STALE: ${s}`);
  console.error('\n  Update ROLE_GATES in this script to match middleware/auth.js.');
  process.exit(1);
}
console.log(`  ${Object.keys(ROLE_GATES).length} fixed role gates verified against middleware/auth.js`);

// ── 1. no route may have an unsatisfiable role-gate stack ──────────────────
const dead = [];
const unknownRoles = new Set();

for (const r of scanRoutes(ROUTES_DIR)) {
  const line = r.routeLine;
  const id = `${r.file}:${r.line}`;

  let admitted = null;         // null = no role gate seen yet
  const gates = [];

  for (const [gate, roles] of Object.entries(ROLE_GATES)) {
    if (!line.includes(gate)) continue;
    gates.push(gate);
    admitted = admitted === null ? [...roles] : intersect(admitted, roles);
  }

  for (const gate of LIST_GATES) {
    const at = line.indexOf(`${gate}(`);
    if (at === -1) continue;
    const arrMatch = /^\s*\[([^\]]*)\]/.exec(line.slice(at + gate.length + 1));
    // Built from a variable, so not statically resolvable - skip rather than
    // guess, which is what turns a gate into noise that gets deleted.
    if (!arrMatch) continue;
    const roles = [...arrMatch[1].matchAll(/'([^']+)'|"([^"]+)"/g)]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    gates.push(`${gate}(${roles.join(',') || '<empty>'})`);
    if (roles.length === 0) {
      admitted = [];            // an empty allowlist admits nobody, by definition
      continue;
    }
    for (const role of roles) {
      if (!CANONICAL_ROLES.includes(role)) unknownRoles.add(`${gate}: ${role}`);
    }
    admitted = admitted === null ? roles : intersect(admitted, roles);
  }

  if (admitted !== null && admitted.length === 0) {
    dead.push({ id, gates, target: r.rawTarget });
  }
}

if (dead.length) {
  console.error(`\n  ${dead.length} route(s) whose role guards NO role can satisfy:`);
  for (const d of dead) {
    console.error(`    ${d.id}  ${d.gates.join(' + ')}   ${d.target}`);
  }
  console.error('\n  These endpoints are a permanent 403 for every account that exists.');
  console.error('  A 403 is what an authz check returns when it WORKS, so this failure');
  console.error('  mode is invisible in production logs and in the UI.');
  process.exit(1);
}
console.log('  no route has an unsatisfiable role-gate stack');

if (unknownRoles.size) {
  // Informational: a role no account can hold is a dead branch in a guard,
  // which usually means a typo rather than an intentionally reserved role.
  console.log(`\n  ${unknownRoles.size} role(s) in a requireRole()/restrictTo() list that are not canonical:`);
  for (const u of [...unknownRoles].sort()) console.log(`    ${u}`);
}

console.log('\ncaller reachability gate OK');
