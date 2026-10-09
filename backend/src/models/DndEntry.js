import mongoose from 'mongoose';

/** File 22 P1-27: do-not-disturb registry (scrubbed before any callback). */
const dndEntrySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  phone: { type: String, required: true, index: true },
  channel: { type: String, enum: ['call', 'sms', 'whatsapp', 'all'], default: 'all' },
  reason: { type: String, default: '', maxlength: 200 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

dndEntrySchema.index({ hospitalId: 1, phone: 1 }, { unique: true });

export default mongoose.models.DndEntry || mongoose.model('DndEntry', dndEntrySchema);
