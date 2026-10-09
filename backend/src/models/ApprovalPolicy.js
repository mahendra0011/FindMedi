import mongoose from 'mongoose';

/** File 13 §13.2: approval policy (threshold matrix). */
const approvalPolicySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  key: { type: String, required: true, index: true },
  name: { type: String, default: '' },
  scope: {
    model: { type: String, default: '' },
    amountField: { type: String, default: 'total' },
  },
  tiers: [{
    min: { type: Number, default: 0 },
    roles: [{ type: String }], // any-of at this tier
    steps: { type: Number, default: 1 },
  }],
  excludedRoles: [{ type: String }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

approvalPolicySchema.index({ hospitalId: 1, key: 1 });

export default mongoose.models.ApprovalPolicy || mongoose.model('ApprovalPolicy', approvalPolicySchema);
