import mongoose from 'mongoose';

/**
 * File 25 §10: team/department group ("Ward-3 Nurses"). Roles + policies
 * attach to the group; members inherit. Membership changes bump member
 * tokenVersions (done at the route layer).
 */
const iamGroupSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
  name: { type: String, required: true, maxlength: 120 },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IamRole' }],
  policyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IamPolicy' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

iamGroupSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.models.IamGroup || mongoose.model('IamGroup', iamGroupSchema);
