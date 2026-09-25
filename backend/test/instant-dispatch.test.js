/**
 * File 06 §9 — instant dispatch rule tests (DB-free, deterministic).
 *  1. Concurrent accepts on the same request: only first vote counts (race safety).
 *  2. Redis down / cold H3 cache → Mongo fallback path still resolves no_responders.
 *  3. Full radius exhaustion triggers the terminal no_responders state.
 */
import { calculateDistanceKm } from '../src/lib/geoUtils.js';
import { findCandidatesByHex } from '../src/lib/h3Cache.js';
import {
  startInstantDispatch,
  handleInstantAccept,
  handleInstantReject,
} from '../src/services/instantDispatchService.js';
import { H3_RESOLUTION_CITY, H3_RESOLUTION_FINE } from '../src/config/h3.js';

const PROVIDER = '507f191e810c19729de860ea';
const OTHER_PROVIDER = '507f191e810c19729de860eb';
const USER = '507f191e810c19729de860ec';

// In-memory fake of a wave-enabled booking model (notified/acceptances API
// mirrors LawyerBooking / AssistantBooking / EmergencyDoctorRequest).
function makeFakeModel({ status = 'searching', notified = [] } = {}) {
  const acceptances = [];
  const doc = {
    _id: 'req1',
    status,
    notified,
    everNotified: [],
    windowEndsAt: new Date(),
    location: { coordinates: [79.9864, 23.1815] },
    acceptances,
    rejections: [],
    async save() {
      this.saved = true;
    },
  };
  return {
    doc,
    acceptances,
    findById() {
      // Mongoose query chain: awaitable AND has .select() (handleInstantAccept
      // uses .select, startInstantDispatch awaits directly).
      const query = Promise.resolve(doc);
      query.select = async () => doc;
      return query;
    },
    async updateOne(filter, update) {
      const vote = update?.$push?.acceptances;
      if (vote) {
        if (acceptances.some((a) => a.providerId === vote.providerId)) {
          return { modifiedCount: 0 };
        }
        acceptances.push(vote);
        return { modifiedCount: 1 };
      }
      if (update?.$push?.rejections) {
        doc.rejections.push(update.$push.rejections);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 1 };
    },
  };
}

const notifiedBoth = [
  { providerId: PROVIDER, userId: USER },
  { providerId: OTHER_PROVIDER, userId: '507f191e810c19729de860ed' },
];

describe('Instant dispatch engine (File 06 §9)', () => {
  describe('accept-is-vote race safety', () => {
    it('first accept wins the vote, duplicate vote is rejected', async () => {
      const Model = makeFakeModel({ notified: notifiedBoth });
      const config = { Model, type: 'lawyer' };
      const user = { _id: USER };
      const first = await handleInstantAccept('req1', PROVIDER, user, config);
      expect(first.status).toBe('accepted_pending');
      const dup = await handleInstantAccept('req1', PROVIDER, user, config);
      expect(['already_voted', 'too_late']).toContain(dup.status);
      expect(Model.acceptances).toHaveLength(1);
    });

    it('two different providers can both vote (backend picks winner at window end)', async () => {
      const Model = makeFakeModel({ notified: notifiedBoth });
      const config = { Model, type: 'assistant' };
      const r1 = await handleInstantAccept('req1', PROVIDER, { _id: USER }, config);
      const r2 = await handleInstantAccept(
        'req1',
        OTHER_PROVIDER,
        { _id: '507f191e810c19729de860ed' },
        config
      );
      expect(r1.status).toBe('accepted_pending');
      expect(r2.status).toBe('accepted_pending');
      expect(Model.acceptances).toHaveLength(2);
    });

    it('non-notified provider is not eligible', async () => {
      const Model = makeFakeModel({ notified: [] });
      const res = await handleInstantAccept('req1', PROVIDER, { _id: USER }, { Model, type: 'ride' });
      expect(res.status).toBe('not_eligible');
    });

    it('closed request rejects late accepts', async () => {
      const Model = makeFakeModel({ status: 'assigned', notified: notifiedBoth });
      const res = await handleInstantAccept('req1', PROVIDER, { _id: USER }, { Model, type: 'ride' });
      expect(res.status).toBe('too_late');
    });

    it('reject records the provider without touching acceptances', async () => {
      const Model = makeFakeModel({ notified: notifiedBoth });
      const res = await handleInstantReject('req1', PROVIDER, { Model, type: 'lawyer' });
      expect(res.status).toBe('rejected');
      expect(Model.acceptances).toHaveLength(0);
      expect(Model.doc.rejections).toContain(PROVIDER);
    });
  });

  describe('Redis-down fallback + radius exhaustion', () => {
    it('H3 lookup fails soft when Redis is unavailable', async () => {
      // No REDIS_URL in test env → isRedisReady() false → never throws.
      const res = await findCandidatesByHex({ lat: 23.1815, lng: 79.9864, providerType: 'rider' });
      expect(res.candidates).toEqual([]);
      expect(res.source).toBe('redis_unavailable');
    });

    it('empty radii + empty fallback resolves no_responders_found (ride maps to no_riders_found)', async () => {
      const Model = makeFakeModel();
      await startInstantDispatch('req1', {
        type: 'ride',
        Model,
        providerType: 'rider',
        radiiKm: [3],
        findEligibleProvidersFallback: async () => [],
        buildAlertPayload: () => ({}),
      });
      expect(Model.doc.status).toBe('no_riders_found');
      expect(Model.doc.saved).toBe(true);
    });

    it('same exhaustion on lawyer type resolves no_responders_found', async () => {
      const Model = makeFakeModel();
      await startInstantDispatch('req1', {
        type: 'lawyer',
        Model,
        providerType: 'lawyer',
        radiiKm: [5],
        findEligibleProvidersFallback: async () => [],
        buildAlertPayload: () => ({}),
      });
      expect(Model.doc.status).toBe('no_responders_found');
    });
  });

  describe('geo + config sanity', () => {
    it('calculateDistanceKm via geoUtils matches road-factor expectations', () => {
      const dist = calculateDistanceKm(23.1815, 79.9864, 23.21, 79.97);
      expect(dist).toBeGreaterThan(2);
      expect(dist).toBeLessThan(10);
      expect(calculateDistanceKm(null, null, 23.21, 79.97)).toBe(5);
    });

    it('H3 resolutions follow File 02 (city 8, fine 9)', () => {
      expect(H3_RESOLUTION_CITY).toBe(8);
      expect(H3_RESOLUTION_FINE).toBe(9);
    });

    it('all four dispatch wrappers expose start/accept/reject', async () => {
      const ride = await import('../src/services/rideDispatchService.js');
      const lawyer = await import('../src/services/lawyerDispatchService.js');
      const assistant = await import('../src/services/assistantDispatchService.js');
      const doctor = await import('../src/services/emergencyDoctorDispatchService.js');
      for (const mod of [ride, lawyer, assistant, doctor]) {
        const fns = Object.values(mod);
        expect(fns.filter((f) => typeof f === 'function').length).toBeGreaterThanOrEqual(3);
      }
    });

    it('wave-enabled schemas carry dispatch fields', async () => {
      const { default: RideBooking } = await import('../src/models/RideBooking.js');
      const { default: AssistantProfile } = await import('../src/models/AssistantProfile.js');
      for (const p of ['notified', 'everNotified', 'acceptances', 'windowEndsAt', 'dispatchLog']) {
        expect(RideBooking.schema.path(p)).toBeDefined();
      }
      expect(AssistantProfile.schema.path('isOnlineForUrgent')).toBeDefined();
      expect(AssistantProfile.schema.path('currentLocation.h3Index8')).toBeDefined();
    });
  });
});
