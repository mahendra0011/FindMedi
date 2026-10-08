import mongoose from 'mongoose';

/**
 * File 25 §10: tenant role (AWS role equivalent). tenantId null = system
 * template cloned by tenants. boundaryId caps the max power a delegated
 * admin may hand out (anti-escalation, §9).
 */
const iamRoleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', default: null, index: true },
  name: { type: String, required: true, maxlength: 120 },
  type: { type: String, enum: ['managed', 'custom'], default: 'custom', index: true },
  policyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IamPolicy' }],
  boundaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'IamPolicy', default: null },
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

iamRoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.models.IamRole || mongoose.model('IamRole', iamRoleSchema);
