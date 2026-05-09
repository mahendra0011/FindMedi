import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { createAndSendOTP, verifyOTP, resendOTP } from '../services/otpService.js';

const router = express.Router();

const sign = (user) => jwt.sign(
  { id: user._id, role: user.role, name: user.name, email: user.email },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '30d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, secretKey } = req.body;

    // Convert email to lowercase
    const lowerEmail = email.toLowerCase();

    if (role === 'admin' && secretKey !== 'medicore2580') {
      return res.status(403).json({ message: 'Invalid secret key for admin registration' });
    }

    if (await User.findOne({ email: lowerEmail })) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create user (unverified, without OTP fields)
    const user = await User.create({
      name,
      email: lowerEmail,
      password,
      role: role || 'patient',
      isVerified: false
    });

    // Send OTP via new OTP service
    const otpResult = await createAndSendOTP({
      userId: user._id,
      email: lowerEmail,
      type: 'email'
    });

    if (!otpResult.success) {
       // If OTP sending fails, we still created the user but OTP failed
       // Check if it's a rate limit error
       if (otpResult.rateLimited) {
         return res.status(429).json({
           message: `Registration successful but please wait ${otpResult.waitSeconds} seconds before requesting OTP verification.`,
           user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: false },
           requiresVerification: true,
           email: user.email,
           waitSeconds: otpResult.waitSeconds
         });
       }
       
       // For other OTP failures
       return res.status(201).json({
         message: 'Registration successful. Please verify your email with the OTP sent.',
         user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: false },
         otpWarning: 'There was a temporary issue sending the OTP. You can try resending it.'
       });
     }

    res.status(201).json({
      message: 'Registration successful. Please verify your email with the OTP sent.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: false }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP using OTP service
    const verificationResult = await verifyOTP({ email, otp });

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    res.json({
      message: 'OTP verified successfully',
      token: sign(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: true
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Resend OTP via OTP service (rate limiting applies)
    const otpResult = await resendOTP({
      userId: user._id,
      email,
      type: 'email'
    });

    if (!otpResult.success) {
      return res.status(429).json({
        message: otpResult.message,
        rateLimited: otpResult.rateLimited,
        waitSeconds: otpResult.waitSeconds
      });
    }

    res.json({
      message: 'OTP resent to your email',
      sentTo: otpResult.sentTo
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}` });
    }

     // If email not verified, require OTP verification
     if (!user.isVerified) {
       const otpResult = await createAndSendOTP({
         userId: user._id,
         email: lowerEmail,
         type: 'email'
       });

       if (!otpResult.success) {
         // Return appropriate status: 429 if rate limited, 500 otherwise
         const statusCode = otpResult.rateLimited ? 429 : 500;
         return res.status(statusCode).json({
           message: 'Please verify your email first',
           requiresVerification: true,
           email: user.email,
           otpError: otpResult.message,
           ...(otpResult.rateLimited && { waitSeconds: otpResult.waitSeconds })
         });
       }

       return res.status(403).json({
         message: 'Please verify your email first',
         requiresVerification: true,
         email: user.email,
         // Don't expose internal OTP errors to the user for security
         otpWarning: 'We have sent a new OTP to your email. Please check your inbox.'
       });
     }

    return res.json({
      token: sign(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone, avatar }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;