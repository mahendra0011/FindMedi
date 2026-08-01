import express from 'express';
import Appointment from '../models/Appointment.js';
import Bed from '../models/Bed.js';
import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Patient from '../models/Patient.js';
import { protect, scopeToHospital, requireRole } from '../middleware/auth.js';
import { validate, createAppointmentSchema, updateAppointmentSchema, walkInSchema } from '../utils/validate.js';
import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';
import { generateTokenNumber } from '../utils/idGenerator.js';
import Payment from '../models/Payment.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { emitAppointmentUpdate } from '../services/socketService.js';

const router = express.Router();

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
    await Notification.create({ title, message, type, read: false, userId: finalUserId, date: getISTDateString() });
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
      filter.$or = [
        { patientId: req.user._id },
        { patientId: { $exists: false }, patient: req.user.name },
      ];
    } else if (req.user.role === 'doctor' || req.user.role === 'clinic_doctor') {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'hospital_admin') {
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    }
    
    if (hospitalId && req.user.role === 'superadmin') filter.hospitalId = hospitalId;
    
    if (search && (req.user.role === 'doctor' || req.user.role === 'clinic_doctor')) {
      filter.$or = [{ patient: new RegExp(search, 'i') }];
    }
    
    const result = await paginatedResults(Appointment, filter, {
      page, limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'patientId', select: 'name email phone gender address dateOfBirth bloodGroup' },
        { path: 'doctorId', select: 'name specialization' },
      ],
    });

    try {
      const Payment = (await import('../models/Payment.js')).default;
      for (const appt of result.data || []) {
        const payment = await Payment.findOne({ referenceId: appt._id.toString(), status: 'completed' }).lean();
        if (payment) {
          if (appt._doc) {
            appt._doc.transactionId = payment.transaction_id;
            appt._doc.invoiceId = payment.invoice_id;
          } else {
            appt.transactionId = payment.transaction_id;
            appt.invoiceId = payment.invoice_id;
          }
        }
      }
    } catch (e) {
      console.error('Failed to attach payment info to paginated appointments:', e);
    }

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/booked-slots', protect, async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return res.status(400).json({ message: 'doctorId and date required' });

    const doctorDoc = await Doctor.findById(doctorId).select('maxBookingsPerSlot dateDisabledSlots bookingWindow').lean();
    const capacity = doctorDoc?.maxBookingsPerSlot || 1;
    // Date-specific disabled slots (per-date toggle from My Schedule)
    const dateDisabled = (doctorDoc?.dateDisabledSlots && doctorDoc.dateDisabledSlots[date]) || [];
    const bookingWindow = doctorDoc?.bookingWindow || { unit: 'weeks', value: 2 };

    const filter = { doctorId, date, status: { $nin: ['Cancelled', 'Completed', 'Missed'] } };
    const appts = await Appointment.find(filter).select('time').lean();

    const counts = {};
    appts.forEach(a => { counts[a.time] = (counts[a.time] || 0) + 1; });
    const fullSlots = Object.keys(counts).filter(t => counts[t] >= capacity);

    // Pending slot removals: slots the doctor requested to disable (pending approval)
    // that are NOT already disabled in the live schedule. Patients see these as
    // "Pending Update" (grey, not selectable) so they don't book a slot that may
    // be removed once the admin approves.
    let pendingDisabledSlots = [];
    try {
      const ScheduleChangeRequest = (await import('../models/ScheduleChangeRequest.js')).default;
      const pendingReq = await ScheduleChangeRequest.findOne({
        doctorId,
        status: 'Pending',
      }).sort({ createdAt: -1 }).lean();
      if (pendingReq?.requestedChanges?.dateDisabledSlots?.[date]) {
        const pendingSlots = pendingReq.requestedChanges.dateDisabledSlots[date] || [];
        const liveDisabled = new Set(dateDisabled);
        pendingDisabledSlots = pendingSlots.filter(s => !liveDisabled.has(s));
      }
    } catch (_) {}

    res.json({ counts, capacity, fullSlots, dateDisabled, bookingWindow, pendingDisabledSlots });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my-appointments', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (req.user.role === 'patient') {
      filter.$or = [
        { patientId: req.user._id },
        { patientId: { $exists: false }, patient: req.user.name },
      ];
    } else if (req.user.role === 'doctor' || req.user.role === 'clinic_doctor') {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'hospital_admin') {
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    }
    
    if (status && status !== 'All') filter.status = status;
    
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name email phone gender address dateOfBirth bloodGroup')
      .populate('doctorId', 'name specialization')
      .sort({ date: -1, createdAt: 1 })
      .lean();

    try {
      const Payment = (await import('../models/Payment.js')).default;
      for (const appt of appointments) {
        const payment = await Payment.findOne({ referenceId: appt._id.toString(), status: 'completed' }).lean();
        if (payment) {
          appt.transactionId = payment.transaction_id;
          appt.invoiceId = payment.invoice_id;
        }
      }
    } catch (e) {
      console.error('Failed to attach payment info to appointments:', e);
    }
    
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /appointments/history-with-payments — patient's appointment history with payment details
router.get('/history-with-payments', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'This endpoint is for patients only' });
    }

    const Payment = (await import('../models/Payment.js')).default;
    
    const filter = {
      patientId: req.user._id,
    };
    
    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name specialization')
      .populate('hospitalId', 'name phone address')
      .sort({ createdAt: -1 })
      .lean();
    
    // For each appointment, try to find its payment record
    const enrichedAppointments = await Promise.all(
      appointments.map(async (apt) => {
        const payment = await Payment.findOne({
          serviceType: 'appointment',
          referenceId: apt._id.toString(),
          patient_id: req.user._id.toString(),
        }).lean();
        
        return {
          _id: apt._id,
          serviceType: 'appointment',
          createdAt: apt.createdAt || apt.date,
          
          // Appointment details
          appointmentDate: apt.date,
          appointmentTime: apt.time,
          tokenNumber: apt.tokenNumber,
          status: apt.status,
          type: apt.type,
          
          // Doctor details
          doctorName: apt.doctor || apt.doctorId?.name || 'Doctor',
          doctorSpecialization: apt.doctorId?.specialization || '',
          provider: apt.hospitalId?.name || apt.doctorId?.name || 'Clinic',
          
          // Payment details (if exists)
          paymentStatus: payment ? payment.status : (apt.status === 'Cancelled' ? 'cancelled' : 'unpaid'),
          amount: payment?.amount || 0,
          method: payment?.method || '',
          transaction_id: payment?.transaction_id || '',
          invoice_id: payment?.invoice_id || '',
          paymentId: payment?._id || null,
          
          // Reference
          referenceId: apt._id,
          reference: {
            doctorName: apt.doctor || apt.doctorId?.name || '',
            doctorSpecialization: apt.doctorId?.specialization || '',
            appointmentDate: apt.date,
            appointmentTime: apt.time,
            appointmentType: apt.type,
          },
        };
      })
    );
    
    // Unpaid "Pending" appointment matlab payment kabhi complete nahi hua
    // (abandoned/failed checkout) — ye history me kabhi dikhna hi nahi chahiye.
    const visibleAppointments = enrichedAppointments.filter(
      a => !(a.status === 'Pending' && !a.transaction_id)
    );

    res.json({ data: visibleAppointments, total: visibleAppointments.length });
  } catch (err) {
    console.error('[appointments/history-with-payments] ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const a = await Appointment.findById(req.params.id)
      .populate('patientId', 'name email phone gender address dateOfBirth bloodGroup')
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

// ─── Walk-in Booking (doctor/clinic/staff se: patient register + appointment ek saath) ───
router.post('/walk-in', protect, requireRole(['doctor', 'clinic_doctor', 'clinic_admin', 'hospital_admin', 'superadmin']), validate(walkInSchema), async (req, res) => {
  try {
    const { patient, doctorId, doctor, department, date, time, type, symptoms, priority, fees, notes } = req.body;

    // 1. Patient register — pehle se same phone/email ka patient ho to reuse karo
    //    (timeout → client retry karne par duplicate patient na bane)
    let p = null;
    if (patient.phone) p = await Patient.findOne({ phone: patient.phone });
    else if (patient.email) p = await Patient.findOne({ email: patient.email });
    if (!p) {
      p = await Patient.create({
        name: patient.name,
        age: patient.age !== undefined ? Number(patient.age) : 0,
        gender: patient.gender || 'Other',
        phone: patient.phone || '',
        email: patient.email || '',
        bloodGroup: patient.bloodGroup || '',
        address: patient.address || '',
        hospitalId: req.user.hospitalId || undefined,
      });
    }

    // 2. Doctor resolve (doctor role ke liye khud ka profile, warna body wala)
    let targetDoctorId = doctorId || req.user.doctorProfileId || null;
    let targetDoctorName = doctor || req.user.name || '';
    let hospitalId = req.user.hospitalId || undefined;
    if (targetDoctorId) {
      const doctorDoc = await Doctor.findById(targetDoctorId);
      if (doctorDoc) {
        targetDoctorName = targetDoctorName || doctorDoc.name;
        if (doctorDoc.hospitalId) hospitalId = doctorDoc.hospitalId;
      }
    }

    // 2b. Duplicate-booking guard (idempotency) — same patient + doctor + slot
    //     agla request pehle hi ban chuka ho to naya banaane ki bajaye wahi return karo
    if (targetDoctorId && p) {
      const dup = await Appointment.findOne({
        patientId: p._id,
        doctorId: targetDoctorId,
        date,
        time,
        status: { $nin: ['Cancelled', 'Completed', 'Missed'] },
      });
      if (dup) {
        return res.status(201).json({ appointment: dup, patient: p, duplicate: true });
      }
    }

    // 3. Capacity check
    if (targetDoctorId) {
      const doctorDoc2 = await Doctor.findById(targetDoctorId).select('maxBookingsPerSlot').lean();
      const capacity = doctorDoc2?.maxBookingsPerSlot || 1;
      const slotFilter = { doctorId: targetDoctorId, date, time, status: { $nin: ['Cancelled', 'Completed', 'Missed'] } };
      const existingBookings = await Appointment.find(slotFilter).select('patientId').lean();
      if (existingBookings.length >= capacity) {
        return res.status(409).json({ message: 'This time slot is full. Please choose a different time.' });
      }
    }

    // 4. Appointment create (Confirmed)
    const tokenNumber = generateTokenNumber();
    const estimatedWaitTime = await calculateEstimatedWaitTime(department || 'General', priority);
    const appointment = await Appointment.create({
      tokenNumber,
      uhid: p.uhid || undefined,
      patient: p.name,
      patientId: p._id,
      doctor: targetDoctorName || 'Doctor',
      doctorId: targetDoctorId,
      department: department || 'General',
      date,
      time,
      type: type || 'Consultation',
      symptoms: symptoms || '',
      notes: notes || '',
      priority: priority || 'Normal',
      fees: fees || 0,
      estimatedWaitTime,
      hospitalId,
      status: 'Confirmed',
    });

    await auditLog('create_appointment', req.user._id, { recordId: appointment._id, ip: req.ip, userAgent: req.get('user-agent') });
    await emitAppointmentUpdate(appointment);
    res.status(201).json({ appointment, patient: p });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/', protect, requireRole(['hospital_admin', 'superadmin']), validate(createAppointmentSchema), async (req, res) => {
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
    
    if (patientId && date && time) {
      // Check if THIS patient already has an appointment at this slot
      const ownFilter = { patientId, doctorId: doctorId || null, date, time, status: { $nin: ['Cancelled', 'Completed', 'Missed'] } };
      const existing = await Appointment.findOne(ownFilter);
      if (existing) {
        if (existing.status === 'Pending') {
          const hasCompletedPayment = await Payment.findOne({ referenceId: existing._id.toString(), status: 'completed' });
          if (hasCompletedPayment) {
            return res.status(409).json({ message: 'You already have an appointment with this doctor on this date and time.' });
          }
          // Only delete if it belongs to this patient AND is older than 2 minutes
          const ageMs = Date.now() - new Date(existing.createdAt).getTime();
          if (ageMs > 2 * 60 * 1000) {
            await Appointment.findByIdAndDelete(existing._id);
          } else {
            return res.status(409).json({ message: 'You already have an appointment with this doctor on this date and time.' });
          }
        } else {
          return res.status(409).json({ message: 'You already have an appointment with this doctor on this date and time.' });
        }
      }

    }

    // Capacity check: alag users tab tak book kar sakte hain jab tak doctor ki maxBookingsPerSlot limit na aa jaye
    if (doctorId) {
      const doctorDoc2 = await Doctor.findById(doctorId).select('maxBookingsPerSlot').lean();
      const capacity = doctorDoc2?.maxBookingsPerSlot || 1;
      const slotFilter = { doctorId, date, time, status: { $nin: ['Cancelled', 'Completed', 'Missed'] } };
      const existingBookings = await Appointment.find(slotFilter).select('patientId').lean();
      if (existingBookings.length >= capacity) {
        return res.status(409).json({ message: 'This time slot is full. Please choose a different time.' });
      }
    }

    const countToday = await Appointment.countDocuments({ date, doctor: doctor || '' });
    const tokenNumber = generateTokenNumber();
    const patientUser = await User.findById(patientId);
    const estimatedWaitTime = await calculateEstimatedWaitTime(department, priority);
    const appointment = await Appointment.create({
        tokenNumber,
        uhid: !!hospitalId ? (patientUser?.uhid || '') : undefined,
        patient: patientName,
        patientId,
        doctor: doctor || '',
        doctorId: doctorId || null,
        department: department || 'General',
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
    const doctorDisplay = doctor ? (doctor.match(/^dr\.?\s/i) ? doctor : `Dr. ${doctor}`) : 'Doctor';
    await createNotification(patientId, 'Appointment Created', `Your appointment with ${doctorDisplay} on ${date} at ${time} has been created. Token: ${tokenNumber}`, 'appointment');
    
    await emitAppointmentUpdate(appointment);
    res.status(201).json({ appointment });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This slot is already booked with this doctor, or your previous payment for it is still processing. Please check your appointment history.' });
    }
    res.status(400).json({ message: err.message });
  }
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
    await emitAppointmentUpdate(appointment);
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
router.put('/:id/intake', protect, async (req, res) => {
  try {
    const {
      chiefComplaint, chiefComplaintOther, symptomsDuration,
      pastMedicalHistory, currentTreatment, testReports,
      currentMedications, allergies, familyHistory,
    } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    if (req.user.role === 'patient' && appointment.patientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    
    appointment.preConsultationDetails = {
      chiefComplaint,
      chiefComplaintOther,
      symptomsDuration,
      pastMedicalHistory,
      currentTreatment,
      testReports,
      currentMedications,
      allergies,
      familyHistory,
      filledAt: new Date()
    };
    
    await appointment.save();
    await emitAppointmentUpdate(appointment);
    res.json(appointment);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
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
    if ((req.user.role === 'doctor' || req.user.role === 'clinic_doctor') && appointment.doctorId && appointment.doctorId.toString() !== req.user.doctorProfileId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    
    const oldStatus = appointment.status;
    
    // Verify payment before confirming (Bug 2)
    if (status === 'Confirmed' && oldStatus === 'Pending') {
      const Payment = (await import('../models/Payment.js')).default;
      const paymentExists = await Payment.findOne({
        serviceType: 'appointment',
        referenceId: req.params.id,
        status: 'completed',
      });
      if (!paymentExists) {
        return res.status(400).json({ message: 'Cannot confirm appointment without completed payment' });
      }
    }
    
    const updates = { ...req.body };

    if (status === 'Completed' && oldStatus !== 'Completed') {
      updates.consultationEndTime = new Date();
    }

    // Reschedule me naya date/time doctor ke liye already taken ho sakta hai —
    // check karo warna double-booking ho jayegi.
    if ((updates.date || updates.time) && (appointment.doctorId || updates.doctorId)) {
      const checkDate = updates.date || appointment.date;
      const checkTime = updates.time || appointment.time;
      const conflict = await Appointment.findOne({
        _id: { $ne: appointment._id },
        doctorId: updates.doctorId || appointment.doctorId,
        date: checkDate, time: checkTime,
        status: { $nin: ['Cancelled', 'Completed', 'Missed'] },
      });
      if (conflict) {
        return res.status(409).json({ message: 'This time slot is already taken with this doctor. Please choose a different slot.' });
      }
    }

const updated = await Appointment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
       .populate('patientId', 'name email phone gender address dateOfBirth bloodGroup')
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
     await emitAppointmentUpdate(updated);
      
       res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This time slot is already taken with this doctor. Please choose a different slot.' });
    }
    res.status(400).json({ message: err.message });
  }
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
    await emitAppointmentUpdate({ _id: req.params.id, doctorId: appointment.doctorId, patientId: appointment.patientId });
    res.json({ message: 'Appointment removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;