import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import Doctor from '../models/Doctor.js';
import Facility from '../models/Facility.js';
import Hospital from '../models/Hospital.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { createAndSendOTP, verifyOTP, resendOTP } from '../services/otpService.js';
import { uploadFileToCloudinary } from '../services/cloudinaryService.js';
import {
  sendAccountVerifiedEmail,
  sendDoctorPendingReviewEmail,
  sendHostNotificationEmail,
  sendPasswordChangedEmail,
} from '../services/notificationService.js';
import { OAuth2Client } from 'google-auth-library';
import {
  validate,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  passwordSchema,
} from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';
import { notifyUsers } from '../services/socketService.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(googleClientId);
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const allowedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const handleAvatarUpload = (req, res, next) => {
  avatarUpload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Profile photo must be 5MB or smaller'
        : err.message;
      return res.status(400).json({ message });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Profile photo is required' });
    }

    // Validate MIME type explicitly
    if (!allowedAvatarTypes.has(file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPG, PNG, WEBP, or GIF images are allowed.' });
    }

    // Validate file extension
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      return res.status(400).json({ message: 'Invalid file extension. Use .jpg, .jpeg, .png, .webp, or .gif' });
    }

    next();
  });
};

const saveAvatarLocally = async (file, req) => {
  const uploadDir = path.join(__dirname, '../public/uploads/avatars');
  await fs.mkdir(uploadDir, { recursive: true });

  const extFromName = path.extname(file.originalname || '').toLowerCase();
  const extFromMime = file.mimetype === 'image/png'
    ? '.png'
    : file.mimetype === 'image/webp'
      ? '.webp'
      : file.mimetype === 'image/gif'
        ? '.gif'
        : '.jpg';
  const ext = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extFromName) ? extFromName : extFromMime;
  const filename = `${req.user.id}-${Date.now()}${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), file.buffer);

  return {
    url: `${req.protocol}://${req.get('host')}/uploads/avatars/${filename}`,
    storedIn: 'local',
  };
};

const signAccessToken = (user) => jwt.sign(
  { id: user._id, role: user.role, name: user.name, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const signRefreshToken = (user) => jwt.sign(
  { id: user._id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

const sign = (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }).catch(err => logger.error('Failed to save refresh token:', err.message));
  return accessToken;
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

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
  let entityApproved = true;
  if (user.role === 'doctor') {
    entityApproved = Boolean(doctorProfile?.approved || user.approvalStatus === 'approved');
  } else if (user.role === 'clinic_doctor' || user.role === 'lab_owner' || user.role === 'pharmacy_owner') {
    const facility = user.facilityId ? await Facility.findById(user.facilityId).select('status') : null;
    entityApproved = facility?.status === 'approved';
  } else if (user.role === 'delivery_boy') {
    entityApproved = user.approvalStatus === 'approved';
  } else if (user.role === 'hospital_admin' && user.hospitalId) {
    const hospital = await Hospital.findById(user.hospitalId).select('status');
    entityApproved = hospital?.status === 'approved';
  }
  const approval = user.role === 'doctor'
    ? (doctorProfile?.approved ? 'approved' : user.approvalStatus || 'pending')
    : entityApproved ? 'approved' : user.approvalStatus || 'pending';

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
     approvalStatus: approval,
     doctorApproved: entityApproved,
     doctorProfileId: doctorProfile?._id,
     hospitalId: user.hospitalId || null,
     settings: user.settings || {},
     ...(user.role === 'delivery_boy' && {
       vehicleType: user.vehicleType,
       vehicleNumber: user.vehicleNumber,
       pharmacyId: user.pharmacyId || null,
       isOnline: user.isOnline,
       currentLocation: user.currentLocation,
       deliveryZone: user.deliveryZone,
       workingHours: user.workingHours,
       emergencyContact: user.emergencyContact,
     }),
   };
};

const notifyAdmins = async ({ title, message }) => {
  const admins = await User.find({ role: 'hospital_admin', status: 'active' }).select('_id');
  if (!admins.length) return;

  const notifs = await Notification.insertMany(admins.map(admin => ({
    title,
    message,
    type: 'system',
    userId: admin._id.toString(),
  })));
  notifs.forEach(n => notifyUser(n.userId, n));
};

const sendVerificationOtp = (user) => createAndSendOTP({
  userId: user._id,
  email: user.email,
  type: 'email',
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'patient',
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

    const normalizedRole = ['hospital_admin', 'doctor', 'patient', 'technician'].includes(role) ? role : 'patient';
    const lowerEmail = email.toLowerCase();

    if (normalizedRole === 'doctor' && (!specialization || !licenseNumber || !(qualification || qualifications))) {
      return res.status(400).json({ message: 'Specialization, qualification and license number are required for doctor registration' });
    }
    if (normalizedRole === 'technician' && !specialization) {
      return res.status(400).json({ message: 'Technician role is required' });
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
      approvalStatus: normalizedRole === 'doctor' || normalizedRole === 'technician' ? 'pending' : 'not_required',
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

    if (normalizedRole === 'technician') {
      await notifyAdmins({
        title: 'Technician Approval Required',
        message: `${name} registered as a ${specialization} technician and needs admin approval after email verification.`,
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
        message: 'Registration successful, but the verification email could not be sent. Please use Resend OTP.',
        user: responseUser,
        requiresVerification: true,
        email: user.email,
        emailDeliveryFailed: true,
        otpWarning: otpResult.message || 'There was a temporary issue sending the OTP. You can try resending it.',
      });
    }

    res.status(201).json({
      message: 'Registration successful. Please verify your email with the OTP sent.',
      user: responseUser,
      requiresVerification: true,
      email: user.email,
      sentTo: otpResult.sentTo,
      messageId: otpResult.messageId,
      simulated: otpResult.simulated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
  try {
    const { email, otp } = req.body;

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

    const accessToken = sign(user);
    setAuthCookies(res, accessToken);
    res.json({
      message: 'OTP verified successfully',
      token: accessToken,
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
      return res.status(otpResult.rateLimited ? 429 : 502).json({
        message: otpResult.message,
        rateLimited: otpResult.rateLimited,
        emailDeliveryFailed: !otpResult.rateLimited,
        waitSeconds: otpResult.waitSeconds,
      });
    }

    res.json({
      message: 'OTP resent to your email',
      sentTo: otpResult.sentTo,
      messageId: otpResult.messageId,
      simulated: otpResult.simulated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}` });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.', blocked: true });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is pending activation.', inactive: true });
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

    const requiresApproval = ['doctor', 'clinic_doctor', 'lab_owner', 'pharmacy_owner', 'delivery_boy'];
    if (requiresApproval.includes(user.role)) {
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
      } else if (user.role === 'delivery_boy') {
        if (user.approvalStatus === 'rejected') {
          return res.status(403).json({
            message: 'Your delivery partner account was not approved. Contact administrator.',
            approvalRejected: true,
            email: user.email,
          });
        }
        if (user.approvalStatus !== 'approved') {
          return res.status(403).json({
            message: 'Your delivery partner account is pending admin approval.',
            approvalPending: true,
            email: user.email,
          });
        }
      } else {
        const facility = user.facilityId ? await Facility.findById(user.facilityId).select('status') : null;
        if (facility?.status === 'rejected') {
          return res.status(403).json({
            message: 'Your facility registration was not approved. Contact administrator.',
            approvalRejected: true,
            email: user.email,
          });
        }
        if (facility?.status === 'pending' || !facility) {
          return res.status(403).json({
            message: 'Your facility registration is pending admin approval.',
            approvalPending: true,
            email: user.email,
          });
        }
      }
    }

    if (user.role === 'hospital_admin' && user.hospitalId) {
      const hospital = await Hospital.findById(user.hospitalId).select('status');
      if (hospital?.status === 'pending') {
        return res.status(403).json({
          message: 'Your hospital registration is pending admin approval.',
          approvalPending: true,
          email: user.email,
        });
      }
      if (hospital?.status === 'rejected') {
        return res.status(403).json({
          message: 'Your hospital registration was rejected. Contact administrator.',
          approvalRejected: true,
          email: user.email,
        });
      }
    }

    try {
      await auditLog('user_login', user._id, { ip: req.ip, userAgent: req.get('user-agent'), email: user.email });
    } catch (err) {
      logger.error('Audit error:', err);
    }

    const accessToken = sign(user);
    setAuthCookies(res, accessToken);
    return res.json({
      token: accessToken,
      user: await userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

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
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { email, otp, password } = req.body;

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

    try {
      await auditLog('password_reset', user._id, { ip: req.ip, userAgent: req.get('user-agent'), email: user.email });
    } catch (err) {
      logger.error('Audit error:', err);
    }

    res.json({ message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/doctor-setup
router.post('/doctor-setup', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) {
      return res.status(400).json({ message: pwResult.error.issues[0].message });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'doctor_setup') {
      return res.status(400).json({ message: 'Invalid setup token' });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = password;
    await user.save();

    res.json({ message: 'Password set successfully. Please verify your email with OTP.' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Setup link has expired. Please contact your administrator.' });
    }
    res.status(400).json({ message: 'Invalid or expired setup token' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();
    const googleName = payload.name || '';
    const googleAvatar = payload.picture || '';

    let user = await User.findOne({ email });

    if (!user) {
      const tempPassword = Math.random().toString(36).slice(-10);
      user = await User.create({
        name: googleName,
        email,
        password: tempPassword,
        role: 'patient',
        isVerified: true,
        status: 'active',
        approvalStatus: 'not_required',
        settings: { defaultDashboard: 'overview' },
      });

      await Patient.create({
        name: googleName,
        age: 0,
        gender: 'Other',
        phone: '',
        email,
        userId: user._id,
        status: 'Active',
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    const accessToken = sign(user);
    setAuthCookies(res, accessToken);
    res.json({
      token: accessToken,
      user: await userResponse(user),
      googleUser: {
        name: googleName,
        email,
        avatar: googleAvatar,
      },
    });
  } catch (err) {
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(await userResponse(user));
});

// PUT /api/auth/change-password
router.put('/change-password', protect, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    await sendPasswordChangedEmail(user);

    try {
      await auditLog('password_change', user._id, { ip: req.ip, userAgent: req.get('user-agent'), email: user.email });
    } catch (err) {
      logger.error('Audit error:', err);
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/avatar
router.post('/avatar', protect, handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Profile photo is required' });
    }

    if (!allowedAvatarTypes.has(req.file.mimetype)) {
      return res.status(400).json({ message: 'Only JPG, PNG, WEBP, or GIF images are allowed' });
    }

    let uploaded;
    try {
      uploaded = await uploadFileToCloudinary(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'medicore/avatars'
      );
    } catch (error) {
      logger.warn('Avatar Cloudinary upload failed, using local storage:', error.message);
      uploaded = await saveAvatarLocally(req.file, req);
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.avatar = uploaded.url;
    await user.save();

    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { $or: [{ user_id: user._id.toString() }, { email: user.email }] },
        { profile_photo: uploaded.url },
        { new: true }
      );
    }

    res.json({
      message: 'Profile photo updated successfully',
      avatar: uploaded.url,
      storedIn: uploaded.storedIn || 'cloudinary',
      user: await userResponse(user),
    });
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Profile photo must be 5MB or smaller' });
    }
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
          profile_photo: user.avatar,
        },
        { new: true }
      );
    }

    res.json(await userResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  let newRefreshTokenDoc = null;
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (stored.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'Refresh token expired. Please login again.' });
    }

    // jwt.verify ka callback async tha → uske andar jo errors throw hote the
    // (User.findById fail, etc.) wo swallow ho jaate the aur response kabhi
    // hang kar deta tha → client timeout → logout. Isliye verifySync use karke
    // await-safe flow banate hain.
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Account blocked' });
    }

    await RefreshToken.deleteOne({ _id: stored._id });

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    newRefreshTokenDoc = await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);
    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    // Cleanup partial refresh token if created mid-failure
    if (newRefreshTokenDoc) {
      try { await RefreshToken.deleteOne({ _id: newRefreshTokenDoc._id }); } catch {}
    }
    logger.error(`[auth/refresh] error: ${err.message}`);
    // DB hiccup → 503 (not 401) so client retries instead of logging out.
    // Genuine auth failures already handled above with explicit 401/400/403.
    res.status(503).json({ message: 'Service temporarily unavailable. Please try again.' });
  }
});

export default router;
