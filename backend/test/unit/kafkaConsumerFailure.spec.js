import { jest } from '@jest/globals';

const upsertProviderLocationCache = jest.fn();
const removeProviderFromCache = jest.fn();
const redisClient = { isOpen: false, get: jest.fn(), set: jest.fn(), incr: jest.fn(), expire: jest.fn() };
const isRedisReady = jest.fn(() => false);
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
const recordPipelineEvent = jest.fn();
const markPipelineStopped = jest.fn();
const registerHandler = jest.fn();
const forwardEvent = jest.fn();
const validateInbound = jest.fn();
const purgeUserFromSearch = jest.fn();
const purgeUserFromLakeManifests = jest.fn();
const medicineDoc = { _id: 'med-1', name: 'Test medicine', currentStock: 5, reorderLevel: 10, purchasePrice: 2, category: 'Other', hospitalId: 'hospital-1', save: jest.fn() };
const medicineFindById = jest.fn();
const purchaseOrderFindOne = jest.fn();
const purchaseOrderCreate = jest.fn();
const supplierFindOne = jest.fn();

jest.unstable_mockModule('../../src/config/kafka.js', () => ({
  KAFKA_TOPICS: {}, KAFKA_CLIENT_ID: 'test', KAFKA_BOOTSTRAP_SERVERS: '', isKafkaConfigured: () => false,
}));
jest.unstable_mockModule('../../src/config/redis.js', () => ({ redisClient, isRedisReady }));
jest.unstable_mockModule('../../src/lib/h3Cache.js', () => ({ upsertProviderLocationCache, removeProviderFromCache }));
jest.unstable_mockModule('../../src/services/eventForwarder.js', () => ({ registerHandler, forwardEvent }));
jest.unstable_mockModule('../../src/events/schemaRegistry.js', () => ({ validateInbound }));
jest.unstable_mockModule('../../src/services/dataPipelineHealth.js', () => ({ recordPipelineEvent, markPipelineStopped }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: logger }));
jest.unstable_mockModule('../../src/services/opensearchIndexer.js', () => ({ purgeUserFromSearch }));
jest.unstable_mockModule('../../src/jobs/lakeOffload.job.js', () => ({ purgeUserFromLakeManifests }));
jest.unstable_mockModule('../../src/models/Medicine.js', () => ({ default: { findById: medicineFindById } }));
jest.unstable_mockModule('../../src/models/PurchaseOrder.js', () => ({ default: { findOne: purchaseOrderFindOne, create: purchaseOrderCreate } }));
jest.unstable_mockModule('../../src/models/Supplier.js', () => ({ default: { findOne: supplierFindOne } }));

const { handleIncomingEvent } = await import('../../src/services/kafkaConsumerService.js');

describe('Kafka consumer failure propagation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('propagates a failed projection so outbox delivery remains retryable', async () => {
    const failure = new Error('cache write failed');
    upsertProviderLocationCache.mockRejectedValueOnce(failure);

    await expect(handleIncomingEvent('booking-topic', {
      eventType: 'provider.presence.online',
      aggregateId: 'provider-1',
      payload: { providerId: 'provider-1', providerType: 'rider', lat: 23, lng: 79 },
      outboxId: 'outbox-1',
    })).rejects.toBe(failure);

    expect(redisClient.set).not.toHaveBeenCalled();
  });

  it('marks the outbox event done only after a successful projection', async () => {
    upsertProviderLocationCache.mockResolvedValueOnce(undefined);
    redisClient.isOpen = true;
    isRedisReady.mockReturnValue(true);

    await expect(handleIncomingEvent('booking-topic', {
      eventType: 'provider.presence.online',
      aggregateId: 'provider-1',
      payload: { providerId: 'provider-1', providerType: 'rider', lat: 23, lng: 79 },
      outboxId: 'outbox-2',
    })).resolves.toBe(true);

    expect(redisClient.set).toHaveBeenCalledWith('event:done:outbox-2', '1', { EX: 86400 });
    redisClient.isOpen = false;
    isRedisReady.mockReturnValue(false);
  });

  it('retries a user tombstone when either analytics copy could not be purged', async () => {
    purgeUserFromSearch.mockRejectedValueOnce(new Error('OpenSearch unavailable'));
    purgeUserFromLakeManifests.mockResolvedValueOnce({ purged: 0 });

    await expect(handleIncomingEvent('tombstone-topic', {
      eventType: 'user.deleted', aggregateId: 'user-7', payload: { userId: 'user-7' }, outboxId: 'outbox-delete-7',
    })).rejects.toThrow('purge incomplete');
    expect(purgeUserFromSearch).toHaveBeenCalledWith('user-7');
    expect(purgeUserFromLakeManifests).toHaveBeenCalledWith('user-7');
    expect(redisClient.set).not.toHaveBeenCalled();
  });

  it('does not decrement pharmacy stock a second time while handling the dispense event', async () => {
    medicineDoc.save.mockClear();
    medicineFindById.mockResolvedValueOnce(medicineDoc);
    purchaseOrderFindOne.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ _id: 'existing-open-po' }) });

    await expect(handleIncomingEvent('pharmacy-topic', {
      eventType: 'medicine.dispensed', aggregateId: 'hospital-1',
      payload: { medicineId: 'med-1', quantity: 2 },
    })).resolves.toBe(true);

    expect(medicineDoc.currentStock).toBe(5);
    expect(medicineDoc.save).not.toHaveBeenCalled();
    expect(purchaseOrderFindOne).toHaveBeenCalled();
  });
});
