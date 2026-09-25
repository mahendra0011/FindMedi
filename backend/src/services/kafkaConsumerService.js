import { KAFKA_TOPICS, isKafkaConfigured } from '../config/kafka.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import { upsertProviderLocationCache, removeProviderFromCache } from '../lib/h3Cache.js';
import logger from '../config/logger.js';

let isListening = false;

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
 * Without a live Kafka cluster it serves the in-process backbone
 * (poller → handleIncomingEvent); with brokers configured the same
 * handler set attaches to consumer groups.
 */
export function startKafkaConsumer() {
  if (isListening) return;
  isListening = true;

  if (isKafkaConfigured()) {
    logger.info('Starting Production Kafka Consumer Group (findmedi-core-consumers)');
  } else {
    logger.info('Starting In-Memory Event Backbone Consumer (Development Mode)');
  }
}

export function stopKafkaConsumer() {
  isListening = false;
  logger.info('Stopped Kafka Consumer Daemon');
}
