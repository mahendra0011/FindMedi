import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const approvalFindById = jestApi.fn();
const approvalCreate = jestApi.fn();
const discountPolicyFindOne = jestApi.fn();
const expenseFindById = jestApi.fn();
const inventoryFindById = jestApi.fn();
const poFindById = jestApi.fn();
const billingCreate = jestApi.fn();

const models = {
  '../../src/models/ApprovalRequest.js': () => ({
    default: {
      findById: (...a) => approvalFindById(...a),
      findOne: () => query(null),
      find: () => query([]),
      create: (...a) => approvalCreate(...a),
      updateMany: async () => ({ modifiedCount: 0 }),
    },
  }),
  '../../src/models/ApprovalPolicy.js': () => ({ default: { findOne: () => query(null), find: () => query([]) } }),
  '../../src/models/Delegation.js': () => ({ default: { findOne: () => query(null), find: () => query([]) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
  '../../src/models/DiscountPolicy.js': () => ({ default: { findOne: (...a) => discountPolicyFindOne(...a) } }),
  '../../src/models/Expense.js': () => ({
    default: { findById: (...a) => expenseFindById(...a), create: async (d) => ({ _id: 'e-new', ...d }) },
  }),
  '../../src/models/LedgerEntry.js': () => ({ default: { insertMany: async () => [], find: () => query([]) } }),
  '../../src/models/Inventory.js': () => ({
    default: { findById: (...a) => inventoryFindById(...a), find: () => query([]), findOne: () => query(null) },
  }),
  '../../src/models/PurchaseOrder.js': () => ({
    default: {
      findById: (...a) => poFindById(...a),
      create: async (d) => ({ _id: 'po-new', ...d, toObject() { return { _id: 'po-new', ...d }; } }),
      find: () => query([]),
    },
  }),
  '../../src/models/Supplier.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/Notification.js': () => ({ default: { create: async () => ({}), find: () => query([]) } }),
  '../../src/models/Billing.js': () => ({
    default: {
      create: (...a) => billingCreate(...a),
      findById: () => query(null),
      find: () => query([]),
      aggregate: async () => [],
    },
  }),
  '../../src/models/ServicePrice.js': () => ({ default: { find: () => query([]), findOne: () => query(null) } }),
  '../../src/models/CreditNote.js': () => ({ default: { create: async (d) => ({ _id: 'cn1', ...d }), findById: () => query(null) } }),
  '../../src/models/CashCounter.js': () => ({ default: { create: async (d) => ({ _id: 'cc1', ...d }), find: () => query([]) } }),
  '../../src/models/CashShift.js': () => ({
    default: { findOne: () => query(null), findById: () => query(null), create: async (d) => ({ _id: 'cs1', ...d }) },
  }),
};

const { as: asFin } = await mountApp('finance', models);
const { as: asInv } = await mountApp('inventory');
const { as: asBill } = await mountApp('billing');
const { as: asAppr } = await mountApp('approvals');

const adminA = { _id: 'adminA', id: 'adminA', role: 'hospital_admin', hospitalId: 'h1' };
const adminB = { _id: 'adminB', id: 'adminB', role: 'hospital_admin', hospitalId: 'h1' };
const biller = { _id: 'recept1', id: 'recept1', role: 'receptionist', hospitalId: 'h1' };

const approvedRequest = (policyKey, amount, id) => ({
  _id: id, policyKey, status: 'approved', amount, hospitalId: 'h1', consumedAt: null,
  save: async function save() { return this; },
});

const pendingRequest = (requestedBy) => ({
  _id: 'ap1', status: 'pending', requestedBy, policyKey: 'billing-discount', amount: 1000,
  steps: [{ step: 0, role: 'hospital_admin', status: 'pending' }],
  save: async function save() {
    if (!this.steps.some((s) => s.status === 'pending')) this.status = 'approved';
    return this;
  },
});

const stockItem = () => ({
  _id: 'i1', itemName: 'Gloves', currentStock: 100, hospitalId: 'h1', transactionHistory: [],
  save: async function save() { return this; },
});

describe('discount authority (P0-1)', () => {
  test('15% discount check is refused for a role with no discount policy', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query(null));
    const r = await asFin(biller).post('/discounts/check').send({ percent: 15 });
    expect(r.status).toBe(200);
    expect(r.body.allowed).toBe(false);
    expect(r.body.approverRole).toBe('hospital_admin');
  });

  test('15% discount check passes when the role policy grants 20%', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query({ role: 'receptionist', maxPercent: 20, requiresReason: true }));
    const r = await asFin(biller).post('/discounts/check').send({ percent: 15 });
    expect(r.status).toBe(200);
    expect(r.body.allowed).toBe(true);
  });

  test('15% discount bill without approval is rejected 409 NEEDS_APPROVAL', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query(null));
    approvalCreate.mockReset().mockResolvedValue({ _id: 'needAppr' });
    billingCreate.mockReset();
    const r = await asBill(biller).post('/').send({ patient: 'Ram', service: 'OPD', amount: 1000, discount: 150 });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('NEEDS_APPROVAL');
    expect(r.body.approvalId).toBe('needAppr');
    expect(billingCreate).not.toHaveBeenCalled();
  });

  test('5% discount bill under the default 10% limit needs no approval', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query(null));
    approvalCreate.mockReset().mockResolvedValue({ _id: 'unused' });
    billingCreate.mockReset().mockResolvedValue({ _id: 'b1', invoiceId: 'INV-1' });
    const r = await asBill(biller).post('/').send({ patient: 'Ram', service: 'OPD', amount: 1000, discount: 50 });
    expect(r.status).toBe(201);
    expect(approvalCreate).not.toHaveBeenCalled();
  });
});

describe('self-approval block (P0-1)', () => {
  test('requester deciding own approval request gets 403 SELF_APPROVAL', async () => {
    approvalFindById.mockReset().mockResolvedValue(pendingRequest('adminA'));
    const r = await asAppr(adminA).post('/requests/ap1/decide').send({ decision: 'approved' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('SELF_APPROVAL');
  });

  test('a different admin decides the same request', async () => {
    approvalFindById.mockReset().mockResolvedValue(pendingRequest('adminA'));
    const r = await asAppr(adminB).post('/requests/ap1/decide').send({ decision: 'approved' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('approved');
  });

  test('expense claimant cannot approve own expense', async () => {
    expenseFindById.mockReset().mockResolvedValue({
      _id: 'e-self', amount: 5000, category: 'Supplies', hospitalId: 'h1',
      createdBy: 'adminA', status: 'Pending', save: async function save() { return this; },
    });
    const r = await asFin(adminA).post('/expenses/e-self/approve').send({});
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('SELF_APPROVAL');
  });

  test('purchase-order creator cannot approve own PO', async () => {
    poFindById.mockReset().mockResolvedValue({
      _id: 'po-self', poNumber: 'PO-SELF', grandTotal: 20000, hospitalId: 'h1',
      createdBy: 'adminA', status: 'Draft', save: async function save() { return this; },
    });
    const r = await asInv(adminA).put('/purchase-orders/po-self/status').send({ status: 'Approved' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('SELF_APPROVAL');
  });
});

describe('purchase-order threshold (P0-1)', () => {
  const bigPo = () => ({
    _id: 'po1', poNumber: 'PO-1', grandTotal: 30000, hospitalId: 'h1',
    createdBy: 'officer1', status: 'Draft', save: async function save() { return this; },
  });

  test('above threshold without approval is held 409 NEEDS_APPROVAL', async () => {
    poFindById.mockReset().mockResolvedValue(bigPo());
    approvalCreate.mockReset().mockResolvedValue({ _id: 'apPO' });
    const r = await asInv(adminB).put('/purchase-orders/po1/status').send({ status: 'Approved' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('NEEDS_APPROVAL');
    expect(r.body.approvalId).toBe('apPO');
    expect(r.body.approverRoles).toEqual(['hospital_admin']);
  });

  test('above threshold with a consumed approval proceeds', async () => {
    const po = bigPo();
    poFindById.mockReset().mockResolvedValue(po);
    const appr = approvedRequest('purchase-order', 30000, 'apPO');
    approvalFindById.mockReset().mockResolvedValue(appr);
    const r = await asInv(adminB).put('/purchase-orders/po1/status').send({ status: 'Approved', approvalId: 'apPO' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('Approved');
    expect(appr.consumedAt).not.toBeNull();
  });

  test('replaying the same PO approval fails closed', async () => {
    poFindById.mockReset().mockResolvedValue(bigPo());
    approvalFindById.mockReset().mockResolvedValue({
      ...approvedRequest('purchase-order', 30000, 'apPO'), consumedAt: new Date(),
    });
    const r = await asInv(adminB).put('/purchase-orders/po1/status').send({ status: 'Approved', approvalId: 'apPO' });
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('APPROVAL_REPLAY');
  });

  test('below threshold approves without any approval', async () => {
    poFindById.mockReset().mockResolvedValue({ ...bigPo(), grandTotal: 20000 });
    approvalCreate.mockReset().mockResolvedValue({ _id: 'unused' });
    const r = await asInv(adminB).put('/purchase-orders/po1/status').send({ status: 'Approved' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('Approved');
    expect(approvalCreate).not.toHaveBeenCalled();
  });
});

describe('stock-adjust threshold (P0-1)', () => {
  test('manual adjust above the limit is held 409 NEEDS_APPROVAL', async () => {
    const item = stockItem();
    inventoryFindById.mockReset().mockResolvedValue(item);
    approvalCreate.mockReset().mockResolvedValue({ _id: 'apSA' });
    const r = await asInv(adminB).put('/items/i1/stock').send({ quantity: 250, type: 'adjust' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('NEEDS_APPROVAL');
    expect(r.body.approvalId).toBe('apSA');
    expect(item.currentStock).toBe(100);
  });

  test('adjust above the limit with a consumed approval proceeds', async () => {
    const item = stockItem();
    inventoryFindById.mockReset().mockResolvedValue(item);
    const appr = approvedRequest('stock-adjust', 250, 'apSA');
    approvalFindById.mockReset().mockResolvedValue(appr);
    const r = await asInv(adminB).put('/items/i1/stock').send({ quantity: 250, type: 'adjust', approvalId: 'apSA' });
    expect(r.status).toBe(200);
    expect(item.currentStock).toBe(250);
    expect(item.transactionHistory.at(-1).type).toBe('Adjustment');
    expect(appr.consumedAt).not.toBeNull();
  });

  test('small deduct below the limit needs no approval', async () => {
    const item = stockItem();
    item.currentStock = 250;
    inventoryFindById.mockReset().mockResolvedValue(item);
    approvalCreate.mockReset().mockResolvedValue({ _id: 'unused' });
    const r = await asInv(adminB).put('/items/i1/stock').send({ quantity: 20, type: 'deduct' });
    expect(r.status).toBe(200);
    expect(item.currentStock).toBe(230);
    expect(approvalCreate).not.toHaveBeenCalled();
  });
});

describe('expense threshold (P0-1)', () => {
  const bigExpense = () => ({
    _id: 'e1', amount: 15000, category: 'Supplies', hospitalId: 'h1',
    createdBy: 'staff1', status: 'Pending', save: async function save() { return this; },
  });

  test('above threshold without approval is held 409 NEEDS_APPROVAL', async () => {
    expenseFindById.mockReset().mockResolvedValue(bigExpense());
    approvalCreate.mockReset().mockResolvedValue({ _id: 'apEX' });
    const r = await asFin(adminB).post('/expenses/e1/approve').send({});
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('NEEDS_APPROVAL');
    expect(r.body.approvalId).toBe('apEX');
  });

  test('above threshold with a consumed approval proceeds', async () => {
    const e = bigExpense();
    expenseFindById.mockReset().mockResolvedValue(e);
    const appr = approvedRequest('expense', 15000, 'apEX');
    approvalFindById.mockReset().mockResolvedValue(appr);
    const r = await asFin(adminB).post('/expenses/e1/approve').send({ approvalId: 'apEX' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('Approved');
    expect(e.approvedBy).toBe('adminB');
    expect(appr.consumedAt).not.toBeNull();
  });

  test('below threshold approves without any approval', async () => {
    expenseFindById.mockReset().mockResolvedValue({ ...bigExpense(), amount: 5000 });
    approvalCreate.mockReset().mockResolvedValue({ _id: 'unused' });
    const r = await asFin(adminB).post('/expenses/e1/approve').send({});
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('Approved');
    expect(approvalCreate).not.toHaveBeenCalled();
  });
});
