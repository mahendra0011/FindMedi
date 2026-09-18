import mongoose from 'mongoose';

const platformCouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: '' },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minOrderValue: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  applicableServices: [{ type: String, enum: ['consultation', 'lab', 'pharmacy', 'all'] }],
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// { code: 1 } index hata diya — `unique: true` (line 4) pehle se hi ek index
// banata hai, isliye manual index duplicate warning deta tha (MONGOOSE Warning:
// Duplicate schema index on {"code":1} found).
platformCouponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
export default mongoose.model('PlatformCoupon', platformCouponSchema);
