import mongoose from 'mongoose';

/**
 * File 25 §10: periodic certification cycle ("is access still needed?").
 * Reviewer keeps or revokes each assignment; revocations apply at the
 * route layer with tokenVersion bumps.
 */
const accessReviewSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
  cycle: { type: String, required: true, maxlength: 40 },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'IamAssignment' },
    decision: { type: String, enum: ['keep', 'revoke', 'pending'], default: 'pending' },
    note: { type: String, maxlength: 500, default: '' },
  }],
  completedAt: { type: Date, default: null },
}, { timestamps: true });

accessReviewSchema.index({ tenantId: 1, cycle: 1 });

export default mongoose.models.AccessReview || mongoose.model('AccessReview', accessReviewSchema);
