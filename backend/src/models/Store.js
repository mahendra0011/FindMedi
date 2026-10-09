import mongoose from 'mongoose';

/**
 * File 09 §9.7: store hierarchy (Central → Pharmacy/OT/Ward/Lab sub-stores).
 */
const storeSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  name: { type: String, required: true, maxlength: 120 },
  type: { type: String, enum: ['Central', 'Pharmacy', 'OT', 'Ward', 'Lab'], default: 'Central' },
  parentStoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

storeSchema.index({ hospitalId: 1, name: 1 }, { unique: true });

export default mongoose.models.Store || mongoose.model('Store', storeSchema);
