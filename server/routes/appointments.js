import express from 'express';
import Appointment from '../models/Appointment.js';
import Bed from '../models/Bed.js';
import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import { protect, scopeToHospital } from '../middleware/auth.js';
import { validate, createAppointmentSchema, updateAppointmentSchema } from '../utils/validate.js';
import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';

const router = express.Router();

const generateToken = async (department) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Date.now().toString(36).slice(-4).toUpperCase();
  return `TKT-${department.slice(0, 3).toUpperCase()}-${dateStr}-${seq}`;
};

const calculateEstimatedWaitTime = async (department, priority = 'Normal') => {
  const waitingCount = await Appointment.countDocuments({
    department,
    status: { $in: ['Confirmed', 'In Queue'] }
  });
  const avgConsultTime = priority === 'Emergency' ? 15 : priority === 'Urgent' ? 20 : 10;
  return waitingCount * avgConsultTime;
};

const createNotification = async (userId, title, message, type = 'appointment') => {
  if (!userId) return;
  try {
    let finalUserId = userId.toString();
    const doctor = await Doctor.findById(userId);
    if (doctor) {
      if (doctor.user_id) {
        finalUserId = doctor.user_id;
      } else {
        const user = await User.findOne({ email: doctor.email, role: 'doctor' });
        if (user) {
          finalUserId = user._id.toString();
          await Doctor.findByIdAndUpdate(doctor._id, { user_id: user._id });
        }
      }
    }
    await Notification.create({ title, message, type, read: false, userId: finalUserId, date: new Date().toISOString().split('T')[0] });
  } catch (err) {
    logger.error('[createNotification] ERROR:', err);
  }
};

router.get('/', protect, async (req, res) => {
  try {
    const { page, limit, status, date, search, hospitalId } = req.query;
    const filter = {};
    
    if (status && status !== 'All') filter.status = status;
    if (date) filter.date = date;
    
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor' || req.user.role === 'clinic_doctor') {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'admin') {
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    }
    
    if (hospitalId && req.user.role === 'superadmin') filter.hospitalId = hospitalId;
    
    if (search && (req.user.role === 'doctor' || req.user.role === 'clinic_doctor')) {
      filter.$or = [{ patient: new RegExp(search, 'i') }];
    }
    
    const result = await paginatedResults(Appointment, filter, {
      page, limit,
      sort: { date: -1, createdAt: -1 },
      populate: [
        { path: 'patientId', select: 'name email phone' },
        { path: 'doctorId', select: 'name specialization' },
      ],
    });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my-appointments', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor' || req.user.role === 'clinic_doctor') {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'admin') {
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    }
    
    if (status && status !== 'All') filter.status = status;
    
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization')
      .sort({ date: -1, createdAt: 1 });
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const a = await Appointment.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization');
    if (!a) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user.role === 'patient' && a.patientId?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this appointment' });
    }
    if (req.user.role !== 'patient' && req.user.hospitalId && a.hospitalId && a.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this appointment' });
    }
    res.json(a);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createAppointmentSchema), async (req, res) => {
  try {
    const { doctorId, doctor, department, date, time, type, symptoms, priority } = req.body;
    
    let patientName = req.user.name;
    let patientId = req.user._id;
    
    let hospitalId = null;
    if (doctorId) {
      const doctorDoc = await Doctor.findById(doctorId);
      if (doctorDoc && doctorDoc.hospitalId) {
        hospitalId = doctorDoc.hospitalId;
      }
    }
    
    if (doctorId && date && time) {
      const existing = await Appointment.findOne({ doctorId, date, time, status: { $nin: ['Cancelled', 'Completed'] } });
      if (existing) return res.status(409).json({ message: 'This time slot is already booked' });
    }
    
    const countToday = await Appointment.countDocuments({ date, doctor: doctor || '' });
    const tokenNumber = `${new Date(date || Date.now()).toISOString().slice(0,10).replace(/-/g,'')}-${String(countToday + 1).padStart(3, '0')}`;
    const patientUser = await User.findById(patientId);
    const estimatedWaitTime = await calculateEstimatedWaitTime(department, priority);
const appointment = await Appointment.create({
       tokenNumber,
       uhid: patientUser?.uhid || '',
       patient: patientName,
       patientId,
       doctor: doctor || '',
       doctorId: doctorId || null,
       department,
       date,
       time,
       type: type || 'Consultation',
       symptoms: symptoms || '',
       priority: priority || 'Normal',
       estimatedWaitTime,
       hospitalId: hospitalId || undefined,
       status: 'Pending'
     });
     
     await auditLog('create_appointment', req.user._id, { recordId: appointment._id, ip: req.ip, userAgent: req.get('user-agent') });
     
     await appointment.populate('doctorId', 'name specialization');
    
    if (doctorId) {
      await createNotification(doctorId, 'New Appointment', `New ${type || 'Consultation'} appointment from ${patientName} for ${date} at ${time}`, 'appointment');
    }
    
    res.status(201).json(appointment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/checkin', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user.role === 'patient' && appointment.patientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    if (req.user.hospitalId && appointment.hospitalId && appointment.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    
    appointment.status = 'In Queue';
    appointment.checkedInAt = new Date();
    
    const queueCount = await Appointment.countDocuments({
      department: appointment.department,
      status: 'In Queue'
    });
    appointment.queuePosition = queueCount + 1;
    
    await appointment.save();
    await auditLog('checkin_appointment', req.user._id, { recordId: appointment._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(appointment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/queue/:department', protect, async (req, res) => {
  try {
    const { department } = req.params;
    const filter = { department, status: { $in: ['In Queue', 'Called'] } };
    if (req.user.hospitalId && req.user.role !== 'superadmin') {
      filter.hospitalId = req.user.hospitalId;
    } else if (req.query.hospitalId) {
      filter.hospitalId = req.query.hospitalId;
    }
    const queue = await Appointment.find(filter).sort({ queuePosition: 1 });
    res.json({ queue });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, validate(updateAppointmentSchema), async (req, res) => {
  try {
    const { status, notes, time, date } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user.role === 'patient' && appointment.patientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    if (req.user.hospitalId && appointment.hospitalId && appointment.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    if ((req.user.role === 'doctor' || req.user.role === 'clinic_doctor') && appointment.doctorId?.toString() !== req.user.doctorProfileId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    
    const oldStatus = appointment.status;
    const updates = { ...req.body };
    
const updated = await Appointment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
       .populate('patientId', 'name email')
       .populate('doctorId', 'name');
     
     if (status && status !== oldStatus) {
       const patientUser = await import('../models/User.js').then(m => m.default.findById(updated.patientId?._id));
       if (patientUser) {
         await createNotification(patientUser._id.toString(), 'Appointment Update', `Your appointment status changed to ${status}`, 'appointment');
       }
       if (updated.doctorId) {
         await createNotification(updated.doctorId._id.toString(), 'Appointment Update', `Appointment with ${updated.patient} status changed to ${status}`, 'appointment');
       }
     }
     await auditLog('update_appointment', req.user._id, { recordId: updated._id, ip: req.ip, userAgent: req.get('user-agent') });
     
     res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user.role === 'patient' && appointment.patientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this appointment' });
    }
    if (req.user.hospitalId && appointment.hospitalId && appointment.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this appointment' });
    }
    if ((req.user.role === 'doctor' || req.user.role === 'clinic_doctor') && appointment.doctorId?.toString() !== req.user.doctorProfileId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this appointment' });
    }
    await Appointment.findByIdAndDelete(req.params.id);
    await auditLog('delete_appointment', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Appointment removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;