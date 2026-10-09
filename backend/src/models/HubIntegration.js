import mongoose from 'mongoose';

/** File 18 §18.2: hub integration registry (status + last-seen). */
const integrationSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  key: { type: String, required: true },
  kind: { type: String, enum: ['lis', 'pacs', 'telephony', 'sms', 'email', 'payment', 'insurance', 'other'], required: true },
  transport: { type: String, enum: ['rest', 'hl7', 'mqtt', 'serial', 'file'], default: 'rest' },
  status: { type: String, enum: ['connected', 'degraded', 'down', 'disabled'], default: 'disabled', index: true },
  lastSeenAt: { type: Date, default: null },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

integrationSchema.index({ hospitalId: 1, key: 1 }, { unique: true });

export default mongoose.models.HubIntegration || mongoose.model('HubIntegration', integrationSchema);
