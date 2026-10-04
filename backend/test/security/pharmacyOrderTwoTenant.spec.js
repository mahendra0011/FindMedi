/**
 * PHARM-B-13 + DL-B-08 + PHARMA-M-01 — pharmacy order list/search two-tenant IDOR.
 *
 * Seeded HTTP regression: two hospitals, duplicate patient display names, one
 * legacy row without patientId. Asserts via real HTTP (mountApp) that:
 *  - patient sees ONLY their own patientId rows (same-name legacy row excluded)
 *  - staff sees ONLY their own tenant rows
 *  - tenant-less staff and non-staff callers get 403 with no DB read
 */
import { jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

// Seeded orders: duplicate display name "Aarav Sharma" across tenants + legacy.
const ORDERS = [
  { _id: 'ord-h1-a', orderId: 'ORD-H1-A', patientId: 'pat-1', patientName: 'Aarav Sharma', hospitalId: 'H1', facilityId: 'F1', status: 'Pending' },
  { _id: 'ord-h1-legacy', orderId: 'ORD-H1-L', patientName: 'Aarav Sharma', hospitalId: 'H1', facilityId: 'F1', status: 'Pending' },
  { _id: 'ord-h2-a', orderId: 'ORD-H2-A', patientId: 'pat-2', patientName: 'Aarav Sharma', hospitalId: 'H2', facilityId: 'F2', status: 'Pending' },
  { _id: 'ord-h2-b', orderId: 'ORD-H2-B', patientId: 'pat-3', patientName: 'Meera Nair', hospitalId: 'H2', facilityId: 'F2', status: 'Confirmed' },
];

const matchesFilter = (doc, filter = {}) => Object.entries(filter).every(([key, want]) => {
  if (key === '$or') return want.some((sub) => matchesFilter(doc, sub));
  if (key === '$and') return want.every((sub) => matchesFilter(doc, sub));
  const got = doc[key];
  if (want !== null && typeof want === 'object' && !(want instanceof RegExp)) {
    if ('$in' in want) return want.$in.some((x) => String(x) === String(got));
    return String(got) === String(want);
  }
  if (want instanceof RegExp) return typeof got === 'string' && want.test(got);
  return String(got) === String(want);
});

const chainFor = (rows) => {
  const q = {
    sort: () => q, skip: () => q, limit: () => q, populate: () => q,
    then: (resolve) => Promise.resolve(rows).then(resolve),
  };
  return q;
};

const findMock = jest.fn((filter = {}) => chainFor(ORDERS.filter((o) => matchesFilter(o, filter))));
const countMock = jest.fn((filter = {}) => Promise.resolve(ORDERS.filter((o) => matchesFilter(o, filter)).length));

jest.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({
  default: { find: (...a) => findMock(...a), countDocuments: (...a) => countMock(...a) },
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: jest.fn(async () => {}) }));

const { as } = await mountApp('pharmacy', {});

const PAT1 = { id: 'pat-1', _id: 'pat-1', role: 'patient', name: 'Aarav Sharma' };
const PAT2 = { id: 'pat-2', _id: 'pat-2', role: 'patient', name: 'Aarav Sharma' };
const STAFF_H1 = { id: 's1', _id: 's1', role: 'pharmacist', hospitalId: 'H1', facilityId: 'F1' };
const STAFF_H2 = { id: 's2', _id: 's2', role: 'pharmacist', hospitalId: 'H2', facilityId: 'F2' };
const STAFF_NO_TENANT = { id: 's3', _id: 's3', role: 'pharmacist' };
const COURIER = { id: 'c1', _id: 'c1', role: 'delivery_boy' };

beforeEach(() => { findMock.mockClear(); countMock.mockClear(); });

describe('PHARM-B-13/DL-B-08 pharmacy order two-tenant IDOR (seeded HTTP)', () => {
  it('patient sees only their own patientId row, never the same-name legacy row', async () => {
    const res = await as(PAT1).get('/orders');
    expect(res.status).toBe(200);
    expect(res.body.orders.map((o) => o._id)).toEqual(['ord-h1-a']);
    // Server filter bound to exact id, not display name.
    expect(findMock).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'pat-1' }));
  });

  it('duplicate-name patient in the other tenant sees only their own row', async () => {
    const res = await as(PAT2).get('/orders');
    expect(res.status).toBe(200);
    expect(res.body.orders.map((o) => o._id)).toEqual(['ord-h2-a']);
  });

  it('staff sees only their own tenant rows', async () => {
    const h1 = await as(STAFF_H1).get('/orders');
    expect(h1.status).toBe(200);
    expect(h1.body.orders.map((o) => o._id).sort()).toEqual(['ord-h1-a', 'ord-h1-legacy']);
    expect(h1.body.orders.every((o) => o.hospitalId === 'H1')).toBe(true);

    const h2 = await as(STAFF_H2).get('/orders');
    expect(h2.status).toBe(200);
    expect(h2.body.orders.map((o) => o._id).sort()).toEqual(['ord-h2-a', 'ord-h2-b']);
    expect(h2.body.orders.every((o) => o.hospitalId === 'H2')).toBe(true);
  });

  it('staff search stays inside their tenant (no cross-tenant name match)', async () => {
    const res = await as(STAFF_H1).get('/orders?search=Aarav');
    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.orders.every((o) => o.hospitalId === 'H1')).toBe(true);
    expect(res.body.orders.map((o) => o._id)).not.toContain('ord-h2-a');
  });

  it('tenant-less staff is denied 403 before any DB read', async () => {
    const res = await as(STAFF_NO_TENANT).get('/orders');
    expect(res.status).toBe(403);
    expect(findMock).not.toHaveBeenCalled();
    expect(countMock).not.toHaveBeenCalled();
  });

  it('non-staff courier without tenant gets 403, not a platform-wide list', async () => {
    const res = await as(COURIER).get('/orders');
    expect(res.status).toBe(403);
    expect(findMock).not.toHaveBeenCalled();
  });

  it('route keeps the permission gate + fail-closed scope (source pin)', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../src/routes/pharmacy.js', import.meta.url), 'utf8');
    const start = src.indexOf("router.get('/orders'");
    const end = src.indexOf("router.post('/orders'", start);
    const route = src.slice(start, end);
    expect(route).toContain("authorize('pharmacy:manage', 'pharmacy:read', 'pharmacy:read:own')");
    expect(route).toContain('allowSharedRowsForNonStaff: false');
    expect(route).toContain('filter.patientId = req.user._id');
  });
});
