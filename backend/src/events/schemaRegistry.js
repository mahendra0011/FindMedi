import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { KAFKA_TOPICS } from '../config/kafka.js';
import logger from '../config/logger.js';

/**
 * DP-M-01 — event schema registry (the runtime half of the contract).
 *
 * The audit found `proto/matching_engine.proto` and the docs describing a
 * schema registry while `kafkaProducer.js` shipped a `validateAndEnvelopEvent`
 * that validated nothing and stamped every payload `schemaVersion: 'v1'`.
 * Consumers switch on `eventType` with a silent `default:` — so an incompatible
 * producer change shipped today would break projections with zero signal.
 *
 * This module is the enforcement point:
 *
 *   PRODUCER  serializeEvent(topic, key, payload)   — called by emitKafkaEvent
 *             before anything reaches the wire. Validates against the registered
 *             schema, on the EXACT JSON-serializable form that consumers will
 *             see (so an ObjectId that stringifies to a valid id passes, while
 *             a structurally wrong payload fails).
 *
 *   CONSUMER  validateInbound(topic, envelope)      — called by the Kafka
 *             eachMessage loop right after JSON.parse. An invalid frame throws;
 *             the consumer's existing catch logs `Consumer message skipped`
 *             and records a pipeline error. No new failure mode.
 *
 *   CI        scripts/check-event-schema-compat.mjs — completeness gate:
 *             every consumer `case`, every KAFKA_TOPICS topic, every producer
 *             literal must be registered; every entry must ship a valid fixture
 *             (the backward-compat anchor) and an invalid one.
 *
 * Design decisions worth knowing:
 *
 *   - In-repo zod registry, NOT a Confluent-style HTTP registry. The audit's
 *     underlying need is "producers and consumers agree at runtime + CI".
 *     SCHEMA_REGISTRY_URL stays reserved (documented in .env.example) for a
 *     future external registry; enforcing our own contracts needs no URL.
 *   - Loose object schemas: we require the fields consumers actually read and
 *     tolerate additive extras. A contract that rejects every new optional
 *     field gets disabled within a week, and a disabled check is no check.
 *   - Unknown eventType on a registered topic: warn-once + allow. Static
 *     producer/consumer literals are enforced in CI; a dynamic `${type}` name
 *     must not wedge prod on its first appearance. Registered + INVALID throws.
 *   - Enforcement is env-tunable: SCHEMA_ENFORCEMENT=enforce|warn|off
 *     (default enforce) so an operator can downgrade without redeploying code.
 *   - Retry/DLQ topics validate through a wildcard entry: they re-wrap any
 *     original eventType plus retryCount, so topic-exact matching would reject
 *     every forwarded failure.
 *
 * OBSERVATION (not fixed here): rides.js emits `RideCompleted.v1` while the
 * consumer handles `ride.completed`. Both names are registered (there may be an
 * external producer for the latter), but core itself never emits the name its
 * own receipt-projection case listens for.
 */

const str1 = () => z.string().min(1);
const scalar = () => z.union([z.string(), z.number()]);

/** Shared wire-frame contract (built by serializeEvent on every emit). */
const envelopeSchema = z.looseObject({
  eventId: str1(),
  timestampEpochMs: z.number().int().nonnegative(),
  topic: str1(),
  key: z.string(),
  payload: z.looseObject({}),
});

export class EventSchemaValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'EventSchemaValidationError';
    this.details = details;
  }
}

/**
 * Booking/dispatch family: the outbox always carries eventType + aggregateId
 * (aggregateType is present on every producer path but is not read anywhere —
 * typed optional rather than required, so DLQ replay identity-only frames that
 * predate a field still validate once replay carries the original payload).
 */
function bookingPayload(eventType, extra = {}) {
  return z.looseObject({
    eventType: z.literal(eventType),
    aggregateId: str1(),
    ...extra,
  });
}

/** Retry frames re-wrap any original event plus the attempt accounting. */
const retryPayload = (versionNote) =>
  z.looseObject({
    eventType: str1(),
    retryCount: z.number().int().min(1),
    aggregateId: str1().optional(),
    retryFrom: z.string().optional(),
    lastError: z.string().optional(),
    outboxId: z.string().optional(),
    ...versionNote,
  });

const DISPATCH_VERTICALS = ['ride', 'lawyer', 'assistant', 'emergency_doctor', 'emergency_sos'];

const rawEntries = [
  // ─── BOOKING_EVENTS — every in-process dispatch/booking producer ───────────
  ...DISPATCH_VERTICALS.map((v) => ({
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: `${v}.dispatch_started`,
    // Consumer reads payload.h3Cell || payload.h3Index8 (both optional) and
    // derives the vertical from eventType; instantDispatch payload is
    // { status, radiiKm } — nothing else is guaranteed.
    schema: bookingPayload(`${v}.dispatch_started`),
  })),
  ...DISPATCH_VERTICALS.map((v) => ({
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: `${v}.assigned`,
    // providerId is the projection's whole payload (engaged:provider:<id>).
    // Every producer path sends it; requiring it turns today's guarded no-op
    // into a visible schema failure at the producer.
    schema: bookingPayload(`${v}.assigned`, { providerId: str1() }),
  })),
  {
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: 'dispatch.provider.assigned',
    schema: bookingPayload('dispatch.provider.assigned', { providerId: str1() }),
  },
  {
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: 'RideBookingCreated.v1',
    schema: bookingPayload('RideBookingCreated.v1'),
  },
  {
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: 'LawyerBookingCreated.v1',
    schema: bookingPayload('LawyerBookingCreated.v1'),
  },
  {
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: 'AssistantBookingCreated.v1',
    schema: bookingPayload('AssistantBookingCreated.v1'),
  },
  {
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: 'RideCompleted.v1',
    schema: bookingPayload('RideCompleted.v1'),
  },
  {
    // External/legacy name; core's consumer case listens for this string even
    // though rides.js emits RideCompleted.v1 (see file header observation).
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    eventType: 'ride.completed',
    schema: bookingPayload('ride.completed'),
  },

  // ─── PROVIDER_PRESENCE — external producers, defensive consumer ────────────
  {
    topic: KAFKA_TOPICS.PROVIDER_PRESENCE,
    eventType: 'provider.presence.online',
    // Consumer: lat/lng guarded (`!= null`) then Number()-cast — scalars only,
    // strings accepted; providerId is String()-cast unguarded, so required.
    schema: z.looseObject({
      eventType: z.literal('provider.presence.online'),
      providerId: str1(),
      providerType: z.union([z.string(), z.number()]).nullish(),
      lat: scalar().nullish(),
      lng: scalar().nullish(),
    }),
  },
  {
    topic: KAFKA_TOPICS.PROVIDER_PRESENCE,
    eventType: 'provider.presence.offline',
    schema: z.looseObject({
      eventType: z.literal('provider.presence.offline'),
      providerId: str1(),
      providerType: z.union([z.string(), z.number()]).nullish(),
    }),
  },

  // ─── HOSPITAL_ADMISSIONS — external/other-service producers ────────────────
  // Consumer falls back to aggregateId for every id and wraps the whole body in
  // try/catch: schemas here reject structural garbage only, never scalar
  // variants mongoose can cast.
  {
    topic: KAFKA_TOPICS.HOSPITAL_ADMISSIONS,
    eventType: 'bed.allocated',
    schema: z.looseObject({
      eventType: z.literal('bed.allocated'),
      bedId: scalar().optional(),
      patientId: scalar().optional(),
      admissionId: scalar().optional(),
      hospitalId: scalar().optional(),
    }),
  },
  {
    topic: KAFKA_TOPICS.HOSPITAL_ADMISSIONS,
    eventType: 'ot.scheduled',
    schema: z.looseObject({
      eventType: z.literal('ot.scheduled'),
      otId: scalar().optional(),
      hospitalId: scalar().optional(),
      scheduledDate: z.union([z.string(), z.number()]).optional(),
    }),
  },
  {
    topic: KAFKA_TOPICS.HOSPITAL_ADMISSIONS,
    eventType: 'patient.discharged',
    schema: z.looseObject({
      eventType: z.literal('patient.discharged'),
      bedId: scalar().optional(),
      hospitalId: scalar().optional(),
      room: z.union([z.string(), z.number()]).optional(),
    }),
  },

  // ─── PHARMACY_INVENTORY — Tech 03-D, core producer (pharmacy.js) ───────────
  {
    topic: KAFKA_TOPICS.PHARMACY_INVENTORY,
    eventType: 'medicine.dispensed',
    // medicineId is required: the core producer sends no aggregateId, so a
    // frame without it cannot resolve a Medicine and the whole handler no-ops.
    // quantity stays optional — the consumer guards it (decrement) and still
    // runs the reorder-point branch without it.
    schema: z.looseObject({
      eventType: z.literal('medicine.dispensed'),
      pharmacyId: str1(),
      medicineId: scalar(),
      quantity: z.union([z.number(), z.string()]).optional(),
    }),
  },
  {
    topic: KAFKA_TOPICS.PHARMACY_INVENTORY,
    eventType: 'stock.below.reorder.point',
    schema: z.looseObject({
      eventType: z.literal('stock.below.reorder.point'),
      pharmacyId: scalar().optional(),
      medicineId: scalar().optional(),
    }),
  },

  // ─── USER_TOMBSTONES — DP-M-04 erasure propagation ─────────────────────────
  {
    topic: KAFKA_TOPICS.USER_TOMBSTONES,
    eventType: 'user.deleted',
    // The contract downstream analytics stores key on: WHICH subject, WHY
    // (erasure vs admin delete), and when. `deletedBy` is null for self-service
    // erasure (the requester is the subject).
    schema: z.looseObject({
      eventType: z.literal('user.deleted'),
      userId: str1(),
      reason: str1(),
      deletedBy: scalar().nullish(),
      deletedAt: str1(),
    }),
  },

  // ─── Telemetry / typed-message topics (no consumer switch in core) ─────────
  {
    topic: KAFKA_TOPICS.DRIVER_TELEMETRY,
    eventType: null,
    schema: z.looseObject({
      providerId: str1(),
      h3Cell: str1(),
      coordinates: z.array(z.number()).nullish(),
      speed: z.number().nullish(),
      bearing: z.number().nullish(),
    }),
  },
  {
    topic: KAFKA_TOPICS.VITALS_TELEMETRY,
    eventType: null,
    schema: z.looseObject({ patientId: str1() }),
  },
  {
    topic: KAFKA_TOPICS.SOS_ALERTS,
    eventType: null,
    schema: z.looseObject({ alertId: str1(), h3Cell: str1(), severity: str1() }),
  },
  {
    topic: KAFKA_TOPICS.LAB_ORDER_EVENTS,
    eventType: null,
    schema: z.looseObject({ labOrderId: str1(), status: str1() }),
  },
  {
    topic: KAFKA_TOPICS.BILLING_EVENTS,
    eventType: null,
    // Core neither produces nor consumes billing events (Flink/external side);
    // registration reserves the topic so coverage stays complete and any event
    // crossing it must at least be typed.
    schema: z.looseObject({ eventType: str1() }),
  },

  // ─── Retry cascade + dead-letter (wildcard: re-wrap any eventType) ─────────
  {
    topic: KAFKA_TOPICS.RETRY_5S,
    eventType: null,
    schema: retryPayload(),
  },
  {
    topic: KAFKA_TOPICS.RETRY_30S,
    eventType: null,
    schema: retryPayload(),
  },
  {
    topic: KAFKA_TOPICS.DLQ,
    eventType: null,
    schema: retryPayload(),
  },
];

const topicSlug = (topic) => {
  const slug = Object.entries(KAFKA_TOPICS).find(([, v]) => v === topic)?.[0];
  if (!slug) return String(topic).replace(/^findmedi\./, '').replace(/\./g, '-');
  return slug.toLowerCase().replace(/_/g, '-');
};

/** `src/events/fixtures/<slug>/<eventType|payload>.json` */
const fixturePathFor = (topic, eventType) =>
  `${topicSlug(topic)}/${eventType || 'payload'}.json`;

export const EVENT_SCHEMA_ENTRIES = Object.freeze(
  rawEntries.map((e) =>
    Object.freeze({
      ...e,
      version: 'v1',
      key: `${e.topic}::${e.eventType ?? '*'}`,
      fixture: fixturePathFor(e.topic, e.eventType),
    })
  )
);

const registry = new Map(EVENT_SCHEMA_ENTRIES.map((e) => [e.key, e]));
const warned = new Set();

export function registerSchema(entry) {
  const key = `${entry.topic}::${entry.eventType ?? '*'}`;
  const full = { ...entry, key, version: entry.version || 'v1' };
  registry.set(key, Object.freeze(full));
  return full;
}

export function listEntries() {
  return [...registry.values()];
}

/** Exact `(topic, eventType)` match first, then the topic's wildcard entry. */
export function lookupEntry(topic, eventType) {
  return (
    registry.get(`${topic}::${eventType ?? '*'}`) ||
    registry.get(`${topic}::*`) ||
    null
  );
}

export function getEnforcementMode() {
  const raw = String(process.env.SCHEMA_ENFORCEMENT || 'enforce').toLowerCase();
  return raw === 'warn' || raw === 'off' ? raw : 'enforce';
}

function warnOnce(topic, eventType) {
  const k = `${topic}::${eventType ?? '*'}`;
  if (warned.has(k)) return;
  warned.add(k);
  logger.warn(
    `[schema] no registry entry for topic=${topic} eventType=${eventType ?? '(none)'} — payload passes unvalidated (DP-M-01)`
  );
}

/** Reset warn-once state between test cases. */
export function resetWarningsForTests() {
  warned.clear();
}

function violation(direction, topic, eventType, issues) {
  return new EventSchemaValidationError(
    `[schema] ${direction} ${topic} (${eventType ?? 'no eventType'}): ${issues.join('; ')}`,
    issues
  );
}

function applyMode(mode, err, topic, eventType) {
  if (mode === 'enforce') throw err;
  if (mode === 'warn') logger.error(err.message);
  // 'off' never reaches here — callers skip validation entirely.
}

/**
 * Producer choke point (called by emitKafkaEvent). Validates the exact JSON
 * form that would hit the wire, then builds the standard envelope. Throws
 * EventSchemaValidationError when SCHEMA_ENFORCEMENT=enforce (default).
 */
export function serializeEvent(topic, key, payload) {
  const mode = getEnforcementMode();
  const eventType = payload?.eventType;
  const entry = lookupEntry(topic, eventType);

  let wirePayload;
  try {
    const base = {
      ...payload,
      emittedBy: 'findmedi-core',
      schemaVersion: entry ? entry.version : 'unregistered',
    };
    wirePayload = JSON.parse(JSON.stringify(base));
  } catch (e) {
    const err = violation('outbound payload not JSON-serializable on', topic, eventType, [
      e.message,
    ]);
    applyMode(mode === 'off' ? 'warn' : mode, err, topic, eventType);
    wirePayload = { ...payload };
  }

  if (mode !== 'off') {
    if (entry) {
      const res = entry.schema.safeParse(wirePayload);
      if (!res.success) {
        const issues = res.error.issues.map(
          (i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`
        );
        applyMode(mode, violation('outbound', topic, eventType, issues), topic, eventType);
      }
    } else {
      warnOnce(topic, eventType);
    }
  }

  return {
    eventId: randomUUID(),
    timestampEpochMs: Date.now(),
    topic,
    key: String(key),
    payload: wirePayload,
  };
}

/**
 * Consumer choke point (called by the Kafka eachMessage loop after parse).
 * Throws on invalid frames — the caller's existing catch turns that into
 * `Consumer message skipped` + a pipeline error metric.
 */
export function validateInbound(topic, envelope) {
  const mode = getEnforcementMode();
  if (mode === 'off') return;

  const frame = envelopeSchema.safeParse(envelope);
  if (!frame.success) {
    const issues = frame.error.issues.map(
      (i) => `frame.${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`
    );
    applyMode(mode, violation('inbound frame on', topic, null, issues), topic, null);
    return;
  }

  const eventType = envelope.payload?.eventType;
  const entry = lookupEntry(topic, eventType);
  if (!entry) {
    warnOnce(topic, eventType);
    return;
  }

  const res = entry.schema.safeParse(envelope.payload);
  if (!res.success) {
    const issues = res.error.issues.map(
      (i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`
    );
    applyMode(mode, violation('inbound', topic, eventType, issues), topic, eventType);
  }
}
