import mongoose from 'mongoose';

/**
 * File 09 §9.5: cash counters + shift open/close with denomination counts
 * and variance. Handover to accounts via deposit-to-bank entry (remarks).
 */
const cashCounterSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  name: { type: String, required: true, maxlength: 120 },
  location: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.CashCounter || mongoose.model('CashCounter', cashCounterSchema);
