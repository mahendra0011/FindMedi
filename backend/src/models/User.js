import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { generate16DigitId } from '../utils/idGenerator.js';
import { canonicalRole } from '../config/permissions.js';

// P2-11: Argon2id is the default password hasher (m=19456, t=2, p=1 —
// OWASP minimums). bcrypt-cost-12 remains readable forever so every
// existing row keeps verifying, and upgrades transparently on next login.
// Escape hatch: PASSWORD_HASHER=bcrypt (new hashes stay bcrypt).
const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
export const passwordHasher = () =>
  String(process.env.PASSWORD_HASHER || 'argon2').toLowerCase() === 'bcrypt' ? 'bcrypt' : 'argon2';

export async function hashNewPassword(plain) {
  const pepper = getPasswordPepper();
  const material = pepper ? peppered(plain, pepper) : String(plain);
  if (passwordHasher() === 'bcrypt') return bcrypt.hash(material, BCRYPT_ROUNDS);
  return argon2.hash(material, ARGON_OPTS);
}

async function verifyAgainstHash(material, hash) {
  try {
    if (String(hash).startsWith('$argon2')) return await argon2.verify(hash, material);
    return await bcrypt.compare(material, hash);
  } catch {
    return false;
  }
}

// P2-11: server-side pepper. When PASSWORD_PEPPER is set (secret manager, NOT
// the DB), passwords are HMAC-SHA256'd with it BEFORE bcrypt, so a DB-only
// leak (dump/backup/SQLi) gives an attacker hashes that still need the pepper
// to crack. Unset = disabled (zero behaviour change); enabling later upgrades
// hashes transparently on next successful login (see comparePassword).
export const getPasswordPepper = () => {
  const p = String(process.env.PASSWORD_PEPPER || '');
  return p.length >= 16 ? p : '';
};

const peppered = (plain, pepper) =>
  crypto.createHmac('sha256', pepper).update(String(plain), 'utf8').digest('hex');

// Compare a plaintext candidate against a stored hash (argon2id or bcrypt),
// trying the peppered form first and falling back to the legacy unpeppered
// form (pre-pepper rows). Returns { ok, legacy } so callers can trigger a
// re-hash upgrade.
export async function passwordMatchesHash(plain, hash) {
  const pepper = getPasswordPepper();
  if (pepper) {
    if (await verifyAgainstHash(peppered(plain, pepper), hash)) return { ok: true, legacy: false };
    if (await verifyAgainstHash(String(plain), hash)) return { ok: true, legacy: true };
    return { ok: false, legacy: false };
  }
  const ok = await verifyAgainstHash(String(plain), hash);
  return { ok, legacy: false };
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  passwordHistory: { type: [String], select: false, default: [] },
  mustResetPassword: { type: Boolean, default: false, index: true },
  // AUTH-012/MISS-001: bumped on password change/reset, 2FA change, logout-all.
  // Every access/refresh token carries tv; mismatch → 401 (session revoked).
  tokenVersion: { type: Number, default: 0, index: true },
  // AUTHZ-B-05: the enum carried BOTH `counselor` and `counsellor`. Two spellings
  // meant two classes of account — one that passed authorize() and one that was
  // silently denied everything — depending only on which spelling the signup form
  // submitted. The legacy spelling is still accepted on write (existing rows must
  // keep validating) but is canonicalised to `counsellor` by a pre-save hook, and
  // `canonicalRole()` in config/permissions.js covers rows written before the fix.
  role: {
    type: String,
    enum: [
      'superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'patient',
      'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist',
      'pharmacy_owner', 'pharmacist', 'nurse', 'radiologist', 'dietitian',
      'physiotherapist',
      'counsellor',       // canonical spelling
      'counselor',        // DEPRECATED legacy alias — auto-migrated to `counsellor`
      'mid_level_counselor', 'senior_counselor', // DEPRECATED legacy aliases
      'psychiatrist', 'accountant', 'security', 'technician', 'helper',
      'delivery_boy', 'rider', 'assistant', 'lawyer', 'ambulance',
    ],
    default: 'patient',
    index: true,
  },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy', ''], default: '' },
  avatar: { type: String, default: '' },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  uhid: { type: String, unique: true, sparse: true },
  gender: { type: String, enum: ['', 'Male', 'Female', 'Other'], default: '' },
  bloodGroup: { type: String, default: '' },
  // Donor-directory opt-in.
  //
  // `bloodGroup` on its own is a DEMOGRAPHIC field every patient record carries,
  // not a statement that the person consents to being tracked and shown to
  // strangers. `GET /api/bloodbank/donors/nearby-h3` was matching on
  // `bloodGroup` + `currentLocation` alone, so it published the name, blood
  // group and live GPS coordinates of any user who happened to have both
  // populated - with no way for that user to opt out, because no flag existed.
  //
  // Default FALSE: existing rows are not donors until they say so. Opting in is
  // explicit and revocable via PUT /api/bloodbank/donor-opt-in.
  isBloodDonor: { type: Boolean, default: false, index: true },
  donorOptInAt: { type: Date, default: null },
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
  // DLM-06: set by the DPDP erasure job. `status` deliberately stays 'blocked'
  // (see deletionService.js) so the sixteen `status === 'blocked'` guards keep
  // holding; this field exists purely to answer "was this account ERASED, or
  // just disabled?" which is a question an auditor will ask.
  erasedAt: { type: Date, default: null, index: true },
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
  twoFactorSecret: { type: String, default: '', select: false },
  twoFactorBackupCodes: [{ type: String, select: false }], // Hashed backup codes
  twoFactorTempSecret: { type: String, default: '', select: false }, // Temp secret during setup

  // Google Drive OAuth tokens (for secure personal file storage)
  driveTokens: { type: Object, default: null, select: false },

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
    aadharFront: { type: String, default: '', select: false },
    aadharBack: { type: String, default: '', select: false },
    panCard: { type: String, default: '', select: false },
    photo: { type: String, default: '' },
    drivingLicense: { type: String, default: '', select: false },
    rc: { type: String, default: '', select: false },
    addressProof: { type: String, default: '', select: false },
  },
  bankDetails: {
    accountNumber: { type: String, default: '', select: false },
    ifsc: { type: String, default: '', select: false },
    accountHolderName: { type: String, default: '' },
    upiId: { type: String, default: '', select: false },
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
    code: { type: String, unique: true, sparse: true },
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
    qrToken: { type: String, unique: true, sparse: true },
    // HI-B-04: a token without an expiry resolved forever. The scan path now
    // requires one (falling back to the rotation stamp, then revoking), and every
    // mint path uses the single QR_TOKEN_TTL_MS lifetime in routes/healthId.js.
    qrTokenExpiry: { type: Date, default: null },
    qrTokenRotatedAt: { type: Date, default: null },
    qrTokenRevokedAt: { type: Date, default: null },
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
    // HI-B-05: the pending ABHA linking challenge. The OTP is stored hashed and
    // bound to the ABDM txnId, so `verify-otp` can actually verify something
    // instead of accepting any 6 characters.
    abhaPendingTxnId: { type: String, default: '' },
    abhaOtpHash: { type: String, default: '' },
    abhaOtpExpiresAt: { type: Date },
    abhaOtpAttempts: { type: Number, default: 0 },
  },

  // timestamps:true already maintains createdAt/updatedAt — no explicit field.
}, { timestamps: true });

// P2-9: cost 12 is the floor (cost 10 is ~4x cheaper for an offline cracker).
// The env override exists for controlled migration runs only and is clamped so
// it can never weaken a production login below the old cost 10.
const BCRYPT_ROUNDS = (() => {
  const n = Number(process.env.BCRYPT_ROUNDS);
  return Number.isInteger(n) && n >= 10 && n <= 15 ? n : 12;
})();

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hashNewPassword(this.password);
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.uhid) {
    this.uhid = generate16DigitId();
  }
  next();
});

// AUTH-015: single source of truth is top-level twoFactorEnabled; the legacy
// settings copy is force-synced so the two flags can never diverge again.
userSchema.pre('save', function (next) {
  if (this.isModified('twoFactorEnabled') && this.settings && typeof this.settings === 'object') {
    this.settings = { ...this.settings, twoFactorEnabled: this.twoFactorEnabled };
    this.markModified('settings');
  }
  next();
});

userSchema.methods.comparePassword = async function (plain) {
  const { ok, legacy } = await passwordMatchesHash(plain, this.password);
  if (ok) {
    // P2-9/P2-11: opportunistic upgrade — a bcrypt row (any cost), a hash
    // minted at an older bcrypt cost, or a pre-pepper row is silently
    // re-hashed to argon2id on the next successful login. The pre-save hook
    // does the hashing; a failure here must never fail the login itself.
    try {
      const stored = String(this.password);
      const cost = stored.startsWith('$2')
        ? Number.parseInt(stored.slice(4, 6), 10)
        : null;
      const needsRehash = legacy
        || (passwordHasher() === 'argon2' && !stored.startsWith('$argon2'))
        || (Number.isInteger(cost) && cost < BCRYPT_ROUNDS);
      if (needsRehash) {
        this.password = plain;
        await this.save();
      }
    } catch { /* keep the successful login */ }
  }
  return ok;
};

// AUTHZ-B-05: collapse the deprecated `counselor` spellings on write so the
// collection converges on ONE canonical value. Legacy rows are migrated by
// scripts/migrate-role-aliases.mjs, and `canonicalRole()` in config/permissions.js
// keeps authorization correct for anything written before this hook existed.
userSchema.pre('save', function canonicaliseRoleAlias(next) {
  if (this.role) {
    const canonical = canonicalRole(this.role);
    if (canonical !== this.role) this.role = canonical;
  }
  next();
});

// Same hook for `findOneAndUpdate` / `updateOne`, which never trigger `save`.
userSchema.pre(['updateOne', 'findOneAndUpdate'], function canonicaliseRoleAliasOnUpdate(next) {
  const update = this.getUpdate() || {};
  if (update.$set && update.$set.role) {
    update.$set.role = canonicalRole(update.$set.role);
    this.setUpdate(update);
  }
  next();
});

export default mongoose.model('User', userSchema);

// §5.3/§5.4: never let secrets/internal flags leave in a response — `select: false`
// is bypassed by .lean()/.select('+password'), so strip at the DTO boundary too.
const USER_FORBIDDEN_FIELDS = new Set([
  'password', 'passwordHistory', 'tokenVersion', 'twoFactorSecret', 'twoFactorTempSecret',
  'twoFactorBackupCodes', 'driveTokens', 'abhaOtpHash', '__v',
]);

export function sanitizeUserDto(input) {
  if (!input || typeof input !== 'object') return input;
  const obj = typeof input.toObject === 'function' ? input.toObject() : { ...input };
  for (const field of USER_FORBIDDEN_FIELDS) delete obj[field];
  return obj;
}

export { USER_FORBIDDEN_FIELDS };

