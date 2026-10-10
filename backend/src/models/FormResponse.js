import mongoose from 'mongoose';

/**
 * File 14 §14.1: form submission pinned to a template version. Signed
 * responses are read-only; corrections go through addenda (amendmentOf
 * chain with reason). Never overwritten.
 */
const formResponseSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  templateKey: { type: String, required: true, index: true },
  templateVersion: { type: Number, required: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  values: { type: mongoose.Schema.Types.Mixed, default: {} },
  computed: { type: mongoose.Schema.Types.Mixed, default: {} },
  // File 22 P1-20: scored templates (NEWS2/Morse/Braden) keep their band
  // verdicts here so the alert doorway and the UI read the same numbers.
  scores: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['Draft', 'Signed', 'Amended'], default: 'Draft', index: true },
  signatures: [{
    role: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    hash: { type: String, default: '' },
  }],
  amendmentOf: { type: mongoose.Schema.Types.ObjectId, ref: 'FormResponse', default: null },
  amendmentReason: { type: String, maxlength: 1000, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

formResponseSchema.index({ encounterId: 1, templateKey: 1 });

export default mongoose.models.FormResponse || mongoose.model('FormResponse', formResponseSchema);
