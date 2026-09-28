import mongoose from 'mongoose';
import { hashOtp, verifyOtpHash } from '../services/napiOtpService.js';

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // tokenKey: first 8 chars of token for lookup (not sensitive, used for DB lookup)
  tokenKey: { type: String, required: true, index: true },
  // tokenHash: salted hash of the full token (rust-sha256 or bcrypt)
  tokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to extract lookup key from token (first 16 chars for uniqueness)
refreshTokenSchema.statics.getTokenKey = (token) => token.substring(0, 16);

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

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);