import mongoose from 'mongoose';

/**
 * File 14 §14.5: every signing event. L1 = drawn signature (patient/relative
 * + witness); L2 = staff e-sign via step-up + typed intent + stored image.
 * Multi-party order enforced at the route layer (patient → witness → doctor).
 */
const signatureEventSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  docRef: {
    kind: { type: String, enum: ['consent', 'discharge', 'ot', 'form', 'other'], default: 'other' },
    id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  },
  level: { type: String, enum: ['L1', 'L2'], required: true },
  signerRole: { type: String, enum: ['patient', 'relative', 'witness', 'doctor', 'staff'], required: true },
  signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  signerName: { type: String, default: '' },
  relation: { type: String, default: '' },
  language: { type: String, default: 'en' },
  intent: { type: String, maxlength: 1000, default: '' },
  imageRef: { type: String, default: '' },
  digest: { type: String, default: '' },
  signature: { type: String, default: '' },
  nonceHash: { type: String, default: '' },
  ip: { type: String, default: '' },
  device: { type: String, default: '' },
  signedAt: { type: Date, default: Date.now },
}, { timestamps: true });

signatureEventSchema.index({ 'docRef.kind': 1, 'docRef.id': 1 });

export default mongoose.models.SignatureEvent || mongoose.model('SignatureEvent', signatureEventSchema);
