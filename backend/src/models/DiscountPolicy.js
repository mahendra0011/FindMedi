import mongoose from 'mongoose';

/**
 * File 09 §9.5: discount authority matrix. ≤role limit auto-applies with a
 * reason code; above it needs the approverRole (four-eyes).
 */
const discountPolicySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  role: { type: String, required: true, maxlength: 60 },
  maxPercent: { type: Number, required: true, min: 0, max: 100 },
  requiresReason: { type: Boolean, default: true },
  approverRole: { type: String, default: 'hospital_admin', maxlength: 60 },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

discountPolicySchema.index({ hospitalId: 1, role: 1 });

export default mongoose.models.DiscountPolicy || mongoose.model('DiscountPolicy', discountPolicySchema);
