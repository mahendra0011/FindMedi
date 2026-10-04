/**
 * RIDE-B-01/03/04/05/06/07 + RIDE-M-01 + ED-B-01 + ED-M-01:
 *  - wave outcome persistence (reconnect recovery),
 *  - stranded-claim sweep,
 *  - missing/stale ETA fallback.
 */
import { jest } from '@jest/globals';

const outbox = { writeOutboxEvent: jest.fn() };
const lock = { acquireLock: jest.fn(), releaseLock: jest.fn() };

jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({
  default: { findOneAndUpdate: jest.fn(), updateOne: jest.fn(), find: jest.fn() },
}));
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => ({
  default: { findOneAndUpdate: jest.fn(), updateOne: jest.fn(), find: jest.fn() },
}));
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({
  default: { findOneAndUpdate: jest.fn(), updateOne: jest.fn(), find: jest.fn() },
}));
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: { findOneAndUpdate: jest.fn(), updateOne: jest.fn(), find: jest.fn() },
}));
jest.unstable_mockModule('../../src/lib/redlock.js', () => lock);
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => outbox);
jest.unstable_mockModule('../../src/services/socketService.js', () => ({ getIO: jest.fn() }));
jest.unstable_mockModule('../../src/lib/h3Cache.js', () => ({ findCandidatesByHex: jest.fn() }));
jest.unstable_mockModule('../../src/lib/geoUtils.js', () => ({ calculateDistanceKm: () => 1 }));
jest.unstable_mockModule('../../src/lib/valhallaRouting.js', () => ({
  rankCandidatesByRoadETA: jest.fn(async (_p, c) => c),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const dispatch = await import('../../src/services/instantDispatchService.js');
const stranded = await import('../../src/jobs/strandedClaimReconcile.job.js');

describe('wave outcome persistence (RIDE-B-03/04)', () => {
  let RiderProfile;
  beforeAll(async () => {
    RiderProfile = (await import('../../src/models/RiderProfile.js')).default;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    dispatch.WAVE_OUTCOME_CACHE.clear();
    lock.acquireLock.mockResolvedValue('tok');
    lock.releaseLock.mockResolvedValue(true);
    outbox.writeOutboxEvent.mockResolvedValue({});
    RiderProfile?.findOneAndUpdate?.mockResolvedValue({ _id: 'p' });
  });

  it('persists assignment to dispatchLog + cache + outbox so reconnect replays it', async () => {
    RiderProfile.findOneAndUpdate.mockResolvedValue({ _id: 'p' });
    const Model = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ windowEndsAt: new Date(Date.now() - 1) }),
      updateOne: jest.fn()
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({ modifiedCount: 1 }),
      findById: jest.fn().mockResolvedValue({
        status: 'searching',
        acceptances: [
          { providerId: 'slow', userId: 'u-slow', roadEtaSeconds: null, distanceKm: 5 },
          { providerId: 'fast', userId: 'u-fast', roadEtaSeconds: 40, distanceKm: 9 },
        ],
      }),
    };
    const io = { to: () => ({ emit: jest.fn() }) };
    const res = await dispatch.runGenericWave({
      requestId: 'ride-9', type: 'ride', Model, radiusKm: 5,
      candidates: [
        { providerId: 'slow', userId: 'u-slow', roadEtaSeconds: null, distanceKm: 5 },
        { providerId: 'fast', userId: 'u-fast', roadEtaSeconds: 40, distanceKm: 9 },
      ],
      io, request: {}, buildAlertPayload: () => ({}),
    });
    expect(res).toEqual({ done: true });
    // dispatchLog `assigned` persisted alongside the status CAS
    const assignCall = Model.updateOne.mock.calls[1];
    expect(assignCall[1].$push.dispatchLog.outcome).toBe('assigned');
    // outcome cached for fast reconnect replay
    expect(dispatch.getCachedWaveOutcome('ride-9')).toMatchObject({ winnerId: expect.any(String) });
    // outbox backbone event still emitted
    expect(outbox.writeOutboxEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'ride.assigned' }));
    expect(RiderProfile.findOneAndUpdate).toHaveBeenCalled();
  });

  it('getWaveOutcome falls back to the durable row when memory was lost (restart)', async () => {
    const row = {
      status: 'accepted', riderId: 'u-fast',
      acceptances: [{ providerId: 'u-fast' }, { providerId: 'u-slow' }],
      dispatchLog: [{ outcome: 'assigned' }],
    };
    const Model = {
      findById: jest.fn(() => ({ select: () => ({ lean: async () => row }) })),
    };
    const outcome = await dispatch.getWaveOutcome(Model, 'ride-restart');
    expect(outcome).toMatchObject({ winnerId: 'u-fast', loserIds: ['u-slow'], status: 'accepted' });
  });
});

describe('missing/stale ETA fallback (RIDE-B-06)', () => {
  it('haversine fallback never returns null/9999-sort traps for real distances', () => {
    expect(dispatch.fallbackEtaSeconds(3)).toBe(Math.max(60, Math.round((3 / 30) * 3600)));
    expect(dispatch.fallbackEtaSeconds(0.1)).toBeGreaterThan(0);
    expect(dispatch.etaOrFallback(null, 3)).toBe(dispatch.fallbackEtaSeconds(3));
    expect(dispatch.etaOrFallback(0, 3)).toBe(dispatch.fallbackEtaSeconds(3));
    expect(dispatch.etaOrFallback(undefined, 3)).toBe(dispatch.fallbackEtaSeconds(3));
    expect(dispatch.etaOrFallback(120, 3)).toBe(120);
  });

  it('wave prefers the fallback ETA over a missing road ETA', () => {
    // slow has no road ETA (5km → 600s fallback); fast has 40s road ETA → fast wins
    const a = { roadEtaSeconds: null, distanceKm: 1 };
    const b = { roadEtaSeconds: 40, distanceKm: 9 };
    expect(dispatch.etaOrFallback(a.roadEtaSeconds, a.distanceKm)).toBeGreaterThan(
      dispatch.etaOrFallback(b.roadEtaSeconds, b.distanceKm),
    );
  });
});

describe('stranded-claim sweep (RIDE-B-05)', () => {
  it('releases claims whose request is terminal/gone, keeps live searching claims', () => {
    const now = new Date('2026-10-04T00:00:00Z');
    expect(stranded.isClaimStranded(
      { activeDispatchRequestId: 'r1' }, { status: 'completed' }, now,
    )).toBe(true);
    expect(stranded.isClaimStranded(
      { activeDispatchRequestId: 'r1' }, null, now,
    )).toBe(true);
    expect(stranded.isClaimStranded(
      { activeDispatchRequestId: 'r1' },
      { status: 'searching', windowEndsAt: new Date('2026-10-04T00:00:00Z') }, now,
    )).toBe(false);
    expect(stranded.isClaimStranded(
      { activeDispatchRequestId: 'r1' },
      { status: 'searching', windowEndsAt: new Date('2026-10-03T00:00:00Z') }, now,
    )).toBe(true);
  });

  it('sweep releases only stranded rows (atomic CAS per provider)', async () => {
    const Provider = {
      find: jest.fn().mockReturnValue({
        select: () => ({ limit: () => ({ lean: async () => ([
          { _id: 'p-live', activeDispatchRequestId: 'req-live' },
          { _id: 'p-dead', activeDispatchRequestId: 'req-dead' },
        ]) }) }),
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const live = { status: 'searching', windowEndsAt: new Date(Date.now() + 60_000) };
    const dead = { status: 'completed' };
    const chainable = (id, hit) => ({
      select: () => ({ lean: async () => (id === hit ? (hit === 'req-live' ? live : dead) : null) }),
    });
    const fakeRequests = [
      { findById: jest.fn((id) => chainable(id, 'req-live')) },
      { findById: jest.fn((id) => chainable(id, 'req-dead')) },
    ];
    // findRequestById tries models in order; emulate by direct sweep logic here
    const now = new Date();
    expect(stranded.isClaimStranded({ activeDispatchRequestId: 'req-live' }, live, now)).toBe(false);
    expect(stranded.isClaimStranded({ activeDispatchRequestId: 'req-dead' }, dead, now)).toBe(true);
    const res = await stranded.runStrandedClaimReconcileOnce({
      now,
      targets: [{ name: 't', Provider, Requests: fakeRequests }],
    });
    expect(res.scanned).toBe(2);
    expect(res.released).toBe(1);
    expect(Provider.updateOne).toHaveBeenCalledTimes(1);
  });
});
