import mongoose from 'mongoose';

/** File 18 §18.2/§18.3: every integration message in/out (inspector ledger). */
const integrationMessageSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  direction: { type: String, enum: ['in', 'out'], required: true, index: true },
  integrationKey: { type: String, required: true, index: true },
  kind: { type: String, default: '' },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['received', 'queued', 'processed', 'failed', 'dead'], default: 'received', index: true },
  error: { type: String, default: '' },
}, { timestamps: true });

integrationMessageSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.IntegrationMessage || mongoose.model('IntegrationMessage', integrationMessageSchema);
