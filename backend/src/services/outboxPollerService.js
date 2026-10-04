import OutboxEvent from '../models/OutboxEvent.js';
import logger from '../config/logger.js';
import { emitKafkaEvent } from '../lib/kafkaProducer.js';
import { KAFKA_TOPICS } from '../config/kafka.js';
import { deliverEvent } from './eventForwarder.js';
import { recordPipelineEvent } from './dataPipelineHealth.js';
import { randomUUID } from 'node:crypto';

let pollerInterval = null;
let isProcessing = false;

const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 50);
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 2000);
const MAX_RETRIES = 5;
const LEASE_MS = Number(process.env.OUTBOX_LEASE_MS || 5 * 60_000);
const WORKER_ID = `${process.pid}:${randomUUID()}`;

/**
 * Dispatches an outbox event to the event pipeline (Kafka broker or resilient event backbone).
 */
async function dispatchOutboxEvent(event) {
  return await emitKafkaEvent(
    event.destinationTopic,
    event.partitionKey || event.aggregateId,
    {
      ...event.payload,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      outboxId: String(event._id),
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
      $or: [
        { status: 'PENDING', $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] },
        { status: 'PROCESSING', processingAt: { $lte: new Date(now.getTime() - LEASE_MS) } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (!pendingEvents || pendingEvents.length === 0) {
      isProcessing = false;
      return;
    }

    for (const evt of pendingEvents) {
      const claimed = await OutboxEvent.findOneAndUpdate(
        {
          _id: evt._id,
          $or: [
            { status: 'PENDING', $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] },
            { status: 'PROCESSING', processingAt: { $lte: new Date(now.getTime() - LEASE_MS) } },
          ],
        },
        { $set: { status: 'PROCESSING', processingAt: now, processingBy: WORKER_ID } },
        { new: true }
      ).lean();
      if (!claimed) continue;
      try {
        // At-least-once delivery is required: pre-publish markers can permanently drop events.
        // Consumers deduplicate by outboxId, so duplicate publication is safe.
        const delivery = await dispatchOutboxEvent(claimed);
        // Single-processing rule: when the broker accepted the event, the
        // consumer group owns processing. Direct call only for in-memory mode.
        if (!delivery || delivery.deliveredTo !== 'kafka_broker') {
          // In-process backbone delivery: poller → forwarder → consumer handlers.
          // A failed in-process consumer must keep the outbox row retryable;
          // logging and marking PUBLISHED here would silently lose the event.
          const inMemoryResult = await deliverEvent(claimed.destinationTopic, {
            eventType: claimed.eventType,
            aggregateId: claimed.aggregateId,
            outboxId: String(claimed._id),
            payload: claimed.payload || {},
          });
          if (!inMemoryResult?.delivered) {
            throw new Error(`in-memory consumer did not complete: ${inMemoryResult?.reason || 'unknown'}`);
          }
        }
        const marked = await OutboxEvent.updateOne(
          { _id: claimed._id, status: 'PROCESSING', processingBy: WORKER_ID },
          {
            $set: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              lastError: null,
              processingAt: null,
              processingBy: null,
            },
          }
        );
        // DP-B-05: a successful publish resets the freshness clock. This is the
        // only positive signal the poller can emit, so it must fire on the real
        // publish path — not inside the update payload above.
        if (marked.modifiedCount) recordPipelineEvent('outbox_poller', 'success');
      } catch (err) {
        // DP-B-05: record the failure so a wedged outbox is visible on
        // /healthz/pipelines. Previously this only logged, and a poller that
        // kept failing looked identical to a platform with no activity.
        recordPipelineEvent('outbox_poller', 'error', { error: err });
        logger.error(`Failed to publish OutboxEvent [${evt._id}]: ${err.message}`);
        const nextRetry = (claimed.retryCount || 0) + 1;
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
          { _id: claimed._id, status: 'PROCESSING', processingBy: WORKER_ID },
          {
            $set: {
              retryCount: nextRetry,
              status: exhausted ? 'FAILED' : 'PENDING',
              nextAttemptAt: exhausted ? null : new Date(Date.now() + backoffMs),
              lastError: err.message,
              processingAt: null,
              processingBy: null,
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
