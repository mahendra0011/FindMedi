import mongoose from 'mongoose';

/**
 * T3 (file 31): DDI override audit — a major interaction blocks "Sign" until
 * the clinician records WHY they are proceeding anyway. One row per overridden
 * pair per prescription so Quality/Pharmacovigilance can report overrides.
 */
const ddiOverrideSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null, index: true },
  // Free context when there is no prescription yet (draft Rx in the composer).
  prescriptionNo: { type: String, default: '', maxlength: 60 },
  pair: {
    drugA: { type: String, required: true, maxlength: 300 },
    drugB: { type: String, required: true, maxlength: 300 },
  },
  severity: { type: String, required: true, enum: ['major', 'moderate', 'minor'] },
  effect: { type: String, default: '', maxlength: 2000 },
  reason: { type: String, required: true, maxlength: 1000 },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  byName: { type: String, default: '', maxlength: 200 },
  at: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

ddiOverrideSchema.index({ hospitalId: 1, at: -1 });

export default mongoose.models.DdiOverride || mongoose.model('DdiOverride', ddiOverrideSchema);