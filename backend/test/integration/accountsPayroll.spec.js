/**
 * File 22 P1-16/17: CoA seed idempotency, vendor 3-way match, loan recovery.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const accounts = [];
const vendorBills = [];
const loans = [{ _id: 'l1', principal: 10000, recovered: 0, emi: 2000, status: 'Open', save: async function s() { return this; } }];

const { as: asFin } = await mountApp('finance', {
  '../../src/models/Account.js': () => ({
    default: {
      find: () => query(accounts),
      findOneAndUpdate: async () => ({ _id: 'a1' }),
      countDocuments: async () => accounts.length + 15,
    },
    COA_SEED: Array.from({ length: 15 }, (_, i) => [`${1000 + i}`, `Seed ${i}`, 'Asset', false]),
  }),
  '../../src/models/VendorBill.js': () => ({
    default: {
      find: () => query(vendorBills),
      findById: (id) => query(vendorBills.find((b) => String(b._id) === String(id)) || null),
      create: async (doc) => {
        const row = { _id: `vb${vendorBills.length}`, status: 'Draft', ...doc, save: async function s() { return this; } };
        vendorBills.push(row);
        return row;
      },
    },
  }),
  '../../src/models/LedgerEntry.js': () => ({ default: { insertMany: async () => [], find: () => query([]) } }),
  '../../src/models/Billing.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const { as: asStaff } = await mountApp('staff', {
  '../../src/models/Staff.js': () => ({ default: { find: () => query([]), findById: () => query(null) } }),
  '../../src/models/Payslip.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/LoanAdvance.js': () => ({
    default: {
      find: () => query(loans),
      findById: (id) => query(loans.find((l) => String(l._id) === String(id)) || null),
      create: async (doc) => {
        const row = { _id: 'l9', recovered: 0, status: 'Open', ...doc, save: async function s() { return this; } };
        loans.push(row);
        return row;
      },
    },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };

describe('P1-16 accounts', () => {
  test('CoA seed is idempotent and counted', async () => {
    const r = await asFin(admin).post('/accounts/seed').send({});
    expect(r.status).toBe(201);
    expect(r.body.accounts).toBeGreaterThanOrEqual(15);
  });

  test('vendor bill computes 3-way match (Short)', async () => {
    const r = await asFin(admin).post('/vendor-bills').send({
      supplierId: '64b0000000000000000000s1', billNo: 'VB-1',
      lines: [{ item: 'Gloves', poQty: 100, grnQty: 100, billQty: 80, rate: 10, gstRate: 12 }],
    });
    expect(r.status).toBe(201);
    expect(r.body.matchStatus).toBe('Short');
    expect(r.body.subTotal).toBe(800);
    expect(r.body.grandTotal).toBe(896);
  });

  test('unmatched bill cannot post', async () => {
    const r = await asFin(admin).post('/vendor-bills').send({
      supplierId: '64b0000000000000000000s1', billNo: 'VB-2',
      lines: [{ item: 'X', poQty: 0, grnQty: 0, billQty: 0, rate: 10 }],
    });
    expect(r.status).toBe(201);
    expect(r.body.matchStatus).toBe('Unmatched');
    const p = await asFin(admin).post(`/vendor-bills/${r.body.id}/post`).send({});
    expect(p.status).toBe(409);
    expect(p.body.code).toBe('MATCH_FAILED');
  });
});

describe('P1-17 loans', () => {
  test('recovery closes at principal', async () => {
    const r = await asStaff(admin).post('/loans/l1/recover').send({ amount: 10000 });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('Closed');
    expect(r.body.recovered).toBe(10000);
  });
});
