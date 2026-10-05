import express from 'express';
import {
  signToken as signJwt,
  verifyToken as verifyJwt,
  verifyRefreshToken,
  ACCESS_TOKEN_TYP,
  REFRESH_TOKEN_TYP,
} from '../utils/jwtKeys.js';
import crypto from 'node:crypto';
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
import Vehicle from '../models/Vehicle.js';
import RiderProfile from '../models/RiderProfile.js';
import AssistantProfile from '../models/AssistantProfile.js';
import LawyerProfile from '../models/LawyerProfile.js';
import { protect } from '../middleware/auth.js';
import { issueStepUpFor, clearStepUps } from '../middleware/stepUpAuth.js';
import { sendServerError } from '../utils/safeError.js';

/**
 * The actions that require a fresh proof of possession.
 *
 * Registered rather than free-text so `/auth/step-up` cannot be used to mint a
 * grant for an arbitrary string. Keep in step with the `requireStepUp('<scope>')`
 * calls at the guarded routes — a scope with no route behind it is dead weight,
 * and a route whose scope is not listed here is unreachable.
 */
const SENSITIVE_SCOPES = new Set([
  'payouts:add',
  'refunds:issue',
  'export:full',
  'records:amend',
  'users:role-change',
]);
export { SENSITIVE_SCOPES };
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
  resendOtpSchema,
  googleAuthSchema,
  googleRegisterSchema,
  doctorSetupSchema,
  refreshTokenSchema,
  profileUpdateSchema,
  passwordSchema,
} from '../utils/validate.js';
import { isPwnedPassword } from '../utils/pwnedPassword.js';
import { authCookieName, authCookieOptions, readAuthCookie } from '../lib/cookiePolicy.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';
import { notifyUsers } from '../services/socketService.js';
import { validateFileContent } from '../middleware/upload.js';
import { authLimiter, totpLimiter } from '../middleware/rateLimit.js';
import { botProtection } from '../middleware/botProtection.js';
import { referralService } from '../services/referralService.js';
import { recordLoginEvent, recordSignupEvent } from '../services/authAnomalyService.js';
import { issueTwoFactorTicket, consumeTwoFactorTicket } from '../utils/twoFactorTicket.js';
import { verifyToken, verifyBackupCode } from '../services/twoFactorService.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const googleClientId = process.env.GOOGLE_CLIENT_ID;
// Google OAuth audiences accepted for id_token verification (AUTH-B-01: the
// route previously verified against a single client id, so a token minted for
// any other client of the project was rejected / a different client was accepted).
const GOOGLE_AUDIENCES = [
  process.env.GOOGLE_CLIENT_ID,
  '752004325733-5u50qb3l1c71mceopu44eqlv9rhc5d89.apps.googleusercontent.com',
  '752004325733-hj2litb6frb03tsbsc05pjj5k6lkijqn.apps.googleusercontent.com',
].filter(Boolean);
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

    // Content-based file type verification (magic bytes) — prevents MIME type spoofing
    if (!validateFileContent(file.buffer, file.mimetype)) {
      return res.status(400).json({ message: 'File content does not match its claimed type. Upload rejected for security.' });
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
  const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars');
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

// AUTH-F-02: `typ` marks the purpose. A refresh token is a 7-day rotating
// session secret; without this claim it verified as an access token on every
// endpoint (protect now rejects it via verifyAccessToken).
const signAccessToken = (user) => signJwt(
  { id: user._id, role: user.role, name: user.name, email: user.email, tv: user.tokenVersion || 0, jti: crypto.randomBytes(8).toString('hex'), typ: ACCESS_TOKEN_TYP },
  { expiresIn: '15m' }
);

const signRefreshToken = (user, familyId) => {
  const jti = crypto.randomBytes(12).toString('hex');
  const token = signJwt(
    { id: user._id, tv: user.tokenVersion || 0, jti, family: familyId || jti, typ: REFRESH_TOKEN_TYP },
    { expiresIn: '7d' }
  );
  return { token, jti, familyId: familyId || jti };
};

const sign = (user, req) => {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti, familyId } = signRefreshToken(user);
  const tokenKey = RefreshToken.getTokenKey(refreshToken);
  RefreshToken.create({
    userId: user._id,
    tokenKey,
    tokenHash: refreshToken, // will be hashed by pre-save hook
    jti,
    familyId,
    userAgent: req?.get?.('user-agent') || '',
    ip: req?.ip || '',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }).catch(err => logger.error('Failed to save refresh token:', err.message));
  return { accessToken, refreshToken };
};

// AUTH-012: password change/reset/logout-all funnels through here — every
// other session dies with the version bump + document purge.
const revokeAllSessions = async (userId) => {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  await RefreshToken.deleteMany({ userId });
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(authCookieName('token'), accessToken, authCookieOptions(15 * 60 * 1000));
  if (refreshToken) {
    res.cookie(authCookieName('refreshToken'), refreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie(authCookieName('token'), authCookieOptions());
  res.clearCookie(authCookieName('refreshToken'), authCookieOptions());
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
  } else if (user.role === 'rider') {
    const riderProfile = await RiderProfile.findOne({ userId: user._id }).populate('vehicleId').lean();
    entityApproved = riderProfile?.riderStatus === 'active';
  } else if (user.role === 'hospital_admin' && user.hospitalId) {
    const hospital = await Hospital.findById(user.hospitalId).select('status');
    entityApproved = hospital?.status === 'approved';
  }
  const approval = user.role === 'doctor'
    ? (doctorProfile?.approved ? 'approved' : user.approvalStatus || 'pending')
    : entityApproved ? 'approved' : user.approvalStatus || 'pending';

  let riderData = null;
  if (user.role === 'rider') {
    const rp = await RiderProfile.findOne({ userId: user._id }).populate('vehicleId').lean();
    if (rp) {
      riderData = {
        riderProfileId: rp._id,
        riderStatus: rp.riderStatus,
        isOnline: rp.isOnline,
        rating: rp.rating || { avg: 5.0, count: 0 },
        vehicle: rp.vehicleId,
        bankDetails: rp.bankDetails,
        operatingArea: rp.operatingArea,
      };
    }
  }

  let ambulanceData = null;
  if (user.role === 'ambulance') {
    const { default: Ambulance } = await import('../models/Ambulance.js');
    const amb = await Ambulance.findOne({ userId: user._id })
      .populate('hospitalId', 'name address phone').lean();
    if (amb) {
      ambulanceData = {
        ambulanceId: amb._id,
        registrationNumber: amb.registrationNumber,
        ambulanceType: amb.ambulanceType,
        hospitalName: amb.hospitalId?.name || '',
        hospitalId: amb.hospitalId?._id || amb.hospitalId || null,
        isOnline: amb.isOnline,
        isOnDuty: amb.isOnDuty,
      };
    }
  }

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
     // AUTH-F-06: the client needs this on EVERY auth response (login, google,
     // 2fa/complete, /me) to route into /set-password without a 403 round-trip.
     mustResetPassword: Boolean(user.mustResetPassword),
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
      ...(user.role === 'rider' && (riderData || {})),
      ...(user.role === 'ambulance' && { ambulanceData }),
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
  notifs.forEach(n => notifyUsers(n.userId, n));
};

const sendVerificationOtp = (user) => createAndSendOTP({
  userId: user._id,
  email: user.email,
  type: 'email',
});

// POST /api/auth/register
// AUTH-M-05: botProtection runs BEFORE validate — validate() strips unknown
// body keys, which would eat the cf-turnstile-response field.
router.post('/register', authLimiter, botProtection(), validate(registerSchema), async (req, res) => {
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
      referralCode,  // NEW: optional referral code from existing user
    } = req.body;

    // AUTH-B-02: public signup roles only — tenant/platform roles (superadmin,
    // hospital_admin, clinic_doctor, ...) are invite-only and are never accepted
    // from the request body here.
    const SELF_SIGNUP_ROLES = ['doctor', 'patient', 'technician', 'rider', 'assistant', 'lawyer', 'counselor', 'counsellor', 'psychiatrist', 'ambulance', 'delivery_boy'];
    const normalizedRole = SELF_SIGNUP_ROLES.includes(role) ? role : 'patient';
    const lowerEmail = email.toLowerCase();

    // P2-9: known-breached passwords are refused at signup (HIBP k-anonymity
    // range search; fail-open with a counted warning if HIBP is unreachable).
    if (await isPwnedPassword(password)) {
      return res.status(400).json({
        message: 'This password has appeared in a data breach. Please choose a different one.',
        code: 'PASSWORD_PWNED',
      });
    }

    if (normalizedRole === 'doctor' && (!specialization || !licenseNumber || !(qualification || qualifications))) {
      return res.status(400).json({ message: 'Specialization, qualification and license number are required for doctor registration' });
    }
    if (normalizedRole === 'technician' && !specialization) {
      return res.status(400).json({ message: 'Technician role is required' });
    }

    if (normalizedRole === 'rider') {
      const { rcNumber, drivingLicenseNumber, drivingLicenseExpiry, insuranceExpiry } = req.body;
      if (!rcNumber) {
        return res.status(400).json({ message: 'Vehicle Registration Number (RC No.) is required' });
      }
      if (!drivingLicenseNumber) {
        return res.status(400).json({ message: 'Driving License Number is required' });
      }
      if (drivingLicenseExpiry && new Date(drivingLicenseExpiry) <= new Date()) {
        return res.status(400).json({ message: 'Driving License expiry date must be in the future' });
      }
      if (insuranceExpiry && new Date(insuranceExpiry) <= new Date()) {
        return res.status(400).json({ message: 'Insurance expiry date must be in the future' });
      }
      const existingVehicle = await Vehicle.findOne({ rcNumber: rcNumber.trim().toUpperCase() });
      if (existingVehicle) {
        return res.status(400).json({ message: 'This Vehicle Registration Number (RC No.) is already registered' });
      }
    }

    if (normalizedRole === 'assistant') {
      const { govtIdNumber, serviceCategories, hospitalsCovered, pricePerHour } = req.body;
      if (!govtIdNumber) {
        return res.status(400).json({ message: 'Government ID Number is required for Assistant registration' });
      }
      if (!serviceCategories || !serviceCategories.length) {
        return res.status(400).json({ message: 'At least one service category must be selected' });
      }
      if (!pricePerHour || Number(pricePerHour) <= 0) {
        return res.status(400).json({ message: 'Price per hour must be greater than 0' });
      }
      const existingAssistant = await AssistantProfile.findOne({ govtIdNumber: govtIdNumber.trim().toUpperCase() });
      if (existingAssistant) {
        return res.status(400).json({ message: 'This Government ID is already registered' });
      }
    }

    if (normalizedRole === 'lawyer') {
      const { barCouncilNumber, stateBarCouncil, practiceCategories, consultationFee: lFee } = req.body;
      if (!barCouncilNumber) {
        return res.status(400).json({ message: 'Bar Council Enrollment Number is required for Lawyer registration' });
      }
      if (!stateBarCouncil) {
        return res.status(400).json({ message: 'State Bar Council name is required' });
      }
      if (!practiceCategories || !practiceCategories.length) {
        return res.status(400).json({ message: 'At least one practice area / category must be selected' });
      }
      if (lFee !== undefined && Number(lFee) < 0) {
        return res.status(400).json({ message: 'Consultation fee cannot be negative' });
      }
      const existingLawyer = await LawyerProfile.findOne({ barCouncilNumber: barCouncilNumber.trim().toUpperCase() });
      if (existingLawyer) {
        return res.status(400).json({ message: 'This Bar Council Enrollment Number is already registered' });
      }
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
      address: req.body.address || '',
      dateOfBirth: dateOfBirth || undefined,
      specialization,
      experience,
      qualification: qualification || qualifications,
      licenseNumber,
      consultationFee: Number(consultationFee) || 0,
      isVerified: false,
      status: 'active',
      approvalStatus: ['doctor', 'technician', 'rider', 'assistant', 'lawyer'].includes(normalizedRole) ? 'pending' : 'not_required',
    });

    // Apply referral code AFTER user exists, with the real new _id
    if (referralCode) {
      try {
        await referralService.applyReferralCode(user._id, referralCode, {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
      } catch (refErr) {
        logger.warn(`applyReferralCode failed for new user ${user._id}: ${refErr.message}`);
        // don't fail signup just because referral code was invalid
      }
    }

    // AUTH-M-05: account-farming signal (burst counter -> audit when a window
    // fills up). Detection only, fire-and-forget — never slows or fails signup.
    recordSignupEvent({ ip: req.ip, userId: user._id, email: lowerEmail }).catch(() => {});

    if (normalizedRole === 'assistant') {
      await AssistantProfile.create({
        userId: user._id,
        govtIdType: req.body.govtIdType || 'Aadhaar',
        govtIdNumber: (req.body.govtIdNumber || `ID-${Date.now()}`).trim().toUpperCase(),
        govtIdDocUrl: req.body.govtIdDocUrl || '',
        policeVerificationDocUrl: req.body.policeVerificationDocUrl || '',
        emergencyContact: {
          name: req.body.emergencyContactName || '',
          phone: req.body.emergencyContactPhone || '',
        },
        experienceYears: Number(req.body.experienceYears) || 1,
        experienceTypes: req.body.experienceTypes || ['Hospital Attendant'],
        certifications: req.body.certifications || [],
        languages: req.body.languages || ['Hindi', 'English'],
        bio: req.body.bio || 'Compassionate and dedicated hospital attendant/caretaker.',
        serviceCategories: req.body.serviceCategories || ['paperwork', 'errand'],
        hospitalsCovered: req.body.hospitalsCovered || ['City Hospital'],
        shiftTypes: req.body.shiftTypes || ['2hr', '4hr', 'full_day'],
        pricePerHour: Number(req.body.pricePerHour) || 150,
        pricePerFullDay: Number(req.body.pricePerFullDay) || (Number(req.body.pricePerHour || 150) * 8 * 0.85),
        extraSkills: req.body.extraSkills || {},
        bankDetails: {
          accountHolder: req.body.bankAccountHolder || name,
          accountNumber: req.body.bankAccountNumber || '',
          ifsc: req.body.bankIfsc || '',
          upiId: req.body.bankUpi || '',
        },
        availableDays: req.body.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        availableTimeSlots: req.body.availableTimeSlots || [{ start: '08:00', end: '20:00' }],
        healthCertification: req.body.healthCertification || {
          isVaccinated: true,
          vaccines: ['COVID-19 Booster', 'Hepatitis B'],
          isCertifiedFit: true,
        },
        trainedEmergencyAdmissions: req.body.trainedEmergencyAdmissions !== undefined ? Boolean(req.body.trainedEmergencyAdmissions) : true,
        policeVerificationStatus: req.body.policeVerificationDocUrl ? 'verified' : 'pending',
        assistantStatus: 'pending_approval',
        isAvailable: false,
        isDocumentVerified: false,
      });

      await notifyAdmins({
        title: '🧑‍⚕️ Assistant Approval Required',
        message: `${name} registered as a Hospital Assistant and needs document verification.`,
      });
    }

    if (normalizedRole === 'lawyer') {
      await LawyerProfile.create({
        userId: user._id,
        barCouncilNumber: (req.body.barCouncilNumber || `BAR-${Date.now()}`).trim().toUpperCase(),
        barCouncilCertUrl: req.body.barCouncilCertUrl || '',
        stateBarCouncil: req.body.stateBarCouncil || 'Bar Council of India',
        yearOfEnrollment: Number(req.body.yearOfEnrollment) || new Date().getFullYear(),
        lawDegreeCertUrl: req.body.lawDegreeCertUrl || '',
        govtIdType: req.body.govtIdType || 'Aadhaar',
        govtIdNumber: req.body.govtIdNumber || '',
        govtIdDocUrl: req.body.govtIdDocUrl || '',
        practiceCategories: req.body.practiceCategories || ['general_consultation'],
        yearsOfPractice: Number(req.body.yearsOfPractice) || 1,
        courtsPracticedIn: req.body.courtsPracticedIn || ['District Court'],
        jurisdictionCity: req.body.jurisdictionCity || 'Jabalpur',
        practiceType: req.body.practiceType || 'independent',
        lawFirmName: req.body.lawFirmName || '',
        yearsAtCurrentPractice: Number(req.body.yearsAtCurrentPractice) || Number(req.body.yearsOfPractice) || 3,
        favorableOutcomesRate: Number(req.body.favorableOutcomesRate) || 88,
        notableCases: req.body.notableCases || [
          'Hospital negligence dispute advisory',
          'Cashless insurance dispute resolution',
        ],
        isPoliceVerified: Boolean(req.body.isPoliceVerified),
        bio: req.body.bio || 'Practicing advocate dedicated to legal advisory & justice.',
        languages: req.body.languages || ['Hindi', 'English'],
        consultationModes: req.body.consultationModes || ['video', 'phone', 'chat'],
        consultationFee: Number(req.body.consultationFee) || 800,
        followUpFee: Number(req.body.followUpFee) || 500,
        freeFirstConsultation: Boolean(req.body.freeFirstConsultation),
        sessionDuration: Number(req.body.sessionDuration) || 30,
        bankDetails: {
          accountHolder: req.body.bankAccountHolder || name,
          accountNumber: req.body.bankAccountNumber || '',
          ifsc: req.body.bankIfsc || '',
          upiId: req.body.bankUpi || '',
        },
        availableDays: req.body.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        availableTimeSlots: req.body.availableTimeSlots || [{ start: '10:00 AM', end: '06:00 PM' }],
        acceptsUrgent: req.body.acceptsUrgent !== undefined ? Boolean(req.body.acceptsUrgent) : true,
        lawyerStatus: 'pending_approval',
        isAvailable: false,
        isDocumentVerified: false,
      });

      await notifyAdmins({
        title: '⚖️ Lawyer Approval Required',
        message: `Adv. ${name} registered as a Lawyer and needs Bar Council verification.`,
      });
    }

    if (normalizedRole === 'rider') {
      const vehicle = await Vehicle.create({
        riderId: user._id,
        type: req.body.vehicleType || 'car',
        brand: req.body.vehicleBrand || 'Standard',
        model: req.body.vehicleModel || 'Model',
        rcNumber: (req.body.rcNumber || `RC-${Date.now()}`).trim().toUpperCase(),
        rcDocUrl: req.body.rcDocUrl || '',
        insuranceNumber: req.body.insuranceNumber || 'INS-PENDING',
        insuranceDocUrl: req.body.insuranceDocUrl || '',
        insuranceExpiry: req.body.insuranceExpiry ? new Date(req.body.insuranceExpiry) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        color: req.body.vehicleColor || '',
        photos: req.body.vehiclePhotos || [],
        capacity: Number(req.body.seatingCapacity) || 4,
        fuelType: req.body.fuelType || 'Petrol',
        extraFields: req.body.extraFields || {},
        isDocumentVerified: false,
      });

      await RiderProfile.create({
        userId: user._id,
        vehicleId: vehicle._id,
        govtIdType: req.body.govtIdType || 'Aadhaar',
        govtIdNumber: req.body.govtIdNumber || 'PENDING',
        govtIdDocUrl: req.body.govtIdDocUrl || '',
        drivingLicenseNumber: req.body.drivingLicenseNumber || 'DL-PENDING',
        drivingLicenseDocUrl: req.body.drivingLicenseDocUrl || '',
        drivingLicenseExpiry: req.body.drivingLicenseExpiry ? new Date(req.body.drivingLicenseExpiry) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        bankDetails: {
          accountHolder: req.body.bankAccountHolder || name,
          accountNumber: req.body.bankAccountNumber || '',
          ifsc: req.body.bankIfsc || '',
          upiId: req.body.bankUpi || '',
        },
        operatingArea: req.body.operatingArea || '',
        availableDays: req.body.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        availableTimeSlot: req.body.availableTimeSlot || { start: '08:00', end: '20:00' },
        riderStatus: 'pending_approval',
        isOnline: false,
      });

      await notifyAdmins({
        title: 'Rider Approval Required',
        message: `${name} registered as a ${req.body.vehicleType || 'vehicle'} driver and needs document verification.`,
      });
    }

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
        subject: 'New FindMedi Doctor Registration',
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
router.post('/verify-otp', authLimiter, totpLimiter, validate(verifyOtpSchema), async (req, res) => {
  try {
    const { email, otp } = req.body;

    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail });
    // AUTH-B-15: a 404 here is an account-existence oracle for an unauthenticated
    // caller. Unknown addresses get the SAME response as a wrong/expired code.
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    const verificationResult = await verifyOTP({ email: lowerEmail, otp, type: 'email' });

    if (!verificationResult.success) {
      if (verificationResult.locked) {
        return res.status(429).json({
          message: verificationResult.message,
          locked: true,
          waitSeconds: verificationResult.waitSeconds,
        });
      }
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

    const { accessToken, refreshToken } = sign(user);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({
      message: 'OTP verified successfully',
      token: accessToken,
      // AUTH-F-03: no refreshToken in the body - httpOnly cookie only.
      user: await userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', authLimiter, totpLimiter, botProtection(), validate(resendOtpSchema), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerEmail });
    // AUTH-B-15: a 404 here is an account-existence oracle for an unauthenticated
    // caller. Unknown addresses get the SAME response as a wrong/expired code.
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
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
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const lowerEmail = email.toLowerCase();

    // AUTH-M-03: per-account brute-force protection with exponential backoff.
    //
    // The old code was a flat 10-failures -> 15-minute hard lock with no delay
    // in between: 960 free guesses a day against one account, and - worse on a
    // healthcare platform - anyone who knew a patient's EMAIL could lock that
    // patient out of their own account indefinitely without ever guessing a
    // password. Backoff now applies BEFORE the hard lock, and a per-IP budget
    // stops one host spraying many accounts.
    //
    // Still fail-open without Redis, deliberately: denying every login when the
    // cache is down would turn a dependency outage into an authentication
    // outage. See src/config/redis.js for the full reasoning.
    try {
      const { checkLoginLockout } = await import('../config/redis.js');
      const lock = await checkLoginLockout(lowerEmail, req.ip);
      if (lock.locked) {
        return res.status(429)
          .set('Retry-After', String(lock.retryAfterSeconds || 60))
          .json({
            message: lock.scope === 'ip'
              ? 'Too many failed sign-in attempts from this network. Try again shortly.'
              : 'Account temporarily locked after repeated failures. Try again shortly.',
            retryAfterSeconds: lock.retryAfterSeconds,
          });
      }
    } catch {}

    const user = await User.findOne({ email: lowerEmail }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Incremented for unknown emails too. Counting only real accounts would
      // let an attacker enumerate which addresses are registered by watching the
      // backoff grow.
      let retryAfterSeconds = 0;
      let justLocked = false;
      try {
        const { registerLoginFailure } = await import('../config/redis.js');
        const result = await registerLoginFailure(lowerEmail, req.ip);
        retryAfterSeconds = result.retryAfterSeconds;
        justLocked = result.locked;
      } catch {}

      // Tell the owner their account is being attacked.
      //
      // Gated on `user` existing, and that gate is a security control, not
      // politeness. Emailing on every failed attempt regardless of whether the
      // address is registered would turn POST /login into an open mail relay:
      // anyone could mail-bomb an arbitrary third party just by typing their
      // address. The email only goes to an account that actually exists, and
      // only on the transition INTO the locked state - a caller retrying inside
      // an active lock never reaches here, and even if they did, the address
      // would need to already be theirs.
      if (justLocked && user) {
        try {
          const { sendEmail } = await import('../services/notificationService.js');
          void sendEmail({
            to: user.email,
            subject: 'Your account was temporarily locked',
            text: [
              'Someone failed to sign in to your account several times, so we locked it briefly to protect it.',
              '',
              'If this was not you, change your password now. If you were locked out, waiting about 15 minutes also clears it.',
            ].join('\n'),
          }).catch(() => {});
        } catch {}
      }

      if (retryAfterSeconds > 0) {
        return res.status(429)
          .set('Retry-After', String(retryAfterSeconds))
          .json({
            // Wording identical to the 401 below, on purpose: if a wrong
            // password and a slow-down response read differently, the pair
            // becomes an account-existence oracle.
            message: 'Invalid credentials',
            retryAfterSeconds,
          });
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    try {
      const { resetLoginFailures } = await import('../config/redis.js');
      await resetLoginFailures(lowerEmail);
    } catch {}

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}` });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.', blocked: true });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is pending activation.', inactive: true });
    }

    // AUTH-F-06: the old AUTH-010 `mustResetPassword` 403 that lived here is
    // gone. It ran only on this password-login path (google/2FA issued tokens
    // anyway) and - fatally - BEFORE token issuance, so the account could never
    // reach PUT /auth/change-password, the one route that clears the flag.
    // `protect` now enforces the lock session-level on every route with a
    // four-path allowlist; the flag rides in userResponse so the client routes
    // to /set-password immediately.

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

    // AUTH-B-03 / DL-03: 2FA must actually gate the session. When the account
    // has 2FA enrolled we hand out NO token and NO auth cookie — only a
    // short-lived, single-use ticket that can be exchanged for a session by
    // POST /api/auth/2fa/complete with a valid TOTP / backup code.
    if (user.twoFactorEnabled) {
      const { ticket, expiresIn } = issueTwoFactorTicket(user);
      return res.status(200).json({
        requiresTwoFactor: true,
        twoFactorTicket: ticket,
        expiresIn,
        email: user.email,
        message: 'Enter the 6-digit code from your authenticator app (or one of your backup codes) to finish signing in.',
      });
    }

    try {
      await auditLog('user_login', user._id, { ip: req.ip, userAgent: req.get('user-agent'), email: user.email });
    } catch (err) {
      logger.error('Audit error:', err);
    }

    const { accessToken, refreshToken } = sign(user);
    // AUTH-M-08: record + check this login against the account's history. Does
    // not block the login and cannot fail it - see recordLoginEvent.
    await recordLoginEvent(user._id, { ip: req.ip, userAgent: req.get('user-agent'), email: user.email });
    setAuthCookies(res, accessToken, refreshToken);
    return res.json({
      token: accessToken,
      // AUTH-F-03: the refresh token travels ONLY in the httpOnly cookie.
      // Putting it in the JSON body handed a 7-day session secret to any
      // script that can read a response (XSS, extension, logged payload) -
      // and the frontend never read it (lib/axios.js keeps a tripwire log
      // that must never fire).
      user: await userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/2fa/complete
// Second leg of the login flow for 2FA-enrolled accounts (AUTH-B-03).
// Exchanges the short-lived ticket issued by /login for a real session, and
// only after a valid TOTP code / backup code. The ticket is single-use.
// -- Step-up authentication (AUTHZ-M-03) ------------------------------------
// 2FA at login proves who you are ONCE. This proves the same person is still
// there when they do something that costs money or moves records out in bulk.
router.post('/step-up', protect, totpLimiter, async (req, res) => {
  try {
    const { code, scope } = req.body || {};
    if (!scope || typeof scope !== 'string' || scope.length > 64) {
      return res.status(400).json({ message: 'scope is required' });
    }
    // A client may only request a REGISTERED sensitive scope. Without this the
    // endpoint becomes an oracle for which scopes exist, and lets a caller mint
    // grants for arbitrary strings.
    if (!SENSITIVE_SCOPES.has(scope)) {
      return res.status(400).json({ message: 'Unknown step-up scope' });
    }

    const out = await issueStepUpFor(req.user._id, code, scope);
    if (!out.ok) {
      const status = out.reason === 'not-enabled' ? 409 : 401;
      return res.status(status).json({
        message: out.reason === 'not-enabled'
          ? 'Enable two-factor authentication to use this feature'
          : 'Incorrect verification code',
        reason: out.reason,
      });
    }

    res.json({ token: out.token, scope, expiresIn: 300 });
  } catch (err) {
    logger.error(`Step-up error: ${err.message}`);
    sendServerError(res, err, 'Could not verify this action');
  }
});

router.post('/2fa/complete', authLimiter, totpLimiter, async (req, res) => {
  try {
    const { twoFactorTicket, token, backupCode } = req.body || {};

    if (!twoFactorTicket || (!token && !backupCode)) {
      return res.status(400).json({ message: 'twoFactorTicket and (token or backupCode) are required' });
    }

    const ticketCheck = await consumeTwoFactorTicket(twoFactorTicket);
    if (!ticketCheck.ok) {
      const message = ticketCheck.reason === 'used'
        ? 'This login attempt was already used. Please sign in again.'
        : 'Your 2FA session expired. Please sign in again.';
      return res.status(401).json({ message });
    }

    const user = await User.findById(ticketCheck.userId).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid 2FA session. Please sign in again.' });
    }
    // A password change / logout-all between the two legs invalidates the ticket.
    if ((user.tokenVersion || 0) !== (ticketCheck.tokenVersion ?? 0)) {
      return res.status(401).json({ message: 'Session revoked. Please sign in again.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.', blocked: true });
    }
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled for this account' });
    }

    let method = null;
    if (token && verifyToken(token, user.twoFactorSecret)) {
      method = 'totp';
    } else if (backupCode) {
      const { valid, codeIndex } = verifyBackupCode(backupCode, user.twoFactorBackupCodes);
      if (valid) {
        // Single-use backup code.
        user.twoFactorBackupCodes.splice(codeIndex, 1);
        method = 'backup';
      }
    }

    if (!method) {
      return res.status(401).json({ message: 'Invalid 2FA code', requiresTwoFactor: true });
    }

    await user.save();

    try {
      await auditLog('user_login_2fa', user._id, { ip: req.ip, userAgent: req.get('user-agent'), method });
    } catch (err) { /* audit must not block login */ }

    const { accessToken, refreshToken } = sign(user, req);
    // AUTH-M-08: 2FA completion is the SECOND leg of a login and can land on a
    // different device/IP than the password step (an OTP arriving on a phone).
    // Detecting only at the password step would flag exactly the legitimate
    // two-device flow as the attack it is designed to catch.
    await recordLoginEvent(user._id, { ip: req.ip, userAgent: req.get('user-agent') });
    setAuthCookies(res, accessToken, refreshToken);
    return res.json({
      success: true,
      method,
      token: accessToken,
      // AUTH-F-03: cookie-only refresh token.
      user: await userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/google — authenticate or verify Google OAuth user
router.post('/google', authLimiter, validate(googleAuthSchema), async (req, res) => {
  try {
    const { idToken, accessToken, role = 'patient' } = req.body;

    if (!idToken && !accessToken) {
      return res.status(400).json({ message: 'Google credential (idToken or accessToken) is required' });
    }

    let googleUser = null;

    // 1. If idToken is provided, try verifying with google-auth-library
    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: GOOGLE_AUDIENCES,
        });
        const payload = ticket.getPayload();
        googleUser = {
          email: payload.email?.toLowerCase(),
          name: payload.name,
          picture: payload.picture,
          sub: payload.sub,
          email_verified: payload.email_verified,
        };
      } catch (idErr) {
        logger.warn('Google verifyIdToken failed, trying userinfo fallback: ' + idErr.message);
      }
    }

    // 2. Fallback: Fetch userinfo directly from Google API endpoint
    if (!googleUser && (accessToken || idToken)) {
      try {
        const tokenToUse = accessToken || idToken;
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });
        if (response.ok) {
          const info = await response.json();
          googleUser = {
            email: info.email?.toLowerCase(),
            name: info.name,
            picture: info.picture,
            sub: info.sub,
            email_verified: info.email_verified,
          };
        }
      } catch (fetchErr) {
        logger.error('Google userinfo fetch failed:', fetchErr);
      }
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ message: 'Failed to verify Google credentials' });
    }

    // Check if user already exists
    const user = await User.findOne({ email: googleUser.email });

    if (user) {
      if (user.status === 'blocked') {
        return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.', blocked: true });
      }

      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
      }

      if (user.role === 'doctor') {
        const doctorProfile = await getDoctorProfile(user);
        if (!doctorProfile?.approved && user.approvalStatus !== 'approved') {
          return res.json({
            message: 'Your doctor account is pending admin approval.',
            approvalPending: true,
            user: await userResponse(user),
          });
        }
      }

      try {
        await auditLog('user_login_google', user._id, { ip: req.ip, userAgent: req.get('user-agent'), email: user.email });
      } catch (e) {}

      const { accessToken: token, refreshToken } = sign(user);
      setAuthCookies(res, token, refreshToken);

      return res.json({
        success: true,
        exists: true,
        token,
        // AUTH-F-03: cookie-only refresh token.
        user: await userResponse(user),
      });
    }

    // User not registered yet -> Return google profile for Step 2 Complete Profile form
    return res.json({
      success: true,
      exists: false,
      googleUser: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        sub: googleUser.sub,
        // AUTH-B-02: never echo a self-selected role back to the client.
        role: 'patient',
      },
    });
  } catch (err) {
    logger.error('Google auth route error:', err);
    res.status(500).json({ message: err.message || 'Google authentication failed' });
  }
});

// POST /api/auth/google-register — Step 2 of Google Signup: Complete Profile & Register
//
// AUTH-B-01: this route used to mint a FULL session (access + refresh token, auth
// cookies) for ANY existing account from a bare email in the body — a complete
// account takeover with zero proof of Google ownership (see DL-01 / DLB-01). A
// session is now only ever issued after a VERIFIED Google id_token, and the
// account identity is taken from the token payload, never from the request body.
//
// AUTH-B-02: self-service signup can only ever create a `patient`; privileged
// roles (hospital_admin/clinic_doctor/...) come from an admin invite flow.
router.post('/google-register', authLimiter, botProtection(), validate(googleRegisterSchema), async (req, res) => {
  try {
    const {
      name,
      phone = '',
      gender = '',
      dateOfBirth,
      avatar = '',
      googleIdToken,
    } = req.body;

    if (!googleIdToken) {
      return res.status(401).json({
        message: 'Google identity proof is required: send the id_token you received from Google Sign-In.',
      });
    }

    let googleProfile;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: googleIdToken,
        audience: GOOGLE_AUDIENCES,
      });
      const payload = ticket.getPayload();
      if (!payload?.email || payload.email_verified === false) {
        return res.status(401).json({ message: 'Google account email could not be verified' });
      }
      googleProfile = {
        email: String(payload.email).toLowerCase(),
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub,
      };
    } catch (verifyErr) {
      logger.warn(`google-register id_token verification failed: ${verifyErr.message}`);
      return res.status(401).json({ message: 'Google token verification failed' });
    }

    // Identity comes from the verified token; the body email is ignored entirely.
    const lowerEmail = googleProfile.email;
    // let, NOT const: the new-account branch reassigns it (eslint prefer-const
    // would break that branch with an Assignment-to-constant TypeError -> 500).
    let user = await User.findOne({ email: lowerEmail });

    if (user) {
      if (user.status === 'blocked') {
        return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.', blocked: true });
      }
      if (phone && !user.phone) user.phone = phone;
      if (gender && !user.gender) user.gender = gender;
      if (dateOfBirth && !user.dateOfBirth) user.dateOfBirth = dateOfBirth;
      if (avatar && !user.avatar) user.avatar = avatar;
      if (!user.name && name) user.name = name;
      user.isVerified = true;
      await user.save();
    } else {
      const created = await User.create({
        name: name || googleProfile.name || lowerEmail.split('@')[0],
        email: lowerEmail,
        // AUTH-B-02: patient only.
        role: 'patient',
        phone,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        avatar: avatar || googleProfile.picture || '',
        isVerified: true,
        status: 'active',
        approvalStatus: 'not_required',
        googleSub: googleProfile.sub,
      });
      user = created;

      await Patient.create({
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender || 'Other',
        age: calculateAge(dateOfBirth),
        userId: user._id,
        status: 'Active',
      });

      // AUTH-M-05: count NEW accounts only — an existing user signing in with
      // Google is not farming. Fire-and-forget, detection only.
      recordSignupEvent({ ip: req.ip, userId: user._id, email: lowerEmail }).catch(() => {});
    }

    try {
      await auditLog('user_register_google', user._id, { ip: req.ip, userAgent: req.get('user-agent'), email: user.email });
    } catch (e) {}

    const { accessToken: token, refreshToken } = sign(user);
    setAuthCookies(res, token, refreshToken);

    return res.json({
      success: true,
      token,
      // AUTH-F-03: cookie-only refresh token.
      user: await userResponse(user),
    });
  } catch (err) {
    logger.error('Google register route error:', err);
    res.status(500).json({ message: err.message || 'Google registration failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, botProtection(), validate(forgotPasswordSchema), async (req, res) => {
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
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    // P2-9: a reset is exactly when people pick a breached password.
    if (await isPwnedPassword(password)) {
      return res.status(400).json({
        message: 'This password has appeared in a data breach. Please choose a different one.',
        code: 'PASSWORD_PWNED',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // AUTH-B-15: same generic answer for unknown accounts (no enumeration oracle).
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset code' });

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    const verificationResult = await verifyOTP({
      email: user.email,
      otp,
      type: 'password_reset',
    });

    if (!verificationResult.success) {
      if (verificationResult.locked) {
        return res.status(429).json({
          message: verificationResult.message,
          locked: true,
          waitSeconds: verificationResult.waitSeconds,
        });
      }
      return res.status(400).json({ message: verificationResult.message });
    }

    user.password = password;
    user.mustResetPassword = false;
    await user.save();
    // AUTH-012: a reset compromises nothing that survives — revoke all sessions.
    await revokeAllSessions(user._id);
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

// AUTH-025: setup tokens are single-use — consumed jtis are burned in Redis.
const consumeSetupToken = async (decoded) => {
  if (!decoded?.jti) return true; // legacy pre-jti token (expires within 48h anyway)
  try {
    const { redisClient, isRedisReady } = await import('../config/redis.js');
    if (!isRedisReady() || !redisClient.isOpen) return true; // fail-open without Redis
    return (await redisClient.set(`setup:used:${decoded.jti}`, '1', { NX: true, EX: 48 * 3600 })) === 'OK';
  } catch {
    return true;
  }
};

// POST /api/auth/doctor-setup
router.post('/doctor-setup', authLimiter, validate(doctorSetupSchema), async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) {
      return res.status(400).json({ message: pwResult.error.issues[0].message });
    }

    const decoded = verifyJwt(token);
    if (decoded.type !== 'doctor_setup') {
      return res.status(400).json({ message: 'Invalid setup token' });
    }
    if (!(await consumeSetupToken(decoded))) {
      return res.status(400).json({ message: 'Setup link already used. Ask your administrator for a new invite.' });
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

// POST /api/auth/ambulance-setup (Doc 02 §3.2 — copy of doctor-setup)
router.post('/ambulance-setup', authLimiter, validate(doctorSetupSchema), async (req, res) => {
  try {
    // FE-B-06: the invite now carries an OPAQUE SINGLE-USE CODE, not a JWT.
    //
    // The previous flow verified a 48-hour `ambulance_setup` JWT and then tried to
    // mark it consumed via `consumeSetupToken(decoded)` — but a JWT cannot express
    // "already used", so the one-time property depended entirely on that side
    // table, and the credential itself stayed replayable for the full 48 hours
    // while sitting in a URL (browser history, proxy logs, Referer).
    //
    // The replacement code has 128 bits of entropy, expires in 15 minutes, and is
    // consumed by an atomic `findOneAndUpdate({ code, usedAt: null, expiresAt > now })`
    // — so two concurrent redemptions cannot both succeed.
    const code = req.body.code || req.body.token; // `token` accepted for older emails in flight
    const { password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ message: 'Setup code and password are required' });
    }
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) {
      return res.status(400).json({ message: pwResult.error.issues[0].message });
    }

    const { consumeAmbulanceSetupCode } = await import('../services/ambulanceLoginService.js');
    const activated = await consumeAmbulanceSetupCode(code, password, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const { default: Ambulance } = await import('../models/Ambulance.js');
    const { default: AmbulanceSetupCode } = await import('../models/AmbulanceSetupCode.js');
    const consumed = await AmbulanceSetupCode.findOne({ userId: activated.userId }).sort({ createdAt: -1 });
    if (consumed?.ambulanceId) {
      await Ambulance.updateOne(
        { _id: consumed.ambulanceId },
        { loginStatus: 'active', userId: activated.userId }
      );
    }

    res.json({ message: 'Password set successfully. You can now login.' });
  } catch (err) {
    // One uniform message for invalid / used / expired. Distinguishing them would
    // only help someone probing, and the code has 128 bits of entropy.
    logger.warn(`Ambulance setup rejected: ${err.message}`);
    res.status(err.statusCode || 400).json({
      message: err.statusCode
        ? err.message
        : 'This setup link is invalid, already used, or has expired.',
    });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(await userResponse(user));
});

// PUT /api/auth/change-password
// authz: self
router.put('/change-password', protect, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // P2-9: known-breached passwords are refused here too.
    if (await isPwnedPassword(newPassword)) {
      return res.status(400).json({
        message: 'This password has appeared in a data breach. Please choose a different one.',
        code: 'PASSWORD_PWNED',
      });
    }

    user.password = newPassword;
    user.mustResetPassword = false;
    await user.save();
    // AUTH-012: changing the password kills every other session.
    await revokeAllSessions(user._id);
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
// authz: self
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
        'findmedi/avatars'
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
router.put('/profile', protect, validate(profileUpdateSchema), async (req, res) => {
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
      chatFee,
      videoFee,
      audioFee,
      homeVisitFee,
      appointmentModes,
      emergencySupport,
      refundOnMissedOrCancelled,
      ambulanceService,
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

    if (user.role === 'doctor' || user.role === 'clinic_doctor') {
      const docUpdate = {
        name: user.name,
        phone: user.phone,
        specialization: user.specialization,
        experience: user.experience || '1 year',
        qualifications: user.qualification,
        fees: Number(user.consultationFee) || 500,
        consultation_fees: Number(user.consultationFee) || 500,
        profile_photo: user.avatar,
      };
      if (appointmentModes) docUpdate.appointmentModes = appointmentModes;
      if (chatFee !== undefined) docUpdate.chat_fee = Number(chatFee) || 0;
      if (videoFee !== undefined) docUpdate.video_fee = Number(videoFee) || 0;
      if (audioFee !== undefined) docUpdate.audio_fee = Number(audioFee) || 0;
      if (consultationFee !== undefined) docUpdate.offline_fee = Number(consultationFee) || 0;
      if (homeVisitFee !== undefined) docUpdate.home_visit_fee = Number(homeVisitFee) || 0;
      if (emergencySupport !== undefined) {
        docUpdate.emergencySupport = Boolean(emergencySupport);
        docUpdate.emergency_consultation = Boolean(emergencySupport);
      }
      if (refundOnMissedOrCancelled !== undefined) {
        docUpdate.refundOnMissedOrCancelled = Boolean(refundOnMissedOrCancelled);
      }
      if (chatFee !== undefined || videoFee !== undefined || audioFee !== undefined || consultationFee !== undefined || homeVisitFee !== undefined) {
        docUpdate.appointmentFees = {
          chat: Number(chatFee || docUpdate.chat_fee || 300),
          video: Number(videoFee || docUpdate.video_fee || 500),
          audio: Number(audioFee || docUpdate.audio_fee || 400),
          offline: Number(consultationFee || docUpdate.offline_fee || 500),
          home_visit: Number(homeVisitFee || docUpdate.home_visit_fee || 800),
        };
      }
      await Doctor.findOneAndUpdate(
        { $or: [{ user_id: user._id.toString() }, { email: user.email }] },
        docUpdate,
        { new: true }
      );
    }

    res.json(await userResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/logout
// Rate-limited like every other auth mutation — without this a caller can
// hammer the endpoint to force repeated RefreshToken.deleteOne() writes.
router.post('/logout', authLimiter, async (req, res) => {
  try {
    const refreshToken = readAuthCookie(req.cookies, 'refreshToken') || req.body?.refreshToken;
    if (refreshToken) {
      const tokenKey = RefreshToken.getTokenKey(refreshToken);
      await RefreshToken.deleteOne({ tokenKey });
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  }
});

// POST /api/auth/logout-all — MISS-001: "sign out of all devices".
router.post('/logout-all', protect, async (req, res) => {
  try {
    await revokeAllSessions(req.user._id);
    clearAuthCookies(res);
    try {
      await auditLog('logout_all', req.user._id, { ip: req.ip, userAgent: req.get('user-agent') });
    } catch (err) {
      logger.error('Audit error:', err);
    }
    res.json({ message: 'Signed out of all devices' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/sessions — MISS-001: list active sessions (device/IP/last use).
//
// `current` marks the caller's own device, by matching the jti inside the
// refresh token they presented. Without it a user cannot tell which row is the
// tab they are looking at, and "sign out this device" is unusable without it.
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await RefreshToken.find({ userId: req.user._id })
      .select('jti familyId userAgent ip createdAt expiresAt replacedBy')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // The jti of the session making this request, if we can identify it.
    const presented = readAuthCookie(req.cookies, 'refreshToken') || req.query?.refreshToken;
    let currentJti = null;
    if (presented) {
      try {
        currentJti = verifyRefreshToken(presented)?.jti || null;
      } catch {
        currentJti = null; // unparseable token: no row is "current"
      }
    }

    res.json({
      sessions: sessions.map((s) => ({
        ...s,
        current: Boolean(currentJti) && s.jti === currentJti,
      })),
    });
  } catch (err) {
    logger.error(`Sessions list error: ${err.message}`);
    sendServerError(res, err, 'Could not load your sessions');
  }
});

// DELETE /api/auth/sessions/:jti — revoke ONE device session.
//
// AUTH-M-02. `GET /sessions` listed rows and `POST /logout-all` killed all of
// them, but there was no way to end a SINGLE session, which is the actual
// response when someone finds an unfamiliar device: "log this one out" without
// signing yourself out of the phone in your hand.
//
// Two rules this route must not get wrong:
//
//  1. SCOPE. The filter is `{ userId: req.user._id, jti }`, never `{ jti }`.
//     A jti is a 12-byte random hex string, so it is unguessable — which is
//     exactly why it must not be the only thing standing between a caller and
//     someone else's session. Pairing it with the session's own user id makes
//     the id irrelevant to authorization rather than merely hard to guess.
//  2. NOT FOUND vs FORBIDDEN are the same 404. A caller must not be able to
//     probe whether a given jti exists in someone else's account, so the
//     response cannot distinguish "not yours" from "does not exist".
//
// This revokes the refresh token only. The matching ACCESS token stays valid
// until it expires (15 min), because there is no per-session revocation list on
// the access-token side; `logout-all` is the hammer that also bumps
// tokenVersion. Bumping tokenVersion here instead would sign the user out of
// every device, which is the opposite of what "revoke this one" means.
router.delete('/sessions/:jti', protect, authLimiter, async (req, res) => {
  try {
    const jti = String(req.params.jti || '');
    if (!/^[a-f0-9]{24}$/i.test(jti)) {
      // Same answer as "not found": do not confirm the format of a real jti.
      return res.status(404).json({ message: 'Session not found' });
    }

    const result = await RefreshToken.deleteOne({ userId: req.user._id, jti });
    if (!result?.deletedCount) {
      return res.status(404).json({ message: 'Session not found' });
    }

    try {
      await auditLog('session_revoked', req.user._id, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        jti,
      });
    } catch (err) {
      logger.error('Audit error:', err);
    }

    // If the caller just killed the session they are using, clear its cookies.
    const presented = readAuthCookie(req.cookies, 'refreshToken');
    if (presented) {
      try {
        if (verifyRefreshToken(presented)?.jti === jti) clearAuthCookies(res);
      } catch {
        // Unparseable presented token: leave the cookies alone.
      }
    }

    res.json({ message: 'Session revoked' });
  } catch (err) {
    logger.error(`Session revoke error: ${err.message}`);
    sendServerError(res, err, 'Could not revoke that session');
  }
});

// POST /api/auth/refresh
router.post('/refresh', authLimiter, validate(refreshTokenSchema), async (req, res) => {
  let newRefreshTokenDoc = null;
  try {
    const refreshToken = readAuthCookie(req.cookies, 'refreshToken') || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const tokenKey = RefreshToken.getTokenKey(refreshToken);
    const stored = await RefreshToken.findOne({ tokenKey });
    if (!stored) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Expiry first, then PROVE the caller holds this token, and only then act on
    // rotation state.
    //
    // The order is the fix. `stored.replacedBy` used to be checked BEFORE
    // `compareToken`, so the reuse branch acted on a row that had merely been
    // LOOKED UP - and while `tokenKey` was a constant prefix (see the model), any
    // string at all could select a row. Verifying first means the destructive
    // branch is only reachable by someone who actually presents the token.
    if (stored.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'Refresh token expired. Please login again.' });
    }

    const isValid = await stored.compareToken(refreshToken);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // MISS-002 reuse detection - presenting an already-rotated token means
    // theft. Reachable only now that the token is proven.
    //
    // The revocation is deliberately USER-wide, and the earlier family-scoped
    // line is gone because it did not do what its comment claimed: the
    // `familyId || undefined` degrades to a bare `{ userId }` filter when
    // familyId is missing (Mongoose strips undefined keys), and the following
    // `deleteMany({ userId })` made the user-wide scope unconditional anyway. So
    // that first line was either redundant or accidentally broader than its
    // comment, depending on the row.
    //
    // User-wide is right for a PHI platform: once a rotated token is replayed,
    // the platform cannot tell the attacker from the legitimate holder, so the
    // cheap answer is to end every session and force re-authentication.
    // Family-scoping would leave the attacker holding a live session on the
    // victim's OTHER devices.
    if (stored.replacedBy) {
      await RefreshToken.deleteMany({ userId: stored.userId }).catch(() => {});
      try {
        await auditLog('refresh_token_reuse_detected', stored.userId, { ip: req.ip, userAgent: req.get('user-agent') });
      } catch (err) {
        logger.error('Audit error:', err);
      }
      logger.error(`[auth] refresh reuse detected for user ${stored.userId} (family ${stored.familyId}) - all sessions revoked`);
      return res.status(401).json({ message: 'Session compromised. Please login again.' });
    }

    // Signature + PURPOSE check: an access token must not mint a new 7-day
    // session (AUTH-F-02). family must be present, typ must be 'refresh' when set.
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'User not found' });
    }

    // AUTH-012: token version — logout-all / password change revokes refresh too.
    if (decoded.tv != null && (user.tokenVersion || 0) !== decoded.tv) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'Session revoked. Please login again.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Account blocked' });
    }

    // Rotation with family linkage (MISS-002): mark predecessor replaced.
    const { token: newRefreshToken, jti: newJti, familyId } = signRefreshToken(user, stored.familyId);
    const newAccessToken = signAccessToken(user);

    stored.replacedBy = newJti;
    stored.revokedAt = new Date();
    await stored.save().catch(() => {});

    newRefreshTokenDoc = await RefreshToken.create({
      userId: user._id,
      tokenKey: RefreshToken.getTokenKey(newRefreshToken),
      tokenHash: newRefreshToken, // will be hashed by pre-save hook
      jti: newJti,
      familyId,
      userAgent: req.get?.('user-agent') || '',
      ip: req.ip || '',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);
    // AUTH-F-03: rotation result goes back as cookies + the short-lived
    // access token only. The rotated refresh token in a body would defeat
    // the httpOnly storage the whole design rests on.
    res.json({
      token: newAccessToken,
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
