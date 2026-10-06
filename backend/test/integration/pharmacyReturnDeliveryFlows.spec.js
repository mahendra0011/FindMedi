import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

/**
 * Regression guards for two pre-existing bugs found while hardening
 * pharmacy.js schemas (see PHARM-B-11 follow-ups):
 *
 * 1. PUT /deliveries/:id validated the status transition AGAINST THE NEW
 *    status (the check ran after Object.assign), so every legal transition
 *    returned 409 and `currentIndex` was dead code. The pharmacy UI's
 *    "Complete" button (Out for Delivery → Delivered) could never succeed.
 *
 * 2. POST /returns spread the request body straight into create(), but
 *    patientName/total are required model fields no client sends — so every
 *    legitimate return 400'd, while status 'Requested' (OrderTracking) is
 *    outside the model enum. A forged total also had to stay impossible
 *    (PHARM-B-11), which meant deriving the snapshot server-side.
 *
 * The suite also pins PUT /returns/:id to its status-only allowlist: the old
 * pickBody list named items/total, which validate()'s strip had already
 * removed — dead entries that read as writable.
 */
const deliveryFindById = jestApi.fn();
const returnFindById = jestApi.fn();
const returnCreate = jestApi.fn();
const orderFindById = jestApi.fn();
const orderFindOne = jestApi.fn();
const auditLog = jestApi.fn();

jestApi.unstable_mockModule('../../src/models/PharmacyDelivery.js', () => ({
  default: { findById: (...args) => deliveryFindById(...args) },
}));
jestApi.unstable_mockModule('../../src/models/PharmacyReturn.js', () => ({
  default: {
    findById: (...args) => returnFindById(...args),
    create: (...args) => returnCreate(...args),
  },
}));
jestApi.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({
  default: {
    findById: (...args) => orderFindById(...args),
    findOne: (...args) => orderFindOne(...args),
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('pharmacy', {});
const staff = as({ id: 'u-1', _id: 'u-1', role: 'superadmin' });

const deliveryId = '507f1f77bcf86cd799439001';
const orderIdHex = '507f1f77bcf86cd799439002';

const makeDelivery = (overrides = {}) => ({
  _id: deliveryId,
  status: 'Assigned',
  hospitalId: 'h1',
  facilityId: 'f1',
  trackingHistory: [],
  otpVerified: false,
  deliveryProofPhoto: undefined,
  save: jestApi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const orderDoc = {
  _id: orderIdHex,
  orderId: 'ORD123',
  patientName: 'Pat P',
  total: 250,
  hospitalId: 'h1',
  facilityId: 'f1',
};

beforeEach(() => {
  deliveryFindById.mockReset();
  returnFindById.mockReset();
  returnCreate.mockReset();
  orderFindById.mockReset();
  orderFindOne.mockReset();
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('PUT /deliveries/:id status timeline', () => {
  it('accepts a legal transition (the old check 409\'d every one of them)', async () => {
    const doc = makeDelivery({ status: 'Assigned' });
    deliveryFindById.mockImplementation(() => query(doc));

    const res = await staff.put(`/deliveries/${deliveryId}`).send({ status: 'Picked Up' });

    expect(res.status).toBe(200);
    expect(doc.status).toBe('Picked Up');
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('rejects an illegal transition with 409 and persists nothing', async () => {
    const doc = makeDelivery({ status: 'Assigned' });
    deliveryFindById.mockImplementation(() => query(doc));

    const res = await staff.put(`/deliveries/${deliveryId}`).send({ status: 'Delivered' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Assigned');
    expect(doc.save).not.toHaveBeenCalled();
    expect(doc.status).toBe('Assigned');
  });

  it('treats a repeated same-status PUT as an idempotent re-save', async () => {
    const doc = makeDelivery({
      status: 'Delivered',
      deliveryProofPhoto: 'https://res.cloudinary.com/demo/proof.png',
    });
    deliveryFindById.mockImplementation(() => query(doc));

    const res = await staff.put(`/deliveries/${deliveryId}`).send({ status: 'Delivered' });

    expect(res.status).toBe(200);
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('still enforces proof-of-delivery on the legal Out for Delivery → Delivered edge', async () => {
    const doc = makeDelivery({ status: 'Out for Delivery' });
    deliveryFindById.mockImplementation(() => query(doc));

    const res = await staff.put(`/deliveries/${deliveryId}`).send({ status: 'Delivered' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/proof photo/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('allows Delivered when the proof photo is included', async () => {
    const doc = makeDelivery({
      status: 'Out for Delivery',
      deliveryProofPhoto: 'https://res.cloudinary.com/demo/proof.png',
    });
    deliveryFindById.mockImplementation(() => query(doc));

    const res = await staff.put(`/deliveries/${deliveryId}`).send({ status: 'Delivered' });

    expect(res.status).toBe(200);
    expect(doc.status).toBe('Delivered');
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('fails closed for a current status outside the transition map', async () => {
    const doc = makeDelivery({ status: 'Legacy Unknown' });
    deliveryFindById.mockImplementation(() => query(doc));

    const res = await staff.put(`/deliveries/${deliveryId}`).send({ status: 'Picked Up' });

    expect(res.status).toBe(409);
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('POST /returns', () => {
  it('derives patientName/total/orderRef from the order (clients send only orderId+reason)', async () => {
    orderFindById.mockImplementation(() => query(orderDoc));
    orderFindOne.mockImplementation(() => query(null));
    returnCreate.mockImplementation(async (doc) => ({ ...doc, _id: 'ret-1' }));

    // Exactly what OrderTracking sends — status outside the model enum.
    const res = await staff.post('/returns').send({
      orderId: orderIdHex,
      reason: 'Damaged strip',
      status: 'Requested',
    });

    expect(res.status).toBe(201);
    expect(returnCreate).toHaveBeenCalledTimes(1);
    const created = returnCreate.mock.calls[0][0];
    expect(created).toMatchObject({
      orderId: orderIdHex,
      orderRef: orderIdHex,
      patientName: 'Pat P',
      total: 250,
      reason: 'Damaged strip',
      status: 'Pending',
    });
    expect(created.returnId).toMatch(/^RET/);
    expect(auditLog).toHaveBeenCalledWith(
      'create_pharmacy_return',
      'u-1',
      expect.objectContaining({ recordId: 'ret-1' }),
    );
  });

  it('never lets a forged total or patientName through', async () => {
    orderFindById.mockImplementation(() => query(orderDoc));
    orderFindOne.mockImplementation(() => query(null));
    returnCreate.mockImplementation(async (doc) => ({ ...doc, _id: 'ret-1' }));

    const res = await staff.post('/returns').send({
      orderId: orderIdHex,
      reason: 'Legit reason',
      total: 0.01,
      patientName: 'Forged Name',
      status: 'Approved',
    });

    expect(res.status).toBe(201);
    const created = returnCreate.mock.calls[0][0];
    expect(created.total).toBe(250);
    expect(created.patientName).toBe('Pat P');
    expect(created.status).toBe('Pending');
  });

  it('resolves a human order-id string through findOne', async () => {
    orderFindById.mockImplementation(() => query(null));
    orderFindOne.mockImplementation(() => query(orderDoc));
    returnCreate.mockImplementation(async (doc) => ({ ...doc, _id: 'ret-1' }));

    const res = await staff.post('/returns').send({ orderId: 'ORD123', reason: 'Wrong item' });

    expect(res.status).toBe(201);
    expect(orderFindById).not.toHaveBeenCalled();
    expect(orderFindOne).toHaveBeenCalledWith({ orderId: 'ORD123' });
    expect(returnCreate.mock.calls[0][0].total).toBe(250);
  });

  it('400s without an orderId', async () => {
    const res = await staff.post('/returns').send({ reason: 'No order' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/orderId is required/);
    expect(returnCreate).not.toHaveBeenCalled();
  });

  it('404s when the order does not exist', async () => {
    orderFindById.mockImplementation(() => query(null));
    orderFindOne.mockImplementation(() => query(null));

    const res = await staff.post('/returns').send({ orderId: orderIdHex, reason: 'Ghost order' });

    expect(res.status).toBe(404);
    expect(returnCreate).not.toHaveBeenCalled();
  });
});

describe('PUT /returns/:id', () => {
  it('updates only status; linkage and total stay immutable even if sent', async () => {
    const retDoc = {
      _id: 'ret-1',
      status: 'Pending',
      total: 250,
      patientName: 'Pat P',
      orderId: 'ORD123',
      save: jestApi.fn().mockResolvedValue(undefined),
    };
    returnFindById.mockImplementation(() => query(retDoc));

    const res = await staff.put('/returns/ret-1').send({
      status: 'Approved',
      total: 1,
      patientName: 'Forged Name',
      orderId: 'ORD999',
      items: [{ medicineName: 'Anything' }],
    });

    expect(res.status).toBe(200);
    expect(retDoc.status).toBe('Approved');
    expect(retDoc.total).toBe(250);
    expect(retDoc.patientName).toBe('Pat P');
    expect(retDoc.orderId).toBe('ORD123');
    expect(retDoc.completedAt).toBeInstanceOf(Date);
    expect(retDoc.save).toHaveBeenCalledTimes(1);
  });

  it('404s for a missing return', async () => {
    returnFindById.mockImplementation(() => query(null));

    const res = await staff.put('/returns/ret-missing').send({ status: 'Rejected' });

    expect(res.status).toBe(404);
  });
});
