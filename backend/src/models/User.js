import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generate16DigitId } from '../utils/idGenerator.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'patient', 'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'pharmacy_owner', 'pharmacist', 'nurse', 'radiologist', 'dietitian', 'physiotherapist', 'counselor', 'counsellor', 'psychiatrist', 'accountant', 'security', 'technician', 'helper', 'delivery_boy', 'rider', 'assistant', 'lawyer', 'ambulance'], default: 'patient', index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy', ''], default: '' },
  avatar: { type: String, default: '' },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  uhid: { type: String, unique: true, sparse: true, index: true },
  gender: { type: String, enum: ['', 'Male', 'Female', 'Other'], default: '' },
  bloodGroup: { type: String, default: '' },
  dateOfBirth: { type: Date },

  // Allergies for patients
  allergies: [{
    allergen: { type: String, required: true },
    reaction: { type: String },
    severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Mild' },
    notes: { type: String },
  }],

  // Chronic conditions for Health ID
  knownConditions: [{
    condition: { type: String, required: true },   // e.g. "Diabetes Type 2"
    since: { type: String, default: '' },
    notes: { type: String, default: '' },
  }],

  specialization: { type: String, default: '' }, // for doctors
  experience: { type: String, default: '' },
  qualification: { type: String, default: '' },
  licenseNumber: { type: String, default: '' },
  consultationFee: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
  flagged: { type: Boolean, default: false, index: true },
  flagReason: { type: String, default: '' },
  approvalStatus: {
    type: String,
    enum: ['not_required', 'pending', 'approved', 'rejected'],
    default: 'not_required',
    index: true,
  },
  // 2FA fields
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: '' },
  twoFactorBackupCodes: [{ type: String }], // Hashed backup codes
  twoFactorTempSecret: { type: String, default: '' }, // Temp secret during setup

  // Google Drive OAuth tokens (for secure personal file storage)
  driveTokens: { type: Object, default: null },

  settings: {
    type: Object,
    default: () => ({
      emailNotifications: true,
      smsAlerts: true,
      systemNotifications: true,
      weeklyReports: false,
      appointmentReminders: true,
      labResultEmails: true,
      criticalAlerts: true,
      adminDigest: true,
      doctorScheduleAlerts: true,
      patientRecordSharing: false,
      theme: 'system',
      density: 'comfortable',
      language: 'en',
      timezone: 'Asia/Calcutta',
      defaultDashboard: 'overview',
      twoFactorEnabled: false,
      dataSharing: false,
      profileVisibility: 'care_team',
    }),
  },

  // Delivery Boy fields
  vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'on-foot', ''], default: '' },
  vehicleNumber: { type: String, default: '' },
  drivingLicenseNumber: { type: String, default: '' },
  docs: {
    aadharFront: { type: String, default: '' },
    aadharBack: { type: String, default: '' },
    panCard: { type: String, default: '' },
    photo: { type: String, default: '' },
    drivingLicense: { type: String, default: '' },
    rc: { type: String, default: '' },
    addressProof: { type: String, default: '' },
  },
  bankDetails: {
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
    upiId: { type: String, default: '' },
  },
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now, index: true },
  deliveryZone: [{ type: String }],
  workingHours: {
    type: Object,
    default: () => ({
      availability: 'full-time',
      startTime: '',
      endTime: '',
    }),
  },
emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
  },

  referral: {
    code: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referredByCode: { type: String, default: '' },
  },

  loyalty: {
    pointsBalance: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },
    tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
  },

  // Spec 21: demo sandbox wallet (₹10,000 sandbox credit, no real currency).
  demoWallet: {
    balance: { type: Number, default: 10000, min: 0 },
    currency: { type: String, default: 'INR' },
  },

  healthIdCard: {
    isEnabled: { type: Boolean, default: true },
    qrToken: { type: String, unique: true, sparse: true, index: true },
    lastRotatedAt: { type: Date },
    shareLevel: {
      type: String,
      enum: ['full', 'minimal'],
      default: 'full',
    },
    abhaNumber: { type: String, default: '', index: true },
    abhaAddress: { type: String, default: '' },
    abhaStatus: { type: String, enum: ['NOT_LINKED', 'PENDING_OTP', 'LINKED'], default: 'NOT_LINKED' },
    abhaLinkedAt: { type: Date },
  },

  createdAt: { type: Date, default: Date.now, index: true },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.uhid) {
    this.uhid = generate16DigitId();
  }
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);

