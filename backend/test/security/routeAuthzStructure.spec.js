/**
 * Static ordering/scope assertions for guards a mounted-route test cannot
 * easily reach (PDF/stream responses, helper modules imported dynamically).
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('AUTHZ · assistant booking receipt + broadcast-fallback are guarded', () => {
  const code = read('../../src/routes/assistantBookings.js');

  it('guards the receipt, which embeds patient name/phone/email and fees', () => {
    const at = code.indexOf("router.get('/:id/receipt'");
    const seg = code.slice(at, code.indexOf('router.', at + 10));
    expect(seg).toMatch(/assertAssistantBookingAccess/);
    expect(seg).toMatch(/denyAssistantBooking/);
  });

  it('guards the broadcast fallback, which REWRITES the booking', () => {
    const at = code.indexOf("router.post('/:id/broadcast-fallback'");
    const head = code.slice(at, at + 1200);
    expect(head).toMatch(/assertAssistantBookingAccess/);
    // The guard must run BEFORE the mutation, not after it.
    expect(head.indexOf('assertAssistantBookingAccess')).toBeLessThan(
      head.indexOf('booking.targetAssistantOnly = false')
    );
  });

  it('denies with 404 rather than 403, to avoid an existence oracle', () => {
    const guard = read('../../src/middleware/assistantBookingAccess.js');
    expect(guard).toMatch(/res\.status\(404\)\.json\(\{ message: 'Booking not found' \}\)/);
  });

  it('fails closed for a staff caller whose tenant cannot be determined', () => {
    // "Cannot determine the tenant" must not read as "allow" — the exact
    // fail-open this module exists to prevent.
    const guard = read('../../src/middleware/assistantBookingAccess.js');
    expect(guard).toMatch(
      /if \(callerTenant && bookingTenant && String\(callerTenant\) === String\(bookingTenant\)\)/
    );
  });
});

describe('AUTHZ · lab dispatch-report is tenant-scoped', () => {
  const code = read('../../src/routes/lab.js');
  const seg = () => {
    const at = code.indexOf("router.get('/bookings/:id/dispatch-report'");
    return code.slice(at, code.indexOf('router.', at + 10));
  };

  it('refuses a caller whose tenant cannot be determined', () => {
    expect(seg()).toMatch(/if \(!callerTenant && req\.user\.role !== 'superadmin'\)/);
  });

  it('constrains the query to the caller hospital', () => {
    expect(seg()).toMatch(/filter\.hospitalId = callerTenant/);
  });

  it('404s rather than returning a null task for another tenant', () => {
    expect(seg()).toMatch(/if \(!task\) return res\.status\(404\)/);
  });
});

describe('AUTHZ · triage recognises applyTenantScope as a real guard', () => {
  it('otherwise ten already-guarded pharmacy routes were flagged', () => {
    // The pattern moved to the shared parser when the two authz tools were
    // unified; asserting on the triage script alone would have kept passing
    // while the actual list of guards lived somewhere else entirely.
    const scan = read('../../scripts/lib/routeScan.mjs');
    const triage = read('../../scripts/triage-authz-gaps.mjs');
    expect(scan).toMatch(/applyTenantScope/);
    expect(triage).not.toMatch(/^const HANDLER_GUARDS/m);

    // Exact count, not a `> N` guess: a loose bound would keep passing even if
    // the helper were renamed and every call site silently stopped matching.
    const uses = (read('../../src/routes/pharmacy.js').match(/applyTenantScope\(/g) || []).length;
    expect(uses).toBe(10);
  });
});

describe('AUTHZ - bloodbank donor directory requires explicit opt-in', () => {
  const code = read('../../src/routes/bloodbank.js');
  const model = read('../../src/models/User.js');

  it('filters the donor search on isBloodDonor', () => {
    const at = code.indexOf("/donors/nearby-h3'");
    const seg = code.slice(at, code.indexOf('router.', at + 10));
    // The regression: the filter was bloodGroup + currentLocation only - two
    // fields a PATIENT record happens to carry - so it published name, blood
    // group and live GPS of any signed-in user with no consent and no opt-out.
    expect(seg).toMatch(/isBloodDonor:\s*true/);
  });

  it('no longer selects phone for donor candidates', () => {
    // It was fetched on every candidate and never returned.
    const at = code.indexOf("/donors/nearby-h3'");
    const seg = code.slice(at, code.indexOf('router.', at + 10));
    expect(seg).not.toMatch(/select\([^)]*\bphone\b/);
  });

  it('defaults the opt-in to false, so existing rows are not donors', () => {
    expect(model).toMatch(/isBloodDonor:\s*\{\s*type:\s*Boolean,\s*default:\s*false/);
  });

  it('offers a self-only, revocable opt-in so the feature stays reachable', () => {
    // Without this the guard would just make the directory permanently empty.
    const at = code.indexOf("/donor-opt-in'");
    const seg = code.slice(at, code.indexOf('router.', at + 10));
    expect(seg).toMatch(/req\.user\.id \?\? req\.user\._id/);
    expect(seg).toMatch(/isBloodDonor:\s*optIn/);
  });

  it('refuses to opt someone else in', () => {
    // The target id must come from the session, never from the body.
    const at = code.indexOf("/donor-opt-in'");
    const seg = code.slice(at, code.indexOf('router.', at + 10));
    expect(seg).not.toMatch(/req\.body\.(userId|patientId|_id)/);
  });
});
