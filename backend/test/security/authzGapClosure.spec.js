/**
 * AUTHZ gap closure: the 16 routes that were UNCLASSIFIED are now 0.
 *
 * These are STATIC assertions in the style of routeAuthzStructure.spec.js,
 * because that is the convention for guards a mounted-route test cannot easily
 * reach, and five of these six live behind dynamic imports or heavy model
 * graphs. They document WHY each guard is there, so the next person who finds a
 * "redundant" guard on a read-only-looking route knows it is load-bearing.
 *
 * The load-bearing regression net is NOT in this file - it is the
 * `check-authz-coverage.mjs` gate, whose baseline was lowered from 16 to 0, plus
 * the authzManifest freshness test. Those fail if anyone removes a tag or adds a
 * route without deciding who may call it. This file explains the six that were
 * actual vulnerabilities, so a later "cleanup" does not undo them on the
 * belief that they were cosmetic.
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The route definition line plus the handler body that follows it. */
const routeBlock = (file, needle) => {
  const code = read(file);
  const at = code.indexOf(needle);
  // Thrown, not asserted: `expect(value, message)` is not a Jest signature - it
  // takes exactly one argument and silently ignores the second, which reads as
  // "expectation with context" and is not. Seven of these tests failed with
  // "Expect takes at most one argument" before it was caught.
  if (at === -1) throw new Error(`${needle} not found in ${file}`);
  const next = code.indexOf('\nrouter.', at + 10);
  return code.slice(at, next === -1 ? at + 1500 : next);
};

describe('AUTHZ · the six that were real gaps, not just unrecorded', () => {
  it('PUT /api/facilities/settings has a role guard on a WRITE', () => {
    // Was: `protect` and nothing else. Any account with a facilityId could flip
    // autoConfirmAppointment for the whole facility.
    const block = routeBlock('../../src/routes/facilities.js', "router.put('/settings'");
    expect(block).toMatch(/adminOnly/);
    // And the guard must precede the update, not follow it.
    expect(block.indexOf('adminOnly')).toBeLessThan(block.indexOf('findByIdAndUpdate'));
  });

  it('PUT /api/facilities/settings rejects a non-boolean setting', () => {
    // The body went straight into a dotted Mongo update, so a string would have
    // been written into a boolean field.
    const block = routeBlock('../../src/routes/facilities.js', "router.put('/settings'");
    expect(block).toMatch(/typeof autoConfirmAppointment !== 'boolean'/);
  });

  it('GET /api/clinic/staff FAILS CLOSED for a tenant-less account', () => {
    // The bug: `User.find({ facilityId: undefined, ... })` does not match
    // nothing, it matches every facility-less staff account on the platform and
    // returns their names, emails and phone numbers to any logged-in patient.
    const block = routeBlock('../../src/routes/clinics.js', "router.get('/staff'");
    expect(block).toMatch(/if \(!facilityId\) return res\.status\(403\)/);
    // ...and the check must come BEFORE the query, or the leak still happens.
    expect(block.indexOf('!facilityId')).toBeLessThan(block.indexOf('User.find'));
  });

  it('GET /api/lab/outbreak is staff-only, not cross-tenant clinical data', () => {
    // Abnormal lab orders from EVERY hospital, returned as geographic clusters.
    const block = routeBlock('../../src/routes/lab.js', "router.get('/outbreak'");
    expect(block).toMatch(/requireRole\(REPORT_DISPATCH_ROLES\)/);
  });

  it('GET /api/beds/heatmap is staff-only', () => {
    // Platform-wide bed capacity per hospital, previously readable by anyone.
    const block = routeBlock('../../src/routes/beds.js', "router.get('/heatmap'");
    expect(block).toMatch(/clinicalStaffOnly/);
  });

  it('GET /api/appointments/booked-slots is scoped to the caller tenant', () => {
    const block = routeBlock('../../src/routes/appointments.js', "router.get('/booked-slots'");
    expect(block).toMatch(/scopeToHospital/);
  });

  it('POST /api/delivery/optimize-route is gated AND has a stop cap', () => {
    const block = routeBlock('../../src/routes/delivery.js', "router.post('/optimize-route'");
    expect(block).toMatch(/requireRole\(DELIVERY_DISPATCH_ROLES\)/);
    // Gating alone is not enough: an authorised caller could still use the
    // routing engine as a denial-of-service lever, since the cost scales with
    // the stop count.
    expect(block).toMatch(/deliveryStops\.length > \d+/);
  });
});

describe('AUTHZ · the nine that were correct but unrecorded', () => {
  const tagged = [
    ['../../src/routes/auth.js', "router.put('/change-password'"],
    ['../../src/routes/auth.js', "router.post('/avatar'"],
    ['../../src/routes/reports.js', "router.get('/types/list'"],
    ['../../src/routes/search.js', "router.get('/providers'"],
    ['../../src/routes/search.js', "router.get('/drugs'"],
    ['../../src/routes/search.js', "router.get('/icd'"],
    ['../../src/routes/surge.js', "router.get('/:cell'"],
    ['../../src/routes/video.js', "router.get('/status'"],
    ['../../src/routes/pharmacy.js', "router.post('/coupons/validate'"],
  ];

  it.each(tagged)('%s %s carries an // authz: tag', (file, needle) => {
    const code = read(file);
    const at = code.indexOf(needle);
    if (at === -1) throw new Error(`${needle} not found in ${file}`);
    // The parser only looks THREE lines above the route, so a tag buried at the
    // top of a long explanation is invisible to the gate - which is exactly how
    // clinics.js GET /staff stayed unclassified even after its first fix.
    const window = code.slice(Math.max(0, at - 400), at);
    const lastRoute = window.lastIndexOf('\nrouter.');
    expect(window.slice(lastRoute + 1)).toMatch(/authz:\s*(self|role|object|facility|public)/);
  });
});

describe('AUTHZ · the gate itself must stay at zero', () => {
  const baseline = JSON.parse(readFileSync(path.join(BACKEND, '.authz-coverage-baseline.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(BACKEND, 'authz-manifest.json'), 'utf8'));

  it('baseline is 0, so any new unclassified route fails immediately', () => {
    expect(baseline.unclassified).toBe(0);
  });

  it('the committed manifest agrees that nothing is unclassified', () => {
    // Two counters for the same thing; if they ever disagree a reader learns to
    // trust neither. `?? 0` because a zero count omits the key entirely.
    expect(manifest.counts.unclassified ?? 0).toBe(0);
    expect(manifest.unrecognised).toEqual([]);
  });

  it('every route is decided, and the manifest covers the whole surface', () => {
    // The regression net proper: any route added without an authorization
    // decision re-creates the gap, and this is the assertion that catches it.
    expect(manifest.routes.every((r) => r.tag !== 'unclassified')).toBe(true);
    expect(manifest.total).toBe(baseline.total);
  });
});

describe('AUTHZ · AUTH-M-01 sensitive route-resource matrix (foreign-ID negatives)', () => {
  // Representative negative per resource: a caller presenting a FOREIGN id must
  // be denied by an ownership/tenant guard BEFORE data is returned. Static in
  // the style of the suites above (the guard lives on the definition line or
  // in the first handler lines); behavioural reach is owned by
  // routeAuthzBehaviour.spec.js + the check-authz-coverage gate.

  it('appointment GET /:id is allowlisted through canReadAppointment', () => {
    const block = routeBlock('../../src/routes/appointments.js', "router.get('/:id'");
    expect(block).toMatch(/canReadAppointment/);
    expect(block.indexOf('canReadAppointment')).toBeLessThan(block.indexOf('res.json'));
  });

  it('pharmacy GET /prescriptions/:id is ownership-gated', () => {
    const block = routeBlock('../../src/routes/pharmacy.js', "router.get('/prescriptions/:id'");
    expect(block).toMatch(/authorizeObject/);
  });

  it('pharmacy staff-only order mutations are tenant-only (no ownership bypass)', () => {
    const block = routeBlock('../../src/routes/pharmacy.js', "router.post('/orders/:id/forward'");
    expect(block).toMatch(/requireTenant: true/);
  });

  it('lab GET /orders/:id is ownership + tenant gated', () => {
    const block = routeBlock('../../src/routes/lab.js', "router.get('/orders/:id'");
    expect(block).toMatch(/authorizeObject/);
    expect(block).toMatch(/ownerField: 'patientId'/);
  });

  it('lab result entry requires the verifying role, not just any staff id', () => {
    const block = routeBlock('../../src/routes/lab.js', "router.put('/orders/:id/enter-result'");
    expect(block).toMatch(/authorizeObject/);
    expect(block).toMatch(/lab:enter_result/);
  });

  it('legal bookings go through the single assertBookingAccess guard', () => {
    const code = read('../../src/routes/lawyerBookings.js');
    expect(code).toMatch(/async function assertBookingAccess/);
    expect(code).toMatch(/booking\.userId\?\.toString\(\) === req\.user\._id\.toString\(\)/);
    // A non-participant foreign id must be denied, not served.
    expect(code).toMatch(/status: 403/);
  });

  it('assistant GET /:id denies non-participants without confirming existence', () => {
    const block = routeBlock('../../src/routes/assistantBookings.js', "router.get('/:id'");
    expect(block).toMatch(/protect/);
    const code = read('../../src/routes/assistantBookings.js');
    expect(code).toMatch(/You are not a participant in this booking/);
  });

  it('assistant vitals/tasks are assigned-assistant-only', () => {
    const code = read('../../src/routes/assistantBookings.js');
    expect(code).toMatch(/Only the assigned assistant can log vitals/);
    expect(code).toMatch(/Only the assigned assistant can update tasks/);
  });

  it('mental-health referrals are fail-closed through assertMentalHealthAccess', () => {
    const code = read('../../src/routes/mentalhealth.js');
    expect(code).toMatch(/assertMentalHealthAccess/);
    // Cross-tenant denial must not confirm existence.
    expect(code).toMatch(/status\(404\)/);
  });

  it('insurance GET /:id is owner + tenant gated', () => {
    const block = routeBlock('../../src/routes/insurance.js', "router.get('/:id'");
    expect(block).toMatch(/authorizeObject/);
    expect(block).toMatch(/insurance:read/);
  });

  it('insurance settlement amount is bounded by the claim (no foreign-amount write)', () => {
    const code = read('../../src/routes/insurance.js');
    expect(code).toMatch(/AMOUNT_EXCEEDS_CLAIM/);
    expect(code).toMatch(/toPaise/);
  });

  it('bulk export stays superadmin-only, row-capped and audited', () => {
    const block = routeBlock('../../src/routes/export.js', "router.get('/users'");
    expect(block).toMatch(/superadminOnly/);
    const code = read('../../src/routes/export.js');
    expect(code).toMatch(/EXPORT_ROW_CAP/);
    expect(code).toMatch(/bulk_export/);
  });
});

