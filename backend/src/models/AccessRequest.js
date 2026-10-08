import mongoose from 'mongoose';

/**
 * File 25 §10: staff access request → approver(s) → assignment.
 * Self-approval impossible (route layer 403s requester-as-approver).
 */
const accessRequestSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requested: {
    kind: { type: String, enum: ['role', 'policy', 'actions'], required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'IamRole', default: null },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'IamPolicy', default: null },
    actions: [{ type: String, maxlength: 120 }],
    scope: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: null },
  },
  reason: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'approved', 'denied', 'expired'], default: 'pending', index: true },
  approverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  decidedAt: { type: Date, default: null },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

accessRequestSchema.index({ tenantId: 1, status: 1 });

export default mongoose.models.AccessRequest || mongoose.model('AccessRequest', accessRequestSchema);
