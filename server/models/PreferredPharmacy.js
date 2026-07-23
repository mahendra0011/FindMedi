import mongoose from 'mongoose';

const preferredPharmacySchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  name: { type: String, required: true },
  priority: { type: Number, required: true },
}, { timestamps: true });

preferredPharmacySchema.index({ patientId: 1, priority: 1 }, { unique: true });
preferredPharmacySchema.index({ patientId: 1, pharmacyId: 1 }, { unique: true });

export default mongoose.model('PreferredPharmacy', preferredPharmacySchema);
