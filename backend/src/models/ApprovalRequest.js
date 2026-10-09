import mongoose from 'mongoose';

/** File 13 §13.2: tiered approval request with per-step ledger. */
const approvalRequestSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  policyKey: { type: String, required: true },
  entityRef: { model: { type: String, default: '' }, id: { type: mongoose.Schema.Types.ObjectId, default: null } },
  title: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  requiredRoles: [{ type: String }],
  steps: [{
    step: { type: Number }, role: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: null }, comment: { type: String, default: '' },
  }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending', index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);
