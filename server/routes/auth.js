import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { createAndSendOTP, verifyOTP, resendOTP } from '../services/otpService.js';
import {
  sendAccountVerifiedEmail,
  sendDoctorPendingReviewEmail,
  sendHostNotificationEmail,
  sendPasswordChangedEmail,
} from '../services/notificationService.js';

const router = express.Router();
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'medicore2580';

const sign = (user) => jwt.sign(
  { id: user._id, role: user.role, name: user.name, email: user.email },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '30d' }
);

const initialsFor = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return Math.max(age, 0);
};

const getDoctorProfile = (user) => Doctor.findOne({
  $or: [
    { user_id: user._id.toString() },
    { email: user.email },
  ],
});

const userResponse = async (user) => {
  const doctorProfile = user.role === 'doctor' ? await getDoctorProfile(user) : null;
  const doctorApproved = user.role !== 'doctor'
    ? true
    : Boolean(doctorProfile?.approved || user.approvalStatus === 'approved');

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    address: user.address,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    specialization: user.specialization,
    experience: user.experience,
    qualification: user.qualification,
    licenseNumber: user.licenseNumber,
    consultationFee: user.consultationFee,
    isVerified: user.isVerified,
    status: user.status,
    approvalStatus: user.role === 'doctor'
      ? (doctorProfile?.approved ? 'approved' : user.approvalStatus || 'pending')
      : 'not_required',
    doctorApproved,
    doctorProfileId: doctorProfile?._id,
    settings: user.settings || {},
  };
};

const notifyAdmins = async ({ title, message }) => {
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
  if (!admins.length) return;

  await Notification.insertMany(admins.map(admin => ({
    title,
    message,
    type: 'system',
    userId: admin._id.toString(),
  })));
};

const sendVerificationOtp = (user) => createAndSendOTP({
  userId: user._id,
  email: user.email,
  type: 'email',
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'patient',
      secretKey,
      phone = '',
      gender = '',
      dateOfBirth,
      specialization = '',
      experience = '',
      qualification = '',
      qualifications = '',
      licenseNumber = '',
      consultationFee = 0,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedRole = ['admin', 'doctor', 'patient'].includes(role) ? role : 'patient';
    const lowerEmail = email.toLowerCase();

    if (normalizedRole === 'admin' && secretKey !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ message: 'Invalid secret key for admin registration' });
    }

    if (normalizedRole === 'doctor' && (!specialization || !licenseNumber || !(qualification || qualifications))) {
      return res.status(400).json({ message: 'Specialization, qualification and license number are required for doctor registration' });
    }

    if (await User.findOne({ email: lowerEmail })) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.create({
      name,
      email: lowerEmail,
      password,
      role: normalizedRole,
      phone,
      gender,
      dateOfBirth: dateOfBirth || undefined,
      specialization,
      experience,
      qualification: qualification || qualifications,
      licenseNumber,
      consultationFee: Number(consultationFee) || 0,
      isVerified: false,
      status: 'active',
      approvalStatus: normalizedRole === 'doctor' ? 'pending' : 'not_required',
    });

    if (normalizedRole === 'doctor') {
      await Doctor.create({
        name,
        specialization,
        experience: experience || '1 year',
        phone,
        email: lowerEmail,
        initials: initialsFor(name),
        department: specialization,
        fees: Number(consultationFee) || 500,
        consultation_fees: Number(consultationFee) || 500,
        qualifications: qualification || qualifications,
        approved: false,
        user_id: user._id.toString(),
      });

      await notifyAdmins({
        title: 'Doctor Approval Required',
        message: `${name} registered as a doctor and needs admin approval after email verification.`,
      });

      await sendHostNotificationEmail({
        subject: 'New MediCore Doctor Registration',
        text: `${name} (${lowerEmail}) registered as a doctor with license ${licenseNumber}.`,
      });
    }

    if (normalizedRole === 'patient') {
      await Patient.create({
        name,
        age: calculateAge(dateOfBirth),
        gender: gender || 'Other',
        phone,
        email: lowerEmail,
        userId: user._id,
        status: 'Active',
      });
    }

    const otpResult = await sendVerificationOtp(user);

    const responseUser = await userResponse(user);

    if (!otpResult.success) {
      if (otpResult.rateLimited) {
        return res.status(429).json({
          message: `Registration successful but please wait ${otpResult.waitSeconds} seconds before requesting OTP verification.`,
          user: responseUser,
          requiresVerification: true,
          email: user.email,
          waitSeconds: otpResult.waitSeconds,
        });
      }

      return res.status(201).json({
        message: 'Registration successful. Please verify your email with the OTP sent.',
        user: responseUser,
        requiresVerification: true,
        email: user.email,
        otpWarning: 'There was a temporary issue sending the OTP. You can try resending it.',
      });
    }

    res.status(201).json({
      message: 'Registration successful. Please verify your email with the OTP sent.',
      user: responseUser,
      requiresVerification: true,
      email: user.email,
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

    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    const verificationResult = await verifyOTP({ email: lowerEmail, otp, type: 'email' });

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    user.isVerified = true;
    await user.save();

    await sendAccountVerifiedEmail(user);

    if (user.role === 'doctor') {
      const doctorProfile = await getDoctorProfile(user);
      if (!doctorProfile?.approved && user.approvalStatus !== 'approved') {
        user.approvalStatus = user.approvalStatus === 'rejected' ? 'rejected' : 'pending';
        await user.save();

        await sendDoctorPendingReviewEmail(user);
        await notifyAdmins({
          title: 'Verified Doctor Pending Approval',
          message: `${user.name} verified their email and is waiting for doctor approval.`,
        });

        return res.json({
          message: 'Email verified successfully. Your account is pending admin approval.',
          approvalPending: true,
          user: await userResponse(user),
        });
      }
    }

    res.json({
      message: 'OTP verified successfully',
      token: sign(user),
      user: await userResponse(user),
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

    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otpResult = await resendOTP({
      userId: user._id,
      email: lowerEmail,
      type: 'email',
    });

    if (!otpResult.success) {
      return res.status(429).json({
        message: otpResult.message,
        rateLimited: otpResult.rateLimited,
        waitSeconds: otpResult.waitSeconds,
      });
    }

    res.json({
      message: 'OTP resent to your email',
      sentTo: otpResult.sentTo,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, secretKey } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}` });
    }

    if (user.role === 'admin' && secretKey !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ message: 'Invalid secret key for admin access' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.', blocked: true });
    }

    if (!user.isVerified) {
      const otpResult = await sendVerificationOtp(user);

      if (!otpResult.success) {
        const statusCode = otpResult.rateLimited ? 429 : 500;
        return res.status(statusCode).json({
          message: 'Please verify your email before continuing.',
          requiresVerification: true,
          email: user.email,
          otpError: otpResult.message,
          ...(otpResult.rateLimited && { waitSeconds: otpResult.waitSeconds }),
        });
      }

      return res.status(403).json({
        message: 'Please verify your email before continuing.',
        requiresVerification: true,
        email: user.email,
        otpWarning: 'We sent a new verification code to your email.',
      });
    }

    if (user.role === 'doctor') {
      const doctorProfile = await getDoctorProfile(user);
      if (user.approvalStatus === 'rejected') {
        return res.status(403).json({
          message: 'Your doctor account was not approved. Contact administrator.',
          approvalRejected: true,
          email: user.email,
        });
      }

      if (!doctorProfile?.approved && user.approvalStatus !== 'approved') {
        return res.status(403).json({
          message: 'Your account is pending admin approval.',
          approvalPending: true,
          email: user.email,
        });
      }

      if (user.approvalStatus !== 'approved') {
        user.approvalStatus = 'approved';
        await user.save();
      }
    }

    return res.json({
      token: sign(user),
      user: await userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If an account exists, a password reset OTP has been sent.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    const otpResult = await createAndSendOTP({
      userId: user._id,
      email: user.email,
      type: 'password_reset',
    });

    if (!otpResult.success) {
      return res.status(otpResult.rateLimited ? 429 : 500).json({
        message: otpResult.message || 'Unable to send reset OTP right now',
        rateLimited: otpResult.rateLimited,
        waitSeconds: otpResult.waitSeconds,
      });
    }

    return res.json({ message: 'Password reset OTP sent to your email.', email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    const verificationResult = await verifyOTP({
      email: user.email,
      otp,
      type: 'password_reset',
    });

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    user.password = password;
    await user.save();
    await sendPasswordChangedEmail(user);

    res.json({ message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(await userResponse(user));
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    await sendPasswordChangedEmail(user);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      name,
      phone,
      avatar,
      address,
      gender,
      dateOfBirth,
      specialization,
      experience,
      qualification,
      licenseNumber,
      consultationFee,
      settings,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;
    if (address !== undefined) user.address = address;
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || undefined;
    if (specialization !== undefined) user.specialization = specialization;
    if (experience !== undefined) user.experience = experience;
    if (qualification !== undefined) user.qualification = qualification;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (consultationFee !== undefined) user.consultationFee = Number(consultationFee) || 0;
    if (settings && typeof settings === 'object') user.settings = { ...(user.settings || {}), ...settings };

    await user.save();

    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { $or: [{ user_id: user._id.toString() }, { email: user.email }] },
        {
          name: user.name,
          phone: user.phone,
          specialization: user.specialization,
          experience: user.experience || '1 year',
          qualifications: user.qualification,
          fees: Number(user.consultationFee) || 500,
          consultation_fees: Number(user.consultationFee) || 500,
        },
        { new: true }
      );
    }

    res.json(await userResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
