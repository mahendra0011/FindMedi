import mongoose from 'mongoose';

/**
 * File 14 §14.2: every render logged — template version, hash, duplicate
 * flag, channel. Reprints watermark DUPLICATE COPY (renderer-side) + audit.
 */
const printLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  docType: { type: String, required: true, index: true },
  entityRef: { type: String, default: '' },
  templateVersion: { type: Number, default: 1 },
  printedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  printedAt: { type: Date, default: Date.now },
  copies: { type: Number, default: 1 },
  isDuplicate: { type: Boolean, default: false },
  channel: { type: String, enum: ['print', 'pdf', 'whatsapp', 'email'], default: 'print' },
  hash: { type: String, default: '' },
}, { timestamps: true });

printLogSchema.index({ docType: 1, entityRef: 1 });

export default mongoose.models.PrintLog || mongoose.model('PrintLog', printLogSchema);
