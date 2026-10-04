import mongoose from 'mongoose';

const platformCouponUserUsageSchema = new mongoose.Schema({
  couponCode: { type: String, required: true, uppercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usedCount: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

platformCouponUserUsageSchema.index({ couponCode: 1, userId: 1 }, { unique: true });

export default mongoose.model('PlatformCouponUserUsage', platformCouponUserUsageSchema);
