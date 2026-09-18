import express from 'express';
import ScheduleChangeRequest from '../models/ScheduleChangeRequest.js';
import Doctor from '../models/Doctor.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createScheduleChangeRequestSchema, updateScheduleChangeStatusSchema } from '../utils/validate.js';
import logger from '../config/logger.js';
import { emitScheduleRequestUpdate } from '../services/socketService.js';

const createNotification = async (userId, title, message, type = 'system') => {
  try {
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.create({ userId, title, message, type });
  } catch (e) { logger.error('Notification error:', e); }
};

// "HH:MM" 24h -> minutes since midnight
const timeStrToMins = (t) => {
  if (!t || typeof t !== 'string') return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// Regenerate the flat time_slots array from workingHours + slotDuration + breakTime
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
    const inBreak = breakStart != null && breakEnd != null &&
      !(slotEnd <= breakStart || mins >= breakEnd);
    if (!inBreak) slots.push(time);
    mins += slotDuration;
  }
  return slots;
};

const router = express.Router();

// Doctor: list own requests. Admin: list hospital-scoped requests.
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ email: req.user.email });
      if (doctor) filter.doctorId = doctor._id;
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const requests = await ScheduleChangeRequest.find(filter)
      .populate('doctorId', 'name email specialization')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Doctor: create a new schedule change request
router.post('/', protect, validate(createScheduleChangeRequestSchema), async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can request schedule changes' });
    }
    const doctor = await Doctor.findOne({ email: req.user.email });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

    // Reject if there's already a Pending request for this doctor
    const existingPending = await ScheduleChangeRequest.findOne({ doctorId: doctor._id, status: 'Pending' });
    if (existingPending) {
      return res.status(409).json({ message: 'You already have a pending change request. Please wait for admin review.' });
    }

    const rc = req.body.requestedChanges || {};

    // Snapshot the doctor's CURRENT values for every field the doctor is requesting to change.
    // This powers the "old → new" highlight text later and stays accurate even if the doctor edits again.
    const oldValues = {};
    if (rc.slotDuration != null) oldValues.slotDuration = doctor.slotDuration;
    if (rc.workingHours) oldValues.workingHours = { start: doctor.workingHours?.start, end: doctor.workingHours?.end };
    if (rc.breakTime) oldValues.breakTime = { start: doctor.breakTime?.start, end: doctor.breakTime?.end };
    if (rc.bookingWindow) oldValues.bookingWindow = { unit: doctor.bookingWindow?.unit, value: doctor.bookingWindow?.value };
    if (rc.weekly_schedule) oldValues.weekly_schedule = doctor.weekly_schedule || {};
    if (rc.leaves != null) oldValues.leaves = doctor.leaves || [];
    if (rc.dateDisabledSlots) oldValues.dateDisabledSlots = doctor.dateDisabledSlots || {};
    if (rc.bufferPerHour != null) oldValues.bufferPerHour = doctor.bufferPerHour;

    const request = await ScheduleChangeRequest.create({
      doctorId: doctor._id,
      doctorName: req.user.name,
      doctorEmail: req.user.email,
      hospitalId: req.user.hospitalId || doctor.hospitalId,
      status: 'Pending',
      requestedChanges: rc,
      oldValues,
    });

    // Notify all hospital admins
    try {
      const User = (await import('../models/User.js')).default;
      const admins = await User.find({ role: 'hospital_admin', hospitalId: doctor.hospitalId }).select('_id');
      for (const a of admins) {
        await createNotification(a._id.toString(), 'Schedule Change Request', `${req.user.name} requested schedule changes`, 'system');
      }
    } catch (_) {}

    await createNotification(req.user._id.toString(), 'Request Submitted', 'Your schedule change request has been submitted for admin review.', 'system');

    res.status(201).json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Doctor: cancel their own pending request (withdraws the request, removes the blur on their page)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const request = await ScheduleChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: `Request already ${request.status.toLowerCase()} — cannot cancel` });
    }
    // Only the requesting doctor can cancel their own request
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ email: req.user.email });
      if (!doctor || doctor._id.toString() !== request.doctorId.toString()) {
        return res.status(403).json({ message: 'You can only cancel your own requests' });
      }
    }

    request.status = 'Cancelled';
    request.reviewedAt = new Date();
    await request.save();

    // Notify the doctor via WebSocket — auto-removes blur on their page
    try {
      const User = (await import('../models/User.js')).default;
      const doctorUser = await User.findOne({ email: request.doctorEmail });
      if (doctorUser) emitScheduleRequestUpdate(doctorUser._id.toString(), { requestId: request._id, status: 'Cancelled' });
    } catch (_) {}

    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Admin: pending queue
router.get('/pending', protect, async (req, res) => {
  try {
    const filter = { status: 'Pending' };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const requests = await ScheduleChangeRequest.find(filter)
      .populate('doctorId', 'name email specialization slotDuration workingHours breakTime bookingWindow weekly_schedule leaves dateDisabledSlots bufferPerHour')
      .sort({ createdAt: 1 });
    res.json({ requests });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: approve (apply only checkbox-selected fields) or reject
router.put('/:id/decision', protect, adminOnly, validate(updateScheduleChangeStatusSchema), async (req, res) => {
  try {
    const { decision, appliedFields = [], adminNote = '', rejectionNote = '' } = req.body;
    const request = await ScheduleChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ message: 'Request already reviewed' });

    if (decision === 'approve' && appliedFields.length > 0) {
      const doctor = await Doctor.findById(request.doctorId);
      if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

      const rc = request.requestedChanges || {};
      const update = {};
      let needsSlotRegen = false;
      let wh = doctor.workingHours || { start: '09:00', end: '17:00' };
      let sd = doctor.slotDuration || 15;
      let bt = doctor.breakTime || { start: '', end: '' };

      if (appliedFields.includes('slotDuration') && rc.slotDuration != null) {
        update.slotDuration = rc.slotDuration; sd = rc.slotDuration; needsSlotRegen = true;
      }
      if (appliedFields.includes('workingHours') && rc.workingHours) {
        update.workingHours = rc.workingHours; wh = rc.workingHours; needsSlotRegen = true;
      }
      if (appliedFields.includes('breakTime') && rc.breakTime) {
        update.breakTime = rc.breakTime; bt = rc.breakTime; needsSlotRegen = true;
      }
      if (appliedFields.includes('bookingWindow') && rc.bookingWindow) update.bookingWindow = rc.bookingWindow;
      if (appliedFields.includes('weekly_schedule') && rc.weekly_schedule) update.weekly_schedule = rc.weekly_schedule;
      if (appliedFields.includes('leaves') && rc.leaves) update.leaves = rc.leaves;
      if (appliedFields.includes('dateDisabledSlots') && rc.dateDisabledSlots) update.dateDisabledSlots = rc.dateDisabledSlots;
      if (appliedFields.includes('bufferPerHour') && rc.bufferPerHour != null) update.bufferPerHour = rc.bufferPerHour;

      // Regenerate time_slots if any timing-related field was applied
      if (needsSlotRegen) {
        update.time_slots = generateTimeSlots(wh.start, wh.end, sd, bt);
      }

      if (Object.keys(update).length > 0) {
        await Doctor.findByIdAndUpdate(request.doctorId, update);
      }

      // Determine which requested fields were NOT applied -> record as rejectionNote for visibility
      const allRequested = Object.keys(rc).filter(k => rc[k] != null);
      const notApplied = allRequested.filter(f => !appliedFields.includes(f));
      const finalRejectionNote = notApplied.length > 0
        ? `These changes were not applied: ${notApplied.join(', ')}.${rejectionNote ? ' ' + rejectionNote : ''}`
        : rejectionNote;

      request.status = 'Approved';
      request.appliedFields = appliedFields;
      request.adminNote = adminNote;
      request.rejectionNote = finalRejectionNote;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();
    } else if (decision === 'reject') {
      request.status = 'Rejected';
      request.rejectionNote = rejectionNote || 'Request rejected by admin';
      request.adminNote = adminNote;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();
    } else if (decision === 'approve' && appliedFields.length === 0) {
      // Admin confirmed but selected nothing -> treat as soft reject
      request.status = 'Rejected';
      request.rejectionNote = rejectionNote || 'No fields were selected for approval.';
      request.adminNote = adminNote;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();
    }

    // Notify the doctor
    try {
      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({ email: request.doctorEmail });
      if (user) {
        const msg = request.status === 'Approved'
          ? `Your schedule change request was approved.${request.appliedFields.length ? ' Applied: ' + request.appliedFields.join(', ') : ''}${request.rejectionNote ? ' | ' + request.rejectionNote : ''}`
          : `Your schedule change request was rejected.${request.rejectionNote ? ' Reason: ' + request.rejectionNote : ''}`;
        await createNotification(user._id.toString(), 'Schedule Request Update', msg, 'system');
        // WebSocket: auto-remove blur + render highlights on doctor's page (no refresh needed)
        emitScheduleRequestUpdate(user._id.toString(), { requestId: request._id, status: request.status });
      }
    } catch (_) {}

    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
