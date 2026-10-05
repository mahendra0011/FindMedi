// AUTH-F-01: EVERY token verification goes through jwtKeys. A bare verify
// against a static JWT_SECRET cannot rotate keys (it rejects anything signed
// under JWT_KEYS) and accepts a refresh token as an access token.
// verifyAccessToken closes both.
import { verifyAccessToken } from '../utils/jwtKeys.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Record from '../models/Record.js';
import { auditLog } from './audit.js';
import { readAuthCookie } from '../lib/cookiePolicy.js';
import { tenantQuotaGuard } from '../services/tenantQuotaService.js';

export { authorize } from './authorize.js';

// AUTH-F-06: the ONLY routes a mustResetPassword session may reach. Exact
// paths (minus query/trailing slash), never prefixes - `/api/auth/
// change-password-evil` must not ride the allowlist. Everything else needs a
// real password first, which is the whole point of the flag.
const PASSWORD_RESET_EXEMPT_PATHS = [
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/logout-all',
  '/api/auth/me',
];
const isPasswordResetExempt = (req) => {
  const p = (req.originalUrl || '').split('?')[0].replace(/\/+$/, '');
  return PASSWORD_RESET_EXEMPT_PATHS.includes(p);
};

// P2-11: roles that MUST run with 2FA. Comma-separated env, e.g.
// TWO_FACTOR_REQUIRED_ROLES=superadmin,hospital_admin. Until such an account
// enrols, protect() lets it reach ONLY the enrolment paths (plus the same
// logout/me/change-password basics as AUTH-F-06) so the client can always
// complete enrolment and never deadlocks itself. Exact paths, never prefixes.
const TWO_FACTOR_REQUIRED_ROLES = new Set(
  String(process.env.TWO_FACTOR_REQUIRED_ROLES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);
const TWO_FACTOR_ENROL_EXEMPT_PATHS = new Set([
  '/api/auth/2fa/setup',
  '/api/auth/2fa/verify',
  '/api/auth/2fa/status',
  '/api/auth/logout',
  '/api/auth/logout-all',
  '/api/auth/me',
  '/api/auth/change-password',
]);
const isTwoFactorEnrolExempt = (req) => {
  const p = (req.originalUrl || '').split('?')[0].replace(/\/+$/, '');
  return TWO_FACTOR_ENROL_EXEMPT_PATHS.has(p);
};

export const protect = async (req, res, next) => {
  let token = readAuthCookie(req.cookies, 'token');
  if (!token) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    token = auth.split(' ')[1];
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    // Siraf asli token failure (invalid/expired) ko auth failure banao
    return res.status(401).json({ message: 'Token invalid or expired' });
  }

  let user;
  let doctor = null;
  try {
    user = await User.findById(decoded.id).select('-password');
    // Counsellor/psychiatrist ko bhi doctor-jaisa Doctor-profile link (appointments,
    // /me/*, ownership checks sab doctorProfileId se chalte hain).
    // AUTH-B-12: resolve the profile by the EXPLICIT user_id link first and only
    // fall back to the email match for legacy rows that have no link at all.
    // A bare `$or: [user_id, email]` let a colliding email bind one account to
    // another account's doctor profile.
    if (user?.role === 'doctor' || user?.role === 'clinic_doctor' || user?.role === 'counsellor' || user?.role === 'psychiatrist') {
      doctor = await Doctor.findOne({ user_id: user._id.toString() });
      if (!doctor && user.email) {
        doctor = await Doctor.findOne({ email: user.email });
      }
    }
  } catch {
    // DB hiccup (reconnect/restart) auth failure nahi hai — 503 bhejo taaki
    // client network-error jaisa retry kare, logout na ho.
    return res.status(503).json({ message: 'Service temporarily unavailable. Please try again.' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }

  // AUTH-012 / AUTH-B-11: token version — password change/reset/logout-all revoke
  // every previously issued token. A token minted WITHOUT the claim (pre-AUTH-012
  // legacy token) is treated as version 0, so the `?? 0` here also closes the
  // "revocation silently skipped for old tokens" hole.
  const tokenVersion = user.tokenVersion || 0;
  if ((decoded.tv ?? 0) !== tokenVersion) {
    return res.status(401).json({ message: 'Session revoked. Please login again.' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
  }

  // AUTH-F-06: temp-password accounts are locked to the four-path allowlist
  // until they rotate. Enforced HERE, not (only) at login: the login-time
  // check never ran for google/2FA-issued tokens or sessions minted before an
  // admin set the flag, and because it ran before token issuance the user
  // could never reach PUT /auth/change-password - the one route that clears
  // the flag. Session-level enforcement closes both holes.
  if (user.mustResetPassword && !isPasswordResetExempt(req)) {
    return res.status(403).json({
      message: 'You must set a new password before continuing.',
      code: 'PASSWORD_RESET_REQUIRED',
      mustResetPassword: true,
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      message: 'Please verify your email before continuing.',
      requiresVerification: true,
      email: user.email,
    });
  }

  // P2-11: mandatory-2FA roles stay locked to the enrolment paths until they
  // actually enrol. Gates HERE (session-level), not only at login, so tokens
  // issued before the env was flipped also become subject to the rule.
  if (
    TWO_FACTOR_REQUIRED_ROLES.has(String(user.role || '').toLowerCase())
    && !user.twoFactorEnabled
    && !isTwoFactorEnrolExempt(req)
  ) {
    return res.status(403).json({
      message: 'Two-factor authentication is required for your role. Please set it up first.',
      code: 'TWO_FACTOR_REQUIRED',
      requiresTwoFactorEnrollment: true,
    });
  }

  if (user.role === 'doctor' || user.role === 'clinic_doctor' || user.role === 'counsellor' || user.role === 'psychiatrist') {
    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({
        message: 'Your doctor account was not approved. Contact administrator.',
        approvalRejected: true,
      });
    }

    if (!doctor?.approved && user.approvalStatus !== 'approved') {
      return res.status(403).json({
        message: 'Your account is pending admin approval.',
        approvalPending: true,
      });
    }
  }

  req.user = {
    id: user._id.toString(),
    _id: user._id,
    role: user.role,
    name: user.name,
    email: user.email,
    hospitalId: user.hospitalId || null,
    facilityId: user.facilityId || null,
    facilityType: user.facilityType || '',
    doctorProfileId: (user.role === 'doctor' || user.role === 'clinic_doctor' || user.role === 'counsellor' || user.role === 'psychiatrist') ? (doctor?._id || null) : null,
    // AUTH-F-06: the reset-lock flag rides along so handlers can react without
    // re-reading the full document (req.authUser already has it too).
    mustResetPassword: Boolean(user.mustResetPassword),
  };
  req.authUser = user;
  // ADM-M-06: last gate before the handler. Every authenticated request from a
  // hospital account counts against that hospital's aggregate sliding window -
  // the one dimension the per-user/IP limiters (rateLimit.js) cannot see.
  // Fail-open by design; see services/tenantQuotaService.js for why.
  return tenantQuotaGuard(req, res, next);
};

export const auditAction = async (req, action) => {
  await auditLog(action, req.user?.id, { ip: req.ip, userAgent: req.get('user-agent') });
};

// Tenant-admin gate. Kept separate from `superadminOnly` (ADM-B-03): tenant
// admins may act inside their own hospital, never on platform-wide config.
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'hospital_admin' && req.user?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: `${roles.join(' or ')} role required` });
  }
  next();
};

export const roleOnly = requireRole;
export const restrictTo = (...roles) => requireRole(roles.flat());

export const superadminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access required' });
  }
  next();
};

export const hospitalAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'hospital_admin' || !req.user?.hospitalId) {
    return res.status(403).json({ message: 'Hospital admin access required' });
  }
  next();
};

export const clinicalStaffOnly = (req, res, next) => {
  if (!['superadmin', 'hospital_admin', 'doctor', 'nurse'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Clinical staff access required' });
  }
  next();
};

export const scopeToHospital = (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  if (!req.user?.hospitalId) {
    return res.status(403).json({ message: 'No hospital linked to this account' });
  }
  req.hospitalId = req.user.hospitalId.toString();
  next();
};

export const scopeToFacility = (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  if (!req.user?.facilityId && !req.user?.hospitalId) {
    return res.status(403).json({ message: 'No facility linked to this account' });
  }
  req.facilityId = (req.user.facilityId || req.user.hospitalId).toString();
  req.facilityType = req.user.facilityType || 'hospital';
  next();
};

export const sameFacility = (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  const targetId = req.body?.facilityId || req.query?.facilityId || req.params?.facilityId;
  const userFacilityId = (req.user.facilityId || req.user.hospitalId)?.toString();
  if (!userFacilityId) {
    return res.status(403).json({ message: 'No facility linked' });
  }
  if (targetId && targetId !== userFacilityId) {
    return res.status(403).json({ message: 'Cross-facility access denied' });
  }
  next();
};

export const canAccessRecord = async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const user = req.user;
    if (user.role === 'superadmin') {
      return next();
    }

    if (user.role === 'hospital_admin') {
      // AUTH-B-09: fail CLOSED. A hospital admin with no linked hospital (or a
      // record with no hospitalId) must NOT be able to read it — the old
      // `if (user.hospitalId && record.hospitalId && ...)` collapsed to "allow".
      if (!user.hospitalId || !record.hospitalId) {
        return res.status(403).json({ message: 'Forbidden: no hospital scope for this record' });
      }
      if (record.hospitalId.toString() !== user.hospitalId.toString()) {
        return res.status(403).json({ message: 'Forbidden: this record belongs to a different hospital' });
      }
      return next();
    }

    if (user.role === 'doctor' || user.role === 'clinic_doctor' || user.role === 'counsellor' || user.role === 'psychiatrist') {
      const ownProfile = (user.doctorProfileId || user.id)?.toString();
      if (!record.doctorId || record.doctorId.toString() !== ownProfile) {
        return res.status(403).json({ message: 'Forbidden: you can only access your assigned records' });
      }
      return next();
    }

    if (user.role === 'patient') {
      if (!record.patientId || record.patientId.toString() !== user.id.toString()) {
        return res.status(403).json({ message: 'Forbidden: you can only access your own records' });
      }
      return next();
    }

    // AUTH-B-09: default-deny. Every other role (nurse, pharmacist, lab staff,
    // rider, assistant, ...) used to fall through to next() with NO check at all.
    return res.status(403).json({ message: 'Forbidden: role not permitted to access medical records' });
  } catch (error) {
    res.status(500).json({ message: 'Authorization check failed' });
  }
};

export const canAccessPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const user = req.user;
    if (user.role === 'superadmin') {
      return next();
    }

    if (user.role === 'hospital_admin') {
      // AUTH-B-09: fail closed (see canAccessRecord).
      if (!user.hospitalId || !patient.hospitalId) {
        return res.status(403).json({ message: 'Forbidden: no hospital scope for this patient' });
      }
      if (patient.hospitalId.toString() !== user.hospitalId.toString()) {
        return res.status(403).json({ message: 'Forbidden: this patient belongs to a different hospital' });
      }
      return next();
    }

    if (user.role === 'doctor' || user.role === 'clinic_doctor' || user.role === 'counsellor' || user.role === 'psychiatrist') {
      const ownProfile = (user.doctorProfileId || user.id)?.toString();
      if (!patient.assignedDoctor || patient.assignedDoctor.toString() !== ownProfile) {
        return res.status(403).json({ message: 'Forbidden: you can only access your assigned patients' });
      }
      return next();
    }

    if (user.role === 'patient') {
      // The Patient document carries the owning User id in `userId` (its own
      // `_id` is a separate Patient-collection id).
      if (!patient.userId || patient.userId.toString() !== user.id.toString()) {
        return res.status(403).json({ message: 'Forbidden: you can only access your own profile' });
      }
      return next();
    }

    // AUTH-B-09: default-deny for every unlisted role.
    return res.status(403).json({ message: 'Forbidden: role not permitted to access patient profiles' });
  } catch (error) {
    res.status(500).json({ message: 'Authorization check failed' });
  }
};

export const optionalProtect = async (req, res, next) => {
  let token = readAuthCookie(req.cookies, 'token');
  if (!token) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    }
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');
    // AUTH-B-10: optional auth must apply the SAME account-state rules as
    // `protect`, otherwise a blocked / revoked / unverified account keeps acting
    // on every optional-auth route.
    req.user = null;
    if (!user) return next();
    if ((decoded.tv ?? 0) !== (user.tokenVersion || 0)) return next();
    if (user.status === 'blocked') return next();
    // AUTH-F-06: same rule as `protect` - a mustResetPassword account is
    // anonymous on optional-auth routes rather than quietly privileged.
    if (user.mustResetPassword) return next();
    if (!user.isVerified) return next();
    req.user = user;
  } catch {
    req.user = null;
  }
  next();
};
