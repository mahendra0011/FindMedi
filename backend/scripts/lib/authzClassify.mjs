import { scanRoutes, SELF_HINTS, HANDLER_GUARDS } from './routeScan.mjs';

/**
 * AUTHZ-M-02: the classification grammar, extracted so it can be imported.
 *
 * It used to live inline in check-authz-coverage.mjs, which meant a test could
 * not re-derive the manifest and check it was current - the one check that makes
 * a committed artefact trustworthy. A test that re-implements the classifier
 * instead of importing it would be a second grammar that silently drifts, so
 * this module is the single definition and the script is just a caller.
 *
 * Order matters: an explicit `// authz:` tag always wins (it is a human claim,
 * and the point of the grammar is to let a reviewer override the heuristic), then
 * a middleware guard, then a guard in the handler body, then the naming
 * convention, and only then "unclassified".
 */

/**
 * Markers checked on the route DEFINITION line only.
 *
 * These are the strong, cheap signals. Anything subtler (a guard inside the
 * handler) is decided by HANDLER_GUARDS - this list is not the whole answer,
 * which is the fix for the 289-route disagreement with the triage.
 */
export const ROLE_MARKERS = [
  'authorize(', 'restrictTo(', 'adminOnly', 'superadminOnly',
  'platformAdminOnly', 'authorizeObject(', 'sameFacilityStrict(',
  'requirePermission', 'staffOnly', 'doctorOnly', 'hospitalOnly',
];

export const classify = (r) => {
  if (r.authzTag) return r.authzTag;
  if (r.guards.length > 0) {
    if (r.routeLine.includes('authorizeObject(')) return 'object';
    if (r.routeLine.includes('sameFacilityStrict(')) return 'facility';
    return 'role';
  }
  // The part that was missing: a real guard inside the handler counts, and the
  // body arrives comment-stripped from routeScan, so a comment that merely
  // NAMES a guard cannot promote a route out of "unclassified".
  if (HANDLER_GUARDS.some((re) => re.test(r.body))) return 'object';
  if (SELF_HINTS.some((h) => r.target.toLowerCase().includes(h))) return 'self';
  if (!r.hasProtect) return 'public';
  return 'unclassified';
};

/**
 * @param {string} routesDir
 * @returns {Array<{file,line,method,target,tag}>} sorted, so callers can
 *   byte-compare the result against a committed manifest.
 */
export const buildInventory = (routesDir) =>
  scanRoutes(routesDir)
    .map((r) => ({
      file: r.file,
      line: r.line,
      method: r.method,
      target: r.rawTarget,
      tag: r.routerGuarded && classify(r) === 'unclassified' ? 'inherited' : classify(r),
    }))
    // Locale-independent ASCII order: localeCompare puts 'appointments.js'
    // before 'appointmentSeries.js' (case-insensitive), which disagrees with
    // the byte-order assertion in test/security/authzManifest.spec.js. ASCII
    // is deterministic on any machine; ICU collation is not guaranteed to be.
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));

export const countByTag = (rows) =>
  rows.reduce((acc, r) => {
    acc[r.tag] = (acc[r.tag] || 0) + 1;
    return acc;
  }, {});

/**
 * AUTHZ-M-07 / AUTHZ-M-01: which ownership mechanism actually guards each route.
 *
 * The manifest answers "is this route classified?". It cannot answer "BY WHAT",
 * and that second question is the one that matters here: `authorizeObject` is
 * the central layer, but nine other mechanisms guard object-level access too.
 * Nobody had a count, so the central layer sat at a handful of usages while 23
 * routes went through `tenantOwnership` - not because the alternative was
 * better, but because nobody could see the split.
 */
/**
 * Keyed by the EXPORTED SYMBOL, never the module filename.
 *
 * First version of this list matched module names, and every count came back
 * near zero: the middleware is called `requireTenantOwnership`, not
 * `tenantOwnership`, and the capital T alone made 19 guarded routes report as
 * unguarded. `chatMembership.js` exports `requireConversationMember` (18 route
 * uses) and reported 0. A matrix that undercounts by 19 routes is worse than no
 * matrix, because it looks like evidence that the migration is nearly done.
 */
export const OWNERSHIP_MECHANISMS = [
  'authorizeObject',
  'requireTenantOwnership',
  'requireConversationMember',
  'assertMentalHealthAccess',
  'canAccessRecord',
  'canAccessPatient',
  'assertAssistantBookingAccess',
  'assertCallParticipant',
  'denyCallAccess',
  'assertEhrSearchAccess',
  'sameFacilityStrict',
];

/** Role-only gates: they decide WHO may call, never WHICH object. */
export const ROLE_ONLY_MECHANISMS = [
  'authorize(', 'restrictTo(', 'adminOnly', 'superadminOnly',
  'platformAdminOnly', 'requirePermission', 'staffOnly', 'doctorOnly', 'hospitalOnly',
];

/**
 * Guards that decide WHICH object, not merely WHO may call. Kept separate from
 * OWNERSHIP_MECHANISMS because these are named like role gates but scope to a
 * record: `scopeToHospital` and `requireSosAccess` are object checks wearing a
 * role gate's clothes, and leaving them out would understate how much of the
 * platform is genuinely object-scoped.
 */
export const OBJECT_SCOPE_GUARDS = new Set(['scopeToHospital', 'resolvePartner', 'requireSosAccess', 'requireReportScope']);

/**
 * Driven by the PARSER's guard list, not by a hand-kept inventory of names.
 *
 * The first two attempts both used a hardcoded list and both were wrong in
 * opposite directions: matching module filenames reported 19 guarded
 * tenant routes as unguarded, and matching a guessed role-gate list reported
 * 370 more that way. routeScan already knows what guards each route has, so the
 * matrix reads that and only adds the handler-body mechanisms the route-definition
 * scan cannot see. Anything the parser does not recognise is surfaced as
 * `unrecognised` rather than quietly dropped.
 */
export const buildOwnershipMatrix = (routesDir) => {
  const byMechanism = {};
  const centralLayer = [];
  const alternatives = {};
  const unrecognised = [];
  const unnamedHandlerGuard = [];

  for (const r of scanRoutes(routesDir)) {
    const id = `${r.file}:${r.line}`;
    const guards = new Set(r.guards);

    // Mechanisms invoked INSIDE the handler body (assertAssistantBookingAccess,
    // assertEhrSearchAccess, ...) never appear on the route definition line, so
    // the definition-line scan cannot see them.
    const haystack = `${r.routeLine}\n${r.body}`;
    for (const m of OWNERSHIP_MECHANISMS) {
      if (haystack.includes(m)) guards.add(m);
    }

    if (guards.size === 0) {
      // A handler-body guard found only by HANDLER_GUARDS is still a real
      // object check; it just cannot be attributed to a named mechanism. It is
      // object-scoped, not unguarded - counting it as either would put this
      // number (260) irreconcilably far from the manifest's `unclassified` (16)
      // and leave the reader with two contradictory gap counts.
      if (HANDLER_GUARDS.some((re) => re.test(r.body))) {
        unnamedHandlerGuard.push(id);
      } else if (classify(r) === 'unclassified') {
        // Delegated to the same classifier the manifest uses, rather than
        // re-deriving "is this a gap" here. The first version of this line
        // tested `r.hasProtect` directly and reported 23 gaps against the
        // manifest's 16 - the 7-route gap was self-scoped routes with no guard
        // on the line, which are correctly NOT unclassified. Two gap counters in
        // one artefact that disagree by 7 is exactly the kind of number nobody
        // trusts afterwards.
        unrecognised.push({ id, target: r.rawTarget });
      }
      continue;
    }

    for (const g of guards) {
      if (!byMechanism[g]) byMechanism[g] = [];
      byMechanism[g].push(id);
    }

    const objectScoped = [...guards].some((g) => OWNERSHIP_MECHANISMS.includes(g) || OBJECT_SCOPE_GUARDS.has(g));
    if (!objectScoped) continue;

    if (guards.has(OWNERSHIP_MECHANISMS[0])) {
      centralLayer.push(id);
    } else {
      for (const g of guards) {
        if (OWNERSHIP_MECHANISMS.includes(g) || OBJECT_SCOPE_GUARDS.has(g)) {
          if (!alternatives[g]) alternatives[g] = [];
          alternatives[g].push(id);
        }
      }
    }
  }

  return {
    byMechanism: Object.fromEntries(
      Object.keys(byMechanism).sort().map((k) => [k, byMechanism[k].length])
    ),
    centralLayer,
    alternatives: Object.fromEntries(
      Object.keys(alternatives).sort().map((k) => [k, alternatives[k].length])
    ),
    unnamedHandlerGuard: unnamedHandlerGuard.length,
    unrecognised,
  };
};

