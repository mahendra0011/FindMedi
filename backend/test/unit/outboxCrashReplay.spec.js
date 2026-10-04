/**
 * DP-B-02 + DP-M-01: outbox crash-replay / multi-replica-ish contract.
 *
 * What the existing specs already prove (and this file must not duplicate):
 *   - outboxPollerLease.spec.js: atomic claim, stable outboxId, failed/no-handler
 *     stays PENDING with retryCount+1.
 *   - kafkaConsumerFailure.spec.js: projection failure propagates, event:done
 *     only after success, tombstone partial purge retries.
 *
 * What was still unverified (audit TODO): "real Mongo/Kafka multi-replica
 * crash-replay" — two pollers racing for the same row, a broker crash between
 * publish and mark, and the completion-marker ordering across the hop.
 *
 * Without Mongo/Kafka here this is the closest honest shape: the SAME
 * poller+consumer modules, with the store/transport mocked at the seam, driven
 * through the crash interleavings (lease lost, handler failed, success) and
 * asserting the three invariants that make crash-replay safe:
 *   1. lease contention -> exactly one publish (loser does not publish);
 *   2. failed attempt   -> retryable PENDING (never PUBLISHED/FAILED early);
 *   3. event:done       -> written only after a successful projection.
 */
import { jest } from '@jest/globals';

// ─── Poller seam ───
const pollerMocks = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  emitKafkaEvent: jest.fn(),
  deliverEvent: jest.fn(),
  recordPipelineEvent: jest.fn(),
};

jest.unstable_mockModule('../../src/models/OutboxEvent.js', () => ({
  default: {
    find: (...a) => pollerMocks.find(...a),
    findOneAndUpdate: (...a) => pollerMocks.findOneAndUpdate(...a),
    updateOne: (...a) => pollerMocks.updateOne(...a),
  },
}));
jest.unstable_mockModule('../../src/lib/kafkaProducer.js', () => ({
  emitKafkaEvent: (...a) => pollerMocks.emitKafkaEvent(...a),
}));
jest.unstable_mockModule('../../src/services/eventForwarder.js', () => ({
  deliverEvent: (...a) => pollerMocks.deliverEvent(...a),
  registerHandler: jest.fn(),
  forwardEvent: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/dataPipelineHealth.js', () => ({
  recordPipelineEvent: (...a) => pollerMocks.recordPipelineEvent(...a),
  markPipelineStopped: jest.fn(),
}));

// ─── Consumer seam (same file: proves the cross-hop marker ordering) ───
const consumerRedis = {
  isOpen: true,
  get: jest.fn(async () => null),
  set: jest.fn(async () => true),
  incr: jest.fn(async () => 1),
  expire: jest.fn(async () => true),
};
const consumerReady = jest.fn(() => true);
const upsertProviderLocationCache = jest.fn();
const removeProviderFromCache = jest.fn();
const validateInbound = jest.fn();

jest.unstable_mockModule('../../src/config/kafka.js', () => ({
  KAFKA_TOPICS: {},
  KAFKA_CLIENT_ID: 'test',
  KAFKA_BOOTSTRAP_SERVERS: '',
  isKafkaConfigured: () => false,
}));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: consumerRedis,
  isRedisReady: (...a) => consumerReady(...a),
}));
jest.unstable_mockModule('../../src/lib/h3Cache.js', () => ({
  upsertProviderLocationCache: (...a) => upsertProviderLocationCache(...a),
  removeProviderFromCache: (...a) => removeProviderFromCache(...a),
}));
jest.unstable_mockModule('../../src/events/schemaRegistry.js', () => ({
  validateInbound: (...a) => validateInbound(...a),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { pollAndProcessOutbox } = await import('../../src/services/outboxPollerService.js');
const { handleIncomingEvent } = await import('../../src/services/kafkaConsumerService.js');

const queryFor = (events) => {
  const q = {
    sort: jest.fn(() => q),
    limit: jest.fn(() => q),
    lean: jest.fn(async () => events),
  };
  return q;
};

const ROW = {
  _id: 'crash-row-1',
  aggregateType: 'ride',
  aggregateId: 'ride-1',
  destinationTopic: 'findmedi.dispatch.booking-events.v1',
  eventType: 'ride.created',
  payload: { h3Cell: '8828308281fffff' },
  retryCount: 0,
};

describe('DP-B-02/DP-M-01 crash-replay contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumerRedis.isOpen = true;
    consumerRedis.get.mockResolvedValue(null);
    pollerMocks.find.mockReturnValue(queryFor([ROW]));
    pollerMocks.findOneAndUpdate.mockReturnValue({ lean: async () => ({ ...ROW }) });
    pollerMocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
    pollerMocks.emitKafkaEvent.mockResolvedValue({ deliveredTo: 'kafka_broker' });
    pollerMocks.deliverEvent.mockResolvedValue({ delivered: true });
    upsertProviderLocationCache.mockResolvedValue(undefined);
  });

  it('lease contention: the replica that loses the CAS never publishes', async () => {
    // Replica A wins the claim; replica B (same row, crashed/expired lease
    // replay) finds the row already owned -> findOneAndUpdate returns null.
    pollerMocks.findOneAndUpdate
      .mockReturnValueOnce({ lean: async () => ({ ...ROW }) })
      .mockReturnValueOnce({ lean: async () => null });

    await pollAndProcessOutbox(); // winner publishes
    const afterWinner = pollerMocks.emitKafkaEvent.mock.calls.length;

    pollerMocks.find.mockReturnValueOnce(queryFor([{ ...ROW, status: 'PROCESSING' }]));
    await pollAndProcessOutbox(); // loser replays the same row

    expect(afterWinner).toBe(1);
    // No second publish for the lost lease.
    expect(pollerMocks.emitKafkaEvent.mock.calls.length).toBe(1);
  });

  it('failed attempt stays retryable: PENDING + retryCount+1, never PUBLISHED', async () => {
    pollerMocks.emitKafkaEvent.mockResolvedValueOnce({ deliveredTo: 'in_memory_spine' });
    pollerMocks.deliverEvent.mockResolvedValueOnce({ delivered: false, reason: 'handler-failed' });

    await pollAndProcessOutbox();

    expect(pollerMocks.updateOne).toHaveBeenCalledTimes(1);
    const set = pollerMocks.updateOne.mock.calls[0][1].$set;
    expect(set).toMatchObject({ status: 'PENDING', retryCount: 1 });
    expect(set.lastError).toMatch(/handler-failed/);
  });

  it('event:done is written only after a successful projection', async () => {
    // Failure first: marker must NOT be written (else the retry is suppressed).
    upsertProviderLocationCache.mockRejectedValueOnce(new Error('cache write failed'));
    await expect(
      handleIncomingEvent('booking-topic', {
        eventType: 'provider.presence.online',
        aggregateId: 'provider-1',
        payload: { providerId: 'provider-1', providerType: 'rider', lat: 23, lng: 79 },
        outboxId: 'crash-outbox-1',
      }),
    ).rejects.toThrow('cache write failed');
    expect(consumerRedis.set).not.toHaveBeenCalledWith(
      'event:done:crash-outbox-1',
      expect.anything(),
      expect.anything(),
    );

    // Success next: the same outboxId now completes and IS marked done.
    upsertProviderLocationCache.mockResolvedValueOnce(undefined);
    await expect(
      handleIncomingEvent('booking-topic', {
        eventType: 'provider.presence.online',
        aggregateId: 'provider-1',
        payload: { providerId: 'provider-1', providerType: 'rider', lat: 23, lng: 79 },
        outboxId: 'crash-outbox-1',
      }),
    ).resolves.toBe(true);
    expect(consumerRedis.set).toHaveBeenCalledWith('event:done:crash-outbox-1', '1', { EX: 86400 });
  });
});
