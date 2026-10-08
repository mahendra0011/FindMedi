import mongoose from 'mongoose';

/**
 * CRM unified task engine (file 24 §4.6/§8): tasks across leads, accounts,
 * partners, tickets and KYC. Auto-created by automation rules (doc expiry,
 * SLA breach, at-risk) via `automationRuleId`.
 */
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 300 },
  type: {
    type: String,
    enum: ['call', 'visit', 'follow_up', 'doc_request', 'renewal', 'training', 'review', 'custom'],
    default: 'follow_up',
  },
  dueAt: { type: Date, default: null, index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  related: {
    type: { type: String, enum: ['lead', 'account', 'partner', 'camp', 'ticket', 'application', 'none'], default: 'none' },
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  slaAt: { type: Date, default: null },
  status: { type: String, enum: ['open', 'in_progress', 'blocked', 'done'], default: 'open', index: true },
  checklist: [{ label: { type: String }, done: { type: Boolean, default: false } }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  automationRuleId: { type: String, default: '' },
}, { timestamps: true });

taskSchema.index({ ownerId: 1, status: 1, dueAt: 1 });
taskSchema.index({ 'related.type': 1, 'related.id': 1 });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
