/**
 * AUTHZ-M-01 migration parity: the 19 requireTenantOwnership routes (lab 7 +
 * pharmacy 12) now run on authorizeObject. This suite pins the MIGRATED
 * behaviour per model shape so a regression back to fail-open is caught here:
 *
 * - owned + tenant-carrying doc: owner in, stranger out, same-tenant staff in,
 *   cross-tenant staff out, tenant-less staff out;
 * - ownerless docs (Medicine / Offer / Delivery): pure tenant gate;
 * - requireTenant:true sites (order delete/forward/reject/refund): even the
 *   OWNER must be inside the tenant (staff-only documents).
 */
import { describe, it, expect, jest } from '@jest/globals';
import express from 'express';
import supertest from 'supertest';

const { authorizeObject, rolesWithPermission } = await import('../../src/middleware/authorize.js');

const LAB_STAFF = ['lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'hospital_admin'];
const PHARM_MANAGE = rolesWithPermission('pharmacy:manage');

const run = async ({ user, doc, opts }) => {
  const d = { ...doc, toObject: undefined };
  const plain = { ...doc };
  delete plain.toObject;
  const model = async () => ({ findById: async () => ({ ...plain, toObject: () => plain }) });
  const mw = authorizeObject({ model, read: true, ...opts });
  const app = express();
  app.get('/x', (req, res, next) => { req.user = user; return mw(req, res, next); }, (req, res) => res.json({ ok: true }));
  return supertest(app).get('/x');
};

const labOrder = (over = {}) => ({ _id: 'o1', patientId: 'p1', hospitalId: 'h1', facilityId: 'f1', ...over });
const LAB_OPTS = {
  ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'],
  actorRoles: [...LAB_STAFF], write: true,
};

const patient = { id: 'p1', _id: 'p1', role: 'patient' };
const stranger = { id: 's9', _id: 's9', role: 'patient' };
const labAdminH1 = { id: 'a1', _id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };
const labAdminH2 = { id: 'a2', _id: 'a2', role: 'hospital_admin', hospitalId: 'h2' };
const tenantlessAdmin = { id: 'a3', _id: 'a3', role: 'hospital_admin' };

describe('AUTHZ-M-01 migration parity · LabOrder (owned, dual-tenant)', () => {
  it('owner reads own order', async () => {
    expect((await run({ user: patient, doc: labOrder(), opts: LAB_OPTS })).status).toBe(200);
  });
  it('stranger patient is denied', async () => {
    expect((await run({ user: stranger, doc: labOrder(), opts: LAB_OPTS })).status).toBe(404);
  });
  it('same-tenant staff is allowed', async () => {
    expect((await run({ user: labAdminH1, doc: labOrder(), opts: LAB_OPTS })).status).toBe(200);
  });
  it('cross-tenant staff is denied', async () => {
    expect((await run({ user: labAdminH2, doc: labOrder(), opts: LAB_OPTS })).status).toBe(404);
  });
  it('tenant-less staff is denied (the old fail-open)', async () => {
    expect((await run({ user: tenantlessAdmin, doc: labOrder(), opts: LAB_OPTS })).status).toBe(404);
  });
  it('overlap on EITHER field is enough', async () => {
    const user = { id: 't1', _id: 't1', role: 'lab_technician', facilityId: 'f1' };
    expect((await run({ user, doc: labOrder(), opts: LAB_OPTS })).status).toBe(200);
  });
});

describe('AUTHZ-M-01 migration parity · Medicine (ownerless: pure tenant gate)', () => {
  const med = { _id: 'm1', hospitalId: 'h1', facilityId: 'f1' };
  const opts = {
    ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'],
    actorRoles: PHARM_MANAGE, write: true,
  };
  it('same-tenant manager allowed', async () => {
    expect((await run({ user: labAdminH1, doc: med, opts })).status).toBe(200);
  });
  it('tenant-less manager denied', async () => {
    expect((await run({ user: tenantlessAdmin, doc: med, opts })).status).toBe(404);
  });
  it('cross-tenant manager denied', async () => {
    expect((await run({ user: labAdminH2, doc: med, opts })).status).toBe(404);
  });
});

describe('AUTHZ-M-01 migration parity · requireTenant sites (order refund: owner must be in-tenant)', () => {
  const order = { _id: 'po1', patientId: 'p1', hospitalId: 'h1', facilityId: 'f1' };
  const opts = {
    ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'],
    actorRoles: PHARM_MANAGE, requireTenant: true, write: true,
  };
  it('same-tenant manager allowed', async () => {
    expect((await run({ user: labAdminH1, doc: order, opts })).status).toBe(200);
  });
  it('tenant-less OWNER is denied (staff-only document)', async () => {
    expect((await run({ user: patient, doc: order, opts })).status).toBe(404);
  });
  it('tenant-less manager denied', async () => {
    expect((await run({ user: tenantlessAdmin, doc: order, opts })).status).toBe(404);
  });
});
