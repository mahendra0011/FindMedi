import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const medicineFindById = jestApi.fn();
const medicineFind = jestApi.fn();
const medicineFindOneAndUpdate = jestApi.fn();
const facilityFindById = jestApi.fn();
const pharmacyOrderFindById = jestApi.fn();
const pharmacyOrderFindOneAndUpdate = jestApi.fn();
const pharmacyOrderCreate = jestApi.fn();
const reserveItems = jestApi.fn();
const releaseItems = jestApi.fn();
const executeWithOutbox = jestApi.fn();
const auditLog = jestApi.fn();
const session = { id: 'http-test-session' };

jestApi.unstable_mockModule('../../src/models/Medicine.js', () => ({
  default: {
    find: (...args) => medicineFind(...args),
    findById: (...args) => medicineFindById(...args),
    findOneAndUpdate: (...args) => medicineFindOneAndUpdate(...args),
  },
}));
jestApi.unstable_mockModule('../../src/models/Facility.js', () => ({
  default: { findById: (...args) => facilityFindById(...args) },
}));
jestApi.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({
  default: {
    create: (...args) => pharmacyOrderCreate(...args),
    findById: (...args) => pharmacyOrderFindById(...args),
    findOneAndUpdate: (...args) => pharmacyOrderFindOneAndUpdate(...args),
  },
}));
jestApi.unstable_mockModule('../../src/services/pharmacyInventoryService.js', () => ({
  PHARMACY_RESERVATION_TTL_MS: 900_000,
  reservePharmacyOrderItems: (...args) => reserveItems(...args),
  releasePharmacyOrderItems: (...args) => releaseItems(...args),
}));
jestApi.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({
  executeWithOutbox: (...args) => executeWithOutbox(...args),
  writeOutboxEvent: jestApi.fn(),
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: (...args) => auditLog(...args) }));

const { as } = await mountApp('pharmacy', {});

const medicine = {
  _id: 'med-1', hospitalId: 'h1', facilityId: 'f1', currentStock: 8,
};
const pendingOrder = {
  _id: 'order-1', patientId: 'patient-1', hospitalId: 'h1', facilityId: 'f1',
  status: 'Pending', paymentStatus: 'Unpaid', inventoryReservationStatus: 'reserved',
  items: [{ medicineId: 'med-1', qty: 2 }],
};
const medicineId = '507f1f77bcf86cd799439011';
const facilityId = '507f1f77bcf86cd799439012';
const hospitalId = '507f1f77bcf86cd799439013';
const checkoutMedicine = {
  _id: medicineId, name: 'Checkout medicine', sellingPrice: 12.5, currentStock: 3,
  facilityId, hospitalId, prescriptionReq: false,
};
const approvedPharmacy = { _id: facilityId, type: 'pharmacy', status: 'approved', details: { deliveryFee: 0 } };

beforeEach(() => {
  medicineFind.mockReset().mockReturnValue(query([checkoutMedicine]));
  medicineFindById.mockReset().mockReturnValue(query(medicine));
  medicineFindOneAndUpdate.mockReset().mockResolvedValue({ ...medicine, currentStock: 6 });
  facilityFindById.mockReset().mockReturnValue(query(approvedPharmacy));
  pharmacyOrderFindById.mockReset().mockReturnValue(query(pendingOrder));
  pharmacyOrderFindOneAndUpdate.mockReset().mockResolvedValue({ ...pendingOrder, status: 'Cancelled', inventoryReservationStatus: 'released' });
  pharmacyOrderCreate.mockReset().mockImplementation(async ([doc]) => [{ ...doc, toObject: () => doc }]);
  reserveItems.mockReset().mockResolvedValue(undefined);
  releaseItems.mockReset().mockResolvedValue(undefined);
  executeWithOutbox.mockReset().mockImplementation((fn) => fn(session));
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('HTTP pharmacy checkout reservation boundary', () => {
  const patient = { _id: 'patient-1', id: 'patient-1', role: 'patient', name: 'Checkout Patient' };
  const cart = {
    items: [{ medicineId, quantity: 2, storeId: facilityId }],
    deliveryMode: 'pickup',
    paymentMethod: 'upi',
    total: 1,
    status: 'Paid',
    paymentStatus: 'Paid',
    patientId: 'foreign-patient',
    hospitalId: 'foreign-hospital',
    facilityId: 'foreign-facility',
  };

  it('reprices and reserves stock in the same transaction before creating a server-owned order', async () => {
    const response = await as(patient).post('/orders').send(cart);
    expect(response.status).toBe(201);
    expect(executeWithOutbox).toHaveBeenCalledTimes(1);
    expect(reserveItems).toHaveBeenCalledWith([
      { medicineId, quantity: 2, expectedPrice: 12.5 },
    ], { session });
    const [createdItems, options] = pharmacyOrderCreate.mock.calls[0];
    expect(options).toEqual({ session });
    expect(createdItems[0]).toMatchObject({
      patientId: patient._id,
      patientName: patient.name,
      hospitalId,
      facilityId,
      status: 'Pending',
      paymentStatus: 'Pending',
      inventoryReservationStatus: 'reserved',
      total: expect.any(Number),
    });
    expect(createdItems[0].total).not.toBe(1);
    expect(createdItems[0].patientId).not.toBe('foreign-patient');
  });

  it('returns a stock-race conflict and creates no order if reservation loses', async () => {
    const conflict = Object.assign(new Error('stock changed'), { status: 409, code: 'MEDICINE_STOCK_RACE' });
    reserveItems.mockRejectedValueOnce(conflict);
    const response = await as(patient).post('/orders').send(cart);
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('MEDICINE_STOCK_RACE');
    expect(pharmacyOrderCreate).not.toHaveBeenCalled();
  });
});

describe('HTTP pharmacy stock adjustment route', () => {
  const pharmacist = { _id: 'staff-1', id: 'staff-1', role: 'hospital_admin', hospitalId: 'h1' };

  it.each([
    ['negative', -2],
    ['zero', 0],
    ['fractional', 1.5],
    ['over limit', 100001],
  ])('rejects %s stock quantities before writing', async (_label, quantity) => {
    const response = await as(pharmacist).put('/medicines/med-1/stock').send({ type: 'deduct', quantity });
    expect(response.status).toBe(400);
    expect(medicineFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('denies a different hospital before applying the adjustment', async () => {
    const response = await as({ ...pharmacist, hospitalId: 'h2' })
      .put('/medicines/med-1/stock').send({ type: 'deduct', quantity: 2 });
    expect(response.status).toBe(404);
    expect(medicineFindOneAndUpdate).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain('med-1');
  });

  it('deducts stock using an atomic sufficient-stock predicate', async () => {
    const response = await as(pharmacist).put('/medicines/med-1/stock').send({ type: 'deduct', quantity: 3 });
    expect(response.status).toBe(200);
    expect(medicineFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'med-1', currentStock: { $gte: 3 } },
      { $inc: { currentStock: -3 } },
      { new: true, runValidators: true }
    );
  });

  it('returns conflict if stock changed before the atomic deduction', async () => {
    medicineFindOneAndUpdate.mockResolvedValueOnce(null);
    const response = await as(pharmacist).put('/medicines/med-1/stock').send({ type: 'deduct', quantity: 9 });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INSUFFICIENT_SELLABLE_STOCK');
  });
});

describe('HTTP pharmacy cancellation reservation handling', () => {
  it('releases stock in the same transactional callback as cancelling its owner order', async () => {
    const response = await as({ _id: 'patient-1', id: 'patient-1', role: 'patient' })
      .post('/orders/order-1/cancel');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('Cancelled');
    expect(executeWithOutbox).toHaveBeenCalledTimes(1);
    expect(pharmacyOrderFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'order-1', status: 'Pending', inventoryReservationStatus: 'reserved' }),
      { $set: { status: 'Cancelled', inventoryReservationStatus: 'released' } },
      { new: true, runValidators: true, session }
    );
    expect(releaseItems).toHaveBeenCalledWith(pendingOrder.items, { session });
  });

  it('hides an order from a foreign patient and does not mutate it', async () => {
    const response = await as({ _id: 'patient-2', id: 'patient-2', role: 'patient' })
      .post('/orders/order-1/cancel');
    expect(response.status).toBe(404);
    expect(pharmacyOrderFindOneAndUpdate).not.toHaveBeenCalled();
    expect(releaseItems).not.toHaveBeenCalled();
  });

  it('hides another facility order from tenant staff without changing inventory', async () => {
    const response = await as({ _id: 'staff-2', id: 'staff-2', role: 'hospital_admin', hospitalId: 'h2' })
      .post('/orders/order-1/cancel');
    expect(response.status).toBe(404);
    expect(pharmacyOrderFindOneAndUpdate).not.toHaveBeenCalled();
    expect(releaseItems).not.toHaveBeenCalled();
  });
});
