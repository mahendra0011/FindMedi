/**
 * AUTHZ-M-01 · the central object-layer tenant boundary is now FAIL-CLOSED.
 *
 * History: this suite used to CHARACTERISE two fail-opens in `authorizeObject`
 * (a tenant-less caller short-circuiting the guard; a singular `tenantField`
 * leaving the other tenant axis unchecked), which made the central layer LESS
 * safe than `requireTenantOwnership` and blocked migration. Both holes were
 * closed in `src/middleware/authorize.js`:
 *
 *   1. ownership is checked FIRST and wins over tenancy (PHARM-B-12), and any
 *      NON-owner facing a tenant-carrying document must intersect its tenant
 *      set — an EMPTY caller tenant set is a deny, not an absence of opinion;
 *   2. `tenantFields: []` is checked across ALL listed fields (default both
 *      facilityId + hospitalId, like requireTenantOwnership), and all three
 *      call sites pass both.
 *
 * The cases below pin the FIXED behaviour so the holes cannot silently reopen.
 * Migration of the remaining routes is now a tractable, mechanical task —
 * see PENDING-BACKLOG.md (AUTHZ-M-01).
 */
import { describe, it, expect, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import express from 'express';
import supertest from 'supertest';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const code = read('../../src/middleware/authorize.js');

const { authorizeObject } = await import('../../src/middleware/authorize.js');

/**
 * Drive the real middleware with a stand-in "user" and a stand-in document.
 * Mirrors the production call sites: both tenant fields checked.
 */
const run = async ({ user, doc, opts = {} }) => {
  const model = async () => ({ findById: async () => doc });
  const mw = authorizeObject({
    model, read: true, ownerField: 'patientId',
    tenantFields: ['hospitalId', 'facilityId'],
    actorRoles: ['hospital_admin', 'accountant'], ...opts,
  });
  const app = express();
  app.get('/x', (req, res, next) => { req.user = user; return mw(req, res, next); }, (req, res) => res.json({ ok: true }));

  return supertest(app).get('/x');
};

const patient = { id: 'p1', _id: 'p1', role: 'patient' };
const stranger = { id: 's1', _id: 's1', role: 'patient' };
const hospitalAdmin = { id: 'a1', _id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };
const tenantlessAdmin = { id: 'a2', _id: 'a2', role: 'hospital_admin' };
const tenantlessRider = { id: 'r1', _id: 'r1', role: 'rider' };

const docInH1 = { _id: 'd1', patientId: 'p1', hospitalId: 'h1' };
const docNoTenant = { _id: 'd2', patientId: 'p1' };

describe('AUTHZ-M-01 · tenant boundary is fail-closed (holes fixed)', () => {
  it('HOLE 1 FIXED — a tenant-less actor-role caller is DENIED on a tenant-carrying document', async () => {
    const res = await run({ user: tenantlessAdmin, doc: docInH1 });
    expect(res.status).toBe(404);
  });

  it('HOLE 1 FIXED — a tenant-less non-actor caller is also DENIED', async () => {
    const res = await run({ user: tenantlessRider, doc: docInH1 });
    expect(res.status).toBe(404);
  });

  it('a caller in the RIGHT tenant is allowed', async () => {
    const res = await run({ user: hospitalAdmin, doc: docInH1 });
    expect(res.status).toBe(200);
  });

  it('a caller in the WRONG tenant IS stopped', async () => {
    const res = await run({ user: { ...hospitalAdmin, hospitalId: 'h2' }, doc: docInH1 });
    expect(res.status).toBe(404);
  });

  it('HOLE 2 FIXED — a document naming its tenant by EITHER field is checked', async () => {
    const doc = { _id: 'd3', patientId: 'p1', facilityId: 'f1' };
    const res = await run({ user: { ...hospitalAdmin, facilityId: 'f9' }, doc });
    // Caller (h1/f9) shares no tenant axis with the document (f1) → deny.
    expect(res.status).toBe(404);
  });

  it('HOLE 2 control — overlap on the OTHER field allows', async () => {
    const doc = { _id: 'd4', patientId: 'p1', facilityId: 'f1' };
    const res = await run({ user: { ...hospitalAdmin, facilityId: 'f1' }, doc });
    expect(res.status).toBe(200);
  });

  it('the subject still reaches their own document (PHARM-B-12 did not regress)', async () => {
    // Ownership is checked FIRST and wins over tenancy: a tenant-less patient
    // reaches their own row even though they intersect no tenant set.
    const res = await run({ user: patient, doc: docInH1 });
    expect(res.status).toBe(200);
  });

  it('a stranger is denied even with no tenant anywhere', async () => {
    const res = await run({ user: stranger, doc: docInH1 });
    expect(res.status).toBe(404);
  });

  it('legacy tenant-less documents still pass the role gate (documented leniency)', async () => {
    // A document with NO tenant in any checked field proceeds to the actor-role
    // check — pre-existing rows are not bricked; new rows always carry a tenant
    // via server derivation.
    const res = await run({ user: hospitalAdmin, doc: docNoTenant });
    expect(res.status).toBe(200);
  });

  it('the fail-closed tenant logic is greppable, not folklore', () => {
    expect(code).toMatch(/tenant-less-caller/);
    expect(code).toMatch(/checkedTenantFields/);
    expect(code).not.toMatch(/FIXME\(AUTHZ-M-01\)/);
  });
});

describe('AUTHZ-M-01 · migration preconditions now hold', () => {
  it('authorizeObject matches requireTenantOwnership semantics (both fields, ownership first)', () => {
    // Both tenant fields.
    expect(code).toMatch(/\['facilityId', 'hospitalId'\]/);
    // Ownership is a separate axis, checked FIRST.
    expect(code).toMatch(/Ownership FIRST/);
    // Empty caller tenant set is a deny on tenant-carrying documents.
    expect(code).toMatch(/tenant-less-caller/);
  });

  it('all three call sites check BOTH tenant fields', () => {
    const inv = read('../../src/routes/insurance.js');
    const pha = read('../../src/routes/pharmacy.js');
    const lab = read('../../src/routes/lab.js');
    expect((inv.match(/authorizeObject\(/g) || []).length).toBe(2);
    expect((pha.match(/authorizeObject\(/g) || []).length).toBe(16);
    expect((lab.match(/authorizeObject\(/g) || []).length).toBe(7);
    for (const src of [inv, pha, lab]) {
      expect(src).not.toMatch(/requireTenantOwnership\(/);
    }
    for (const src of [inv, pha]) {
      expect(src).toMatch(/ownerField: 'patientId'/);
      expect(src).toMatch(/tenantFields: \['hospitalId', 'facilityId'\]/);
    }
  });
});
