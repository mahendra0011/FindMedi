import mongoose from 'mongoose';

/**
 * NOTIF-M-04: a delivery receipt per (notification, channel).
 *
 * The `notifications` collection is a statement of INTENT - "we decided to tell
 * this user this". It says nothing about what the transport did. `sendEmail`
 * caught its own errors and returned `{ success: false }`, which most callers
 * ignored, so a bounced prescription email was indistinguishable from a
 * delivered one except in a log line nobody reads.
 *
 * This model is the other half: one row per attempt-at-delivery, with the
 * provider's own message id, the attempt history, and a dead-letter marker once
 * retries are exhausted.
 *
 * STATUS IS HONEST ABOUT WHAT IS KNOWN
 *   queued     - accepted for delivery, not yet handed to a provider
 *   sent       - the provider ACCEPTED it. NOT the same as delivered.
 *   delivered  - provider confirmed delivery (webhook). Unreached without one.
 *   failed     - last attempt failed, a retry is scheduled
 *   dead-letter- retries exhausted; needs a human or a replay
 *
 * Collapsing `sent` into `delivered` is the specific lie this avoids: it is how
 * a platform ends up claiming a critical lab alert was received.
 */
const deliveryAttemptSchema = new mongoose.Schema({
  attempt: { type: Number, required: true },
  at: { type: Date, default: Date.now },
  ok: { type: Boolean, required: true },
  // Provider error code / HTTP status. Never the full provider response, which
  // echoes the recipient address and subject line.
  errorCode: { type: String, default: null },
  error: { type: String, default: null, maxlength: 512 },
}, { _id: false });

const notificationDeliverySchema = new mongoose.Schema({
  notificationId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  channel: { type: String, enum: ['email', 'sms', 'push', 'inApp'], required: true },

  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'failed', 'dead-letter'],
    default: 'queued',
    index: true,
  },

  attempts: { type: [deliveryAttemptSchema], default: [] },
  attemptCount: { type: Number, default: 0 },

  providerMessageId: { type: String, default: null },
  lastError: { type: String, default: null, maxlength: 512 },
  nextAttemptAt: { type: Date, default: null },
  deadLetteredAt: { type: Date, default: null },

  // Set when the recipient actually opened it in-app. Distinct from
  // `delivered`, and the only one this platform can observe directly.
  readAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

notificationDeliverySchema.index({ status: 1, nextAttemptAt: 1 });
notificationDeliverySchema.index({ userId: 1, createdAt: -1 });
// One row per (notification, channel) - a retry must UPDATE the receipt, not
// append a second one, or "did this get delivered" stops having one answer.
notificationDeliverySchema.index({ notificationId: 1, channel: 1 }, { unique: true });

export default mongoose.model('NotificationDelivery', notificationDeliverySchema);