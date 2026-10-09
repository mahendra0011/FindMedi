import mongoose from 'mongoose';

/** File 13 §13.6: reason-code master (cancel/refund/discount/DAMA…). */
const reasonCodeSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  module: { type: String, required: true, index: true }, // cancel, refund, discount, discharge-against-advice…
  code: { type: String, required: true, maxlength: 60 },
  label: { type: String, default: '' },
  requiresNote: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });

reasonCodeSchema.index({ hospitalId: 1, module: 1, code: 1 }, { unique: true });

export default mongoose.models.ReasonCode || mongoose.model('ReasonCode', reasonCodeSchema);
