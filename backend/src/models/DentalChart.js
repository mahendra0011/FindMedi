import mongoose from 'mongoose';

// 7.md §3.1 dental chart (odontogram): a per-patient snapshot of all teeth.
// Teeth use FDI numbering (permanent 11-18/21-28/31-38/41-48, primary
// 51-55/61-65/71-75/81-85). Rows are snapshots, never mutated — a new exam
// writes a new chart, so the history endpoint is the clinical timeline.
// Provider-owned (providerId + authorizeObject ownerUserId check in the
// route); the patient reads their own rows through GET /mine.
export const DENTAL_TOOTH_CONDITIONS = [
  'healthy', 'caries', 'filling', 'crown', 'implant', 'missing',
  'rct', 'fracture', 'extraction_planned', 'other',
];

const dentalChartSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teeth: [{
    fdi: { type: String, required: true },
    condition: { type: String, enum: DENTAL_TOOTH_CONDITIONS, default: 'healthy' },
    notes: { type: String, maxlength: 300, default: '' },
    _id: false,
  }],
  // Before/after photos (7.md §3.1 "consented"): URLs only, and the consent
  // flag travels WITH the images — an image without granted consent is a
  // compliance incident, not a display bug.
  images: [{ type: String, maxlength: 500 }],
  photoConsent: {
    granted: { type: Boolean, default: false },
    grantedAt: { type: Date, default: null },
  },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: false });

dentalChartSchema.index({ patientId: 1, recordedAt: -1 });

export default mongoose.model('DentalChart', dentalChartSchema);
