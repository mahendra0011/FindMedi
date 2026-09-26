import OutboxEvent from '../models/OutboxEvent.js';
import logger from '../config/logger.js';
import { emitKafkaEvent } from '../lib/kafkaProducer.js';
import { KAFKA_TOPICS } from '../config/kafka.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import { handleIncomingEvent } from './kafkaConsumerService.js';

let pollerInterval = null;
let isProcessing = false;

const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 50);
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 2000);
const MAX_RETRIES = 5;

/**
 * Dispatches an outbox event to the event pipeline (Kafka broker or resilient event backbone).
 */
async function dispatchOutboxEvent(event) {
  return await emitKafkaEvent(
    event.destinationTopic,
    event.partitionKey || event.aggregateId,
    {
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      ...event.payload,
    }
  );
}

/**
 * Polls MongoDB for pending outbox events and publishes them sequentially.
 */
export async function pollAndProcessOutbox() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date();
    const pendingEvents = await OutboxEvent.find({
      status: 'PENDING',
      $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
    })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (!pendingEvents || pendingEvents.length === 0) {
      isProcessing = false;
      return;
    }

    for (const evt of pendingEvents) {
      try {
        // Spec 11: idempotent delivery gate — 24h Redis seen-set drops redeliveries.
        const dedupKey = `event:seen:${evt._id}`;
        let duplicate = false;
        try {
          if (isRedisReady() && redisClient.isOpen) {
            const set = await redisClient.set(dedupKey, '1', { NX: true, EX: 86400 });
            if (set !== 'OK') duplicate = true;
          }
        } catch {}
        if (duplicate) {
          await OutboxEvent.updateOne(
            { _id: evt._id },
            { $set: { status: 'PUBLISHED', publishedAt: new Date(), lastError: 'duplicate-suppressed' } }
          );
          continue;
        }
        const delivery = await dispatchOutboxEvent(evt);
        // Single-processing rule: when the broker accepted the event, the
        // consumer group owns processing. Direct call only for in-memory mode.
        if (!delivery || delivery.deliveredTo !== 'kafka_broker') {
          // In-process backbone delivery: poller → consumer handlers (real projections).
          try {
            await handleIncomingEvent(evt.destinationTopic, {
              eventType: evt.eventType,
              aggregateId: evt.aggregateId,
              payload: evt.payload || {},
            });
          } catch (consumerErr) {
            logger.warn(`Consumer handler failed for ${evt._id}: ${consumerErr.message}`);
          }
        }
        await OutboxEvent.updateOne(
          { _id: evt._id },
          {
            $set: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              lastError: null,
            },
          }
        );
      } catch (err) {
        logger.error(`Failed to publish OutboxEvent [${evt._id}]: ${err.message}`);
        const nextRetry = (evt.retryCount || 0) + 1;
        const exhausted = nextRetry >= MAX_RETRIES;
        // Spec 11 retry tiers: republish the ORIGINAL event to the retry
        // topics (5s → 30s) so any consumer (not just this poller) retries it;
        // terminal failures go to the DLQ topic + ops alert log.
        try {
          const retryEnvelope = {
            eventType: evt.eventType,
            aggregateType: evt.aggregateType,
            aggregateId: evt.aggregateId,
            retryCount: nextRetry,
            outboxId: String(evt._id),
            ...(evt.payload || {}),
          };
          if (exhausted) {
            await emitKafkaEvent(KAFKA_TOPICS.DLQ, evt.aggregateId, retryEnvelope);
          } else {
            const retryTopic = nextRetry <= 2 ? KAFKA_TOPICS.RETRY_5S : KAFKA_TOPICS.RETRY_30S;
            await emitKafkaEvent(retryTopic, evt.aggregateId, retryEnvelope);
          }
        } catch (retryErr) {
          logger.warn(`Retry-topic publish skipped for ${evt._id}: ${retryErr.message}`);
        }
        if (exhausted) {
          // Dead-letter: no broker DLQ topic without Kafka; terminal FAILED state + ops alert log.
          logger.error(`[DLQ] OutboxEvent [${evt._id}] exhausted retries (type=${evt.eventType}). Manual triage required.`);
        }
        // Spec 11 retry tiers: 5s backoff (attempts 1-2) → 30s (attempts 3-4) → DLQ.
        const backoffMs = nextRetry <= 2 ? 5000 : 30000;
        await OutboxEvent.updateOne(
          { _id: evt._id },
          {
            $set: {
              retryCount: nextRetry,
              status: exhausted ? 'FAILED' : 'PENDING',
              nextAttemptAt: exhausted ? null : new Date(Date.now() + backoffMs),
              lastError: err.message,
            },
          }
        );
      }
    }
  } catch (err) {
    logger.error(`pollAndProcessOutbox error: ${err.message}`);
  } finally {
    isProcessing = false;
  }
}

export function startOutboxPoller() {
  if (pollerInterval) return;
  logger.info(`Starting Transactional Outbox Poller (interval: ${POLL_INTERVAL_MS}ms)`);
  pollerInterval = setInterval(pollAndProcessOutbox, POLL_INTERVAL_MS);
}

export function stopOutboxPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info('Stopped Transactional Outbox Poller');
  }
}
