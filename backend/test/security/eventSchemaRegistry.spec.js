/**
 * DP-M-01 — event schema registry: runtime enforcement + CI compatibility.
 *
 * Uses dynamic imports so the Kafka env can be scrubbed before config/kafka.js
 * is evaluated (a host with KAFKA_BOOTSTRAP_SERVERS set would otherwise send
 * these cases at a real broker).
 */
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { jest } from '@jest/globals';

process.env.KAFKA_BOOTSTRAP_SERVERS = '';
delete process.env.SCHEMA_ENFORCEMENT;

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: mockLogger }));

const { KAFKA_TOPICS } = await import('../../src/config/kafka.js');
const registry = await import('../../src/events/schemaRegistry.js');
const { emitKafkaEvent } = await import('../../src/lib/kafkaProducer.js');
const compat = await import('../../scripts/check-event-schema-compat.mjs');

const {
  serializeEvent,
  validateInbound,
  registerSchema,
  lookupEntry,
  listEntries,
  resetWarningsForTests,
  EventSchemaValidationError,
  EVENT_SCHEMA_ENTRIES,
} = registry;

const BOOKING = KAFKA_TOPICS.BOOKING_EVENTS;
const RETRY_5S = KAFKA_TOPICS.RETRY_5S;

const validRideStarted = () => ({
  eventType: 'ride.dispatch_started',
  aggregateType: 'RideBooking',
  aggregateId: '652f00000000000000000001',
  status: 'searching',
});

const validRideAssigned = () => ({
  eventType: 'ride.assigned',
  aggregateType: 'RideBooking',
  aggregateId: '652f00000000000000000001',
  providerId: '652f000000000000000000aa',
});

beforeEach(() => {
  resetWarningsForTests();
  delete process.env.SCHEMA_ENFORCEMENT;
  jest.clearAllMocks();
});

describe('DP-M-01 · serializeEvent (producer choke point)', () => {
  it('builds the standard wire envelope with registry-backed schemaVersion', () => {
    const env = serializeEvent(BOOKING, 'agg-1', validRideStarted());
    expect(env.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(typeof env.timestampEpochMs).toBe('number');
    expect(env.topic).toBe(BOOKING);
    expect(env.key).toBe('agg-1');
    expect(env.payload.emittedBy).toBe('findmedi-core');
    expect(env.payload.schemaVersion).toBe('v1');
    expect(env.payload.status).toBe('searching');
  });

  it('stringifies the key even for ObjectId-shaped input', () => {
    const env = serializeEvent(BOOKING, { toString: () => '652fdeadbeef' }, validRideStarted());
    expect(env.key).toBe('652fdeadbeef');
  });

  it('throws EventSchemaValidationError when a required consumer field is missing', () => {
    expect(() =>
      serializeEvent(BOOKING, 'k', { eventType: 'ride.assigned', aggregateId: 'a1' })
    ).toThrow(EventSchemaValidationError);
    try {
      serializeEvent(BOOKING, 'k', { eventType: 'ride.assigned', aggregateId: 'a1' });
    } catch (err) {
      expect(err.message).toContain('outbound');
      expect(err.message).toContain('providerId');
    }
  });

  it('validates the JSON-serializable wire form, so ObjectId-like values pass', () => {
    const idLike = { toJSON: () => '652f00000000000000000001' };
    const env = serializeEvent(BOOKING, 'k', { ...validRideStarted(), aggregateId: idLike });
    expect(env.payload.aggregateId).toBe('652f00000000000000000001');
  });

  it('rejects structurally wrong types (array where scalar is required)', () => {
    expect(() =>
      serializeEvent(BOOKING, 'k', { ...validRideStarted(), aggregateId: ['a', 'b'] })
    ).toThrow(EventSchemaValidationError);
  });

  it('SCHEMA_ENFORCEMENT=warn logs the violation instead of throwing', () => {
    process.env.SCHEMA_ENFORCEMENT = 'warn';
    expect(() =>
      serializeEvent(BOOKING, 'k', { eventType: 'ride.assigned', aggregateId: 'a1' })
    ).not.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('[schema] outbound'));
  });

  it('SCHEMA_ENFORCEMENT=off skips validation but still stamps schemaVersion', () => {
    process.env.SCHEMA_ENFORCEMENT = 'off';
    const env = serializeEvent(BOOKING, 'k', { eventType: 'ride.assigned', aggregateId: 'a1' });
    expect(env.payload.schemaVersion).toBe('v1');
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('warns exactly once for an unregistered eventType and passes it through', () => {
    const env = serializeEvent(BOOKING, 'k', {
      eventType: 'nonsense.type',
      aggregateId: 'a1',
    });
    expect(env.payload.schemaVersion).toBe('unregistered');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    serializeEvent(BOOKING, 'k', { eventType: 'nonsense.type', aggregateId: 'a1' });
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('validates retry frames through the topic wildcard entry', () => {
    const env = serializeEvent(RETRY_5S, 'k', {
      eventType: 'ride.dispatch_started',
      aggregateId: 'a1',
      retryCount: 1,
    });
    expect(env.payload.retryCount).toBe(1);
    expect(() =>
      serializeEvent(RETRY_5S, 'k', { eventType: 'ride.dispatch_started', aggregateId: 'a1' })
    ).toThrow(/retryCount/);
  });
});

describe('DP-M-01 · validateInbound (consumer choke point)', () => {
  it('accepts a frame built by serializeEvent', () => {
    const frame = serializeEvent(BOOKING, 'k', validRideAssigned());
    expect(() => validateInbound(BOOKING, frame)).not.toThrow();
  });

  it('throws when a registered payload drifted from the schema', () => {
    const frame = serializeEvent(BOOKING, 'k', validRideStarted());
    frame.payload = { eventType: 'ride.assigned', aggregateId: 'a1' }; // providerId stripped
    expect(() => validateInbound(BOOKING, frame)).toThrow(EventSchemaValidationError);
    expect(() => validateInbound(BOOKING, frame)).toThrow(/inbound/);
  });

  it('throws on a malformed frame (missing envelope fields)', () => {
    expect(() => validateInbound(BOOKING, { payload: { eventType: 'x' } })).toThrow(/frame\./);
  });

  it('does not throw in off mode', () => {
    process.env.SCHEMA_ENFORCEMENT = 'off';
    expect(() =>
      validateInbound(BOOKING, { payload: { eventType: 'ride.assigned', aggregateId: 'a1' } })
    ).not.toThrow();
  });

  it('warns once for unknown eventTypes on a known topic', () => {
    const frame = serializeEvent(BOOKING, 'k', { eventType: 'mystery.type', aggregateId: 'x' });
    expect(() => validateInbound(BOOKING, frame)).not.toThrow();
    expect(() => validateInbound(BOOKING, frame)).not.toThrow();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('DP-M-01 · registry mechanics', () => {
  it('lookup prefers an exact entry over the topic wildcard', () => {
    const exact = lookupEntry(BOOKING, 'ride.assigned');
    const wildcard = lookupEntry(RETRY_5S, 'ride.dispatch_started');
    expect(exact?.eventType).toBe('ride.assigned');
    expect(exact?.eventType).not.toBe('*');
    expect(wildcard?.eventType).toBeNull();
    expect(wildcard?.topic).toBe(RETRY_5S);
  });

  it('registerSchema installs a live contract for new topics', () => {
    registerSchema({
      topic: 'findmedi.test.dp-m-01',
      eventType: 'test.thing',
      schema: z.object({ eventType: z.literal('test.thing'), n: z.number() }),
    });
    const env = serializeEvent('findmedi.test.dp-m-01', 'k', { eventType: 'test.thing', n: 7 });
    expect(env.payload.n).toBe(7);
    expect(() =>
      serializeEvent('findmedi.test.dp-m-01', 'k', { eventType: 'test.thing', n: 'seven' })
    ).toThrow(EventSchemaValidationError);
  });

  it('covers every KAFKA_TOPICS topic with at least one entry', () => {
    for (const topic of Object.values(KAFKA_TOPICS)) {
      expect(listEntries().some((e) => e.topic === topic)).toBe(true);
    }
  });
});

describe('DP-M-01 · emitKafkaEvent integration', () => {
  it('refuses to deliver an invalid payload (throws before the in-memory spine)', async () => {
    await expect(
      emitKafkaEvent(BOOKING, 'k', { eventType: 'ride.assigned', aggregateId: 'a1' })
    ).rejects.toThrow(EventSchemaValidationError);
  });

  it('delivers a valid payload to the in-memory spine', async () => {
    const res = await emitKafkaEvent(BOOKING, 'k', validRideStarted());
    expect(res).toMatchObject({ success: true, deliveredTo: 'in_memory_spine' });
    expect(res.eventId).toBeTruthy();
  });
});

describe('DP-M-01 · CI compatibility gate', () => {
  it('reports no problems against the current tree', () => {
    const { problems } = compat.runChecks();
    expect(problems).toEqual([]);
  });

  it('sees every consumer case and every static producer literal', () => {
    const cases = compat.collectConsumerCases();
    expect(cases).toContain('ride.completed');
    expect(cases).toContain('emergency_sos.dispatch_started');
    expect(cases).toContain('stock.below.reorder.point');
    const { literals } = compat.collectProducerEventTypes();
    expect(literals).toContain('RideCompleted.v1');
    expect(literals).toContain('medicine.dispensed');
    expect(literals).toContain('dispatch.provider.assigned');
  });

  it('pins the producer and consumer to the registry (source pins)', () => {
    const producer = readFileSync(
      new URL('../../src/lib/kafkaProducer.js', import.meta.url),
      'utf8'
    );
    expect(producer).toContain('serializeEvent(topic, key, payload)');
    expect(producer).not.toContain('validateAndEnvelopEvent(');
    const consumer = readFileSync(
      new URL('../../src/services/kafkaConsumerService.js', import.meta.url),
      'utf8'
    );
    expect(consumer).toContain('validateInbound(topic, enveloped)');
  });

  it('ships one valid + one negative fixture per entry', () => {
    expect(EVENT_SCHEMA_ENTRIES.length).toBeGreaterThanOrEqual(31);
    for (const entry of EVENT_SCHEMA_ENTRIES) {
      expect(entry.fixture).toMatch(/\.json$/);
      expect(entry.version).toBe('v1');
    }
  });
});
