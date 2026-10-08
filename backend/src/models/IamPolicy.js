import mongoose from 'mongoose';

/**
 * File 25 §4/§10: tenant access policy (AWS policy equivalent).
 * tenantId null = platform-managed template (read-only, versioned).
 * Statements use the existing permission-string catalog as actions
 * (equivalence with ROLE_PERMISSIONS); the ~120 fine-grained catalog
 * extends this vocabulary later without changing the shape.
 */
const statementSchema = new mongoose.Schema({
  sid: { type: String, maxlength: 80, default: '' },
  effect: { type: String, enum: ['Allow', 'Deny'], required: true },
  actions: [{ type: String, maxlength: 120 }],
  resources: [{ type: String, maxlength: 200 }],
  conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const iamPolicySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', default: null, index: true },
  name: { type: String, required: true, maxlength: 120 },
  type: { type: String, enum: ['managed', 'custom'], default: 'custom', index: true },
  statements: { type: [statementSchema], default: [] },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'deprecated'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

iamPolicySchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.models.IamPolicy || mongoose.model('IamPolicy', iamPolicySchema);
