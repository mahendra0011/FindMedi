import mongoose from 'mongoose';

/**
 * File 09 §9.7/06.4: CSSD instrument set master (contents + counts).
 */
const instrumentSetSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  code: { type: String, required: true, maxlength: 60 },
  name: { type: String, required: true, maxlength: 200 },
  items: [{ instrument: { type: String }, qty: { type: Number, default: 1 } }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

instrumentSetSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export default mongoose.models.InstrumentSet || mongoose.model('InstrumentSet', instrumentSetSchema);
