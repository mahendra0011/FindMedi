/**
 * AUTHZ gap triage â€” which unclassified routes are actually unguarded?
 *
 * WHY THIS EXISTS
 * The `check-authz-coverage.mjs` gate reports 288 "unclassified" routes, which
 * reads as 288 vulnerabilities. It is not. That number was produced by GUESSING at
 * guard NAMES, and the codebase uses `resolvePartner`, `scopeToHospital`,
 * `canAccessPatient`, `requireTenantOwnership`, `callerOwnsDoc`,
 * `requireAssistantBooking`, `requireRoomAccess`, `hospitalAdminOnly` and more.
 * Every time the guess missed, it invented a false positive on an already-guarded
 * route. Five passes took 288 -> 98 -> 85 -> 84 -> 73, and every one of those
 * reductions was a false positive removed, not a finding closed.
 *
 * THE CORRECT MODEL: parse the middleware chain, subtract what is NOT an
 * authorization decision, and see what is left. Whatever remains is a guard,
 * whatever it is named.
 *
 *   node scripts/triage-authz-gaps.mjs            # summary + list
 *   node scripts/triage-authz-gaps.mjs pharmacy   # one file
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROUTES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'routes'
);

import { scanRoutes, SELF_HINTS, HANDLER_GUARDS } from './lib/routeScan.mjs';

// The parser itself (middleware chain splitting, handler-body extraction,
// comment stripping, guard patterns) now lives in scripts/lib/routeScan.mjs,
// shared with check-authz-coverage.mjs.
//
// It was duplicated here and the two copies had already drifted: the coverage
// gate reported 289 unclassified routes while this file reported 0 unguarded,
// because the gate only ever read the route DEFINITION line. Two parsers for one
// question means the answer depends on which tool the reader happened to run, so
// the fix is one parser, not a second correct copy of this one.
/**
 * Routes manually reviewed and cleared, with the reason.
 *
 * The tilder cannot decide these: a route that queries the caller's OWN record
 * is correctly self-scoped, and a route that returns a platform-wide aggregate
 * has nothing to scope BY. Both look identical to a pattern matcher, which is
 * why they kept reappearing on the unguarded list.
 *
 * Every entry was read in full. A new entry is a CLAIM that can be wrong, so
 * the reason is recorded here rather than silently dropped - if the route later
 * starts reading someone else's data, this becomes a false negative that looks
 * reviewed. `npm run authz:triage` prints the list so a reviewer can re-check it.
 *
 * Keyed `file:method path`. A path change invalidates the entry by design, and
 * a key that stops matching is reported as STALE so a clearance cannot rot into
 * a silent false negative.
 *
 * Note: `announcements.js:GET /` was cleared here, then the route was actually
 * fixed (it now 403s on an undetermined tenant) and the entry had to be deleted
 * because the route stopped being a candidate. The stale detector is what
 * surfaced that, which is the behaviour worth keeping.
 */
const REVIEWED_SAFE = new Map([
  // Self-scoped through the session: `req.user.id` / `req.user._id`. The user
  // cannot name a target, so there is no object to authorize.
  ['auth.js:PUT /change-password', 'self-scoped via req.user.id; also requires the current password'],
  ['auth.js:POST /avatar', 'self-scoped via req.user.id; writes only the caller own avatar'],

  // Self-scoped through the session tenant: the target facility/hospital comes
  // from the token, never from the request.
  ['facilities.js:GET /settings', 'self-scoped via req.user.facilityId/hospitalId; no tenant in the path'],
  ['facilities.js:PUT /settings', 'self-scoped via req.user.facilityId/hospitalId; no tenant in the path'],
  ['clinics.js:GET /staff', 'scoped to req.user.facilityId; sibling POST is adminOnly, this read is facility-internal'],

  // Public catalogue data. No PHI, no per-tenant ownership - a provider
  // directory or a drug list is meant to be searchable by any signed-in user.
  ['search.js:GET /providers', 'public provider directory; no patient data'],
  ['search.js:GET /drugs', 'public drug catalogue; searchDrugs() has its own denial path'],
  ['search.js:GET /icd', 'public ICD-10 reference list; no PHI'],

  // Platform-wide AGGREGATES. Counts per time/date/cell, never identities.
  ['appointments.js:GET /booked-slots', 'returns per-slot COUNTS for a doctor, no patient names'],
  ['beds.js:GET /heatmap', 'available-bed counts aggregated per H3 cell, no identities'],
  ['lab.js:GET /outbreak', 'abnormal-test counts per H3 cell, no identities'],
  ['surge.js:GET /:cell', 'surge projection for a cell, no identities'],
  ['reports.js:GET /types/list', 'static config list of report types'],
  ['video.js:GET /status', 'returns a boolean and the public LiveKit URL, no token or secret'],

  // Stateless compute. Reads nothing from the database, so there is no record
  // to authorize. (It IS an unauthenticated-callable wrapper around a paid
  // routing API - a cost/abuse concern tracked as a rate-limit item, not an
  // authorization one.)
  ['delivery.js:POST /optimize-route', 'stateless Valhalla call; no DB read, no PHI'],

  // Existence probe for a coupon the CALLER is about to redeem. The redeem path
  // is the server-owned one; this only reports whether a code is live, and
  // does not return another tenant order data.
  ['pharmacy.js:POST /coupons/validate', 'existence probe only; the real discount is derived server-side on the order'],
]);

const reviewedSafe = [];

const only = process.argv[2];
const guarded = [];
const selfHinted = [];
const unguarded = [];

// scanRoutes() supplies the same facts the coverage gate uses, so the two tools
// cannot drift apart again on the same route.
for (const r of scanRoutes(ROUTES_DIR, only)) {
  // Already-tagged by the coverage gate's `// authz:` convention.
  if (r.authzTag) continue;
  if (!r.hasProtect) continue;
  // Inherited from a router-level guard.
  if (r.routerGuarded) continue;

  const entry = {
    file: r.file,
    line: r.line,
    method: r.method,
    target: r.rawTarget,
    guard: r.guards.join(", "),
  };

  if (r.guards.length > 0 || HANDLER_GUARDS.some((re) => re.test(r.body))) {
    guarded.push(entry);
  } else if (SELF_HINTS.some((h) => r.target.toLowerCase().includes(h))) {
    // A `/me` or `/my-` path is self-scoped BY CONVENTION only. It is reported
    // separately rather than counted as guarded, because the convention is a
    // naming habit, not a control: `GET /my-orders` that queries every order is
    // exactly the bug the convention is supposed to prevent.
    selfHinted.push(entry);
  } else {
    // The key strips the surrounding quotes: `entry.target` keeps them for
    // display (they make the path obvious in the listing), but a
    // `file:METHOD '/path'` key never matches a hand-written map entry, and
    // the stale-key detector then reports every clearance as stale.
    const key = `${r.file}:${r.method} ${r.target}`;
    if (REVIEWED_SAFE.has(key)) reviewedSafe.push({ ...entry, reason: REVIEWED_SAFE.get(key) });
    else unguarded.push(entry);
  }
}

const bar = '='.repeat(78);
const w = (s, n) => String(s).padEnd(n);

console.log(bar);
console.log('AUTHZ GAP TRIAGE');
console.log(bar);
console.log(`guarded         : ${guarded.length}`);
console.log(`self-hinted     : ${selfHinted.length}   (/me, /my- â€” a NAMING convention, not a control)`);
console.log(`reviewed-safe   : ${reviewedSafe.length}   (read in full; reason recorded in this file)`);
console.log(`UNGUARDED       : ${unguarded.length}   <-- the real work`);
console.log(`files           : ${new Set(unguarded.map((r) => r.file)).size}`);

// A REVIEWED_SAFE key that no longer matches any route is a stale claim: the
// route was renamed, moved or deleted, and the clearance silently stopped
// applying. Surfacing it keeps the list honest instead of letting it rot.
const matched = new Set(
  reviewedSafe.map((r) => `${r.file}:${r.method} ${r.target.replace(/^['"`]|['"`]$/g, '')}`)
);
const stale = [...REVIEWED_SAFE.keys()].filter((k) => !matched.has(k));
if (stale.length > 0 && !only) {
  console.log(`\n  STALE reviewed-safe keys (route renamed/moved â€” re-review or delete):`);
  for (const k of stale) console.log(`    ${k}`);
}

const byFile = new Map();
for (const r of unguarded) {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
}
const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);

console.log('\n' + bar);
console.log('UNGUARDED, grouped by file (highest risk first: writes, then PHI reads)');
console.log(bar);

const risk = (r) => {
  const write = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method);
  const phi = /(prescription|record|lab|patient|appointment|mental|consent|billing|insurance|dispatch|outbreak)/i.test(r.target);
  return (write ? 0 : 10) + (phi ? 0 : 5);
};
unguarded.sort((a, b) => risk(a) - risk(b));

for (const [file, list] of sorted) {
  console.log(`\n${file}  (${list.length})`);
  for (const r of list) {
    console.log(`   L${String(r.line).padStart(4)}  ${w(r.method, 6)} ${r.target}`);
  }
}
console.log(`\n  TOTAL: ${unguarded.length}`);
