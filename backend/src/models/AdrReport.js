import mongoose from 'mongoose';

/**
 * File 09 §9.9: adverse drug reaction report (PvPI-bound). Causality +
 * outcome feed pharmacovigilance review.
 */
const adrReportSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  drug: { type: String, required: true, maxlength: 200 },
  reaction: { type: String, required: true, maxlength: 2000 },
  severity: { type: String, enum: ['Mild', 'Moderate', 'Severe', 'Fatal'], default: 'Moderate' },
  outcome: { type: String, default: '' },
  causality: { type: String, enum: ['', 'Certain', 'Probable', 'Possible', 'Unlikely'], default: '' },
  reportedToPvPI: { type: Boolean, default: false },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Open', 'UnderReview', 'Closed'], default: 'Open', index: true },
}, { timestamps: true });

export default mongoose.models.AdrReport || mongoose.model('AdrReport', adrReportSchema);
