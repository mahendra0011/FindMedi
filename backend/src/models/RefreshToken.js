import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { hashOtp, verifyOtpHash } from '../services/napiOtpService.js';

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // tokenKey: an indexed lookup key for the token.
  //
  // It was `token.substring(0, 16)`, which sounds like a safe prefix but is a
  // CONSTANT: a JWT is `base64url(header).base64url(payload).signature`, and the
  // header is identical for every token this service signs (`{"alg":"HS256",
  // "typ":"JWT"}` -> `eyJhbGciOiJIUzI1...`). Verified: three tokens for three
  // different users produced the identical key `eyJhbGciOiJIUzI1`.
  //
  // Consequences of that, all real:
  //  - `findOne({ tokenKey })` returned an ARBITRARY row from the whole
  //    collection, not the caller's.
  //  - `/refresh` acts on that row BEFORE verifying the presented token against
  //    its hash, and the reuse-detection branch runs
  //    `deleteMany({ userId })`. So any caller could send the 16-byte constant
  //    plus arbitrary filler - a string that is not a token at all - and force
  //    logout of whichever user the lookup happened to land on. A mass-logout
  //    DoS with no credential.
  //  - Legitimate concurrent refreshes for two different users raced on the
  //    same key.
  //
  // A SHA-256 of the whole token is deterministic, indexed, and collision-free
  // in practice. It stores no secret material (the token itself is still hashed
  // separately in `tokenHash`).
  tokenKey: { type: String, required: true, index: true },
  // tokenHash: salted hash of the full token (rust-sha256 or bcrypt)
  tokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  // MISS-002: rotation family + reuse detection.
  jti: { type: String, index: true },
  familyId: { type: String, index: true },
  replacedBy: { type: String, default: null }, // jti of the successor (null = live)
  revokedAt: { type: Date, default: null },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Lookup key for a refresh token: the first 32 hex chars of its SHA-256.
 *
 * Must be a function of the WHOLE token. A prefix is not safe here — see the
 * `tokenKey` comment above for why the previous 16-char prefix was a constant.
 */
refreshTokenSchema.statics.getTokenKey = (token) =>
  createHash('sha256').update(String(token)).digest('hex').slice(0, 32);

// Static method to hash token for storage
refreshTokenSchema.statics.hashToken = async (token) => {
  const { hashOtp } = await import('../services/napiOtpService.js');
  return await hashOtp(token);
};

// Instance method to compare plain token with stored hash
refreshTokenSchema.methods.compareToken = async function(plainToken) {
  const { verifyOtpHash } = await import('../services/napiOtpService.js');
  return await verifyOtpHash(plainToken, this.tokenHash);
};

// Pre-save hook to hash token if it's a plain token
refreshTokenSchema.pre('save', async function(next) {
  if (this.isModified('tokenHash') && this.tokenHash && 
      !this.tokenHash.startsWith('$2a$') && 
      !this.tokenHash.startsWith('$2b$') && 
      !this.tokenHash.startsWith('$2y$') && 
      !this.tokenHash.includes(':')) {
    // Plain token detected - hash it before saving
    const { hashOtp } = await import('../services/napiOtpService.js');
    this.tokenHash = await hashOtp(this.tokenHash);
  }
  next();
});

export default mongoose.model('RefreshToken', refreshTokenSchema);
