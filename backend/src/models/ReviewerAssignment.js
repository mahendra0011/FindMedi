import mongoose from 'mongoose';

const reviewerAssignmentSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  roleType: {
    type: String,
    enum: ['kyc_reviewer', 'clinical_compliance_reviewer', 'senior_reviewer', 'finance_reviewer'],
    default: 'kyc_reviewer',
    index: true,
  },
  tier: { type: String, enum: ['T1', 'T2', 'T3'], default: 'T1', index: true },
  priority: { type: String, enum: ['standard', 'urgent', 'high_risk'], default: 'standard' },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'reassigned', 'expired'],
    default: 'assigned',
    index: true,
  },
  slaHours: { type: Number, default: 48 },
  assignedAt: { type: Date, default: Date.now },
  slaDeadline: { type: Date, required: true, index: true },
  completedAt: { type: Date, default: null },
  notes: { type: String, maxlength: 1000, default: '' },
}, { timestamps: true });

reviewerAssignmentSchema.index({ reviewerId: 1, status: 1 });
reviewerAssignmentSchema.index({ applicationId: 1, roleType: 1 });

/**
 * Assigns a reviewer to an application with an SLA deadline.
 */
reviewerAssignmentSchema.statics.assignReviewer = async function ({
  applicationId,
  reviewerId,
  assignedBy = null,
  roleType = 'kyc_reviewer',
  tier = 'T1',
  slaHours = 48,
  priority = 'standard',
  notes = '',
}) {
  const now = new Date();
  const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

  // Mark any active assignment of this roleType as reassigned
  await this.updateMany(
    { applicationId, roleType, status: { $in: ['assigned', 'in_progress'] } },
    { $set: { status: 'reassigned', notes: 'Reassigned to new reviewer' } }
  );

  return this.create({
    applicationId,
    reviewerId,
    assignedBy,
    roleType,
    tier,
    slaHours,
    priority,
    assignedAt: now,
    slaDeadline,
    status: 'assigned',
    notes,
  });
};

/**
 * Marks an active assignment completed.
 */
reviewerAssignmentSchema.statics.completeAssignment = async function (applicationId, reviewerId) {
  return this.findOneAndUpdate(
    { applicationId, reviewerId, status: { $in: ['assigned', 'in_progress'] } },
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true }
  );
};

export default mongoose.model('ReviewerAssignment', reviewerAssignmentSchema);
