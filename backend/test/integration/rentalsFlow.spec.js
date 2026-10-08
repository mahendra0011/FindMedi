import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// 5.md Flow G (equipment rental) — the server-owned half of the flow: prices
// come from the AssetUnit, every move is a CAS against the transition table,
// and close refuses to release a unit whose sanitisation predates the return.

const RENTAL_ID = '7000000000000000000000a1';
const UNIT_ID = '7000000000000000000000b2';
const PROVIDER_ID = '7000000000000000000000c3';
const VENDOR_OWNER = '7000000000000000000000d4';
const PATIENT = '7000000000000000000000e5';

const rentalCreate = jestApi.fn();
const rentalFindOne = jestApi.fn();
const rentalFindById = jestApi.fn();
const rentalFind = jestApi.fn();
const rentalFindOneAndUpdate = jestApi.fn();
const rentalCount = jestApi.fn();
const unitFindById = jestApi.fn();
const unitUpdateOne = jestApi.fn();
const providerFindById = jestApi.fn();
const auditLog = jestApi.fn();

let lastCreateBody = null;

jestApi.unstable_mockModule('../../src/models/Rental.js', () => ({
  __esModule: true,
  default: {
    find: (...a) => rentalFind(...a),
    findOne: (...a) => rentalFindOne(...a),
    findById: (...a) => rentalFindById(...a),
    countDocuments: (...a) => rentalCount(...a),
    create: (body) => { lastCreateBody = body; return rentalCreate(body); },
    findOneAndUpdate: (...a) => rentalFindOneAndUpdate(...a),
  },
}));

jestApi.unstable_mockModule('../../src/models/AssetUnit.js', () => ({
  __esModule: true,
  default: {
    findById: (...a) => unitFindById(...a),
    updateOne: (...a) => unitUpdateOne(...a),
    find: jestApi.fn().mockImplementation(() => query([])),
    countDocuments: jestApi.fn().mockResolvedValue(0),
  },
}));

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: {
    findById: (...a) => providerFindById(...a),
    find: jestApi.fn().mockImplementation(() => query([])),
  },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('rentals');

const vendor = { _id: VENDOR_OWNER, role: 'doctor' };
const renter = { _id: PATIENT, role: 'patient' };

const unit = (over = {}) => ({
  _id: UNIT_ID, vendorId: PROVIDER_ID, productName: 'Oxygen concentrator',
  serial: 'A-4471', status: 'available', isListed: true,
  ratePerDay: 500, deposit: 100, sanitisationCycleDays: 0,
  ...over,
});

const rental = (over = {}) => {
  // One clock read per factory call: startAt/endAt built from two separate
  // `new Date()`s can straddle a millisecond under load, and rentalDays'
  // Math.ceil then bills the phantom millisecond as a whole extra day.
  const t0 = Date.now();
  return {
  _id: RENTAL_ID, userId: PATIENT, vendorId: PROVIDER_ID, vendorOwnerId: VENDOR_OWNER,
  assetUnitId: UNIT_ID, status: 'REQUESTED',
  startAt: new Date(t0), endAt: new Date(t0 + 2 * 864e5),
  days: 2, ratePerDay: 500, rentalAmount: 1000, deposit: 100,
  depositRefundAmount: null, damage: { notes: '', amount: 0 },
  ...over,
  };
};

beforeEach(() => {
  lastCreateBody = null;
  rentalCreate.mockReset().mockImplementation(async (body) => ({ _id: RENTAL_ID, ...body }));
  rentalFindOne.mockReset().mockImplementation(() => query(null));
  rentalFindById.mockReset().mockImplementation(() => query(rental()));
  rentalFind.mockReset().mockImplementation(() => query([]));
  rentalFindOneAndUpdate.mockReset().mockImplementation(() => query(rental({ status: 'APPROVED' })));
  rentalCount.mockReset().mockResolvedValue(0);
  unitFindById.mockReset().mockImplementation(() => query(unit()));
  unitUpdateOne.mockReset().mockResolvedValue({ matchedCount: 1 });
  providerFindById.mockReset().mockImplementation(() => query({
    _id: PROVIDER_ID, ownerUserId: VENDOR_OWNER, status: 'live',
  }));
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('POST /rentals — server-owned pricing', () => {
  it('rejects unauthenticated callers', async () => {
    const res = await as().post('/').send({ assetUnitId: UNIT_ID, startAt: '2026-11-01', endAt: '2026-11-03' });
    expect(res.status).toBe(401);
  });

  it('computes days, rate and deposit from the UNIT, not the body', async () => {
    // Anchored to one instant: two separate clock reads can straddle a
    // millisecond under load and Math.ceil bills it as a third day.
    const t0 = Date.now();
    const res = await as(renter).post('/').send({
      assetUnitId: UNIT_ID,
      startAt: new Date(t0).toISOString(),
      endAt: new Date(t0 + 2 * 864e5).toISOString(),
    });
    expect(res.status).toBe(201);
    expect(lastCreateBody.days).toBe(2);
    expect(lastCreateBody.ratePerDay).toBe(500);
    expect(lastCreateBody.rentalAmount).toBe(1000);
    expect(lastCreateBody.deposit).toBe(100);
    expect(lastCreateBody.status).toBe('REQUESTED');
    expect(lastCreateBody.userId).toBe(PATIENT);
  });

  it('400s a body that carries its own price (strict schema)', async () => {
    const t0 = Date.now();
    const res = await as(renter).post('/').send({
      assetUnitId: UNIT_ID,
      startAt: new Date(t0).toISOString(),
      endAt: new Date(t0 + 864e5).toISOString(),
      rentalAmount: 1,
    });
    expect(res.status).toBe(400);
    expect(rentalCreate).not.toHaveBeenCalled();
  });

  it('refuses a window that overlaps a live rental', async () => {
    rentalFindOne.mockImplementation(() => query(rental({ _id: 'other' })));
    const t0 = Date.now();
    const res = await as(renter).post('/').send({
      assetUnitId: UNIT_ID,
      startAt: new Date(t0).toISOString(),
      endAt: new Date(t0 + 864e5).toISOString(),
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DATE_CONFLICT');
  });
});

describe('POST /rentals/:id/approve', () => {
  it('is not reachable by the renter (ownerField: vendorOwnerId)', async () => {
    const res = await as(renter).post(`/${RENTAL_ID}/approve`).send({});
    expect(res.status).toBe(404);
    expect(rentalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('lets the vendor approve and reserves the unit', async () => {
    rentalFindOneAndUpdate.mockImplementation(() => query(rental({ status: 'APPROVED' })));
    const res = await as(vendor).post(`/${RENTAL_ID}/approve`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
    expect(unitUpdateOne).toHaveBeenCalledWith(
      { _id: UNIT_ID, status: { $ne: 'reserved' } },
      { $set: { status: 'reserved' } },
    );
  });

  it('409s an illegal move with the transition code, not a silent enum failure', async () => {
    rentalFindById.mockImplementation(() => query(rental({ status: 'CLOSED' })));
    const res = await as(vendor).post(`/${RENTAL_ID}/approve`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ILLEGAL_STATE_TRANSITION');
    expect(rentalFindOneAndUpdate).not.toHaveBeenCalled();
    expect(unitUpdateOne).not.toHaveBeenCalled();
  });
});

describe('POST /rentals/:id/close — deposit + sanitisation gate', () => {
  const closing = (over = {}) => rental({
    status: 'INSPECTION',
    returnedAt: new Date('2026-01-01T00:00:00Z'),
    deposit: 1000,
    damage: { notes: 'scuffed armrest', amount: 300 },
    ...over,
  });

  it('refuses to close when the sanitisation record predates the return', async () => {
    rentalFindById.mockImplementation(() => query(closing()));
    unitFindById.mockImplementation(() => query(unit({ sanitisationCycleDays: 7, lastSanitisedAt: null })));
    const res = await as(vendor).post(`/${RENTAL_ID}/close`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SANITISATION_REQUIRED');
    expect(rentalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('computes the refund as deposit minus damage (never below zero)', async () => {
    rentalFindById.mockImplementation(() => query(closing()));
    unitFindById.mockImplementation(() => query(unit({
      sanitisationCycleDays: 7, lastSanitisedAt: new Date(),
    })));
    rentalFindOneAndUpdate.mockImplementation(() => query(closing({
      status: 'CLOSED', depositRefundAmount: 700,
    })));
    const res = await as(vendor).post(`/${RENTAL_ID}/close`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CLOSED');
    expect(res.body.depositRefundAmount).toBe(700);
    const set = rentalFindOneAndUpdate.mock.calls[0][1].$set;
    expect(set.depositRefundAmount).toBe(700);
  });

  it('moves money as its own step: CLOSED -> DEPOSIT_REFUNDED', async () => {
    rentalFindById.mockImplementation(() => query(closing({ status: 'CLOSED', depositRefundAmount: 700 })));
    rentalFindOneAndUpdate.mockImplementation(() => query(closing({
      status: 'DEPOSIT_REFUNDED', depositRefundAmount: 700,
    })));
    const res = await as(vendor).post(`/${RENTAL_ID}/deposit-refund`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DEPOSIT_REFUNDED');
    expect(res.body.depositRefundAmount).toBe(700);
  });

  it('409s deposit-refund when the rental has not been closed yet', async () => {
    rentalFindById.mockImplementation(() => query(closing()));
    const res = await as(vendor).post(`/${RENTAL_ID}/deposit-refund`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ILLEGAL_STATE_TRANSITION');
  });
});

describe('GET /rentals and the asset catalogue', () => {
  it('scopes the rental list to the caller', async () => {
    const res = await as(renter).get('/');
    expect(res.status).toBe(200);
    expect(rentalFind.mock.calls[0][0].$or).toEqual([{ userId: PATIENT }]);
  });

  it('serves the public asset list without a session', async () => {
    const res = await as().get('/assets');
    expect(res.status).toBe(200);
  });

  it('requires a session to LIST an asset', async () => {
    const res = await as().post('/assets').send({
      vendorId: PROVIDER_ID, productName: 'Walker', serial: 'W-1',
      ratePerDay: 100,
    });
    expect(res.status).toBe(401);
  });
});
