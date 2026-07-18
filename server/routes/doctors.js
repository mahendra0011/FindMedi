import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import Doctor from '../models/Doctor.js';
import ClinicProfile from '../models/ClinicProfile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, hospitalAdminOnly, superadminOnly, scopeToHospital } from '../middleware/auth.js';
import { sendDoctorApprovalEmail, sendDoctorRejectionEmail, sendEmail } from '../services/notificationService.js';
import { uploadFileToCloudinary } from '../services/cloudinaryService.js';
import { validate, createDoctorSchema, updateDoctorSchema } from '../utils/validate.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') return cb(null, true);
    cb(new Error('Only PNG and JPG images are allowed'));
  },
});

const isAdminListRequest = async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;

  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    const { search, available, specialization, location, includeAll, hospitalId, doctor_type } = req.query;
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
    if (doctor_type) filter.doctor_type = doctor_type;
    if (hospitalId) {
      try {
        filter.hospitalId = hospitalId;
        const doctors = await Doctor.find(filter).populate('hospitalId', 'name address city').sort({ createdAt: -1 });
        return res.json(doctors);
      } catch (castErr) {
        return res.json([]);
      }
    }
    let doctors = await Doctor.find(filter).populate('hospitalId', 'name address city').sort({ createdAt: -1 }).lean();
    const clinicDoctorIds = doctors.filter(d => d.doctor_type === 'clinic').map(d => d._id);
    if (clinicDoctorIds.length) {
      const profiles = await ClinicProfile.find({ doctorId: { $in: clinicDoctorIds } }).lean();
      const profileMap = Object.fromEntries(profiles.map(p => [p.doctorId.toString(), p]));
      doctors = doctors.map(d => {
        if (d.doctor_type === 'clinic') d.clinicProfile = profileMap[d._id.toString()] || null;
        return d;
      });
    }
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
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (req.user.role !== 'superadmin' && req.user.hospitalId && doctor.hospitalId && doctor.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (doctor.doctor_type === 'clinic') {
      doctor.clinicProfile = await ClinicProfile.findOne({ doctorId: doctor._id }).lean();
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

    const { name, email, phone, specialization, experience, qualification, consultation_fees, fees, hospitalId: bodyHospitalId } = req.body;
    
    if (!email) return res.status(400).json({ message: 'Doctor email is required' });
    if (!name) return res.status(400).json({ message: 'Doctor name is required' });
    const targetHospitalId = bodyHospitalId || hospitalId || undefined;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Create User with temporary status
    const tempPassword = Math.random().toString(36).slice(-10);
    const setupToken = jwt.sign({ email: email.toLowerCase(), type: 'doctor_setup' }, process.env.JWT_SECRET, { expiresIn: '48h' });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      role: 'doctor',
      phone: phone || '',
      hospitalId: targetHospitalId,
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
      hospitalId: targetHospitalId,
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

router.put('/:id/clinic-profile', protect, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    const { clinicProfile } = req.body;
    if (!clinicProfile) return res.status(400).json({ message: 'clinicProfile data required' });
    const profile = await ClinicProfile.findOneAndUpdate(
      { doctorId: req.params.id },
      { ...clinicProfile, doctorId: req.params.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
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

router.post('/:id/signature', protect, upload.single('signature'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.user_id !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const cloudResult = await uploadFileToCloudinary(req.file.buffer, req.file.originalname, req.file.mimetype);
    const updated = await Doctor.findByIdAndUpdate(req.params.id, { signatureUrl: cloudResult.url }, { new: true });
    res.json({ signatureUrl: updated.signatureUrl });
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
