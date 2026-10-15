import mongoose from 'mongoose';

const approvalEntrySchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, default: '' },
  adminRole: { type: String, default: 'superadmin' },
  at: { type: Date, default: Date.now },
  ip: { type: String, default: '' },
  notes: { type: String, maxlength: 1000, default: '' },
}, { _id: false });

const twoPersonApprovalSchema = new mongoose.Schema({
  actionType: {
    type: String,
    required: true,
    enum: [
      'payout',
      'sensitive_kyc_approval',
      'tenant_suspension',
      'commission_rate_change',
      'fee_waiver',
      'break_glass',
      'superadmin_escalation',
      'bulk_export',
    ],
    index: true,
  },
  targetModel: { type: String, required: true }, // e.g. 'Payout', 'ProviderApplication', 'Hospital'
  targetId: { type: String, required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByName: { type: String, default: '' },
  payload: { type: mongoose.Schema.Types.Mixed },
  approvals: [approvalEntrySchema],
  requiredApprovalsCount: { type: Number, default: 2, min: 2, max: 5 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true,
  },
  rejectionReason: { type: String, maxlength: 1000, default: '' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  expiresAt: { type: Date, required: true, index: true },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

twoPersonApprovalSchema.index({ targetId: 1, actionType: 1, status: 1 });

/**
 * Initiates a four-eyes / two-person approval request.
 */
twoPersonApprovalSchema.statics.requestAction = async function ({
  actionType,
  targetModel,
  targetId,
  requestedBy,
  requestedByName = '',
  payload = {},
  requiredApprovalsCount = 2,
  expiresInHours = 48,
}) {
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  return this.create({
    actionType,
    targetModel,
    targetId: String(targetId),
    requestedBy,
    requestedByName,
    payload,
    requiredApprovalsCount,
    expiresAt,
    status: 'pending',
    approvals: [],
  });
};

/**
 * Records an approval by an admin. Enforces distinct administrators.
 */
twoPersonApprovalSchema.statics.recordApproval = async function ({
  approvalId,
  adminId,
  adminName = '',
  adminRole = 'superadmin',
  ip = '',
  notes = '',
}) {
  const record = await this.findById(approvalId);
  if (!record) {
    const err = new Error('Approval request not found');
    err.status = 404;
    throw err;
  }

  if (record.status !== 'pending') {
    const err = new Error(`Approval request is already ${record.status}`);
    err.status = 409;
    throw err;
  }

  if (new Date() > record.expiresAt) {
    record.status = 'expired';
    await record.save();
    const err = new Error('Approval request has expired');
    err.status = 410;
    throw err;
  }

  // Four-eyes invariant: Same admin cannot approve twice
  const adminIdStr = String(adminId);
  const alreadyApproved = record.approvals.some((a) => String(a.adminId) === adminIdStr);
  if (alreadyApproved) {
    const err = new Error('Admin has already approved this request; four-eyes policy requires distinct reviewers');
    err.status = 400;
    throw err;
  }

  record.approvals.push({
    adminId,
    adminName,
    adminRole,
    at: new Date(),
    ip,
    notes,
  });

  const distinctCount = new Set(record.approvals.map((a) => String(a.adminId))).size;
  if (distinctCount >= record.requiredApprovalsCount) {
    record.status = 'approved';
    record.resolvedAt = new Date();
  }

  await record.save();
  return record;
};

/**
 * Rejects an approval request.
 */
twoPersonApprovalSchema.statics.rejectAction = async function ({
  approvalId,
  adminId,
  reason = 'Rejected by administrator',
}) {
  const record = await this.findById(approvalId);
  if (!record) {
    const err = new Error('Approval request not found');
    err.status = 404;
    throw err;
  }

  if (record.status !== 'pending') {
    const err = new Error(`Approval request is already ${record.status}`);
    err.status = 409;
    throw err;
  }

  record.status = 'rejected';
  record.rejectionReason = reason;
  record.rejectedBy = adminId;
  record.resolvedAt = new Date();
  await record.save();
  return record;
};

export default mongoose.model('TwoPersonApproval', twoPersonApprovalSchema);
