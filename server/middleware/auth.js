import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';

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

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
