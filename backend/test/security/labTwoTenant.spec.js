/**
 * LAB-M-01 — lab result/report two-tenant IDOR matrix + report-download auth.
 *
 * Seeded HTTP via mountApp('lab'): two facilities, one order each.
 *  - GET /orders list: patient sees own only; staff sees own tenant only;
 *    tenant-less staff 403 with no DB read.
 *  - GET /orders/:id: cross-tenant read is 404 (no existence oracle).
 *  - GET /bookings/:id/dispatch-report: tenant-less 403; cross-tenant 404.
 *  - GET /export: tenant-less 403; scoped admin query carries tenant + 5000 cap.
 */
import { jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const chain = (value) => {
  const q = {
    select: () => q, lean: () => q, populate: () => q, sort: () => q,
    skip: () => q, limit: (...a) => { q._limit = a[0]; return q; },
    then: (resolve) => Promise.resolve(value).then(resolve),
  };
  return q;
};

// NOTE: GET /orders applies applyTenantScope(fields:['facilityId']) to EVERYONE,
// so a patient list is {patientId: own} + {facilityId: shared/null} while a staff
// list is {hospitalId, facilityId: own tenant}. One row cannot serve both, so the
// seed carries a patient-created shared row (no facilityId) alongside tenant rows.
const LAB_ORDERS = [
  { _id: 'lab-h1', orderId: 'LAB-H1', patientId: 'pat-9', patientName: 'Aarav Sharma', hospitalId: 'H1', facilityId: 'F1', status: 'Completed' },
  { _id: 'lab-h2', orderId: 'LAB-H2', patientId: 'pat-2', patientName: 'Meera Nair', hospitalId: 'H2', facilityId: 'F2', status: 'Completed' },
  { _id: 'lab-h1p', orderId: 'LAB-H1P', patientId: 'pat-1', patientName: 'Aarav Sharma', hospitalId: 'H1', status: 'Completed' },
];

const matchesFilter = (doc, filter = {}) => Object.entries(filter).every(([key, want]) => {
  if (key === '$or') return want.some((sub) => matchesFilter(doc, sub));
  if (key === '$and') return want.every((sub) => matchesFilter(doc, sub));
  const got = doc[key];
  if (want !== null && typeof want === 'object' && !(want instanceof RegExp)) {
    // Mongo `$in: [null]` matches both explicit null and a missing key.
    if ('$in' in want) return want.$in.some((x) => (x == null ? got == null : String(x) === String(got)));
    return String(got) === String(want);
  }
  if (want instanceof RegExp) return typeof got === 'string' && want.test(got);
  return String(got) === String(want);
});

const labFind = jest.fn((filter = {}) => chain(LAB_ORDERS.filter((o) => matchesFilter(o, filter))));
const labFindById = jest.fn((id) => chain(LAB_ORDERS.find((o) => String(o._id) === String(id)) || null));

// Courier dispatch tasks keyed by booking, each carrying PHI (addresses + name).
const DISPATCH_TASKS = {
  'book-h1': { _id: 'task-h1', labBookingId: 'book-h1', hospitalId: 'H1', patientName: 'Aarav Sharma', pickupAddress: 'H1 pickup', dropAddress: 'patient home 1' },
  'book-h2': { _id: 'task-h2', labBookingId: 'book-h2', hospitalId: 'H2', patientName: 'Meera Nair', pickupAddress: 'H2 pickup', dropAddress: 'patient home 2' },
};
const deliveryFindOne = jest.fn((filter = {}) => chain(
  Object.values(DISPATCH_TASKS).find((t) => Object.entries(filter).every(([k, v]) => String(t[k]) === String(v))) || null,
));

jest.unstable_mockModule('../../src/models/LabOrder.js', () => ({
  default: {
    find: (...a) => labFind(...a),
    findById: (...a) => labFindById(...a),
    countDocuments: async () => 0,
  },
}));
jest.unstable_mockModule('../../src/models/PharmacyDelivery.js', () => ({
  default: { findOne: (...a) => deliveryFindOne(...a), find: () => chain([]) },
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: jest.fn(async () => {}) }));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({ createNotification: jest.fn(async () => ({})) }));
jest.unstable_mockModule('../../src/services/socketService.js', () => ({
  getIO: jest.fn(() => null), emitDeliveryStatus: jest.fn(),
}));

const { as } = await mountApp('lab', {});

const PAT1 = { id: 'pat-1', _id: 'pat-1', role: 'patient' };
const PAT2 = { id: 'pat-2', _id: 'pat-2', role: 'patient' };
const STAFF_H1 = { id: 's1', _id: 's1', role: 'hospital_admin', hospitalId: 'H1', facilityId: 'F1' };
const STAFF_H2 = { id: 's2', _id: 's2', role: 'hospital_admin', hospitalId: 'H2', facilityId: 'F2' };
const STAFF_NO_TENANT = { id: 's3', _id: 's3', role: 'hospital_admin' };

beforeEach(() => { labFind.mockClear(); labFindById.mockClear(); deliveryFindOne.mockClear(); });

describe('LAB-M-01 lab order two-tenant IDOR matrix (seeded HTTP)', () => {
  it('patient lists only their own order (never another tenant row)', async () => {
    const res = await as(PAT1).get('/orders');
    expect(res.status).toBe(200);
    expect(res.body.orders.map((o) => o._id)).toEqual(['lab-h1p']);
  });

  it('staff lists only their own tenant orders', async () => {
    const h1 = await as(STAFF_H1).get('/orders');
    expect(h1.status).toBe(200);
    expect(h1.body.orders.map((o) => o._id)).toEqual(['lab-h1']);

    const h2 = await as(STAFF_H2).get('/orders');
    expect(h2.status).toBe(200);
    expect(h2.body.orders.map((o) => o._id)).toEqual(['lab-h2']);
  });

  it('tenant-less staff list is 403 with no DB read', async () => {
    const res = await as(STAFF_NO_TENANT).get('/orders');
    expect(res.status).toBe(403);
    expect(labFind).not.toHaveBeenCalled();
  });

  it('cross-tenant single-order read is 404 (no oracle)', async () => {
    const cross = await as(STAFF_H1).get('/orders/lab-h2');
    expect(cross.status).toBe(404);
    expect(JSON.stringify(cross.body)).not.toContain('Meera');

    const own = await as(STAFF_H1).get('/orders/lab-h1');
    expect(own.status).toBe(200);
    expect(own.body._id).toBe('lab-h1');
  });

  it('foreign patient cannot read another patient order by id', async () => {
    const res = await as(PAT1).get('/orders/lab-h2');
    expect(res.status).toBe(404);
  });

  it('patient reads their own order', async () => {
    const res = await as(PAT2).get('/orders/lab-h2');
    expect(res.status).toBe(200);
    expect(res.body._id).toBe('lab-h2');
  });
});

describe('LAB-M-01 report-download authorization (seeded HTTP)', () => {
  it('tenant-less caller is 403 before any dispatch read', async () => {
    const res = await as(STAFF_NO_TENANT).get('/bookings/book-h1/dispatch-report');
    expect(res.status).toBe(403);
    expect(deliveryFindOne).not.toHaveBeenCalled();
  });

  it('cross-tenant dispatch download is 404, own-tenant succeeds', async () => {
    const cross = await as(STAFF_H1).get('/bookings/book-h2/dispatch-report');
    expect(cross.status).toBe(404);
    expect(JSON.stringify(cross.body)).not.toContain('patient home 2');

    const own = await as(STAFF_H1).get('/bookings/book-h1/dispatch-report');
    expect(own.status).toBe(200);
    expect(own.body.task._id).toBe('task-h1');
  });
});

describe('LAB-M-01 lab export scope + cap (seeded HTTP)', () => {
  it('tenant-less admin export is 403 with no DB read', async () => {
    const res = await as(STAFF_NO_TENANT).get('/export?format=json');
    expect(res.status).toBe(403);
    expect(labFind).not.toHaveBeenCalled();
  });

  it('scoped admin export carries the tenant predicate and the 5000 row cap', async () => {
    const res = await as(STAFF_H1).get('/export?format=json');
    expect(res.status).toBe(200);
    expect(res.body.cappedAt).toBe(5000);
    const filter = labFind.mock.calls[0][0];
    expect(JSON.stringify(filter)).toContain('H1');
    expect(JSON.stringify(filter)).not.toContain('H2');
  });
});
