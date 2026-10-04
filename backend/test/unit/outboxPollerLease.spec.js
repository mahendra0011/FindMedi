import { jest } from '@jest/globals';

const mocks = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  emitKafkaEvent: jest.fn(),
  deliverEvent: jest.fn(),
  recordPipelineEvent: jest.fn(),
};

jest.unstable_mockModule('../../src/models/OutboxEvent.js', () => ({ default: {
  find: (...args) => mocks.find(...args),
  findOneAndUpdate: (...args) => mocks.findOneAndUpdate(...args),
  updateOne: (...args) => mocks.updateOne(...args),
} }));
jest.unstable_mockModule('../../src/lib/kafkaProducer.js', () => ({ emitKafkaEvent: (...args) => mocks.emitKafkaEvent(...args) }));
jest.unstable_mockModule('../../src/services/eventForwarder.js', () => ({ deliverEvent: (...args) => mocks.deliverEvent(...args) }));
jest.unstable_mockModule('../../src/services/dataPipelineHealth.js', () => ({ recordPipelineEvent: (...args) => mocks.recordPipelineEvent(...args) }));

const { pollAndProcessOutbox } = await import('../../src/services/outboxPollerService.js');

function queryFor(events) {
  const query = {
    sort: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => events),
  };
  return query;
}

describe('outbox poller database lease', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.find.mockReturnValue(queryFor([{ _id: 'evt-1', aggregateType: 'ride', aggregateId: 'ride-1', destinationTopic: 'topic', eventType: 'ride.created', payload: { outboxId: 'forged' }, retryCount: 0 }]));
    mocks.findOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: 'evt-1', aggregateType: 'ride', aggregateId: 'ride-1', destinationTopic: 'topic', eventType: 'ride.created', payload: { outboxId: 'forged' }, retryCount: 0 }) });
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mocks.emitKafkaEvent.mockResolvedValue({ deliveredTo: 'kafka_broker' });
    mocks.deliverEvent.mockResolvedValue({ delivered: true });
  });

  it('claims with an atomic status/lease update before publishing', async () => {
    await pollAndProcessOutbox();
    expect(mocks.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ _id: 'evt-1', $or: expect.any(Array) });
    expect(mocks.findOneAndUpdate.mock.calls[0][1].$set).toMatchObject({ status: 'PROCESSING', processingBy: expect.any(String) });
    expect(mocks.emitKafkaEvent).toHaveBeenCalledTimes(1);
    expect(mocks.updateOne.mock.calls[0][0]).toMatchObject({ _id: 'evt-1', status: 'PROCESSING', processingBy: expect.any(String) });
    expect(mocks.updateOne.mock.calls[0][1].$set).toMatchObject({ status: 'PUBLISHED', processingBy: null, processingAt: null });
  });

  it('does not publish if another worker already owns the event', async () => {
    mocks.findOneAndUpdate.mockReturnValueOnce({ lean: async () => null });
    await pollAndProcessOutbox();
    expect(mocks.emitKafkaEvent).not.toHaveBeenCalled();
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('keeps the stable outbox ID authoritative over payload fields', async () => {
    await pollAndProcessOutbox();
    expect(mocks.emitKafkaEvent.mock.calls[0][2].outboxId).toBe('evt-1');
  });

  it('does not mark an in-memory event published when its consumer fails', async () => {
    mocks.emitKafkaEvent.mockResolvedValueOnce({ deliveredTo: 'in_memory_spine' });
    mocks.deliverEvent.mockResolvedValueOnce({ delivered: false, reason: 'handler-failed' });

    await pollAndProcessOutbox();

    expect(mocks.updateOne).toHaveBeenCalledTimes(1);
    expect(mocks.updateOne.mock.calls[0][1].$set).toMatchObject({ status: 'PENDING', retryCount: 1 });
    expect(mocks.updateOne.mock.calls[0][1].$set.lastError).toMatch(/handler-failed/);
  });

  it('waits for in-memory handlers before marking an outbox row published', async () => {
    mocks.emitKafkaEvent.mockResolvedValueOnce({ deliveredTo: 'in_memory_spine' });
    mocks.deliverEvent.mockResolvedValueOnce({ delivered: true });

    await pollAndProcessOutbox();

    expect(mocks.deliverEvent).toHaveBeenCalledWith('topic', expect.objectContaining({ outboxId: 'evt-1' }));
    expect(mocks.updateOne.mock.calls[0][1].$set.status).toBe('PUBLISHED');
  });

  it('keeps an in-memory event retryable when no consumer is registered', async () => {
    mocks.emitKafkaEvent.mockResolvedValueOnce({ deliveredTo: 'in_memory_spine' });
    mocks.deliverEvent.mockResolvedValueOnce({ delivered: false, reason: 'no-handlers' });

    await pollAndProcessOutbox();

    expect(mocks.updateOne.mock.calls[0][1].$set).toMatchObject({ status: 'PENDING', retryCount: 1 });
    expect(mocks.updateOne.mock.calls[0][1].$set.lastError).toMatch(/no-handlers/);
  });
});
