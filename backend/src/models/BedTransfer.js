import mongoose from 'mongoose';

/**
 * File 09 §9.2 (F8): bed/ward transfer history with tariff change capture.
 */
const bedTransferSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  fromBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', default: null },
  toBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
  fromWard: { type: String, default: '' },
  toWard: { type: String, default: '' },
  reason: { type: String, maxlength: 500, default: '' },
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  effectiveAt: { type: Date, default: Date.now },
}, { timestamps: true });

bedTransferSchema.index({ admissionId: 1, effectiveAt: 1 });

export default mongoose.models.BedTransfer || mongoose.model('BedTransfer', bedTransferSchema);
