/**
 * P2-16: behavioural deny/allow matrix over the REAL authorization middlewares.
 *
 * Coverage that already exists elsewhere and is NOT duplicated here:
 *   - checkPermissionMatrix.mjs  - every permission STRING is defined
 *   - check-authz-coverage.mjs   - every route carries an authorization tag
 *   - the HTTP harness           - substitutes authorize() on purpose, so an
 *                                  integration spec can only prove the guard is
 *                                  IN the chain, never how it decides.
 *
 * What nobody tested: the actual decision paths of the real middleware -
 * 401 vs 403, the superadmin bypass, any-of semantics, the platform-admin vs
 * tenant-admin split (AUTHZ-B-04), facility fail-closed (AUTHZ-B-01), the
 * role-alias canonicalisation, and the SHAPE of the 403 body (AUTHZ-B-03:
 * no permission matrix in the response).
 */
import { describe, it, expect } from '@jest/globals';
import { authorize, platformAdminOnly, sameFacilityStrict } from '../../src/middleware/authorize.js';

const run = (mw, req) => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(b) { this.body = b; return this; },
    setHeader() { return this; },
  };
  let nextCalled = false;
  mw(req, res, (err) => { if (err) throw err; nextCalled = true; });
  return { nextCalled, statusCode: res.statusCode, body: res.body };
};

const reqAs = (user, extra = {}) => ({ user, originalUrl: '/api/matrix-probe', ...extra });

describe('P2-16 authorize() deny/allow matrix', () => {
  it('401s an unauthenticated caller (not 403 - no session is not a permission answer)', () => {
    const r = run(authorize('insurance:write'), reqAs(undefined));
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it('bypasses for superadmin', () => {
    const r = run(authorize('insurance:write'), reqAs({ id: 'sa', role: 'superadmin' }));
    expect(r.nextCalled).toBe(true);
  });

  it('allows the role that holds the permission, denies roles that do not', () => {
    const allow = run(authorize('insurance:write'), reqAs({ id: 'a', role: 'hospital_admin' }));
    expect(allow.nextCalled).toBe(true);

    for (const role of ['patient', 'staff', 'doctor']) {
      const deny = run(authorize('insurance:write'), reqAs({ id: 'd', role }));
      expect(deny.nextCalled).toBe(false);
      expect(deny.statusCode).toBe(403);
    }
  });

  it('treats multiple permissions as ANY-OF', () => {
    const mw = authorize('insurance:write', 'billing:write');
    // hospital_admin holds both, patient holds neither.
    expect(run(mw, reqAs({ id: 'a', role: 'hospital_admin' })).nextCalled).toBe(true);
    expect(run(mw, reqAs({ id: 'p', role: 'patient' })).statusCode).toBe(403);

    const ownOrRead = authorize('insurance:write:own', 'insurance:write');
    // patient holds only the :own form - still an allow.
    expect(run(ownOrRead, reqAs({ id: 'p', role: 'patient' })).nextCalled).toBe(true);
  });

  it('keeps self-service `:own` permissions off other roles (patient can chat, admin cannot)', () => {
    expect(run(authorize('chat:write:own'), reqAs({ id: 'p', role: 'patient' })).nextCalled).toBe(true);
    expect(run(authorize('chat:write:own'), reqAs({ id: 'h', role: 'hospital_admin' })).statusCode).toBe(403);
  });

  it('canonicalises deprecated role aliases (counselor -> counsellor)', () => {
    const r = run(authorize('appointments:read'), reqAs({ id: 'c', role: 'counselor' }));
    expect(r.nextCalled).toBe(true);
  });

  it('403 body is generic - no required/role/matrix leakage (AUTHZ-B-03)', () => {
    const r = run(authorize('insurance:write', 'billing:write'), reqAs({ id: 'p', role: 'patient' }));
    expect(r.statusCode).toBe(403);
    expect(r.body).toEqual({ message: 'Insufficient permissions' });
    expect(r.body).not.toHaveProperty('required');
    expect(r.body).not.toHaveProperty('role');
  });
});

describe('P2-16 platformAdminOnly (AUTHZ-B-04)', () => {
  it('allows only the platform admin - a tenant admin is a deny', () => {
    expect(run(platformAdminOnly, reqAs({ id: 'sa', role: 'superadmin' })).nextCalled).toBe(true);
    expect(run(platformAdminOnly, reqAs({ id: 'ha', role: 'hospital_admin' })).statusCode).toBe(403);
    expect(run(platformAdminOnly, reqAs(undefined)).statusCode).toBe(401);
  });
});

describe('P2-16 sameFacilityStrict (AUTHZ-B-01)', () => {
  it('superadmin bypasses facility scoping', () => {
    expect(run(sameFacilityStrict, reqAs({ id: 'sa', role: 'superadmin' })).nextCalled).toBe(true);
  });

  it('denies an account with no linked facility', () => {
    const r = run(sameFacilityStrict, reqAs({ id: 'x', role: 'doctor', facilityId: undefined }));
    expect(r.statusCode).toBe(403);
    expect(r.body.message).toMatch(/No facility linked/);
  });

  it('denies when the target facilityId is missing (fail-closed, not fail-open)', () => {
    const r = run(sameFacilityStrict, reqAs({ id: 'x', role: 'doctor', facilityId: 'f1' }));
    expect(r.statusCode).toBe(403);
    expect(r.body.message).toMatch(/facilityId required/);
  });

  it('denies a cross-facility target and allows a matching one', () => {
    const deny = run(sameFacilityStrict, reqAs({ id: 'x', role: 'doctor', facilityId: 'f1' }, { body: { facilityId: 'f2' } }));
    expect(deny.statusCode).toBe(403);
    expect(deny.body.message).toMatch(/Cross-facility/);

    const allow = run(sameFacilityStrict, reqAs({ id: 'x', role: 'doctor', facilityId: 'f1' }, { body: { facilityId: 'f1' } }));
    expect(allow.nextCalled).toBe(true);
  });
});
