import OTP from '../models/OTP.js';
import { sendEmail, sendSMS } from './notificationService.js';
import { renderEmailTemplate, renderPlainText } from './emailTemplates.js';

// OTP validity: 10 minutes
const OTP_VALIDITY_MINUTES = 10;
const OTP_VALIDITY_MS = OTP_VALIDITY_MINUTES * 60 * 1000;

// Minimum gap between OTP requests: 1 minute
const MIN_OTP_REQUEST_GAP_MS = 60 * 1000;

// Generate 6-digit numeric OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Check if user can request a new OTP (minimum 1 minute gap)
 * @param {string} email - User email
 * @returns {Promise<{allowed: boolean, waitSeconds?: number, lastRequestAt?: Date}>}
 */
export const checkRateLimit = async (email) => {
  // Find the most recent OTP for this email
  const lastOtp = await OTP.findOne({ email })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .limit(1);

  if (!lastOtp) {
    return { allowed: true };
  }

  const timeSinceLastRequest = Date.now() - new Date(lastOtp.createdAt).getTime();
  const waitTime = MIN_OTP_REQUEST_GAP_MS - timeSinceLastRequest;

  if (timeSinceLastRequest < MIN_OTP_REQUEST_GAP_MS) {
    return {
      allowed: false,
      waitSeconds: Math.ceil(waitTime / 1000),
      lastRequestAt: lastOtp.createdAt
    };
  }

  return { allowed: true };
};

/**
 * Create and send OTP
 * @param {Object} params - { userId, email, type = 'email', phone? }
 * @returns {Promise<{success: boolean, message: string, otpId?: string}>}
 */
export const createAndSendOTP = async ({ userId, email, type = 'email', phone = '' }) => {
  try {
    const normalizedEmail = email.toLowerCase();

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(normalizedEmail);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        message: `Please wait ${rateLimitCheck.waitSeconds} seconds before requesting a new OTP`,
        rateLimited: true,
        waitSeconds: rateLimitCheck.waitSeconds
      };
    }

    // Generate OTP
    const otpPlain = generateOTP();
    const otpHash = await OTP.hashOTP(otpPlain);
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS);

    // Create OTP record
    const otpRecord = await OTP.create({
      user: userId,
      email: normalizedEmail,
      otpHash,
      type,
      phone,
      used: false,
      expiresAt,
      lastRequestAt: new Date()
    });

    // Send OTP via email or SMS
    let sendResult;
    if (type === 'sms' && phone) {
      sendResult = await sendSMS(phone, `Your MediCore OTP is: ${otpPlain}. Valid for ${OTP_VALIDITY_MINUTES} minutes.`);
    } else {
      const isPasswordReset = type === 'password_reset';
      const subject = isPasswordReset
        ? 'Reset Your MediCore Password'
        : 'Your OTP Verification - MediCore Hospital';
      const intro = isPasswordReset
        ? 'Use this code to reset your MediCore password.'
        : 'Use this code to verify your MediCore account.';
      const template = {
        title: isPasswordReset ? 'Reset your password' : 'Verify your email',
        subtitle: intro,
        badge: isPasswordReset ? 'Password Reset' : 'Email Verification',
        paragraphs: [
          `This secure code will expire in ${OTP_VALIDITY_MINUTES} minutes.`,
          'For your safety, never share this code with anyone.',
        ],
        code: otpPlain,
        details: [
          { label: 'Purpose', value: isPasswordReset ? 'Password reset' : 'Email verification' },
          { label: 'Expires in', value: `${OTP_VALIDITY_MINUTES} minutes` },
        ],
        note: "If you didn't request this code, you can safely ignore this email.",
        tone: isPasswordReset ? 'warning' : 'default',
        preheader: `Your MediCore verification code is ${otpPlain}.`,
      };

      sendResult = await sendEmail({
        to: normalizedEmail,
        subject,
        text: renderPlainText(template),
        html: renderEmailTemplate(template)
      });
    }

    if (!sendResult.success) {
      // Delete OTP record if sending failed
      await otpRecord.deleteOne();
      return {
        success: false,
        message: `Failed to send OTP: ${sendResult.error || sendResult.message}`
      };
    }

    // Only the newest delivered OTP for this email/purpose should remain valid.
    await OTP.updateMany(
      {
        email: normalizedEmail,
        type,
        used: false,
        _id: { $ne: otpRecord._id },
      },
      { used: true }
    );

    return {
      success: true,
      message: 'OTP sent successfully',
      otpId: otpRecord._id,
      sentTo: type === 'sms' ? phone : normalizedEmail
    };

  } catch (error) {
    console.error('OTP creation error:', error);
    return {
      success: false,
      message: 'Failed to create OTP',
      error: error.message
    };
  }
};

/**
 * Verify OTP
 * @param {Object} params - { email, otp } or { phone, otp }
 * @returns {Promise<{success: boolean, message: string, otpRecord?: Object}>}
 */
export const verifyOTP = async ({ email, otp, type = 'email' }) => {
  try {
    const normalizedEmail = email.toLowerCase();

    // Find valid, unused OTP for this email
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      type,
      used: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }); // Get the most recent

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.'
      };
    }

    // Check if OTP matches
    const isMatch = await otpRecord.compareOTP(otp);
    if (!isMatch) {
      return {
        success: false,
        message: 'Invalid OTP'
      };
    }

    // Mark as used (single-use)
    otpRecord.used = true;
    await otpRecord.save();
    await OTP.updateMany(
      {
        email: normalizedEmail,
        type,
        used: false,
        _id: { $ne: otpRecord._id },
      },
      { used: true }
    );

    return {
      success: true,
      message: 'OTP verified successfully',
      otpRecord: {
        id: otpRecord._id,
        userId: otpRecord.user,
        email: otpRecord.email,
        type: otpRecord.type,
        expiresAt: otpRecord.expiresAt
      }
    };

  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      message: 'Verification failed',
      error: error.message
    };
  }
};

/**
 * Resend OTP (with rate limiting)
 * @param {Object} params - { userId, email, type = 'email', phone? }
 * @returns {Promise<Object>} - Same as createAndSendOTP
 */
export const resendOTP = async (params) => {
  // For resend, we simply create a new OTP (rate limiting will apply)
  return await createAndSendOTP(params);
};

/**
 * Get OTP details (for debugging/admin purposes)
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export const getLatestOTP = async (email) => {
  return await OTP.findOne({ email })
    .sort({ createdAt: -1 })
    .select('-otpHash') // Don't expose hash
    .lean();
};
