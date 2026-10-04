/**
 * DP-M-01/DL-M-06: delete/revoke freshness — the search tier cannot stay
 * behind the Mongo erasure.
 *
 * Two halves, one invariant ("no stale analytics copy after erasure"):
 *   1. deletionService.executeDeletion runs purge_search_index with the SAME
 *      subject id and still emits the user.deleted tombstone (so the lake +
 *      any other analytics copy learns about it through the outbox);
 *   2. the consumer fan-out for user.deleted attempts BOTH purges and fails
 *      the event when either fails, so the outbox retry (not a log line) is
 *      what finishes erasure propagation.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── deletionService seam ───
const deleteMany = jest.fn(async () => ({ deletedCount: 1 }));
jest.unstable_mockModule('../../src/models/RefreshToken.js', () => ({
  default: { deleteMany: (...a) => deleteMany(...a) },
}));
// Chainable: production calls User.findById(id).select('_id email').
const userFindById = jest.fn(() => ({ select: () => Promise.resolve({ _id: 'user-7' }) }));
const userUpdateOne = jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 }));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findById: (...a) => userFindById(...a),
    updateOne: (...a) => userUpdateOne(...a),
  },
}));
const purgeUserFromSearch = jest.fn(async () => ({
  status: 'ok',
  detail: 'purged 2 doc(s)',
  purged: {},
}));
jest.unstable_mockModule('../../src/services/opensearchIndexer.js', () => ({
  purgeUserFromSearch: (...a) => purgeUserFromSearch(...a),
}));
const writeOutboxEvent = jest.fn(async () => ({ _id: 'tombstone-1' }));
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({
  writeOutboxEvent: (...a) => writeOutboxEvent(...a),
  executeWithOutbox: async (fn) => fn(null),
}));

// ─── consumer seam ───
const consumerRedis = {
  isOpen: false,
  get: jest.fn(async () => null),
  set: jest.fn(async () => true),
  incr: jest.fn(),
  expire: jest.fn(),
};
jest.unstable_mockModule('../../src/config/kafka.js', () => ({
  KAFKA_TOPICS: {},
  KAFKA_CLIENT_ID: 'test',
  KAFKA_BOOTSTRAP_SERVERS: '',
  isKafkaConfigured: () => false,
}));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: consumerRedis,
  isRedisReady: () => false,
}));
jest.unstable_mockModule('../../src/lib/h3Cache.js', () => ({
  upsertProviderLocationCache: jest.fn(),
  removeProviderFromCache: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/eventForwarder.js', () => ({
  registerHandler: jest.fn(),
  forwardEvent: jest.fn(),
}));
jest.unstable_mockModule('../../src/events/schemaRegistry.js', () => ({
  validateInbound: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/dataPipelineHealth.js', () => ({
  recordPipelineEvent: jest.fn(),
  markPipelineStopped: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
const lakePurge = jest.fn(async () => ({ purged: 0 }));
jest.unstable_mockModule('../../src/jobs/lakeOffload.job.js', () => ({
  purgeUserFromLakeManifests: (...a) => lakePurge(...a),
}));

const { executeDeletion } = await import('../../src/services/deletionService.js');

describe('delete/revoke freshness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    purgeUserFromSearch.mockResolvedValue({
      status: 'ok',
      detail: 'purged 2 doc(s)',
      purged: {},
    });
  });

  it('erasure purges the search tier with the same subject id and still emits the tombstone', async () => {
    const { steps, failed } = await executeDeletion('user-7', { reason: 'erasure' });

    expect(purgeUserFromSearch).toHaveBeenCalledWith('user-7');
    expect(writeOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.deleted', aggregateId: 'user-7' }),
    );
    expect(failed).toEqual([]);
    expect(steps.find((s) => s.name === 'purge_search_index')?.status).toBe('ok');
  });

  it('a failed search purge fails the certificate step but does not suppress the tombstone', async () => {
    purgeUserFromSearch.mockRejectedValueOnce(new Error('OpenSearch unavailable'));

    const { steps, failed } = await executeDeletion('user-7');

    expect(steps.find((s) => s.name === 'purge_search_index')?.status).toBe('failed');
    expect(failed).toContain('purge_search_index');
    // Propagation must try harder, not quieter, on a partial chain.
    expect(writeOutboxEvent).toHaveBeenCalled();
  });

  it('consumer tombstone fan-out fails the event when either analytics purge fails', async () => {
    // One shared opensearch mock serves both deletionService (static import)
    // and the consumer (dynamic import): the first mock registration wins, so
    // a second factory would be silently ignored.
    purgeUserFromSearch.mockRejectedValueOnce(new Error('OpenSearch unavailable'));
    lakePurge.mockResolvedValueOnce({ purged: 0 });
    const { handleIncomingEvent } = await import(
      '../../src/services/kafkaConsumerService.js'
    );

    await expect(
      handleIncomingEvent('tombstone-topic', {
        eventType: 'user.deleted',
        aggregateId: 'user-7',
        payload: { userId: 'user-7' },
        outboxId: 'tombstone-retry-1',
      }),
    ).rejects.toThrow('purge incomplete');
    expect(purgeUserFromSearch).toHaveBeenCalledWith('user-7');
  });
});
