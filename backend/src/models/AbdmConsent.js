import mongoose from 'mongoose';

/**
 * File 22 P2-28: ABDM-style health-data consent (HIP request → patient grant/
 * deny → HIU fetch within purpose + date window). Gateway calls need live
 * ABDM credentials; the CONSENT LIFECYCLE itself is fully local and is what
 * gates every fetch below.
 */
const abdmConsentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  abhaAddress: { type: String, default: '' },
  hipId: { type: String, default: '' },
  hiuId: { type: String, default: '', maxlength: 120 },
  purpose: { type: String, default: 'CAREMGT', maxlength: 60 },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  dataEraseAt: { type: Date, default: null },
  status: { type: String, enum: ['Requested', 'Granted', 'Denied', 'Expired', 'Revoked'], default: 'Requested', index: true },
  grantedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

abdmConsentSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.AbdmConsent || mongoose.model('AbdmConsent', abdmConsentSchema);
