import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Record from '../models/Record.js';
import { auditLog } from './audit.js';
import { tenantQuotaGuard } from '../services/tenantQuotaService.js';

export { authorize } from './authorize.js';

export const protect = async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    token = auth.split(' ')[1];
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
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

  if (!user.isVerified) {
    return res.status(403).json({
      message: 'Please verify your email before continuing.',
      requiresVerification: true,
      email: user.email,
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
  let token = req.cookies?.token;
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    // AUTH-B-10: optional auth must apply the SAME account-state rules as
    // `protect`, otherwise a blocked / revoked / unverified account keeps acting
    // on every optional-auth route.
    req.user = null;
    if (!user) return next();
    if ((decoded.tv ?? 0) !== (user.tokenVersion || 0)) return next();
    if (user.status === 'blocked') return next();
    if (!user.isVerified) return next();
    req.user = user;
  } catch {
    req.user = null;
  }
  next();
};
