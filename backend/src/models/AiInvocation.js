import mongoose from 'mongoose';

/**
 * File 17 §17.4: every AI invocation is logged (model, tokens, latency,
 * redaction flags) with a global kill switch in SystemSetting.
 * PHI redaction happens BEFORE the provider call, never after.
 */
const aiInvocationSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  feature: { type: String, required: true, index: true },
  provider: { type: String, default: 'stub' },
  redacted: { type: Boolean, default: true },
  tokensIn: { type: Number, default: 0 },
  tokensOut: { type: Number, default: 0 },
  ms: { type: Number, default: 0 },
  ok: { type: Boolean, default: true },
  error: { type: String, default: '' },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

aiInvocationSchema.index({ hospitalId: 1, feature: 1 });

export default mongoose.models.AiInvocation || mongoose.model('AiInvocation', aiInvocationSchema);
