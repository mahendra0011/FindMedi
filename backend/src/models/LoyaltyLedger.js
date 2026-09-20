import mongoose from 'mongoose';

const loyaltyLedgerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['earn', 'redeem', 'expire', 'admin_adjustment'],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  refId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

loyaltyLedgerSchema.index({ userId: 1, createdAt: -1 });
loyaltyLedgerSchema.index({ type: 1 });

export default mongoose.model('LoyaltyLedger', loyaltyLedgerSchema);