import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Record from '../models/Record.js';
import { auditLog } from './audit.js';

export const protect = async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    token = auth.split(' ')[1];
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
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

    let doctor = null;
    if (user.role === 'doctor' || user.role === 'clinic_doctor') {
      doctor = await Doctor.findOne({
        $or: [
          { user_id: user._id.toString() },
          { email: user.email },
        ],
      });

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
      doctorProfileId: (user.role === 'doctor' || user.role === 'clinic_doctor') ? (doctor?._id || null) : null,
    };
    req.authUser = user;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

export const auditAction = async (req, action) => {
  await auditLog(action, req.user?.id, { ip: req.ip, userAgent: req.get('user-agent') });
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
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

export const superadminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access required' });
  }
  next();
};

export const hospitalAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin' || !req.user?.hospitalId) {
    return res.status(403).json({ message: 'Hospital admin access required' });
  }
  next();
};

export const clinicalStaffOnly = (req, res, next) => {
  if (!['superadmin', 'admin', 'doctor', 'nurse'].includes(req.user?.role)) {
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

    if (user.role === 'admin') {
      if (user.hospitalId && record.hospitalId && record.hospitalId.toString() !== user.hospitalId.toString()) {
        return res.status(403).json({ message: 'Forbidden: this record belongs to a different hospital' });
      }
      return next();
    }

    if (user.role === 'doctor' && record.doctorId?.toString() !== (user.doctorProfileId?.toString() || user.id)) {
      return res.status(403).json({ message: 'Forbidden: you can only access your assigned records' });
    }

    if (user.role === 'patient' && record.patientId?.toString() !== user.id) {
      return res.status(403).json({ message: 'Forbidden: you can only access your own records' });
    }

    next();
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

    if (user.role === 'admin') {
      if (user.hospitalId && patient.hospitalId && patient.hospitalId.toString() !== user.hospitalId.toString()) {
        return res.status(403).json({ message: 'Forbidden: this patient belongs to a different hospital' });
      }
      return next();
    }

    if (user.role === 'doctor' && patient.assignedDoctor !== (user.doctorProfileId?.toString() || user.id)) {
      return res.status(403).json({ message: 'Forbidden: you can only access your assigned patients' });
    }

    if (user.role === 'patient' && patient.userId?.toString() !== user.id) {
      return res.status(403).json({ message: 'Forbidden: you can only access your own profile' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Authorization check failed' });
  }
};

