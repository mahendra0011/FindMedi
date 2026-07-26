import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generate16DigitId } from '../utils/idGenerator.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin', 'admin', 'doctor', 'clinic_doctor', 'patient', 'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'pharmacy_owner', 'pharmacist', 'nurse', 'radiologist', 'dietitian', 'physiotherapist', 'counselor', 'accountant', 'security', 'technician', 'helper'], default: 'patient', index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy', ''], default: '' },
  avatar: { type: String, default: '' },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  uhid: { type: String, unique: true, sparse: true, index: true },
  gender: { type: String, enum: ['', 'Male', 'Female', 'Other'], default: '' },
  dateOfBirth: { type: Date },

  // Allergies for patients
  allergies: [{
    allergen: { type: String, required: true },
    reaction: { type: String },
    severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Mild' },
    notes: { type: String },
  }],

  specialization: { type: String, default: '' }, // for doctors
  experience: { type: String, default: '' },
  qualification: { type: String, default: '' },
  licenseNumber: { type: String, default: '' },
  consultationFee: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
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

