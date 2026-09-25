import mongoose from 'mongoose';

const outboxEventSchema = new mongoose.Schema(
  {
    aggregateType: {
      type: String,
      enum: ['ride', 'lawyer', 'assistant', 'emergency_sos', 'emergency_doctor', 'payment', 'user', 'provider', 'RideBooking', 'LawyerBooking', 'AssistantBooking', 'EmergencyRequest'],
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
      enum: ['PENDING', 'PUBLISHED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed poller composite index
outboxEventSchema.index({ status: 1, createdAt: 1 });

const OutboxEvent = mongoose.model('OutboxEvent', outboxEventSchema);

export default OutboxEvent;
