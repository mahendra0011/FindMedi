import mongoose from 'mongoose';

/**
 * File 13 §13.3: human/operational task routed from rules, approvals and
 * the ward — assigned to a user or queued to a role.
 */
const workTaskSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  title: { type: String, required: true, maxlength: 200 },
  detail: { type: String, default: '', maxlength: 2000 },
  entityRef: { model: { type: String, default: '' }, id: { type: mongoose.Schema.Types.ObjectId, default: null } },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  roleQueue: { type: String, default: '' },
  priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3'], default: 'P2', index: true },
  status: { type: String, enum: ['Open', 'InProgress', 'Blocked', 'Done', 'Cancelled'], default: 'Open', index: true },
  dueAt: { type: Date, default: null },
  tags: [{ type: String }],
  activity: [{
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now }, text: { type: String, default: '' },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

workTaskSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.WorkTask || mongoose.model('WorkTask', workTaskSchema);
