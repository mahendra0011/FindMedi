import OutboxEvent from '../models/OutboxEvent.js';
import logger from '../config/logger.js';
import { emitKafkaEvent } from '../lib/kafkaProducer.js';

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
    const pendingEvents = await OutboxEvent.find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (!pendingEvents || pendingEvents.length === 0) {
      isProcessing = false;
      return;
    }

    for (const evt of pendingEvents) {
      try {
        await dispatchOutboxEvent(evt);
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
        await OutboxEvent.updateOne(
          { _id: evt._id },
          {
            $set: {
              retryCount: nextRetry,
              status: nextRetry >= MAX_RETRIES ? 'FAILED' : 'PENDING',
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
