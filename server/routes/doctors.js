import express from 'express';
import jwt from 'jsonwebtoken';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, hospitalAdminOnly, superadminOnly, scopeToHospital } from '../middleware/auth.js';
import { sendDoctorApprovalEmail, sendDoctorRejectionEmail, sendEmail } from '../services/notificationService.js';

const router = express.Router();

const isAdminListRequest = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;

  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('role status isVerified');
    return Boolean(user && user.role === 'admin' && user.status !== 'blocked' && user.isVerified);
  } catch {
    return false;
  }
};

const findDoctorUser = (doctor, update) => {
  const or = [{ email: doctor.email }];
  if (doctor.user_id) or.unshift({ _id: doctor.user_id });
  return User.findOneAndUpdate({ $or: or }, update, { new: true });
};

router.get('/', async (req, res) => {
  try {
    const { search, available, specialization, location, includeAll, hospitalId } = req.query;
    const filter = {};
    const canViewAll = includeAll === 'true' && await isAdminListRequest(req);
    if (!canViewAll) filter.approved = true;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { specialization: new RegExp(search, 'i') },
    ];
    if (specialization && specialization !== 'All') filter.specialization = new RegExp(specialization, 'i');
    if (location && location !== 'All') filter.location = new RegExp(location, 'i');
    if (available !== undefined) filter.available = available === 'true';
    if (hospitalId) filter.hospitalId = hospitalId;
    const doctors = await Doctor.find(filter).sort({ createdAt: -1 });
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/user/:userId', protect, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user_id: req.params.userId });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
    if (req.user.role !== 'superadmin' && req.user.hospitalId && doctor.hospitalId && doctor.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(doctor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (req.user.role !== 'superadmin' && req.user.hospitalId && doctor.hospitalId && doctor.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(doctor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const hospitalId = req.user.hospitalId;
    if (!hospitalId && req.user.role !== 'superadmin') {
      return res.status(400).json({ message: 'No hospital linked to this account' });
    }

    const { name, email, phone, specialization, experience, qualification, consultation_fees, fees } = req.body;
    
    if (!email) return res.status(400).json({ message: 'Doctor email is required' });
    if (!name) return res.status(400).json({ message: 'Doctor name is required' });

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Create User with temporary status
    const tempPassword = Math.random().toString(36).slice(-10);
    const setupToken = jwt.sign({ email: email.toLowerCase(), type: 'doctor_setup' }, process.env.JWT_SECRET || 'secret', { expiresIn: '48h' });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      role: 'doctor',
      phone: phone || '',
      hospitalId: hospitalId || undefined,
      isVerified: false,
      status: 'active',
      approvalStatus: 'approved',
    });

    // Create Doctor profile
    const doctor = await Doctor.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      specialization: specialization || 'General Medicine',
      experience: experience || '1 year',
      qualifications: qualification || '',
      fees: Number(consultation_fees || fees || 500),
      consultation_fees: Number(consultation_fees || fees || 500),
      approved: true,
      user_id: user._id.toString(),
      hospitalId: hospitalId || undefined,
      initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      available: true,
    });

    // Send invitation email with setup link
    const setupUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/doctor-setup?token=${setupToken}`;
    await sendEmail({
      to: email.toLowerCase(),
      subject: 'Welcome to MediCore — Set up your doctor account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="color: #0b8a72;">Welcome to MediCore, ${name}!</h2>
          <p>An admin has created a doctor account for you. Please set up your password to get started.</p>
          <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background: #0b8a72; color: white; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Set Up My Account
          </a>
          <p style="margin-top: 24px; color: #666;">This link expires in 48 hours. If you did not expect this invitation, please ignore this email.</p>
        </div>
      `,
      text: `Welcome to MediCore! An admin has created a doctor account for you. Set up your password here: ${setupUrl}`,
    });

    res.status(201).json({
      message: 'Doctor created. An invitation email has been sent.',
      doctor,
    });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.hospitalId?.toString() !== req.user.hospitalId?.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this doctor' });
    }
    const updated = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.hospitalId?.toString() !== req.user.hospitalId?.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not your hospital' });
    }
    doctor.approved = true;
    await doctor.save();

    const user = await findDoctorUser(doctor, { approvalStatus: 'approved' });

    if (user) {
      await Notification.create({
        title: 'Doctor Account Approved',
        message: 'Your doctor account has been approved. You can now access your dashboard.',
        type: 'system',
        userId: user._id.toString(),
      });
      await sendDoctorApprovalEmail(user);
    }

    res.json({ message: 'Doctor approved', doctor });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.hospitalId?.toString() !== req.user.hospitalId?.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not your hospital' });
    }
    doctor.approved = false;
    await doctor.save();

    const user = await findDoctorUser(doctor, { approvalStatus: 'rejected' });

    if (user) {
      await Notification.create({
        title: 'Doctor Account Review Update',
        message: 'Your doctor account was not approved. Contact the administrator for details.',
        type: 'system',
        userId: user._id.toString(),
      });
      await sendDoctorRejectionEmail(user);
    }

    res.json({ message: 'Doctor rejected', doctor });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/schedule', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.hospitalId?.toString() !== req.user.hospitalId?.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not your hospital' });
    }
    const update = {};
    if (req.body.time_slots) update.time_slots = req.body.time_slots;
    if (req.body.weekly_schedule) update.weekly_schedule = req.body.weekly_schedule;
    if (req.body.leaves) update.leaves = req.body.leaves;
    const updated = await Doctor.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.hospitalId?.toString() !== req.user.hospitalId?.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not your hospital' });
    }
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Doctor removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
// 22
