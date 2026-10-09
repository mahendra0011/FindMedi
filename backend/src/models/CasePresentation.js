import mongoose from 'mongoose';

/**
 * Doc 11 P2: tumour-board / M&M case presentation + teaching notes.
 * De-identified by convention (no patient identity fields on the row —
 * link the encounter for authorized viewers instead).
 */
const casePresentationSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null },
  kind: { type: String, enum: ['TumourBoard', 'MM', 'Teaching'], default: 'Teaching', index: true },
  title: { type: String, required: true, maxlength: 200 },
  summary: { type: String, maxlength: 5000, default: '' },
  questions: [{ type: String, maxlength: 500 }],
  discussion: { type: String, maxlength: 5000, default: '' },
  decision: { type: String, maxlength: 2000, default: '' },
  presentedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  presentedAt: { type: Date, default: null },
  status: { type: String, enum: ['Draft', 'Presented', 'Closed'], default: 'Draft', index: true },
}, { timestamps: true });

casePresentationSchema.index({ hospitalId: 1, kind: 1, status: 1 });

export default mongoose.models.CasePresentation || mongoose.model('CasePresentation', casePresentationSchema);
