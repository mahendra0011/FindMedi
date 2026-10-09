import mongoose from 'mongoose';

/** File 22 P2-30: per-hospital chapter assessment (scores + auto values). */
const nabhAssessmentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  chapter: { type: String, required: true, index: true },
  scores: { type: mongoose.Schema.Types.Mixed, default: {} }, // {objectiveCode: 'compliant'|'partial'|'non_compliant'|'na'}
  autoValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  scorePct: { type: Number, default: null },
  assessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assessedAt: { type: Date, default: Date.now },
}, { timestamps: true });

nabhAssessmentSchema.index({ hospitalId: 1, chapter: 1 });

export default mongoose.models.NabhAssessment || mongoose.model('NabhAssessment', nabhAssessmentSchema);
