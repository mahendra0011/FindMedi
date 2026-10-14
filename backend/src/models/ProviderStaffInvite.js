import mongoose from 'mongoose';

/**
 * 2.md 9 — single-use provider staff invitation codes.
 *
 * Same reasoning as AmbulanceSetupCode (FE-B-06): the invite link must be
 * OPAQUE (no claims in a URL), EXPIRING, and SINGLE-USE, and a row is the only
 * structure that can express "already redeemed" — a JWT cannot.
 *
 * Differences from the ambulance flow: this invite carries the TEMPLATE the
 * owner picked (the role is resolved server-side at issue time), and 48 hours
 * instead of 15 minutes, because the invitee is a human who was told about it
 * offline and gets one working day to click.
 *
 * `code` is stored as-is (the lookup IS the redemption: one atomic
 * findOneAndUpdate flips `usedAt`), 128 bits of CSPRNG entropy, TTL-indexed so
 * Mongo cleans up what nobody clicked.
 */
const providerStaffInviteSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  // Resolved from the template at issue time — never client-supplied at redeem.
  template: { type: String, required: true, maxlength: 60 },
  role: { type: String, required: true, maxlength: 60 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 160 },
  name: { type: String, maxlength: 120, default: '' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Convenience for the owner's invite list; redemption never uses this index
// (it filters on `code`).
providerStaffInviteSchema.index({ providerId: 1, createdAt: -1 });

// TTL cleanup for invites nobody clicked. Redemption already rejects an expired
// row via `expiresAt > now`, so this is hygiene, not the security control.
providerStaffInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('ProviderStaffInvite', providerStaffInviteSchema);
