import mongoose from 'mongoose';

/** File 13 §13.5: firing ledger — dedup hash (rule+entity+day) + suppression. */
const ruleFiringSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule', index: true },
  dedupHash: { type: String, required: true, index: true },
  entityRef: { model: { type: String, default: '' }, id: { type: mongoose.Schema.Types.ObjectId, default: null } },
  status: { type: String, enum: ['fired', 'suppressed', 'ack'], default: 'fired' },
  firedAt: { type: Date, default: Date.now },
}, { timestamps: true });

ruleFiringSchema.index({ ruleId: 1, dedupHash: 1 });

export default mongoose.models.RuleFiring || mongoose.model('RuleFiring', ruleFiringSchema);
