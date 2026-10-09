import mongoose from 'mongoose';

/** File 18 §18.3: outbound webhook subscription (secret never listed). */
const webhookSubSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  url: { type: String, required: true },
  events: [{ type: String }],
  secret: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.WebhookSubscription || mongoose.model('WebhookSubscription', webhookSubSchema);
