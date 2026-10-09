import mongoose from 'mongoose';

/**
 * File 13 §13.5: rule (DNF conditions + actions). Suppression honors the
 * RuleFiring ledger; test-fire uses the same matcher (lib/ruleEngine.js).
 */
const conditionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  op: {
    type: String, required: true,
    enum: ['=', '!=', '>', '>=', '<', '<=', 'between', 'in', 'contains', 'is_set', 'is_empty'],
  },
  value: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const ruleSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  key: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 200 },
  dataset: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: true },
  groups: { type: [[conditionSchema]], default: [] }, // OR of ANDs
  cooldownMinutes: { type: Number, default: 1440 },
  actions: { type: mongoose.Schema.Types.Mixed, default: {} },
  schedule: { type: String, default: '15m' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ruleSchema.index({ hospitalId: 1, key: 1 }, { unique: true });

export default mongoose.models.Rule || mongoose.model('Rule', ruleSchema);
