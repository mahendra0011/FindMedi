import { jest } from '@jest/globals';

process.env.INSTANT_WINDOW_RIDE = '0';

const profile = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
};
const lock = {
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
};
const socket = {
  getIO: jest.fn(),
};
const outbox = { writeOutboxEvent: jest.fn() };
const routing = { rankCandidatesByRoadETA: jest.fn() };

jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({ default: profile }));
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => ({ default: profile }));
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({ default: profile }));
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: profile }));
jest.unstable_mockModule('../../src/services/socketService.js', () => socket);
jest.unstable_mockModule('../../src/lib/h3Cache.js', () => ({ findCandidatesByHex: jest.fn() }));
jest.unstable_mockModule('../../src/lib/geoUtils.js', () => ({ calculateDistanceKm: () => 0.5 }));
jest.unstable_mockModule('../../src/lib/valhallaRouting.js', () => routing);
jest.unstable_mockModule('../../src/lib/redlock.js', () => lock);
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => outbox);
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const { runGenericWave, hydrateAndFilterCandidates } = await import('../../src/services/instantDispatchService.js');

describe('shared instant dispatch wave winner and loser notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routing.rankCandidatesByRoadETA.mockImplementation(async (_pickup, candidates) => candidates.map((c) => ({ ...c, roadEtaSeconds: 40 })));
    profile.findOneAndUpdate.mockResolvedValue({ _id: 'profile' });
    profile.updateOne.mockResolvedValue({ modifiedCount: 1 });
    lock.acquireLock.mockResolvedValue('lock-token');
    lock.releaseLock.mockResolvedValue(true);
    outbox.writeOutboxEvent.mockResolvedValue({});
  });

  it('assigns the lowest ETA acceptor and emits lost_bid only to losing acceptors', async () => {
    const emitted = [];
    const io = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }) };
    const Model = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ windowEndsAt: new Date(Date.now() - 1) }),
      updateOne: jest.fn()
        .mockResolvedValueOnce({ modifiedCount: 1 }) // dispatch log
        .mockResolvedValueOnce({ modifiedCount: 1 }), // assignment CAS
      findById: jest.fn().mockResolvedValue({
        status: 'searching',
        acceptances: [
          { providerId: 'rider-slow', userId: 'user-slow', roadEtaSeconds: 90, distanceKm: 3 },
          { providerId: 'rider-fast', userId: 'user-fast', roadEtaSeconds: 40, distanceKm: 5 },
        ],
      }),
    };

    const result = await runGenericWave({
      requestId: 'ride-1', type: 'ride', Model, radiusKm: 3,
      candidates: [
        { providerId: 'rider-slow', userId: 'user-slow', roadEtaSeconds: 90 },
        { providerId: 'rider-fast', userId: 'user-fast', roadEtaSeconds: 40 },
      ],
      io,
      request: {},
      buildAlertPayload: () => ({}),
    });

    expect(lock.acquireLock).toHaveBeenCalled();
    expect(profile.findOneAndUpdate).toHaveBeenCalled();
    expect(result).toEqual({ done: true });
    expect(Model.updateOne.mock.calls[1][1].$set).toMatchObject({ status: 'accepted', riderId: 'user-fast' });
    expect(emitted).toContainEqual(expect.objectContaining({
      room: 'user:user-slow', event: 'ride:lost_bid',
      payload: expect.objectContaining({ requestId: 'ride-1', status: 'lost_bid' }),
    }));
    expect(emitted).not.toContainEqual(expect.objectContaining({ room: 'user:user-fast', event: 'ride:lost_bid' }));
  });

  it.each([
    ['lawyer', 'confirmed', { lawyerId: 'user-fast' }, { userId: 'user-fast', activeDispatchRequestId: null }],
    ['assistant', 'confirmed', { assistantId: 'user-fast' }, { userId: 'user-fast', activeDispatchRequestId: null }],
    ['emergency_doctor', 'assigned', { assignedDoctorId: 'doctor-profile-fast', assignedDoctorUserId: 'user-fast' }, { user_id: 'user-fast', activeDispatchRequestId: null }],
  ])('preserves %s provider identity and assignment fields', async (type, status, assignedFields, claimFilter) => {
    const Model = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ windowEndsAt: new Date(Date.now() - 1) }),
      updateOne: jest.fn()
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({ modifiedCount: 1 }),
      findById: jest.fn().mockResolvedValue({
        status: 'searching',
        acceptances: [{ providerId: 'user-fast', userId: 'user-fast', profileId: 'doctor-profile-fast', roadEtaSeconds: 40 }],
      }),
    };
    const io = { to: () => ({ emit: jest.fn() }) };

    await runGenericWave({
      requestId: `${type}-1`, type, Model, radiusKm: 3,
      candidates: [{ providerId: 'user-fast', userId: 'user-fast', profileId: 'doctor-profile-fast', roadEtaSeconds: 40 }],
      io, request: {}, buildAlertPayload: () => ({}),
    });

    expect(profile.findOneAndUpdate).toHaveBeenCalledWith(claimFilter, expect.any(Object), expect.any(Object));
    expect(Model.updateOne.mock.calls[1][1].$set).toMatchObject({ status, ...assignedFields });
  });
});

describe('shared H3/fallback candidate hydration filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routing.rankCandidatesByRoadETA.mockImplementation(async (_pickup, candidates) => candidates);
  });

  it('revalidates active, online, unclaimed and fresh riders before offering either candidate source', async () => {
    const now = Date.now();
    const fresh = {
      _id: 'profile-fresh', userId: 'user-fresh', riderStatus: 'active', isOnline: true,
      currentLocation: { coordinates: [72, 19], updatedAt: new Date(now - 10_000) },
    };
    const stale = {
      _id: 'profile-stale', userId: 'user-stale', riderStatus: 'active', isOnline: true,
      currentLocation: { coordinates: [72, 19], updatedAt: new Date(now - 120_000) },
    };
    profile.find.mockReturnValue({ select: () => ({ lean: async () => [fresh, stale] }) });

    const candidates = await hydrateAndFilterCandidates(['user-fresh', 'user-stale'], 'rider', 19, 72, 3);

    expect(profile.find).toHaveBeenCalledWith(expect.objectContaining({
      userId: { $in: ['user-fresh', 'user-stale'] },
      riderStatus: 'active',
      isOnline: true,
      activeDispatchRequestId: null,
      'currentLocation.updatedAt': { $gte: expect.any(Date) },
    }));
    expect(candidates.map((candidate) => candidate.userId)).toEqual(['user-fresh']);
  });

  it('hydrates emergency doctors by linked User identity while retaining Doctor profile identity', async () => {
    const now = Date.now();
    const doctor = {
      _id: 'doctor-profile-1',
      user_id: 'doctor-user-1',
      emergencySupport: true,
      isEmergencyDutyActive: true,
      activeDispatchRequestId: null,
      emergencyDoctorLocation: { coordinates: [72, 19], lastUpdatedAt: new Date(now - 5_000) },
    };
    profile.find.mockReturnValue({ select: () => ({ lean: async () => [doctor] }) });

    const candidates = await hydrateAndFilterCandidates(['doctor-user-1'], 'doctor', 19, 72, 3);

    expect(profile.find).toHaveBeenCalledWith({
      $and: [
        { $or: [{ user_id: { $in: ['doctor-user-1'] } }, { _id: { $in: ['doctor-user-1'] } }] },
        {
          emergencySupport: true,
          isEmergencyDutyActive: true,
          activeDispatchRequestId: null,
          'emergencyDoctorLocation.lastUpdatedAt': { $gte: expect.any(Date) },
        },
      ],
    });
    expect(candidates).toEqual([expect.objectContaining({
      providerId: 'doctor-user-1',
      userId: 'doctor-user-1',
      profileId: 'doctor-profile-1',
    })]);
  });
});
