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
  // File 22 P0-1: one-time consumption — an approval applies to exactly one
  // action, so a captured approvalId cannot be replayed on a second bill.
  consumedAt: { type: Date, default: null },
  consumedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  consumedFor: { type: String, default: '' },
  // File 22 P0-left: SLA escalation — pending requests past 75% of dueAt
  // escalate to the next tier (hospital_admin) so they don't silently expire.
  escalatedAt: { type: Date, default: null },
  escalationLevel: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);
