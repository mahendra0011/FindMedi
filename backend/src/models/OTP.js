import mongoose from 'mongoose';
import { hashOtp, verifyOtpHash, OTP_HASH_ALGO, ACTIVE_OTP_HASH_ALGO, resolveOtpHashAlgo } from '../services/napiOtpService.js';

const otpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, lowercase: true, index: true },
  otpHash: { type: String, required: true },
  // Explicit record of which backend produced otpHash (shared OTP_HASH_ALGO contract).
  // Optional with default so pre-existing documents without the field keep working.
  hashAlgo: {
    type: String,
    enum: Object.values(OTP_HASH_ALGO),
    default: OTP_HASH_ALGO.UNKNOWN,
  },
  type: { 
    type: String, 
    enum: ['email', 'sms', 'password_reset'],
    default: 'email' 
  },
  phone: { type: String, default: '' },
  used: { type: Boolean, default: false, index: true },
  expiresAt: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now },
  // For rate limiting: track last OTP request time per user/email
  lastRequestAt: { type: Date, index: true }
});

// Index for efficient query of valid, unused OTPs
otpSchema.index({ email: 1, used: 1, expiresAt: 1 });

// TTL index to automatically remove expired OTPs after 1 hour
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

/**
 * Hash an OTP before storing.
 * Production backend is the explicit ACTIVE_OTP_HASH_ALGO contract
 * ('rust-sha256' when native is available, otherwise 'bcrypt').
 * `hashOtp()` itself already falls back to bcrypt, so behavior is unchanged.
 */
otpSchema.statics.hashOTP = async (otp) => {
  if (ACTIVE_OTP_HASH_ALGO === OTP_HASH_ALGO.RUST_SHA256) {
    try {
      return hashOtp(otp); // Rust SHA-256 hash (returns salt:hash synchronously)
    } catch (e) {
      // Fall through to bcrypt
    }
  }
  // Fallback: bcrypt (also the active backend when native is unavailable)
  const bcrypt = (await import('bcryptjs')).default;
  return await bcrypt.hash(otp, 10);
};

/**
 * Hash an OTP and report which backend produced it (explicit contract).
 * Same hashing behavior as `hashOTP()` plus the OTP_HASH_ALGO value,
 * so callers can persist `hashAlgo` alongside `otpHash`.
 *
 * @returns {Promise<{ hash: string, algo: string }>}
 */
otpSchema.statics.hashOTPWithMeta = async (otp) => {
  if (ACTIVE_OTP_HASH_ALGO === OTP_HASH_ALGO.RUST_SHA256) {
    try {
      const hash = await hashOtp(otp);
      return { hash, algo: resolveOtpHashAlgo(hash) };
    } catch (e) {
      // Fall through to bcrypt
    }
  }
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(otp, 10);
  return { hash, algo: OTP_HASH_ALGO.BCRYPT };
};

/**
 * Compare plain OTP with stored hash.
 * Delegates to verifyOtpHash (which branches on the explicit OtpHashKind);
 * the catch-all bcrypt fallback only applies when the stored hash is
 * explicitly a bcrypt hash per the OTP_HASH_ALGO contract.
 */
otpSchema.methods.compareOTP = async function(plainOtp) {
  try {
    return await verifyOtpHash(plainOtp, this.otpHash);
  } catch (e) {
    // Explicit fallback: only bcrypt hashes can be bcrypt-compared.
    if (resolveOtpHashAlgo(this.otpHash) !== OTP_HASH_ALGO.BCRYPT) return false;
    const bcrypt = (await import('bcryptjs')).default;
    return await bcrypt.compare(plainOtp, this.otpHash);
  }
};

/**
 * Which backend produced/verifies this document's hash (explicit contract).
 * Falls back to classifying otpHash so legacy documents without `hashAlgo`
 * (default 'unknown') still resolve correctly.
 */
otpSchema.methods.resolveHashAlgo = function() {
  if (this.hashAlgo && this.hashAlgo !== OTP_HASH_ALGO.UNKNOWN) return this.hashAlgo;
  return resolveOtpHashAlgo(this.otpHash);
};

// Auto-record which backend produced otpHash (backward-compatible:
// only fills hashAlgo when it is missing/default so manual values survive).
otpSchema.pre('save', function(next) {
  try {
    if (this.isModified('otpHash') || !this.hashAlgo || this.hashAlgo === OTP_HASH_ALGO.UNKNOWN) {
      const resolved = resolveOtpHashAlgo(this.otpHash);
      if (resolved !== OTP_HASH_ALGO.UNKNOWN) this.hashAlgo = resolved;
    }
  } catch {
    // Never block saving on algo bookkeeping
  }
  next();
});

/**
 * Check if OTP is valid (not used and not expired)
 */
otpSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

export default mongoose.model('OTP', otpSchema);
