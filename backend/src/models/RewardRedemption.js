import mongoose from 'mongoose';

const rewardRedemptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  rewardCatalogItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RewardCatalogItem',
    required: true,
  },
  pointsSpent: {
    type: Number,
    required: true,
  },
  code: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  usedAt: {
    type: Date,
  },
  usedOnOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
}, { timestamps: true });

rewardRedemptionSchema.index({ userId: 1, status: 1 });
rewardRedemptionSchema.index({ code: 1 });
rewardRedemptionSchema.index({ expiresAt: 1 });

export default mongoose.model('RewardRedemption', rewardRedemptionSchema);