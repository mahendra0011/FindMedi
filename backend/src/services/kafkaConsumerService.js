import { KAFKA_TOPICS, KAFKA_CLIENT_ID, KAFKA_BOOTSTRAP_SERVERS, isKafkaConfigured } from '../config/kafka.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import { upsertProviderLocationCache, removeProviderFromCache } from '../lib/h3Cache.js';
import { registerHandler, forwardEvent } from './eventForwarder.js';
// DP-M-01: frames off the wire are checked against the schema registry before
// any handler sees them. An invalid frame throws into the catch below — the
// existing `Consumer message skipped` path, plus an error metric. No new
// failure mode; a breaking producer change now surfaces instead of silently
// matching the switch's default case.
import { validateInbound } from '../events/schemaRegistry.js';
// ADM-M-05: the ops-health widget surfaces pipeline freshness. This consumer
// was one of two pipelines that never reported (always `unknown`), so "is the
// consumer keeping up?" was unanswerable from the product.
import { recordPipelineEvent, markPipelineStopped } from './dataPipelineHealth.js';
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
 * Projection failures propagate to EventForwarder/OutboxPoller so durable
 * events remain retryable. Best-effort side effects must catch locally.
 */
export async function handleIncomingEvent(topic, eventPayload) {
  const { eventType, aggregateId, payload = {}, outboxId } = eventPayload || {};
  logger.debug(`[KAFKA_CONSUMER_RECV] Topic: ${topic} | Type: ${eventType} | ID: ${aggregateId}`);

  // Idempotent reprocessing: retry/DLQ redeliveries of an already-handled
  // outbox event are skipped via the processed-marker (24h).
  if (outboxId) {
    try {
      if (isRedisReady() && redisClient.isOpen) {
        const done = await redisClient.get(`event:done:${outboxId}`);
        if (done) return true;
      }
    } catch {}
  }

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

      case 'LawyerBookingCompleted.v1': {
        // The in-app notice is committed with the booking/ledger transaction;
        // this outbox event only refreshes connected participants after commit.
        const io = (await import('./socketService.js')).getIO();
        if (io && aggregateId) {
          const update = {
            bookingId: String(aggregateId),
            status: 'completed',
            completedAt: payload.completedAt,
            settledAmount: payload.settledAmount,
          };
          io.to(`lawyer-booking:${aggregateId}`).emit('booking_status_update', update);
          io.of('/lawyer').to(`lawyer-booking:${aggregateId}`).emit('booking_status_update', update);
          if (payload.patientId) io.to(`user:${payload.patientId}`).emit('booking_status_update', update);
          if (payload.lawyerId) io.to(`user:${payload.lawyerId}`).emit('booking_status_update', update);
        }
        break;
      }

      // ─── Tech 03-C: hospital admission events → bed/OT/housekeeping sync ──
      case 'bed.allocated': {
        try {
          const { default: Bed } = await import('../models/Bed.js');
          const bed = await Bed.findById(payload.bedId || aggregateId);
          if (bed && bed.status === 'Available') {
            bed.status = 'Occupied';
            bed.currentPatientId = payload.patientId || bed.currentPatientId;
            bed.currentPatientName = payload.patientName || bed.currentPatientName;
            bed.admissionId = payload.admissionId || bed.admissionId;
            bed.occupiedSince = new Date();
            await bed.save();
          }
        } catch (err) {
          logger.warn(`bed.allocated sync skipped: ${err.message}`);
        }
        break;
      }

      case 'ot.scheduled': {
        try {
          const { default: OperationTheatre } = await import('../models/OperationTheatre.js');
          const ot = await OperationTheatre.findById(payload.otId || aggregateId);
          if (ot) {
            ot.status = 'Scheduled';
            if (payload.scheduledDate) ot.scheduledDate = new Date(payload.scheduledDate);
            if (payload.otNumber) ot.otNumber = payload.otNumber;
            await ot.save();
          }
        } catch (err) {
          logger.warn(`ot.scheduled sync skipped: ${err.message}`);
        }
        break;
      }

      case 'patient.discharged': {
        try {
          const { default: Bed } = await import('../models/Bed.js');
          const { default: Housekeeping } = await import('../models/Housekeeping.js');
          const bed = await Bed.findById(payload.bedId || aggregateId);
          if (bed) {
            bed.status = 'Under Cleaning';
            bed.currentPatientId = undefined;
            bed.currentPatientName = undefined;
            bed.admissionId = undefined;
            await bed.save();
            await Housekeeping.create({
              taskId: `HK-${Date.now().toString(36).toUpperCase()}`,
              room: payload.room || bed.floor || 'Ward',
              bedNumber: bed.bedNumber,
              ward: bed.ward,
              type: 'Discharge Cleaning',
              hospitalId: bed.hospitalId,
              notes: `Auto task from discharge event (${bed.bedNumber})`,
            });
          }
        } catch (err) {
          logger.warn(`patient.discharged sync skipped: ${err.message}`);
        }
        break;
      }

      // ─── DP-M-04: erasure propagation to analytics copies ──────────────────
      case 'user.deleted': {
        // Mongo-side scrubbing already happened in the deletion chain; this
        // branch owns the ANALYTICS copies. Both purges are idempotent; an
        // unconfigured OpenSearch is a skip and a missing lake dir is a no-op.
        // Attempt both stores, then fail the event if either configured purge
        // fails so outbox retry can finish erasure propagation.
        const subjectId = payload.userId || aggregateId;
        if (!subjectId) break;
        const purgeErrors = [];
        try {
          const { purgeUserFromSearch } = await import('./opensearchIndexer.js');
          // Re-purge even though the chain purged synchronously: this also
          // covers tombstones written by other writers, and purge is a no-op
          // when nothing matches.
          await purgeUserFromSearch(String(subjectId));
        } catch (err) {
          logger.warn(`user.deleted search purge skipped: ${err.message}`);
          purgeErrors.push(err);
        }
        try {
          const { purgeUserFromLakeManifests } = await import('../jobs/lakeOffload.job.js');
          const r = await purgeUserFromLakeManifests(String(subjectId));
          if (r?.purged) logger.info(`user.deleted lake purge removed ${r.purged} manifest row(s)`);
        } catch (err) {
          logger.warn(`user.deleted lake purge skipped: ${err.message}`);
          purgeErrors.push(err);
        }
        if (purgeErrors.length) {
          throw new AggregateError(purgeErrors, `user.deleted purge incomplete for ${subjectId}`);
        }
        break;
      }

      // ─── Tech 03-D: pharmacy inventory delta → decrement + auto-PO ─────────
      case 'medicine.dispensed':
      case 'stock.below.reorder.point': {
        try {
          const { default: Medicine } = await import('../models/Medicine.js');
          const { default: PurchaseOrder } = await import('../models/PurchaseOrder.js');
          const { default: Supplier } = await import('../models/Supplier.js');
          const med = await Medicine.findById(payload.medicineId || aggregateId);
          if (med) {
            // Pharmacy dispense route already performs the inventory debit
            // before it emits this event. This consumer only handles the
            // reorder side effect; applying `quantity` again double-debits.
            if (med.currentStock <= (med.reorderLevel ?? 10)) {
              const existing = await PurchaseOrder.findOne({
                status: { $in: ['Draft', 'Submitted', 'Approved', 'Ordered'] },
                'items.itemName': med.name,
              }).lean();
              if (!existing) {
                const supplier = await Supplier.findOne(
                  med.hospitalId ? { hospitalId: med.hospitalId } : {}
                ).lean();
                if (supplier) {
                  const qty = Math.max(50, (med.reorderLevel ?? 10) * 5);
                  const total = qty * (med.purchasePrice || 0);
                  await PurchaseOrder.create({
                    supplierId: supplier._id,
                    supplierName: supplier.name,
                    items: [{
                      itemName: med.name,
                      category: med.category || 'Other',
                      quantity: qty,
                      unitPrice: med.purchasePrice || 0,
                      total,
                    }],
                    subTotal: total,
                    grandTotal: total,
                    status: 'Draft',
                    hospitalId: med.hospitalId,
                    createdBy: payload.createdBy || supplier.createdBy || med._id,
                    notes: `Auto-PO from inventory event (${eventType}); stock=${med.currentStock}`,
                  });
                  logger.info(`[auto-PO] Draft PO raised for ${med.name} (stock=${med.currentStock})`);
                } else {
                  logger.warn(`[auto-PO] Reorder point hit for ${med.name} but no supplier found; manual PO required.`);
                }
              }
            }
          }
        } catch (err) {
          logger.warn(`pharmacy inventory sync skipped: ${err.message}`);
        }
        break;
      }

      default:
        logger.debug(`Unhandled eventType in consumer: ${eventType}`);
        break;
    }
  } catch (err) {
    logger.warn(`handleIncomingEvent(${eventType}) failed: ${err.message}`);
    throw err;
  }

  if (outboxId) {
    try {
      if (isRedisReady() && redisClient.isOpen) {
        await redisClient.set(`event:done:${outboxId}`, '1', { EX: 86400 });
      }
    } catch {}
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
      topics: [
        KAFKA_TOPICS.BOOKING_EVENTS,
        KAFKA_TOPICS.SOS_ALERTS,
        KAFKA_TOPICS.PROVIDER_PRESENCE,
        KAFKA_TOPICS.HOSPITAL_ADMISSIONS,
        KAFKA_TOPICS.PHARMACY_INVENTORY,
        // DP-M-04: erasure propagation - user.deleted tombstones.
        KAFKA_TOPICS.USER_TOMBSTONES,
        KAFKA_TOPICS.RETRY_5S,
        KAFKA_TOPICS.RETRY_30S,
        // DP-M-02. The DLQ is DELIBERATELY NOT SUBSCRIBED HERE.
        //
        // It used to be, and that made the dead-letter queue the opposite of
        // dead: a message that had exhausted its retries was re-forwarded into
        // the same `forwardEvent` path as healthy traffic, with `attempt`
        // omitted, so `forwardEvent` reset it to 0 (`opts.attempt || 0`). It then
        // failed again, `routeToRetry` computed `next = 1`, and it went straight
        // back to RETRY_5S - forever. The `isDuplicate` marker does not break
        // this: it is only written on SUCCESSFUL delivery, so a poison pill was
        // never suppressed.
        //
        // The result was one unprocessable event spinning through RETRY_5S with
        // no backoff, burning CPU and Kafka bandwidth permanently and growing
        // the retry topic without bound. A dead-letter queue that re-feeds
        // itself is not a safety net; it is an amplifier.
        //
        // Replay is now an explicit operator action - see
        // `scripts/replay-dlq.mjs` - which is the only correct time to re-drive
        // a message that has already failed five times: when a human has looked
        // at why.
      ],
      fromBeginning: false,
    });
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        recordPipelineEvent('kafka_consumer', 'event');
        try {
          const enveloped = JSON.parse(message.value.toString());
          validateInbound(topic, enveloped);
          const inner = enveloped.payload || {};
          await forwardEvent(topic, {
            eventId: enveloped.eventId,
            eventType: inner.eventType,
            aggregateId: inner.aggregateId,
            payload: inner,
            // DP-M-02: carry the attempt count ACROSS the broker hop. Dropping it
            // is why the documented 5s -> 30s -> DLQ cascade never actually
            // escalated for anything arriving over Kafka - every redelivery
            // restarted at 0, so a message could never accumulate enough
            // failures to reach the DLQ through this path at all.
            retryCount: enveloped.retryCount ?? inner.retryCount,
            retryFrom: enveloped.retryFrom ?? inner.retryFrom,
            lastError: enveloped.lastError ?? inner.lastError,
          }, {
            // ...and hand it to the forwarder as the attempt count, so
            // routeToRetry computes the NEXT step rather than the first one.
            attempt: Number(enveloped.retryCount ?? inner.retryCount ?? 0),
          });
          // Success = handed to the forwarder; handler outcome is the
          // forwarder's own signal. A parse failure is a consumer error.
          recordPipelineEvent('kafka_consumer', 'success');
        } catch (err) {
          recordPipelineEvent('kafka_consumer', 'error', { error: err });
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
  // Silence is not health (DP-B-05): a stopped consumer must look like a
  // stopped consumer on the freshness widget, not like a quiet topic.
  markPipelineStopped('kafka_consumer');
  logger.info('Stopped Kafka Consumer Daemon');
}

// uForwarder wiring: core projection handler serves both the in-memory
// backbone (poller → forwarder) and the broker consumer (kafka → forwarder).
registerHandler('*', (topic, event) => handleIncomingEvent(topic, event));
