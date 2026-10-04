import mongoose from 'mongoose';

const platformCouponRedemptionSchema = new mongoose.Schema({
  couponCode: { type: String, required: true, uppercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  discountPaise: { type: Number, required: true, min: 0 },
  orderRef: { type: String, required: true },
  status: { type: String, enum: ['applied', 'settled', 'reversed'], default: 'applied', index: true },
}, { timestamps: true });

// Retries for the same checkout cannot create multiple redemptions; per-user
// eligibility queries have a covering index on code, user and active statuses.
platformCouponRedemptionSchema.index({ couponCode: 1, orderRef: 1 }, { unique: true });
platformCouponRedemptionSchema.index({ couponCode: 1, userId: 1, status: 1 });

export default mongoose.model('PlatformCouponRedemption', platformCouponRedemptionSchema);
