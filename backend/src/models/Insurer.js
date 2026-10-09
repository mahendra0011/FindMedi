import mongoose from 'mongoose';

/**
 * File 09 §9.6: insurer/TPA/govt-scheme master with empanelment, rate-card
 * link and document checklist for pre-auth.
 */
const insurerSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true, maxlength: 200 },
  type: { type: String, enum: ['Insurer', 'TPA', 'Govt'], default: 'Insurer', index: true },
  contact: { type: String, default: '' },
  empanelmentNo: { type: String, default: '' },
  rateCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePrice', default: null },
  docChecklist: [{ type: String, maxlength: 200 }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

insurerSchema.index({ hospitalId: 1, name: 1 });

export default mongoose.models.Insurer || mongoose.model('Insurer', insurerSchema);
