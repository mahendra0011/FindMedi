import mongoose from 'mongoose';

/**
 * File 24 §4.10 Projects & Roadmap: platform initiatives with external tracker
 * links (Jira/Linear), phase & progress, and a founder-friendly decision log
 * (decision + why). Aggregate/operational work items — no PHI.
 */
const crmProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200, index: true },
  kind: {
    type: String,
    enum: ['project', 'release', 'initiative', 'ops_task'],
    default: 'project',
    index: true,
  },
  phase: { type: String, default: '', maxlength: 60 },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'blocked', 'done', 'cancelled'],
    default: 'planned',
    index: true,
  },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  startAt: { type: Date, default: null },
  targetAt: { type: Date, default: null },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  externalRef: { type: String, default: '', maxlength: 300 },
  tags: [{ type: String, maxlength: 40 }],
  notes: { type: String, default: '', maxlength: 4000 },
  decisionLog: [{
    decision: { type: String, required: true, maxlength: 1000 },
    why: { type: String, default: '', maxlength: 2000 },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

crmProjectSchema.index({ status: 1, kind: 1 });

export default mongoose.models.CrmProject || mongoose.model('CrmProject', crmProjectSchema);
