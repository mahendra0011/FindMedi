import mongoose from 'mongoose';

const outboxEventSchema = new mongoose.Schema(
  {
    aggregateType: {
      type: String,
      enum: ['ride', 'lawyer', 'assistant', 'emergency_sos', 'emergency_doctor', 'payment', 'user', 'provider', 'Prescription', 'RideBooking', 'LawyerBooking', 'AssistantBooking', 'EmergencyRequest', 'PharmacyOrder'],
      required: true,
      index: true,
    },
    aggregateId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    destinationTopic: {
      type: String,
      required: true,
      default: 'findmedi.dispatch.booking-events.v1',
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    // Spec 11 retry tiers: next attempt timestamp (5s → 30s backoff).
    nextAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastError: {
      type: String,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    processingAt: { type: Date, default: null, index: true },
    processingBy: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// High-speed poller composite index
outboxEventSchema.index({ status: 1, createdAt: 1 });
outboxEventSchema.index({ status: 1, nextAttemptAt: 1 });
outboxEventSchema.index({ status: 1, processingAt: 1 });

const OutboxEvent = mongoose.model('OutboxEvent', outboxEventSchema);

export default OutboxEvent;
