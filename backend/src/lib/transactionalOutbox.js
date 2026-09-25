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
  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
  });

  try {
    // 1. Execute business logic inside the transactional session
    const businessResult = await operationFn(session);

    // 2. Persist outbox event records inside the SAME session
    if (eventsToEmit && eventsToEmit.length > 0) {
      const records = eventsToEmit.map((evt) => ({
        aggregateType: evt.aggregateType,
        aggregateId: String(evt.aggregateId),
        eventType: evt.eventType,
        payload: evt.payload || {},
        destinationTopic: evt.destinationTopic || 'findmedi.dispatch.booking-events.v1',
        status: 'PENDING',
        retryCount: 0,
      }));

      await OutboxEvent.insertMany(records, { session });
    }

    // 3. Atomically commit both writes
    await session.commitTransaction();
    return businessResult;
  } catch (err) {
    await session.abortTransaction();
    logger.error(`executeWithOutbox transaction rolled back: ${err.message}`);
    throw err;
  } finally {
    session.endSession();
  }
}
