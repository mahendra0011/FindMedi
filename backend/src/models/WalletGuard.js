import mongoose from 'mongoose';

/**
 * PAY-M-02: per-user wallet policy state — KYC, freeze, and rolling
 * withdrawal counters.
 *
 * One document per user (unique `userId`) rather than fields on the three
 * provider profiles, because the limits have to be enforceable with a single
 * atomic update: a read-modify-write across RiderProfile/AssistantProfile/
 * LawyerProfile is exactly the pattern that lets concurrent withdrawals
 * overshoot a cap. Rolling windows carry their key (`dayKey`/`hourKey`, IST) so
 * a stale window is detectable and zeroed lazily instead of needing a cron
 * reset job.
 */
const walletGuardSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  // No KYC approval flow exists yet in the platform, so enforcement is behind
  // WALLET_KYC_REQUIRED (default off) — but the STATE now exists and can be
  // set by a superadmin, which is what the finding meant by "no KYC state".
  kycStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified',
  },
  kycVerifiedAt: { type: Date },
  kycVerifiedBy: { type: String },
  frozen: {
    active: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    at: { type: Date },
    by: { type: String, default: 'system' },
  },
  daily: {
    dayKey: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  hourly: {
    hourKey: { type: String, default: '' },
    count: { type: Number, default: 0 },
  },
}, { timestamps: true });

export default mongoose.model('WalletGuard', walletGuardSchema);
