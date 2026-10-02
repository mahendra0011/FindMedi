/**
 * Shared route scanner for the authorization tools.
 *
 * WHY THIS IS A SEPARATE MODULE
 * `check-authz-coverage.mjs` and `triage-authz-gaps.mjs` both decide whether a
 * route is authorized, and they disagreed on 289 routes: the coverage gate only
 * ever looked at the route DEFINITION line, so a route guarded by
 * `applyTenantScope()` inside its handler was "unclassified", while the triage —
 * which parsed the handler body — said it was guarded. Two parsers for one
 * question is the defect, not the fix; whichever tool a reader happened to run
 * determined the answer.
 *
 * This module is the single answer. It parses each route into its middleware
 * chain, its handler body (comments stripped) and its `// authz:` tag, and
 * exposes the pieces so each tool can apply its OWN policy to the same facts.
 *
 * It does not decide what is authorized. It decides what is CODE.
 */
import fs from 'node:fs';
import path from 'node:path';

export const SELF_HINTS = ['/me', '/my-', '/profile', '/self', '/mine'];

/** Middleware that authenticate or validate, but do NOT authorize. */
export const NON_AUTHZ = new Set([
  'protect', 'optionalProtect', 'authenticate',
  'validate', 'validateFileContent', 'requireValidatedFile',
  'multer', 'upload', 'single', 'array', 'none', 'fields',
  'authLimiter', 'bookingLimiter', 'paymentLimiter', 'generalLimiter',
  'publicSearchLimiter', 'totpLimiter', 'reviewWriteLimiter', 'auditSearchLimiter',
  'idempotencyGuard', 'setCsrfToken', 'asyncHandler', 'express',
]);

/**
 * Substrings that mark an authorization decision in a middleware name.
 *
 * `Only` covers adminOnly / hospitalAdminOnly / clinicalStaffOnly /
 * targetLawyerOnly / roleOnly / ownOnly in one rule — they share a naming
 * convention, and enumerating them individually is how the list goes stale.
 */
export const AUTHZ_MARKERS = [
  'authorize', 'restrictTo', 'Only', 'scopeTo', 'requireRole',
  'canAccess', 'requireTenant', 'requireOwnership', 'callerOwns', 'callerMayAct',
  'requireConversationMember', 'requireRoomAccess', 'requireAssistantBooking',
  'sameFacility', 'resolvePartner', 'resolvePatient', 'resolveBooking',
  'requireAccess', 'require', 'deny', 'guard',
];

/**
 * Patterns proving a guard lives INSIDE the handler body.
 *
 * Deliberately generic. Enumerating `assertAccess|assertOwn|canAccess|...`
 * misses guards like `assertMentalHealthAccess(` and `assertAssistantBookingAccess(`
 * — including ones added by hand — and a guard-naming list is a maintenance
 * liability. Matching the SHAPE of a call is not.
 */
export const HANDLER_GUARDS = [
  /req\.user\.role/,
  /req\.user\._id/,
  /\b(assert|can|may|require|deny|is|has|owns)[A-Za-z0-9_]*(Access|Ownership|Owned|Owns|Owner|Participant|Party|Scope|Tenant|Allowed|Permitted|Authorized|Authorised)[A-Za-z0-9_]*\s*\(/i,
  /\bcanAccess[A-Za-z]*\s*\(/,
  /\bcallerOwns[A-Za-z]*\s*\(|\bcallerMayAct[A-Za-z]*\s*\(/,
  // `applyTenantScope` is the repo-wide fail-closed tenant helper from
  // AUTHZ-B-07, used 10 times in pharmacy.js alone. `apply` is not one of the
  // verb prefixes above, so it was invisible — which put five ALREADY-GUARDED
  // pharmacy routes on the unguarded list.
  /\bapplyTenantScope\s*\(/,
  /\bassertTenantOwnership\s*\(/,
  // A CONSENT predicate is an authorization decision: `isBloodDonor: true` in a
  // filter is what stops a patient record being published as a donor entry.
  // Narrow on purpose — isActive/isApproved/enabled are lifecycle flags, not
  // consent, and counting them as authorization would whitelist real gaps.
  /\b(is\w*(Donor|Consent\w*)|consentGiven|consentId)\b/,
  /String\([^)]*(patientId|userId|clientId|doctorId|assistantId|lawyerId|riderId|partnerId)/,
  /\.(patientId|userId|clientId|doctorId|assistantId|lawyerId|riderId|partnerId)\??\.\s*toString\(\)\s*===/,
  /Not authorized|Forbidden|Access denied/,
  /\$match[\s\S]{0,160}req\.user\._id/,
  /\.\$match\(/,
  /const\s+\w+\s*=\s*req\.user\._id/,
  /\b(caller|receiver|sender|recipient|owner|createdBy|requestedBy|uploadedBy|assignedTo|reportedBy)\s*:\s*(userId|req\.user\._id)/,
];


/**
 * Remove comments.
 *
 * A comment is not a control, but it very often NAMES one. `GET /search/icd` was
 * reported as consent-guarded purely because the comment above the NEXT route
 * reads `// GET /api/search/ehr?...&consentId= - consent-gated`. Quote-aware, so
 * a `//` inside a URL or string literal is not mistaken for a comment.
 */
export function stripComments(text) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      out += ch;
      if (ch === '\\') { out += text[++i] ?? ''; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; out += ch; continue; }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Split a route definition's middleware chain, honouring nesting and quotes. */
export function middlewareChain(routeLine) {
  const cut = routeLine.search(/\basync\s*\(\s*req\s*,|\bfunction\s*\(\s*req\s*,/);
  const head = cut > 0 ? routeLine.slice(0, cut) : routeLine;

  // Drop the `router.get(` prefix BEFORE splitting.
  //
  // This is the bug that made an earlier version report 172 unguarded routes:
  // `router.get('/privacy', protect, authorize(...), async (req, res) => {`
  // does not close the `router.get(` paren on that line, so the depth counter
  // never returned to zero, no comma was a top-level delimiter, and the whole
  // chain came back as one part whose leading identifier was `router`.
  const argsOnly = head.replace(/^\s*router\.\w+\s*\(/, '');

  const parts = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (const ch of argsOnly) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);

  return parts
    .map((p) => p.trim())
    .filter((p) => p && !/^['"]/.test(p));
}

/** The handler body: from this route line to the next route definition. */
export function handlerBody(lines, start) {
  const out = [];
  for (let i = start; i < lines.length && i < start + 220; i++) {
    if (i > start && /router\.(get|post|put|patch|delete)\s*\(/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return stripComments(out.join('\n'));
}

/** Guard middleware names on a route, after removing the non-authz ones. */
export function guardMiddleware(routeLine) {
  return middlewareChain(routeLine)
    .map((m) => (m.match(/^([A-Za-z_$][\w$]*)/) || [])[1] || '')
    .filter((name) => name && !NON_AUTHZ.has(name))
    .filter((name) => AUTHZ_MARKERS.some((s) => name.includes(s)));
}

/** The nearest `// authz: <tag>` comment above a route, if any. */
function authzTag(lines, i) {
  for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
    const t = lines[j] || '';
    const m = t.match(/^\s*\/\/\s*authz:\s*(\w+)/);
    if (m) return m[1];
    if (/^\s*\/\//.test(t)) continue;
    if (t.trim()) break;
  }
  return null;
}

/**
 * Scan every route file and return the facts both tools need.
 *
 * @param {string} routesDir absolute path to the routes directory
 * @param {string} [only]   substring filter on the filename
 */
export function scanRoutes(routesDir, only) {
  const rows = [];
  for (const file of fs.readdirSync(routesDir)) {
    if (!file.endsWith('.js')) continue;
    if (only && !file.includes(only)) continue;

    const lines = fs.readFileSync(path.join(routesDir, file), 'utf8').split(/\r?\n/);
    let routerGuarded = false;

    lines.forEach((line, i) => {
      if (/router\.use\(/.test(line)) routerGuarded = true;
      const m = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*(.+)/);
      if (!m) return;

      const raw = m[2].split(',')[0].trim().slice(0, 62);
      rows.push({
        file,
        line: i + 1,
        method: m[1].toUpperCase(),
        target: raw.replace(/^['"`]|['"`]$/g, ''),
        rawTarget: raw,
        routeLine: line,
        authzTag: authzTag(lines, i),
        hasProtect: line.includes('protect'),
        routerGuarded,
        guards: guardMiddleware(line),
        body: handlerBody(lines, i),
      });
    });
  }
  return rows;
}
