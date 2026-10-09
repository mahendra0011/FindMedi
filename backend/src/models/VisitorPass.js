import mongoose from 'mongoose';

/**
 * File 09 §9.4: IPD visitor passes with time windows + blacklist check
 * (route layer refuses blacklisted phones).
 */
const visitorPassSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
  visitorName: { type: String, required: true, maxlength: 120 },
  phone: { type: String, default: '' },
  idType: { type: String, default: '' },
  idLast4: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  relation: { type: String, default: '' },
  validFrom: { type: Date, default: Date.now },
  validTo: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active', index: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

visitorPassSchema.index({ hospitalId: 1, phone: 1 });

export default mongoose.models.VisitorPass || mongoose.model('VisitorPass', visitorPassSchema);
