import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Record from '../models/Record.js';
import { auditLog } from './audit.js';

export const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
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

    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({
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
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
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
    if (user.role === 'admin') {
      return next();
    }

    if (user.role === 'doctor' && record.assignedDoctor !== user.id) {
      return res.status(403).json({ message: 'Forbidden: you can only access your assigned records' });
    }

    if (user.role === 'patient' && record.patientId !== user.id) {
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
    if (user.role === 'admin') {
      return next();
    }

    if (user.role === 'doctor' && patient.assignedDoctor !== user.id) {
      return res.status(403).json({ message: 'Forbidden: you can only access your assigned patients' });
    }

    if (user.role === 'patient' && patient.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden: you can only access your own profile' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Authorization check failed' });
  }
};
