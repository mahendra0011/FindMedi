import { KAFKA_TOPICS, KAFKA_CLIENT_ID, KAFKA_BOOTSTRAP_SERVERS, isKafkaConfigured } from '../config/kafka.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import { upsertProviderLocationCache, removeProviderFromCache } from '../lib/h3Cache.js';
import logger from '../config/logger.js';

let isListening = false;
let consumerInstance = null;

async function bumpDemandCounter(h3Cell, vertical) {
  try {
    if (!isRedisReady() || !redisClient.isOpen || !h3Cell) return;
    const key = `demand:h3:${h3Cell}:${vertical || 'all'}`;
    await redisClient.incr(key);
    await redisClient.expire(key, 3600);
  } catch {}
}

/**
 * Handles incoming backbone events with real projections.
 * Every branch is fail-soft: handler errors never break the poller loop
 * (the poller wraps this call in try/catch as a second guard).
 */
export async function handleIncomingEvent(topic, eventPayload) {
  const { eventType, aggregateId, payload = {} } = eventPayload || {};
  logger.debug(`[KAFKA_CONSUMER_RECV] Topic: ${topic} | Type: ${eventType} | ID: ${aggregateId}`);

  try {
    switch (eventType) {
      case 'ride.dispatch_started':
      case 'lawyer.dispatch_started':
      case 'assistant.dispatch_started':
      case 'emergency_doctor.dispatch_started':
      case 'emergency_sos.dispatch_started': {
        // Demand projection: per-H3-cell counters feed the surge job.
        const cell = payload.h3Cell || payload.h3Index8 || null;
        const vertical = (eventType || '').split('.')[0];
        await bumpDemandCounter(cell, vertical);
        break;
      }

      case 'ride.assigned':
      case 'lawyer.assigned':
      case 'assistant.assigned':
      case 'emergency_doctor.assigned':
      case 'emergency_sos.assigned': {
        // Assignment projection: track active provider engagement.
        try {
          if (isRedisReady() && redisClient.isOpen && payload.providerId) {
            await redisClient.set(`engaged:provider:${payload.providerId}`, String(aggregateId), { EX: 3600 });
          }
        } catch {}
        break;
      }

      case 'provider.presence.online': {
        // Presence projection: keep the H3 hex cache in sync from any producer.
        if (payload.lat != null && payload.lng != null) {
          await upsertProviderLocationCache({
            providerId: String(payload.providerId),
            providerType: payload.providerType,
            lat: Number(payload.lat),
            lng: Number(payload.lng),
          });
        }
        break;
      }

      case 'provider.presence.offline': {
        await removeProviderFromCache({
          providerId: String(payload.providerId),
          providerType: payload.providerType,
        });
        break;
      }

      case 'ride.completed': {
        // Downstream: pre-generate the GST receipt PDF so it is ready on request.
        try {
          const { default: RideBooking } = await import('../models/RideBooking.js');
          const { generateRideReceiptPdf } = await import('./rideReceiptService.js');
          const ride = await RideBooking.findById(aggregateId || payload.rideId).lean();
          if (ride) {
            await generateRideReceiptPdf(ride, null, null, null);
          }
        } catch (err) {
          logger.warn(`Receipt pre-generation skipped: ${err.message}`);
        }
        break;
      }

      default:
        logger.debug(`Unhandled eventType in consumer: ${eventType}`);
        break;
    }
  } catch (err) {
    logger.warn(`handleIncomingEvent(${eventType}) failed: ${err.message}`);
  }

  return true;
}

/**
 * Starts the resilient event subscriber daemon.
 * With brokers configured: real KafkaJS consumer group
 * (findmedi-core-consumers) on booking + SOS topics, dispatching every
 * message into handleIncomingEvent. Without: in-process backbone
 * (poller → handleIncomingEvent) as before.
 */
export async function startKafkaConsumer() {
  if (isListening) return;
  isListening = true;

  if (!isKafkaConfigured()) {
    logger.info('Starting In-Memory Event Backbone Consumer (Development Mode)');
    return;
  }

  try {
    const { Kafka } = await import('kafkajs');
    const kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers: KAFKA_BOOTSTRAP_SERVERS });
    const consumer = kafka.consumer({ groupId: 'findmedi-core-consumers' });
    await consumer.connect();
    await consumer.subscribe({
      topics: [KAFKA_TOPICS.BOOKING_EVENTS, KAFKA_TOPICS.SOS_ALERTS, KAFKA_TOPICS.PROVIDER_PRESENCE],
      fromBeginning: false,
    });
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const enveloped = JSON.parse(message.value.toString());
          const inner = enveloped.payload || {};
          await handleIncomingEvent(topic, {
            eventType: inner.eventType,
            aggregateId: inner.aggregateId,
            payload: inner,
          });
        } catch (err) {
          logger.warn(`Consumer message skipped (${topic}): ${err.message}`);
        }
      },
    });
    consumerInstance = consumer;
    logger.info('Started Production Kafka Consumer Group (findmedi-core-consumers)');
  } catch (err) {
    isListening = false;
    logger.error(`Kafka consumer start failed, in-memory backbone continues: ${err.message}`);
  }
}

export async function stopKafkaConsumer() {
  isListening = false;
  try {
    await consumerInstance?.disconnect();
  } catch {}
  consumerInstance = null;
  logger.info('Stopped Kafka Consumer Daemon');
}
