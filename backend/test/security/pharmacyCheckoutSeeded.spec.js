/**
 * PHARM-B-14 + PHARM-B-16 + PHARM-B-17 + PHARM-B-18 + PHARM-B-15 — seeded HTTP.
 *
 * One spec, real router (mountApp), mocked models/services only:
 *  - catalogue-derived totals: forged client total/price ignored, server total used
 *  - multi-store cart rejected 422 with no order insert
 *  - COD collect atomic: delivered+unpaid writes Payment+Billing in one
 *    transaction; premature collection 409 with no mutation
 *  - prescription tamper: forged verify token rejected, no PHI echoed
 *  - negative stock rejected, unavailable-refund never mutates the order
 */
import { jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const MED_ID = '507f1f77bcf86cd799439011';
const MED2_ID = '507f1f77bcf86cd799439014';
const FAC_ID = '507f1f77bcf86cd799439012';
const HOS_ID = '507f1f77bcf86cd799439013';

const chain = (value) => {
  const q = {
    select: () => q, lean: () => q, populate: () => q, sort: () => q,
    skip: () => q, limit: () => q,
    then: (resolve) => Promise.resolve(value).then(resolve),
  };
  return q;
};

const catalogue = [
  { _id: MED_ID, name: 'Paracetamol 500', sellingPrice: 100, currentStock: 10, facilityId: FAC_ID, hospitalId: HOS_ID, prescriptionReq: false },
  { _id: MED2_ID, name: 'Ibuprofen 200', sellingPrice: 50, currentStock: 10, facilityId: '507f1f77bcf86cd799439015', hospitalId: HOS_ID, prescriptionReq: false },
];

const medicineFind = jest.fn(() => chain(catalogue.filter((m) => m._id === MED_ID)));
const medicineFindById = jest.fn((id) => chain({ _id: id, hospitalId: 'H1', facilityId: 'F1', currentStock: 8 }));
const medicineFindOneAndUpdate = jest.fn(async () => null);
const facilityFindById = jest.fn(() => chain({ _id: FAC_ID, type: 'pharmacy', status: 'approved', details: { deliveryFee: 0 } }));
const orderCreate = jest.fn(async ([doc]) => [{ ...doc, _id: 'order-new', toObject: () => ({ ...doc, _id: 'order-new' }) }]);
const paymentCreate = jest.fn(async (docs) => docs);
const billingCreate = jest.fn(async (docs) => docs);
const reserveItems = jest.fn(async () => {});
const executeWithOutbox = jest.fn((fn) => fn({ id: 'sess-1' }));
const auditLog = jest.fn(async () => {});

// Orders DB for COD + refund paths.
const ordersDb = {
  'order-cod-ready': {
    _id: 'order-cod-ready', patientId: 'patient-1', patientName: 'COD Patient',
    hospitalId: 'H1', facilityId: 'H1', status: 'Delivered', paymentStatus: 'Unpaid',
    paymentMethod: 'COD', total: 250, items: [{ medicineName: 'Paracetamol 500', price: 100, qty: 2 }],
    deliveryFee: 0, platformFee: 5, gst: 10, discount: 0,
  },
  'order-cod-early': {
    _id: 'order-cod-early', patientId: 'patient-1', patientName: 'COD Patient',
    hospitalId: 'H1', facilityId: 'H1', status: 'Shipped', paymentStatus: 'Unpaid',
    paymentMethod: 'COD', total: 250, items: [{ medicineName: 'Paracetamol 500', price: 100, qty: 2 }],
  },
  'order-unpaid': {
    _id: 'order-unpaid', patientId: 'patient-1', hospitalId: 'H1', facilityId: 'H1',
    status: 'Pending', paymentStatus: 'Unpaid', refunded: false,
  },
  'order-paid': {
    _id: 'order-paid', patientId: 'patient-1', hospitalId: 'H1', facilityId: 'H1',
    status: 'Delivered', paymentStatus: 'Paid', refunded: false,
  },
};
const orderFindById = jest.fn((id) => chain(ordersDb[String(id)] || null));
const orderFindOneAndUpdate = jest.fn(async (filter, _update) => {
  const doc = ordersDb[String(filter._id)];
  if (!doc) return null;
  // COD CAS: only Delivered+Unpaid COD collects.
  if (filter.paymentMethod === 'COD' && (doc.status !== 'Delivered' || doc.paymentStatus !== 'Unpaid')) return null;
  return { ...doc, paymentStatus: 'Paid', inventoryReservationStatus: 'consumed' };
});

jest.unstable_mockModule('../../src/models/Medicine.js', () => ({
  default: {
    find: (...a) => medicineFind(...a),
    findById: (...a) => medicineFindById(...a),
    findOneAndUpdate: (...a) => medicineFindOneAndUpdate(...a),
  },
}));
jest.unstable_mockModule('../../src/models/Facility.js', () => ({
  default: { findById: (...a) => facilityFindById(...a) },
}));
jest.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({
  default: {
    create: (...a) => orderCreate(...a),
    findById: (...a) => orderFindById(...a),
    findOneAndUpdate: (...a) => orderFindOneAndUpdate(...a),
    find: () => chain([]),
    countDocuments: async () => 0,
  },
}));
jest.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { create: (...a) => paymentCreate(...a) },
}));
jest.unstable_mockModule('../../src/models/Billing.js', () => ({
  default: { create: (...a) => billingCreate(...a) },
}));
jest.unstable_mockModule('../../src/models/PlatformCoupon.js', () => ({
  default: { findOne: () => chain(null) },
}));
jest.unstable_mockModule('../../src/services/pharmacyInventoryService.js', () => ({
  PHARMACY_RESERVATION_TTL_MS: 900_000,
  reservePharmacyOrderItems: (...a) => reserveItems(...a),
  releasePharmacyOrderItems: jest.fn(async () => {}),
}));
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({
  executeWithOutbox: (...a) => executeWithOutbox(...a),
  writeOutboxEvent: jest.fn(),
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: (...a) => auditLog(...a) }));
jest.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));

const { as } = await mountApp('pharmacy', {});

const PATIENT = { id: 'patient-1', _id: 'patient-1', role: 'patient', name: 'Checkout Patient' };
const STAFF = { id: 'staff-1', _id: 'staff-1', role: 'hospital_admin', hospitalId: 'H1', facilityId: 'F1' };

const cart = (over = {}) => ({
  items: [{ medicineId: MED_ID, quantity: 2, storeId: FAC_ID }],
  deliveryMode: 'pickup',
  paymentMethod: 'upi',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  medicineFind.mockImplementation(() => chain(catalogue.filter((m) => m._id === MED_ID)));
  medicineFindById.mockImplementation((id) => chain({ _id: id, hospitalId: 'H1', facilityId: 'F1', currentStock: 8 }));
  facilityFindById.mockImplementation(() => chain({ _id: FAC_ID, type: 'pharmacy', status: 'approved', details: { deliveryFee: 0 } }));
  executeWithOutbox.mockImplementation((fn) => fn({ id: 'sess-1' }));
  reserveItems.mockResolvedValue(undefined);
  orderCreate.mockImplementation(async ([doc]) => [{ ...doc, _id: 'order-new', toObject: () => ({ ...doc, _id: 'order-new' }) }]);
});

describe('PHARM-B-14 catalogue-derived checkout (seeded HTTP)', () => {
  it('ignores forged client totals/prices and returns the server-priced total', async () => {
    const res = await as(PATIENT).post('/orders').send(cart({
      total: 1, subtotal: 1, discount: 9999, status: 'Paid', paymentStatus: 'Paid', patientId: 'victim',
    }));
    expect(res.status).toBe(201);
    expect(res.body.total).not.toBe(1);
    expect(res.body.total).toBeGreaterThan(200); // 2x100 + platform 5 + gst 10
    expect(res.body.authoritativeTotal).toBe(res.body.total);
    expect(res.body.breakdown).toMatchObject({ subtotal: 200 });
    expect(res.body.status).toBe('Pending');
    expect(res.body.patientId).toBe('patient-1');
    const [created] = orderCreate.mock.calls[0];
    expect(created[0].total).not.toBe(1);
    expect(created[0].patientId).toBe('patient-1');
  });

  it('rejects multi-store carts 422 and creates no order', async () => {
    medicineFind.mockImplementationOnce(() => chain(catalogue));
    const res = await as(PATIENT).post('/orders').send({
      items: [
        { medicineId: MED_ID, quantity: 1, storeId: FAC_ID },
        { medicineId: MED2_ID, quantity: 1, storeId: '507f1f77bcf86cd799439015' },
      ],
      deliveryMode: 'pickup',
      paymentMethod: 'upi',
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MULTI_STORE_CHECKOUT_UNSUPPORTED');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('rejects unknown/demo medicine references without creating an order', async () => {
    const res = await as(PATIENT).post('/orders').send(cart({
      items: [{ medicineId: 'demo-cart-id', quantity: 1 }],
    }));
    expect([409, 422]).toContain(res.status);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('propagates a stock-race conflict as 409 with no order insert', async () => {
    reserveItems.mockRejectedValueOnce(Object.assign(new Error('race'), { status: 409, code: 'MEDICINE_STOCK_RACE' }));
    const res = await as(PATIENT).post('/orders').send(cart());
    expect(res.status).toBe(409);
    expect(orderCreate).not.toHaveBeenCalled();
  });
});

describe('PHARM-B-16 COD atomic collection (seeded HTTP)', () => {
  it('collects a delivered unpaid COD order writing Payment+Billing atomically', async () => {
    const res = await as(STAFF).post('/orders/order-cod-ready/collect-cod').send({});
    expect(res.status).toBe(200);
    expect(executeWithOutbox).toHaveBeenCalledTimes(1);
    expect(paymentCreate).toHaveBeenCalledTimes(1);
    expect(billingCreate).toHaveBeenCalledTimes(1);
    const [payDocs, payOpts] = paymentCreate.mock.calls[0];
    expect(payOpts).toEqual({ session: expect.anything() });
    expect(payDocs[0]).toMatchObject({ status: 'completed', method: 'cash', amount: 250 });
    const [billDocs] = billingCreate.mock.calls[0];
    expect(billDocs[0]).toMatchObject({ status: 'Paid', amount: 250 });
  });

  it('refuses premature COD collection 409 with no accounting mutation', async () => {
    const res = await as(STAFF).post('/orders/order-cod-early/collect-cod').send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COD_COLLECTION_NOT_ALLOWED');
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(billingCreate).not.toHaveBeenCalled();
  });
});

describe('PHARM-B-17 prescription tamper (seeded HTTP)', () => {
  it('rejects a tampered token with the neutral shape and no PHI', async () => {
    const res = await as(STAFF).get('/prescriptions/verify/FM1.tampered.abcdef0123456789abcdef0123456789.abcdef0123456789abcdef0123456789');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/patientName|medicines|diagnosis/i);
  });

  it('rejects a malformed token without leaking whether an id exists', async () => {
    const res = await as(STAFF).get('/prescriptions/verify/not-a-token');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.message).toBeTruthy();
  });
});

describe('PHARM-B-18 negative stock + PHARM-B-15 unavailable refund (seeded HTTP)', () => {
  it.each([['negative', -5], ['zero', 0], ['fractional', 1.5]])(
    'rejects %s stock quantities before any write', async (_label, quantity) => {
      const res = await as(STAFF).put('/medicines/med-1/stock').send({ type: 'deduct', quantity });
      expect(res.status).toBe(400);
      expect(medicineFindOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('answers unpaid-order refund 409 with no mutation', async () => {
    const before = { ...ordersDb['order-unpaid'] };
    const res = await as(STAFF).post('/orders/order-unpaid/refund').send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NO_CAPTURED_PAYMENT');
    expect(ordersDb['order-unpaid']).toEqual(before);
  });

  it('answers paid-order refund 503 unavailable with no mutation', async () => {
    const before = { ...ordersDb['order-paid'] };
    const res = await as(STAFF).post('/orders/order-paid/refund').send({});
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('REFUND_PROVIDER_UNAVAILABLE');
    expect(ordersDb['order-paid']).toEqual(before);
  });
});
