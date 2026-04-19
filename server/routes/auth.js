import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendEmail, generateVerificationToken, getVerificationLink } from '../utils/email.js';

const router = express.Router();

const sign = (user) => jwt.sign(
  { id: user._id, role: user.role, name: user.name, email: user.email },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '30d' }
);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}` });
    }
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, isVerified: user.isVerified } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already in use' });

    // Create verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'patient',
      verificationToken: token,
      verificationTokenExpires: expires,
    });

    // Send verification email
    const verificationLink = getVerificationLink(token, process.env.VITE_API_URL || 'http://localhost:8080');
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to MediCore! 🏥</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with MediCore. Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verify Email
          </a>
        </p>
        <p>Or copy this link: <code>${verificationLink}</code></p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Verify your MediCore email address',
      html,
      text: `Click to verify: ${verificationLink}`,
    });

    res.status(201).json({ 
      token: sign(user), 
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: false },
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    if (user.verificationTokenExpires && new Date() > user.verificationTokenExpires) {
      return res.status(400).json({ message: 'Verification token has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.verificationToken = '';
    user.verificationTokenExpires = null;
    await user.save();

    // Return success (frontend will show success page)
    res.json({ 
      success: true, 
      message: 'Email verified successfully!',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: true }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = token;
    user.verificationTokenExpires = expires;
    await user.save();

    const verificationLink = getVerificationLink(token, process.env.VITE_API_URL || 'http://localhost:8080');
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email</h2>
        <p>Hello ${user.name},</p>
        <p>Here is your new verification link (valid for 24 hours):</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verify Email
          </a>
        </p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Your new MediCore verification link',
      html,
      text: `Verify: ${verificationLink}`,
    });

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -verificationToken -verificationTokenExpires');
  res.json(user);
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone, avatar }, { new: true }).select('-password -verificationToken -verificationTokenExpires');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
