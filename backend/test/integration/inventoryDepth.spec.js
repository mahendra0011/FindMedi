/**
 * File 22 P1-18/19: stock audit gating, ABC-VED math, rate-contract check.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const inventory = [
  {
    _id: 'i1', itemName: 'Gloves', currentStock: 100, minStockLevel: 150, unitPrice: 10,
    ved: 'Vital', transactionHistory: [{ type: 'Issue', quantity: 500 }, { type: 'Issue', quantity: 200 }],
    save: async function s() { return this; },
  },
  {
    _id: 'i2', itemName: 'Gauze', currentStock: 400, minStockLevel: 50, unitPrice: 5,
    ved: 'Essential', transactionHistory: [{ type: 'Issue', quantity: 600 }],
    save: async function s() { return this; },
  },
];

// NOTE: one shared Inventory stub — unstable_mockModule is per-FILE, so a
// second registration would shadow findOne and break the audit route.
const inventoryStub = () => ({
  default: {
    find: (filter) => {
      if (filter?.$expr) return query([inventory[0]]);
      return query(inventory);
    },
    findOne: (filter) => query(inventory.find((r) => String(r._id) === String(filter._id)) || null),
    findById: (id) => query(inventory.find((r) => String(r._id) === String(id)) || null),
  },
});

const { as: asStores } = await mountApp('stores', {
  '../../src/models/Store.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/Indent.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/GRN.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/StockLedger.js': () => ({ default: { aggregate: async () => [] } }),
  '../../src/models/Inventory.js': inventoryStub,
  '../../src/models/Contract.js': () => ({
    default: {
      find: () => query([{ lines: [{ item: 'Gloves', rate: 8 }], enforceMax: true, counterparty: 'Acme' }]),
    },
  }),
  '../../src/models/ApprovalPolicy.js': () => ({ default: { findOne: () => query(null) } }),
  '../../src/models/ApprovalRequest.js': () => ({
    default: { findById: () => query(null), findOne: () => query(null), create: async (d) => ({ _id: 'apx', ...d }) },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const { as: asInv } = await mountApp('inventory', {
  '../../src/models/Inventory.js': inventoryStub,
  '../../src/models/Supplier.js': () => ({ default: { findById: () => query(null) } }),
  '../../src/models/PurchaseOrder.js': () => ({ default: { create: async (d) => ({ _id: 'po1', ...d, toObject: () => ({ _id: 'po1', ...d }) }) } }),
  '../../src/models/Contract.js': () => ({
    default: {
      find: () => query([{ lines: [{ item: 'Gloves', rate: 8 }], enforceMax: true, counterparty: 'Acme' }]),
    },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const mgr = { _id: 'm1', id: 'm1', role: 'hospital_admin', hospitalId: 'h1' };

describe('P1-18 inventory depth', () => {
  test('small audit diffs apply directly', async () => {
    const r = await asStores(mgr).post('/stock-audit').send({ items: [{ itemId: 'i1', counted: 105 }] });
    expect(r.status).toBe(200);
    expect(r.body.applied.length).toBe(1);
    expect(r.body.held.length).toBe(0);
    expect(inventory[0].currentStock).toBe(105);
  });

  test('large diffs are held for approval, not silently applied', async () => {
    const r = await asStores(mgr).post('/stock-audit').send({ items: [{ itemId: 'i1', counted: 500 }] });
    expect(r.status).toBe(200);
    expect(r.body.applied.length).toBe(0);
    expect(r.body.held.length).toBe(1);
    expect(r.body.held[0].approvalId).toBe('apx');
    expect(inventory[0].currentStock).toBe(105);
  });

  test('ABC-VED classifies by consumption value', async () => {
    const r = await asStores(mgr).get('/abc-ved');
    expect(r.status).toBe(200);
    const gloves = r.body.items.find((x) => x.itemName === 'Gloves');
    expect(gloves.abc).toBe('A');
    expect(gloves.ved).toBe('Vital');
  });

  test('enforced rate ceiling blocks the PO', async () => {
    const r = await asInv(mgr).post('/purchase-orders').send({
      supplierId: '64b0000000000000000000s1', supplierName: 'Acme',
      items: [{ itemName: 'Gloves', quantity: 100, unitPrice: 12 }],
    });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('RATE_CONTRACT_BLOCK');
  });
});
