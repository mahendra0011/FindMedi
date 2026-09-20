import mongoose from 'mongoose';

const loyaltyEarnRuleSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'appointment_completed',
      'lab_order_completed',
      'pharmacy_order_completed',
      'review_submitted',
      'referral_qualified',
      'profile_completed',
    ],
    unique: true,
  },
  points: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

loyaltyEarnRuleSchema.index({ action: 1 });
loyaltyEarnRuleSchema.index({ isActive: 1 });

export default mongoose.model('LoyaltyEarnRule', loyaltyEarnRuleSchema);