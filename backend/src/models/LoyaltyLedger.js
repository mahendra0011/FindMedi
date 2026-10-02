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
    // LOYAL-M-02: 'reverse' claws back a previous 'earn' when the booking it
    // belongs to is cancelled.
    enum: ['earn', 'redeem', 'expire', 'admin_adjustment', 'reverse'],
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
// LOYAL-M-02: at most ONE reversal per (user, action, refId). The unique index
// is the idempotency lock — a retried/concurrent cancel loses the upsert race
// with E11000 instead of deducting the points twice. Partial so 'earn'/'redeem'
// rows (which can legitimately repeat) are unaffected.
loyaltyLedgerSchema.index(
  { userId: 1, reason: 1, refId: 1 },
  { unique: true, partialFilterExpression: { type: 'reverse' }, name: 'loyalty_reverse_once' },
);

export default mongoose.model('LoyaltyLedger', loyaltyLedgerSchema);