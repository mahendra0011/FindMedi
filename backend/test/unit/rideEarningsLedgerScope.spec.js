import { jest } from '@jest/globals';

const riderId = '507f1f77bcf86cd799439001';
const patientId = '507f1f77bcf86cd799439002';
const rideId = '507f1f77bcf86cd799439003';
const rows = [
  { amount: 1000, commissionAmount: 100, taxAmount: 10, netAmount: 890, createdAt: new Date('2026-10-04T09:00:00Z') },
];
const ledger = { find: jest.fn(), findOne: jest.fn() };
const rideBooking = { findById: jest.fn() };
const riderProfile = { findOne: jest.fn() };

jest.unstable_mockModule('../../src/models/TransactionLedger.js', () => ({ default: ledger }));
jest.unstable_mockModule('../../src/models/RideBooking.js', () => ({ default: rideBooking }));
jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({ default: riderProfile }));

const noOpMiddleware = (_req, _res, next) => next();
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({ protect: noOpMiddleware, optionalProtect: noOpMiddleware, authorize: () => noOpMiddleware }));
jest.unstable_mockModule('../../src/middleware/rateLimit.js', () => ({ bookingLimiter: noOpMiddleware }));
jest.unstable_mockModule('../../src/utils/validate.js', () => ({
  validate: () => noOpMiddleware,
  estimateRideSchema: {}, bookRideSchema: {}, rateRideSchema: {},
}));

const router = (await import('../../src/routes/rides.js')).default;

function routeHandler(path) {
  const layer = router.stack.find((item) => item.route?.path === path && item.route.methods.get);
  if (!layer) throw new Error(`GET ${path} route not found`);
  return layer.route.stack.at(-1).handle;
}

function fakeRes() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('ride earnings endpoints use the same completed-credit ledger scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ledger.find.mockReturnValue({ select: () => ({ lean: async () => rows }) });
    ledger.findOne.mockReturnValue({ select: () => ({ lean: async () => ({
      _id: 'ledger-1', amount: 1000, commissionPercent: 10, commissionAmount: 100,
      taxAmount: 10, netAmount: 890, status: 'completed',
    }) }) });
    const ride = {
      _id: rideId, userId: { _id: patientId, toString: () => patientId },
      riderId: { _id: riderId, toString: () => riderId }, vehicleId: null,
      vehicleType: 'car', isEmergency: false, pickup: {}, drop: {}, distanceKm: 4,
      fare: { total: 1000 }, status: 'completed', bookingNumber: 'RID-1',
    };
    const populatedRide = { populate: () => populatedRide, then: undefined };
    // Mongoose query is thenable; implement the await at the end of populate chain.
    populatedRide.populate = () => populatedRide;
    populatedRide.lean = async () => ride;
    populatedRide.then = (resolve, reject) => Promise.resolve(ride).then(resolve, reject);
    rideBooking.findById.mockReturnValue(populatedRide);
    riderProfile.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ totalEarnings: 890, walletBalance: 50, commissionEarned: 100 }) }) });
  });

  it('keeps driver period totals and an individual payout statement on the same credit basis', async () => {
    const earningsRes = fakeRes();
    await routeHandler('/driver/earnings')({
      user: { _id: riderId, role: 'rider' },
      query: { period: 'day', startDate: '2026-10-04T00:00:00.000Z', endDate: '2026-10-05T00:00:00.000Z' },
    }, earningsRes);

    const statementRes = fakeRes();
    await routeHandler('/:id/payout-statement')({
      user: { _id: riderId, role: 'rider' }, params: { id: rideId },
    }, statementRes);

    expect(earningsRes.statusCode).toBe(200);
    expect(statementRes.statusCode).toBe(200);
    expect(earningsRes.body.earningsSummary).toMatchObject({ totalGross: 1000, totalCommission: 100, totalTDS: 10, totalNet: 890, rideCount: 1 });
    expect(statementRes.body.payoutStatement).toMatchObject({ totalAmount: 1000, commissionAmount: 100, taxAmount: 10, driverNet: 890 });
    expect(earningsRes.body.earningsSummary.totalNet).toBe(statementRes.body.payoutStatement.driverNet);
    expect(ledger.find).toHaveBeenCalledWith(expect.objectContaining({
      source: 'ride', providerId: riderId, entryType: 'CREDIT', status: 'completed',
    }));
    expect(ledger.findOne).toHaveBeenCalledWith({
      source: 'ride', sourceId: rideId, entryType: 'CREDIT', status: 'completed',
    });
  });
});
