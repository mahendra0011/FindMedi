import express from 'express';
import Doctor from '../models/Doctor.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { emitAppointmentUpdate } from '../services/socketService.js';
import {
  createSeries,
  listSeries,
  cancelSeries,
  sendSeriesError,
  SERIES_COUNT_MIN,
  SERIES_COUNT_MAX,
} from '../services/appointmentSeriesService.js';

/**
 * APPT-M-02: patient-facing recurring-series API.
 *
 * All three routes are self-scoped (the series is loaded with
 * `patientId: req.user._id`, so someone else's id 404s rather than 403s) -
 * hence the `self` tag on every definition. Occurrence-level cancel and
 * reschedule need no new surface: each occurrence is a normal Appointment, so
 * the existing PUT/DELETE /api/appointments/:id already manage them.
 */
const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const FREQUENCIES = ['weekly', 'biweekly', 'monthly'];

// Same doctor->user notification resolution as routes/appointments.js.
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
    await Notification.create({ title, message, type, read: false, userId: finalUserId, date: getISTDateString() });
  } catch (err) {
    logger.error('[createNotification] ERROR:', err);
  }
};

// authz: self
router.post('/', protect, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.doctorId || !OBJECT_ID.test(String(b.doctorId))) {
      return res.status(400).json({ message: 'doctorId is required and must be an ObjectId' });
    }
    if (!b.date || !DATE.test(String(b.date))) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }
    if (!b.time || !TIME.test(String(b.time))) {
      return res.status(400).json({ message: 'time must be HH:MM' });
    }
    if (!FREQUENCIES.includes(b.frequency)) {
      return res.status(400).json({ message: 'frequency must be weekly, biweekly or monthly' });
    }
    const count = Number(b.count);
    if (!Number.isInteger(count) || count < SERIES_COUNT_MIN || count > SERIES_COUNT_MAX) {
      return res.status(400).json({ message: `count must be an integer between ${SERIES_COUNT_MIN} and ${SERIES_COUNT_MAX}` });
    }
    const feesPerOccurrence = b.feesPerOccurrence === undefined ? 0 : Number(b.feesPerOccurrence);
    if (!Number.isFinite(feesPerOccurrence) || feesPerOccurrence < 0 || feesPerOccurrence > 1000000) {
      return res.status(400).json({ message: 'feesPerOccurrence must be a number between 0 and 1000000' });
    }

    const { series, appointments } = await createSeries({
      patientId: req.user._id,
      patientName: req.user.name || '',
      doctorId: b.doctorId,
      date: b.date,
      time: b.time,
      frequency: b.frequency,
      count,
      feesPerOccurrence,
      appointmentMode: typeof b.appointmentMode === 'string' && b.appointmentMode ? b.appointmentMode : 'offline',
      type: typeof b.type === 'string' && b.type ? b.type : 'Consultation',
      department: typeof b.department === 'string' && b.department ? b.department : undefined,
      notes: typeof b.notes === 'string' ? b.notes : '',
      symptoms: typeof b.symptoms === 'string' ? b.symptoms : '',
    });

    const patternLabel = `${series.count} ${series.frequency} appointments from ${series.startDate}`;
    await createNotification(
      series.doctorId,
      'New Appointment Series',
      `${req.user.name || 'A patient'} booked a recurring series: ${patternLabel} at ${series.time}.`,
      'appointment',
    );
    await createNotification(
      req.user._id,
      'Recurring Appointments Booked',
      `Your series with ${series.doctor} is booked: ${patternLabel} at ${series.time}. Pay each visit to confirm it.`,
      'appointment',
    );
    for (const appt of appointments) {
      void emitAppointmentUpdate(appt).catch(() => { /* best-effort live refresh */ });
    }

    await auditLog('create_appointment_series', req.user._id, {
      recordId: series._id, ip: req.ip, userAgent: req.get('user-agent'),
      doctorId: series.doctorId, frequency: series.frequency, count: series.count,
    });
    return res.status(201).json({ series, appointments });
  } catch (err) {
    return sendSeriesError(res, err);
  }
});

// authz: self
router.get('/mine', protect, async (req, res) => {
  try {
    const series = await listSeries(req.user._id);
    return res.json(series);
  } catch (err) {
    return sendSeriesError(res, err);
  }
});

// authz: self
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!OBJECT_ID.test(String(req.params.id))) {
      return res.status(400).json({ message: 'id must be an ObjectId' });
    }
    const { series, cancelledCount } = await cancelSeries({
      seriesId: req.params.id,
      patientId: req.user._id,
    });
    if (cancelledCount > 0) {
      await createNotification(
        series.doctorId,
        'Appointment Series Cancelled',
        `${series.patientName || 'A patient'} cancelled their recurring series (${cancelledCount} upcoming visit${cancelledCount === 1 ? '' : 's'} from ${series.startDate}).`,
        'appointment',
      );
    }
    await auditLog('cancel_appointment_series', req.user._id, {
      recordId: series._id, ip: req.ip, userAgent: req.get('user-agent'),
      doctorId: series.doctorId, cancelledCount,
    });
    return res.json({ series, cancelledCount });
  } catch (err) {
    return sendSeriesError(res, err);
  }
});

export default router;
