import { jest } from '@jest/globals';

const mongoose = { connection: { readyState: 1 } };
const RiderProfile = { aggregate: jest.fn(), find: jest.fn() };
const Vehicle = { find: jest.fn() };
const logger = { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() };

jest.unstable_mockModule('mongoose', () => ({ default: mongoose }));
jest.unstable_mockModule('../../src/models/RideBooking.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({ default: RiderProfile }));
jest.unstable_mockModule('../../src/models/Vehicle.js', () => ({ default: Vehicle }));
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/Notification.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/services/socketService.js', () => ({ getIO: jest.fn() }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: logger }));
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({ writeOutboxEvent: jest.fn() }));

const { findEligibleRiders, LOCATION_FRESH_SECONDS } = await import('../../src/services/rideService.js');

function nearbyRider(id, updatedAt, distanceMeters = 1200) {
  return {
    _id: `profile-${id}`,
    userId: `user-${id}`,
    riderStatus: 'active',
    isOnline: true,
    activeDispatchRequestId: null,
    currentLocation: { type: 'Point', coordinates: [72, 19], updatedAt },
    distanceMeters,
  };
}

function populatedFind(rows) {
  return {
    populate: () => ({ populate: () => ({ lean: async () => rows }) }),
  };
}

describe('ride provider geo and fallback eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection.readyState = 1;
    Vehicle.find.mockReturnValue({ select: async () => [{ _id: 'vehicle-1' }] });
  });

  it('filters stale geo results and applies active/online/claim/freshness constraints in $geoNear', async () => {
    const now = Date.now();
    RiderProfile.aggregate.mockResolvedValue([
      nearbyRider('fresh', new Date(now - 5_000)),
      nearbyRider('stale', new Date(now - LOCATION_FRESH_SECONDS * 1000 - 5_000)),
    ]);

    const result = await findEligibleRiders('car', 19, 72, false, 5);

    expect(RiderProfile.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ $geoNear: expect.objectContaining({
        query: expect.objectContaining({
          isOnline: true,
          riderStatus: 'active',
          activeDispatchRequestId: null,
          'currentLocation.updatedAt': { $gte: expect.any(Date) },
          vehicleId: { $in: ['vehicle-1'] },
        }),
      }) }),
    ]));
    expect(result.map((rider) => rider.userId)).toEqual(['user-fresh']);
    expect(result[0]).toMatchObject({ locationFresh: true, distanceKm: 1.2 });
  });

  it('filters stale fallback rows and never represents unknown distance as zero', async () => {
    const now = Date.now();
    RiderProfile.aggregate.mockRejectedValue(new Error('2dsphere index unavailable'));
    RiderProfile.find.mockReturnValue(populatedFind([
      nearbyRider('fresh', new Date(now - 5_000)),
      nearbyRider('stale', new Date(now - LOCATION_FRESH_SECONDS * 1000 - 5_000)),
    ]));

    const result = await findEligibleRiders('car', 19, 72, false, 5);

    expect(RiderProfile.find).toHaveBeenCalledWith(expect.objectContaining({
      isOnline: true,
      riderStatus: 'active',
      activeDispatchRequestId: null,
      'currentLocation.updatedAt': { $gte: expect.any(Date) },
      vehicleId: { $in: ['vehicle-1'] },
    }));
    expect(result.map((rider) => rider.userId)).toEqual(['user-fresh']);
    expect(result[0]).toMatchObject({ locationFresh: false, distanceKm: null, dispatchDegraded: 'geo_index_unavailable' });
  });
});
