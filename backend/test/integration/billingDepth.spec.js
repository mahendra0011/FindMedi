/**
 * File 22 P1-14: split collection, cancel-with-approval, series numbering.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const bills = [];
const approvals = [];

const { as } = await mountApp('billing', {
  '../../src/models/Billing.js': () => ({
    default: {
      create: async (doc) => {
        const row = { _id: `b${bills.length}`, payments: [], paid: 0, balance: doc.amount, status: 'Pending', ...doc, save: async function s() { return this; } };
        bills.push(row);
        return row;
      },
      findById: (id) => query(bills.find((b) => String(b._id) === String(id)) || null),
      findOne: (filter) => query(
        bills.find((b) => (filter?._id && String(b._id) === String(filter._id))
          || (filter?.invoiceId && (b.invoiceId === filter.invoiceId || String(b._id) === String(filter.invoiceId)))) || null,
      ),
    },
  }),
  '../../src/models/DiscountPolicy.js': () => ({ default: { findOne: () => query(null) } }),
  '../../src/models/ApprovalRequest.js': () => ({
    default: {
      findById: (id) => query(approvals.find((a) => String(a._id) === String(id)) || null),
      findOne: () => query(null),
      create: async (doc) => {
        const row = { _id: `ap${approvals.length}`, status: 'pending', ...doc, save: async function s() { return this; } };
        approvals.push(row);
        return row;
      },
    },
  }),
  '../../src/models/ApprovalPolicy.js': () => ({ default: { findOne: () => query(null) } }),
  '../../src/models/DoctorFee.js': () => ({
    default: { find: () => query([]), create: async (doc) => ({ _id: 'f1', ...doc }) },
  }),
  '../../src/models/InvoiceSeries.js': () => ({
    default: { findOneAndUpdate: async () => ({ next: 41 }) },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const biller = { _id: 'r1', id: 'r1', role: 'receptionist', hospitalId: 'h1' };

describe('P1-14 billing depth', () => {
  test('create assigns series number + computes overage', async () => {
    const res = await as(biller).post('/').send({
      patient: 'Ram', service: 'IPD', amount: 60000, packageCap: 50000, invoiceSeries: 'IPD',
    });
    expect(res.status).toBe(201);
    expect(res.body.invoiceId.startsWith('IPD/')).toBe(true);
    expect(res.body.invoiceId.endsWith('/00040')).toBe(true);
    expect(res.body.overage).toBe(10000);
  });

  test('collect splits across modes and derives status', async () => {
    const id = bills[0]._id;
    bills[0].balance = 1000;
    bills[0].amount = 1000;
    const res = await as(biller).post(`/${id}/collect`).send({
      payments: [{ mode: 'Cash', amount: 400 }, { mode: 'UPI', amount: 600, txnRef: 'upi1' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Paid');
    expect(res.body.balance).toBe(0);
  });

  test('over-collection fails closed', async () => {
    const c = await as(biller).post('/').send({ patient: 'Shyam', service: 'OPD', amount: 500 });
    const id = c.body._id || bills[bills.length - 1]._id;
    const last = bills[bills.length - 1];
    last.balance = 500;
    last.amount = 500;
    const res = await as(biller).post(`/${id}/collect`).send({ payments: [{ mode: 'Cash', amount: 600 }] });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OVER_COLLECTION');
  });

  test('cancel unpaid bill with reason works; paid bill needs approval', async () => {
    const c = await as(biller).post('/').send({ patient: 'Gita', service: 'OPD', amount: 300 });
    const id = (c.body._id || bills[bills.length - 1]._id);
    const r1 = await as(biller).post(`/${id}/cancel`).send({ reason: 'duplicate' });
    expect(r1.status).toBe(200);
    // paid bill → 409 + approval id
    const last = bills[bills.length - 1];
    last.status = 'Pending';
    last.paid = 300;
    const r2 = await as(biller).post(`/${id}/cancel`).send({ reason: 'charged twice' });
    expect(r2.status).toBe(409);
    expect(r2.body.code).toBe('NEEDS_APPROVAL');
  });

  test('doctor fee upsert', async () => {
    const res = await as(biller).post('/doctor-fees').send({ doctorId: '64b0000000000000000000d1', consultFee: 800 });
    expect(res.status).toBe(201);
  });
});
