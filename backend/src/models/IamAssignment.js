import mongoose from 'mongoose';

/**
 * File 25 §10: who holds what, where, until when. Scope narrows a role to
 * departments/wards/locations/care-team; expiresAt auto-revokes via TTL
 * index (temporary access, §7). approvedBy enforces maker-checker for
 * admin-critical grants.
 */
const iamAssignmentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
  principalType: { type: String, enum: ['user', 'group'], required: true },
  principalId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'IamRole', default: null },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'IamPolicy', default: null },
  scope: {
    deptIds: [{ type: String, maxlength: 80 }],
    wardIds: [{ type: String, maxlength: 80 }],
    locationIds: [{ type: String, maxlength: 80 }],
    careTeamOnly: { type: Boolean, default: false },
  },
  conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, default: null, index: true },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, maxlength: 500, default: '' },
  status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active', index: true },
}, { timestamps: true });

iamAssignmentSchema.index({ tenantId: 1, principalId: 1 });
iamAssignmentSchema.index({ tenantId: 1, status: 1 });

export default mongoose.models.IamAssignment || mongoose.model('IamAssignment', iamAssignmentSchema);
