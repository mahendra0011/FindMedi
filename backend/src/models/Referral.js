import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  refereeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'qualified', 'rewarded', 'expired', 'fraud_flagged'],
    default: 'pending',
  },
  qualifyingAction: {
    type: String,
    default: '',
  },
  qualifiedAt: {
    type: Date,
  },
  referrerRewardPoints: {
    type: Number,
    default: 0,
  },
  refereeRewardPoints: {
    type: Number,
    default: 0,
  },
  rewardedAt: {
    type: Date,
  },
}, { timestamps: true });

referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ status: 1 });

export default mongoose.model('Referral', referralSchema);