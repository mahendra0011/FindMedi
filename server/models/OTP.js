import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, lowercase: true, index: true },
  otpHash: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['email', 'sms', 'password_reset'],
    default: 'email' 
  },
  phone: { type: String, default: '' },
  used: { type: Boolean, default: false, index: true },
  expiresAt: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  // For rate limiting: track last OTP request time per user/email
  lastRequestAt: { type: Date, index: true }
});

// Index for efficient query of valid, unused OTPs
otpSchema.index({ email: 1, used: 1, expiresAt: 1 });

// TTL index to automatically remove expired OTPs after 1 hour
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

/**
 * Hash an OTP before storing
 */
otpSchema.statics.hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

/**
 * Compare plain OTP with stored hash
 */
otpSchema.methods.compareOTP = async function(plainOtp) {
  return await bcrypt.compare(plainOtp, this.otpHash);
};

/**
 * Check if OTP is valid (not used and not expired)
 */
otpSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

export default mongoose.model('OTP', otpSchema);
