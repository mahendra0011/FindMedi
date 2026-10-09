import mongoose from 'mongoose';

/**
 * File 09 §9.2: IPD consent templates + signed instances (admission,
 * surgery, anesthesia, blood, high-risk, DAMA) with witness + language +
 * revocation.
 */
const consentFormSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  templateId: {
    type: String,
    enum: ['admission', 'surgery', 'anesthesia', 'blood', 'high_risk', 'dama', 'other'],
    default: 'other', index: true,
  },
  language: { type: String, default: 'en' },
  content: { type: String, maxlength: 10000, default: '' },
  signedBy: { type: String, enum: ['patient', 'guardian'], default: 'patient' },
  signerName: { type: String, default: '' },
  witness: { type: String, default: '' },
  signatureImg: { type: String, default: '' },
  signedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

consentFormSchema.index({ admissionId: 1, templateId: 1 });

export default mongoose.models.ConsentForm || mongoose.model('ConsentForm', consentFormSchema);
