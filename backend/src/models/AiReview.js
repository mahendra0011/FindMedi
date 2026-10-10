import mongoose from 'mongoose';

// File 22 P2-37: human-review queue for AI drafts. Nothing AI-generated is
// shown as final clinical content until a reviewer flips status to Approved.

const aiReviewSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  feature: { type: String, required: true }, // ocr | claim_check | faq_rag | lab_narrative | discharge_draft
  sourceId: { type: String, default: '' }, // claim id / order id / doc id when known
  input: { type: mongoose.Schema.Types.Mixed, default: {} },
  output: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Edited'], default: 'Pending', index: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewerNote: { type: String, default: '', maxlength: 500 },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

aiReviewSchema.index({ hospitalId: 1, status: 1, createdAt: -1 });

export default mongoose.models.AiReview || mongoose.model('AiReview', aiReviewSchema);
