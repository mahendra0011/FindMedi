import mongoose from 'mongoose';

/**
 * T6 (file 31): Narcotic & Schedule H1 physical stock verification count.
 * Periodic dual-sign-off physical audit count compared against calculated ledger.
 */
const narcoticCountSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
  medicineName: { type: String, required: true, maxlength: 300 },
  batch: { type: String, default: '', maxlength: 100 },
  countedQty: { type: Number, required: true, min: 0 },
  countedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  countedByName: { type: String, default: '', maxlength: 200 },
  witnessBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  witnessByName: { type: String, default: '', maxlength: 200 },
  notes: { type: String, default: '', maxlength: 1000 },
  at: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

narcoticCountSchema.index({ hospitalId: 1, medicineId: 1, at: -1 });

export default mongoose.models.NarcoticCount || mongoose.model('NarcoticCount', narcoticCountSchema);
