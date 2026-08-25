import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import Doctor from '../models/Doctor.js';
import ClinicProfile from '../models/ClinicProfile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, hospitalAdminOnly, superadminOnly, scopeToHospital } from '../middleware/auth.js';
import { sendDoctorApprovalEmail, sendDoctorRejectionEmail, sendEmail } from '../services/notificationService.js';
import { auditLog } from '../middleware/audit.js';
import { uploadFileToCloudinary } from '../services/cloudinaryService.js';
import { z } from 'zod';
import { validate, createDoctorSchema, updateDoctorSchema } from '../utils/validate.js';
import { paginatedResults } from '../utils/pagination.js';
import {
  getCache,
  setCache,
  flushCachePattern,
  getOnlinePresence,
  getOnlineDoctorsList,
} from '../config/redis.js';

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
    return Boolean(user && user.role === 'hospital_admin' && user.status !== 'blocked' && user.isVerified);
  } catch {
    return false;
  }
};

const findDoctorUser = (doctor, update) => {
  const or = [{ email: doctor.email }];
  if (doctor.user_id) or.unshift({ _id: doctor.user_id });
  return User.findOneAndUpdate({ $or: or }, update, { new: true });
};

const populatePractice = (query) => query
  .populate('hospitalId', 'name address city phone email rating reviewsCount establishedYear totalDoctors accreditations hospitalType emergency24x7 bedAvailability ambulanceService insuranceAccepted workingHours logo')
  .populate('facilityId', 'name address city phone email type status rating reviewsCount specialties establishedYear');

// GET /api/doctors/presence — get live online status of doctors
router.get('/presence', async (req, res) => {
  try {
    const { ids } = req.query;
    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      const presence = await getOnlinePresence(idList);
      return res.json(presence);
    }
    const onlineDocs = await getOnlineDoctorsList();
    res.json({ onlineDoctors: onlineDocs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, search, available, specialization, location, includeAll, hospitalId, facilityId, doctor_type } = req.query;

    const cacheKey = `doctors_list_${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    const filter = {};
    const canViewAll = includeAll === 'true' && await isAdminListRequest(req);
    if (!canViewAll) filter.approved = true;

    // Non-superadmin admin/clinic_doctor ko apni hi facility ke doctors milein — query param se bypass na ho
    let effectiveHospitalId = hospitalId;
    let effectiveFacilityId = facilityId;
    if (req.user && req.user.role !== 'superadmin' && (req.user.role === 'hospital_admin' || req.user.role === 'clinic_doctor')) {
      effectiveHospitalId = req.user.hospitalId ? req.user.hospitalId.toString() : undefined;
      effectiveFacilityId = req.user.facilityId ? req.user.facilityId.toString() : undefined;
    }
    if (effectiveFacilityId) filter.facilityId = effectiveFacilityId;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { specialization: new RegExp(search, 'i') },
    ];
    if (specialization && specialization !== 'All') filter.specialization = new RegExp(specialization, 'i');
    if (location && location !== 'All') filter.location = new RegExp(location, 'i');
    if (available !== undefined) filter.available = available === 'true';
    if (doctor_type) filter.doctor_type = doctor_type;

    const paginateOpts = {
      page, limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'hospitalId', select: 'name address city phone email rating reviewsCount establishedYear totalDoctors accreditations hospitalType emergency24x7 bedAvailability ambulanceService insuranceAccepted workingHours logo' },
        { path: 'facilityId', select: 'name address city phone email type status rating reviewsCount specialties establishedYear' },
      ],
    };

    let result;
    if (effectiveHospitalId) {
      try {
        filter.hospitalId = effectiveHospitalId;
        result = await paginatedResults(Doctor, filter, paginateOpts);
      } catch (castErr) {
        const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
        return res.json({ data: [], total: 0, page: 1, limit: l, totalPages: 0 });
      }
    } else {
      result = await paginatedResults(Doctor, filter, paginateOpts);
    }

    // Enrich with clinic profiles
    const clinicDoctorIds = result.data.filter(d => d.doctor_type === 'clinic').map(d => d._id);
    if (clinicDoctorIds.length) {
      const profiles = await ClinicProfile.find({ doctorId: { $in: clinicDoctorIds } }).lean();
      const profileMap = Object.fromEntries(profiles.map(p => [p.doctorId.toString(), p]));
      result.data = result.data.map(d => {
        if (d.doctor_type === 'clinic') d.clinicProfile = profileMap[d._id.toString()] || null;
        return d;
      });
    }

    await setCache(cacheKey, result, 300);
    res.json(result);
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

router.get('/my-facility/auto-confirm', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'clinic_doctor', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const filter = {};
    if (req.user.role !== 'superadmin') {
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
      else if (req.user.facilityId) filter.facilityId = req.user.facilityId;
      else return res.status(403).json({ message: 'No facility linked to this account' });
    }
    const doctors = await Doctor.find(filter)
      .select('name specialization doctor_type autoConfirmAppointment maxBookingsPerSlot')
      .sort({ name: 1 })
      .lean();
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/auto-confirm', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'clinic_doctor', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (req.user.role !== 'superadmin') {
      const sameHospital = req.user.hospitalId && doctor.hospitalId?.toString() === req.user.hospitalId.toString();
      const sameFacility = req.user.facilityId && doctor.facilityId?.toString() === req.user.facilityId.toString();
      if (!sameHospital && !sameFacility) return res.status(403).json({ message: 'Not authorized for this doctor' });
    }
    const { autoConfirmAppointment } = req.body;
    doctor.autoConfirmAppointment = typeof autoConfirmAppointment === 'boolean' ? autoConfirmAppointment : null;
    await doctor.save();
    await auditLog('update_doctor_auto_confirm', req.user._id, { targetDoctorId: doctor._id, autoConfirmAppointment: doctor.autoConfirmAppointment, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ _id: doctor._id, autoConfirmAppointment: doctor.autoConfirmAppointment });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/me/auto-confirm', protect, async (req, res) => {
  try {
    if (!['doctor', 'clinic_doctor'].includes(req.user.role)) return res.status(403).json({ message: 'Doctor access required' });
    if (!req.user.doctorProfileId) return res.status(404).json({ message: 'Doctor profile not found' });
    const doctor = await Doctor.findById(req.user.doctorProfileId).select('autoConfirmAppointment').lean();
    res.json({ autoConfirmAppointment: doctor?.autoConfirmAppointment ?? null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/me/auto-confirm', protect, async (req, res) => {
  try {
    if (!['doctor', 'clinic_doctor'].includes(req.user.role)) return res.status(403).json({ message: 'Doctor access required' });
    if (!req.user.doctorProfileId) return res.status(404).json({ message: 'Doctor profile not found' });
    const { autoConfirmAppointment } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      req.user.doctorProfileId,
      { autoConfirmAppointment: typeof autoConfirmAppointment === 'boolean' ? autoConfirmAppointment : null },
      { new: true }
    ).select('autoConfirmAppointment');
    await auditLog('update_doctor_auto_confirm', req.user._id, { targetDoctorId: req.user.doctorProfileId, autoConfirmAppointment: doctor?.autoConfirmAppointment, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ autoConfirmAppointment: doctor?.autoConfirmAppointment ?? null });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/me/slot-capacity', protect, async (req, res) => {
  try {
    if (!['doctor', 'clinic_doctor'].includes(req.user.role)) return res.status(403).json({ message: 'Doctor access required' });
    if (!req.user.doctorProfileId) return res.status(404).json({ message: 'Doctor profile not found' });
    const doctor = await Doctor.findById(req.user.doctorProfileId).select('maxBookingsPerSlot slotDuration').lean();
    res.json({ maxBookingsPerSlot: doctor?.maxBookingsPerSlot || 1, slotDuration: doctor?.slotDuration || 15 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/me/slot-capacity', protect, async (req, res) => {
  try {
    if (!['doctor', 'clinic_doctor'].includes(req.user.role)) return res.status(403).json({ message: 'Doctor access required' });
    if (!req.user.doctorProfileId) return res.status(404).json({ message: 'Doctor profile not found' });
    const n = Number(req.body.maxBookingsPerSlot);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      return res.status(400).json({ message: 'Per-slot value 1 se 20 ke beech ek whole number hona chahiye' });
    }
    const doctor = await Doctor.findByIdAndUpdate(req.user.doctorProfileId, { maxBookingsPerSlot: n }, { new: true }).select('maxBookingsPerSlot');
    await auditLog('update_doctor_slot_capacity', req.user._id, { targetDoctorId: req.user.doctorProfileId, maxBookingsPerSlot: doctor.maxBookingsPerSlot, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ maxBookingsPerSlot: doctor.maxBookingsPerSlot });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/slot-capacity', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'clinic_doctor', 'superadmin'].includes(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (req.user.role !== 'superadmin') {
      const sameHospital = req.user.hospitalId && doctor.hospitalId?.toString() === req.user.hospitalId.toString();
      const sameFacility = req.user.facilityId && doctor.facilityId?.toString() === req.user.facilityId.toString();
      if (!sameHospital && !sameFacility) return res.status(403).json({ message: 'Not authorized for this doctor' });
    }
    const n = Number(req.body.maxBookingsPerSlot);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      return res.status(400).json({ message: 'Per-slot value 1 se 20 ke beech ek whole number hona chahiye' });
    }
    doctor.maxBookingsPerSlot = n;
    await doctor.save();
    await auditLog('update_doctor_slot_capacity', req.user._id, { targetDoctorId: doctor._id, maxBookingsPerSlot: doctor.maxBookingsPerSlot, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ _id: doctor._id, maxBookingsPerSlot: doctor.maxBookingsPerSlot });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doctor = await populatePractice(Doctor.findById(req.params.id)).lean();
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (req.user && req.user.role !== 'superadmin' && req.user.hospitalId && doctor.hospitalId && doctor.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (doctor.doctor_type === 'clinic') {
      doctor.clinicProfile = await ClinicProfile.findOne({ doctorId: doctor._id }).lean();
    }
    res.json(doctor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createDoctorSchema), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
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
      subject: 'Welcome to FindMedi — Set up your doctor account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="color: #0b8a72;">Welcome to FindMedi, ${name}!</h2>
          <p>An admin has created a doctor account for you. Please set up your password to get started.</p>
          <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background: #0b8a72; color: white; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Set Up My Account
          </a>
          <p style="margin-top: 24px; color: #666;">This link expires in 48 hours. If you did not expect this invitation, please ignore this email.</p>
        </div>
      `,
      text: `Welcome to FindMedi! An admin has created a doctor account for you. Set up your password here: ${setupUrl}`,
    });

    res.status(201).json({
      message: 'Doctor created. An invitation email has been sent.',
      doctor,
    });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, adminOnly, validate(updateDoctorSchema), async (req, res) => {
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

const clinicProfileSchema = z.object({ clinicProfile: z.object({}).passthrough() });

router.put('/:id/clinic-profile', protect, adminOnly, validate(clinicProfileSchema), async (req, res) => {
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
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
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

    await auditLog('approve_doctor', req.user._id, { targetDoctorId: doctor._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Doctor approved', doctor });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
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

    await auditLog('reject_doctor', req.user._id, { targetDoctorId: doctor._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Doctor rejected', doctor });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

const scheduleSchema = z.object({
  time_slots: z.any().optional(),
  weekly_schedule: z.any().optional(),
  leaves: z.any().optional(),
  slotDuration: z.number().optional(),
  bufferPerHour: z.number().optional(),
  workingHours: z.object({ start: z.string(), end: z.string() }).optional(),
  breakTime: z.object({ start: z.string(), end: z.string() }).optional(),
  dateDisabledSlots: z.any().optional(),
  bookingWindow: z.object({
    unit: z.enum(['hours', 'days', 'weeks', 'months']),
    value: z.number().min(0),
  }).optional(),
});

// "HH:MM" 24h -> minutes since midnight
const timeStrToMins = (t) => {
  if (!t || typeof t !== 'string') return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const generateTimeSlots = (startTime, endTime, slotDuration, breakTime = {}) => {
  const slots = [];
  const startMins = timeStrToMins(startTime);
  const endMins = timeStrToMins(endTime);
  const breakStart = breakTime?.start ? timeStrToMins(breakTime.start) : null;
  const breakEnd = breakTime?.end ? timeStrToMins(breakTime.end) : null;
  if (startMins == null || endMins == null) return slots;

  let mins = startMins;
  while (mins < endMins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const hour = h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const time = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    const slotEnd = mins + slotDuration;
    // Skip slots that fall inside break window
    const inBreak = breakStart != null && breakEnd != null &&
      !(slotEnd <= breakStart || mins >= breakEnd);
    if (!inBreak) slots.push(time);
    mins += slotDuration;
  }
  return slots;
};

router.put('/:id/schedule', protect, validate(scheduleSchema), async (req, res) => {
  try {
    if (!['superadmin', 'hospital_admin', 'clinic_doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (req.user.role !== 'superadmin') {
      const sameHospital = req.user.hospitalId && doctor.hospitalId?.toString() === req.user.hospitalId.toString();
      const sameFacility = req.user.facilityId && doctor.facilityId?.toString() === req.user.facilityId.toString();
      // clinic_doctor ko apni hi facility ke doctor chahiye; admin ko apni hi hospital ke
      if (!sameHospital && !sameFacility) {
        return res.status(403).json({ message: 'Not authorized for this doctor' });
      }
    }
    const update = {};
    if (req.body.time_slots) update.time_slots = req.body.time_slots;
    if (req.body.weekly_schedule) update.weekly_schedule = req.body.weekly_schedule;
    if (req.body.leaves) update.leaves = req.body.leaves;
    if (req.body.slotDuration !== undefined) update.slotDuration = req.body.slotDuration;
    if (req.body.bufferPerHour !== undefined) update.bufferPerHour = req.body.bufferPerHour;
    if (req.body.workingHours) update.workingHours = req.body.workingHours;
    if (req.body.breakTime !== undefined) update.breakTime = req.body.breakTime;
    if (req.body.dateDisabledSlots !== undefined) update.dateDisabledSlots = req.body.dateDisabledSlots;
    if (req.body.bookingWindow !== undefined) update.bookingWindow = req.body.bookingWindow;

    // Regenerate slots whenever workingHours, slotDuration, or breakTime changes.
    // Break window ke slots kabhi generate hi nahi hote — kahin bhi show nahi honge.
    if (req.body.workingHours || req.body.slotDuration !== undefined || req.body.breakTime !== undefined) {
      const wh = req.body.workingHours || doctor.workingHours;
      const sd = req.body.slotDuration !== undefined ? req.body.slotDuration : doctor.slotDuration;
      const bt = req.body.breakTime !== undefined ? req.body.breakTime : doctor.breakTime;
      update.time_slots = generateTimeSlots(wh.start, wh.end, sd, bt);
    }

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
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.hospitalId?.toString() !== req.user.hospitalId?.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not your hospital' });
    }
    await Doctor.findByIdAndDelete(req.params.id);
    await auditLog('delete_doctor', req.user._id, { targetDoctorId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Doctor removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
