import mongoose from 'mongoose';

/**
 * File 09 §9.9: Medico-Legal Case register. Restricted-edit: status changes
 * and statements are append-only; the record itself is never hard-deleted
 * (retention + legal hold).
 */
const mlcCaseSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mlcNo: { type: String, required: true, index: true },
  policeStation: { type: String, default: '' },
  intimationAt: { type: Date, default: null },
  injuryType: { type: String, default: '' },
  history: { type: String, maxlength: 4000, default: '' },
  opinion: { type: String, maxlength: 4000, default: '' },
  sealedExhibits: [{ type: String, maxlength: 300 }],
  status: { type: String, enum: ['Open', 'Reported', 'Closed'], default: 'Open', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

mlcCaseSchema.index({ hospitalId: 1, mlcNo: 1 }, { unique: true, sparse: true });

export default mongoose.models.MlcCase || mongoose.model('MlcCase', mlcCaseSchema);
