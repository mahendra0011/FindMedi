import mongoose from 'mongoose';
import OutboxEvent from '../models/OutboxEvent.js';
import logger from '../config/logger.js';

/**
 * Executes a database operation and writes OutboxEvent records atomically inside a single ACID session.
 * Guarantees zero data loss and prevents dual-write inconsistencies between MongoDB and event streams.
 *
 * @param {Function} operationFn - Async function taking (session) and returning business result
 * @param {Array<Object>} eventsToEmit - Array of { aggregateType, aggregateId, eventType, payload, destinationTopic }
 */
export async function executeWithOutbox(operationFn, eventsToEmit = []) {
  const session = await mongoose.startSession();
  try {
    // Write conflicts are expected when multiple bookings/dispenses contend
    // for the same documents. Retry the complete transaction only for errors
    // Mongo labels transient; never replay arbitrary application failures.
    for (let attempt = 1; ; attempt += 1) {
      let transactionStarted = false;
      try {
        session.startTransaction({
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        });
        transactionStarted = true;

        const businessResult = await operationFn(session);
        if (eventsToEmit?.length) {
          const records = eventsToEmit.map((evt) => ({
            aggregateType: evt.aggregateType,
            aggregateId: String(typeof evt.aggregateId === 'function' ? evt.aggregateId(businessResult) : evt.aggregateId),
            eventType: evt.eventType,
            payload: typeof evt.payload === 'function' ? evt.payload(businessResult) : (evt.payload || {}),
            destinationTopic: evt.destinationTopic || 'findmedi.dispatch.booking-events.v1',
            status: 'PENDING',
            retryCount: 0,
          }));
          await OutboxEvent.insertMany(records, { session });
        }

        // Unknown commit results must retry commit on this transaction; they
        // must not rerun the business callback and risk duplicating effects.
        for (let commitAttempt = 1; ; commitAttempt += 1) {
          try {
            await session.commitTransaction();
            transactionStarted = false;
            return businessResult;
          } catch (commitError) {
            const unknownCommit = commitError.hasErrorLabel?.('UnknownTransactionCommitResult');
            if (unknownCommit && commitAttempt < 3) continue;
            throw commitError;
          }
        }
      } catch (err) {
        if (transactionStarted) {
          try {
            await session.abortTransaction();
          } catch (abortError) {
            // Preserve the operation/commit error. Abort failure is separately
            // logged because the server may already have ended the transaction.
            logger.error(`executeWithOutbox abort failed: ${abortError.message}`);
          }
        }
        const transient = err.hasErrorLabel?.('TransientTransactionError');
        if (transient && attempt < 3) {
          logger.warn(`executeWithOutbox retrying transient transaction (attempt ${attempt + 1})`);
          continue;
        }
        logger.error(`executeWithOutbox transaction failed: ${err.message}`);
        throw err;
      }
    }
  } finally {
    try {
      await session.endSession();
    } catch (endError) {
      logger.error(`executeWithOutbox session cleanup failed: ${endError.message}`);
    }
  }
}

/**
 * Fail-soft outbox writer for hot dispatch paths.
 * Records a PENDING OutboxEvent for the poller → Kafka pipeline.
 * NEVER throws: dispatch must not break when Mongo is slow/down.
 * For replica-set environments needing atomicity, use executeWithOutbox instead.
 */
export async function writeOutboxEvent({ aggregateType, aggregateId, eventType, payload = {}, destinationTopic } = {}) {
  try {
    if (!aggregateType || !aggregateId || !eventType) return null;
    const doc = await OutboxEvent.create({
      aggregateType,
      aggregateId: String(aggregateId),
      eventType,
      payload,
      destinationTopic: destinationTopic || 'findmedi.dispatch.booking-events.v1',
      status: 'PENDING',
      retryCount: 0,
    });
    return doc;
  } catch (err) {
    logger.warn(`writeOutboxEvent skipped (${eventType}): ${err.message}`);
    return null;
  }
}
