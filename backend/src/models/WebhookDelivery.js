import mongoose from 'mongoose';

/** File 18 §18.3: signed delivery attempts with scheduler-driven retries. */
const webhookDeliverySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  subId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebhookSubscription', index: true },
  event: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  nextRetryAt: { type: Date, default: null },
  lastError: { type: String, default: '' },
}, { timestamps: true });

webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

export default mongoose.models.WebhookDelivery || mongoose.model('WebhookDelivery', webhookDeliverySchema);
