
const PHI_FIELDS = new Set([
  'name', 'email', 'phone', 'address', 'aadhaar', 'aadhaarNumber',
  'uhid', 'patientId', 'doctorId', 'userId', 'abhaNumber', 'abhaAddress',
  'emergencyContact', 'knownConditions', 'allergies', 'bloodGroup',
  'dateOfBirth', 'gender', 'signatureUrl', 'avatar', 'latitude', 'longitude'
]);

function redactPHI(obj, allowed = new Set()) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => redactPHI(v, allowed));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PHI_FIELDS.has(k) && !allowed.has(k)) continue;
    out[k] = redactPHI(v, allowed);
  }
  return out;
}
import { KAFKA_TOPICS, KAFKA_CLIENT_ID, KAFKA_BOOTSTRAP_SERVERS, isKafkaConfigured } from '../config/kafka.js';
import logger from '../config/logger.js';
// DP-M-01: the "validate" in the old validateAndEnvelopEvent validated nothing.
// serializeEvent now checks the payload against the in-repo schema registry
// (src/events/schemaRegistry.js) before anything reaches the wire.
import { serializeEvent } from '../events/schemaRegistry.js';

let kafkaInstance = null;
let producerInstance = null;
let producerConnecting = null;

async function getProducer() {
  if (!isKafkaConfigured()) return null;
  if (producerInstance) return producerInstance;
  if (!producerConnecting) {
    producerConnecting = (async () => {
      const { Kafka } = await import('kafkajs');
      kafkaInstance = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers: KAFKA_BOOTSTRAP_SERVERS });
      const producer = kafkaInstance.producer({
        idempotent: true, // Spec 10: enable.idempotence=true (no dupes on retry)
        maxInFlightRequests: 5,
      });
      await producer.connect();
      producerInstance = producer;
      logger.info('Kafka producer connected (idempotent, acks=-1)');
      return producer;
    })().catch((err) => {
      producerConnecting = null;
      throw err;
    });
  }
  return producerConnecting;
}

/**
 * Publishes an event to the Kafka event backbone.
 * Real broker send when configured (acks=all via idempotent producer);
 * graceful in-memory resolve otherwise.
 *
 * DP-M-01: schema violations now throw EventSchemaValidationError BEFORE any
 * delivery attempt (SCHEMA_ENFORCEMENT=enforce by default) — the outbox poller
 * catches that per event and drives it through the normal retry → DLQ cascade,
 * so an incompatible payload becomes a visible dead-letter instead of a silent
 * consumer no-op. Broker failures rethrow after logging.
 */
export async function emitKafkaEvent(topic, key, payload) {
  const enveloped = serializeEvent(topic, key, payload);

  if (!isKafkaConfigured()) {
    // In local dev without live Kafka cluster, log safely and resolve
    logger.debug(`[EVENT_SPINE_DEV] Topic: ${topic} | Key: ${key} | EventId: ${enveloped.eventId}`);
    return {
      success: true,
      deliveredTo: 'in_memory_spine',
      eventId: enveloped.eventId,
    };
  }

  try {
    const producer = await getProducer();
    const redacted = redactPHI(payload);
    await producer.send({
      topic,
      acks: -1, // Spec 10: all in-sync replicas must acknowledge
      messages: [{ key: enveloped.key, value: JSON.stringify(enveloped) }],
    });
    logger.info(`[KAFKA_PRODUCED] Topic: ${topic} | Key: ${key} | EventId: ${enveloped.eventId}`);
    return {
      success: true,
      deliveredTo: 'kafka_broker',
      eventId: enveloped.eventId,
    };
  } catch (err) {
    logger.error(`Failed to publish event to Kafka [${topic}]: ${err.message}`);
    throw err;
  }
}

export async function disconnectProducer() {
  try {
    await producerInstance?.disconnect();
  } catch {}
  producerInstance = null;
  producerConnecting = null;
  kafkaInstance = null;
}

/**
 * Specialized event emitters for FindMedi verticals
 */
export async function emitBookingEvent(bookingId, vertical, status, data) {
  return emitKafkaEvent(KAFKA_TOPICS.BOOKING_EVENTS, bookingId, {
    bookingId,
    vertical,
    status,
    ...data,
  });
}

export async function emitLocationTelemetry(providerId, h3Cell, coords, speed, bearing) {
  return emitKafkaEvent(KAFKA_TOPICS.DRIVER_TELEMETRY, h3Cell, {
    providerId,
    h3Cell,
    coordinates: coords,
    speed,
    bearing,
  });
}

export async function emitEmergencySOSAlert(alertId, h3Cell, severity, data) {
  return emitKafkaEvent(KAFKA_TOPICS.SOS_ALERTS, h3Cell, {
    alertId,
    h3Cell,
    severity,
    ...data,
  });
}

export async function emitLabOrderEvent(labOrderId, status, data) {
  return emitKafkaEvent(KAFKA_TOPICS.LAB_ORDER_EVENTS, labOrderId, {
    labOrderId,
    status,
    ...data,
  });
}

export async function emitVitalsTelemetry(patientId, vitalsData) {
  return emitKafkaEvent(KAFKA_TOPICS.VITALS_TELEMETRY, patientId, {
    patientId,
    ...vitalsData,
  });
}

export async function emitHospitalAdmissionEvent(hospitalId, eventType, data) {
  return emitKafkaEvent(KAFKA_TOPICS.HOSPITAL_ADMISSIONS, hospitalId, {
    hospitalId,
    eventType,
    ...data,
  });
}

export async function emitPharmacyInventoryEvent(pharmacyId, eventType, data) {
  return emitKafkaEvent(KAFKA_TOPICS.PHARMACY_INVENTORY, pharmacyId, {
    pharmacyId,
    eventType,
    ...data,
  });
}
