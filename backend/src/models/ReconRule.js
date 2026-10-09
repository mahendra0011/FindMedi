import mongoose from 'mongoose';

/** File 16 §16.3: narration-regex auto-match rules (validated server-side). */
const reconRuleSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true },
  pattern: { type: String, default: '' }, // narration regex
  targetModel: { type: String, default: 'Payment' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.ReconRule || mongoose.model('ReconRule', reconRuleSchema);
