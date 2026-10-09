import mongoose from 'mongoose';

/**
 * File 13 §13.1: workflow definition (directed graph JSON, versioned).
 * Table-driven runtime (lib/workflowEngine.js) — no xstate dependency;
 * instances pin the version they started on.
 */
const actionSchema = new mongoose.Schema({
  kind: { type: String, enum: ['task', 'notify', 'charge', 'webhook', 'event'], required: true },
  params: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const stateSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, default: '' },
  type: { type: String, enum: ['start', 'task', 'parallel', 'join', 'end'], default: 'task' },
  slaMinutes: { type: Number, default: 0 },
  onEnter: { type: [actionSchema], default: [] },
  onExit: { type: [actionSchema], default: [] },
}, { _id: false });

const transitionSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  from: { type: String, required: true },
  to: { type: String, required: true },
  event: { type: String, required: true },
  guard: {
    roles: [{ type: String }],
    permissions: [{ type: String }],
  },
  label: { type: String, default: '' },
}, { _id: false });

const workflowDefinitionSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  key: { type: String, required: true, maxlength: 120, index: true },
  name: { type: String, required: true, maxlength: 200 },
  entityModel: { type: String, default: '' },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Draft', index: true },
  states: { type: [stateSchema], default: [] },
  transitions: { type: [transitionSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

workflowDefinitionSchema.index({ hospitalId: 1, key: 1, version: -1 });

export default mongoose.models.WorkflowDefinition || mongoose.model('WorkflowDefinition', workflowDefinitionSchema);
