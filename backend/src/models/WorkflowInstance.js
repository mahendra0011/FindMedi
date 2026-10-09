import mongoose from 'mongoose';

/**
 * File 13 §13.1: running instance pinned to a definition version.
 * Optimistic concurrency via `version`; cancel-with-reason, never delete.
 */
const workflowInstanceSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  defKey: { type: String, required: true, index: true },
  defVersion: { type: Number, required: true },
  entityRef: {
    model: { type: String, default: '' },
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  state: { type: String, default: '' },
  activeStates: [{ type: String }],
  history: [{
    from: { type: String }, to: { type: String }, event: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now }, note: { type: String, default: '' },
  }],
  timers: [{ state: { type: String }, dueAt: { type: Date }, escalatedAt: { type: Date, default: null } }],
  status: { type: String, enum: ['Active', 'Done', 'Cancelled'], default: 'Active', index: true },
  cancelReason: { type: String, default: '' },
  version: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

workflowInstanceSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.WorkflowInstance || mongoose.model('WorkflowInstance', workflowInstanceSchema);
