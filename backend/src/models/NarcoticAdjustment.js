import mongoose from 'mongoose';

/**
 * T6 (file 31): Narcotic & Schedule H1 stock adjustment with dual witness.
 * Records wastage, breakage, expiry, and supplier returns for controlled drugs.
 * Dual-person sign-off (recordedBy + witnessBy) is legally mandated under NDPS.
 */
const narcoticAdjustmentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
  medicineName: { type: String, required: true, maxlength: 300 },
  batch: { type: String, default: '', maxlength: 100 },
  qty: { type: Number, required: true, min: 1 },
  type: {
    type: String,
    enum: ['wastage', 'breakage', 'expiry', 'return-to-supplier'],
    required: true,
  },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  witnessBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  witnessByName: { type: String, default: '', maxlength: 200 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recordedByName: { type: String, default: '', maxlength: 200 },
  at: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

narcoticAdjustmentSchema.index({ hospitalId: 1, medicineId: 1, at: -1 });

export default mongoose.models.NarcoticAdjustment || mongoose.model('NarcoticAdjustment', narcoticAdjustmentSchema);
