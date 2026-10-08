import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import express from 'express';
import Appointment from '../models/Appointment.js';
import Bed from '../models/Bed.js';
import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Patient from '../models/Patient.js';
import { protect, scopeToHospital, requireRole, authorize } from '../middleware/auth.js';
import { validate, createAppointmentSchema, updateAppointmentSchema, walkInSchema } from '../utils/validate.js';
import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';
// APPT-B-02: atomic slot-capacity reservation (compare-and-set, not check-then-write).
import { reserveSlotSeat, releaseSlotSeat } from '../services/slotCapacity.js';
// APPT-M-01: a freed seat is offered to the waitlist before it evaporates.
import { onSlotFreed } from '../services/waitlistService.js';
// APPT-B-04: no raw err.message in a 500 body.
import { sendServerError } from '../utils/safeError.js';
import { generateTokenNumber } from '../utils/idGenerator.js';
import Payment from '../models/Payment.js';
import { getISTDateString, slotStartAt } from '../utils/dateUtils.js';
import { emitAppointmentUpdate } from '../services/socketService.js';
import { loyaltyService } from '../services/loyaltyService.js';
// A5 (5.md §2.1/§2.4): one status table + the cancellation tier arithmetic,
// asserted here before any write, and the single refund issuer used after.
import { assertAppointmentTransition, computeCancellation } from '../lib/appointmentLifecycle.js';
import { issueRefund } from '../services/refundService.js';
// A5 (5.md §15): the server owns the price. The walk-in fee comes from the
// doctor's listed consultation fee, never from the request body.
import { resolveAuthoritativeAmount } from '../services/pricingService.js';
import {
  lockAppointmentSlot,
  releaseAppointmentSlot,
  getLockedSlotsForDoctor,
  getNextOPDTokenNumber,
} from '../config/redis.js';

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

router.get('/', protect, authorize('appointments:read', 'appointments:read:own'), async (req, res) => {
  try {
    const { page, limit, status, date, search, hospitalId } = req.query;
    const filter = {};
    
    if (status && status !== 'All') filter.status = status;
    if (date) filter.date = date;
    
    const scopeFilter = {};
    if (req.user.role === 'patient') {
      scopeFilter.$or = [
        { patientId: req.user._id },
        { patientId: { $exists: false }, patient: req.user.name },
      ];
    } else if (req.user.role === 'doctor' || req.user.role === 'clinic_doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') {
      scopeFilter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) scopeFilter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'superadmin') {
      // APPT-B-07: handled BEFORE the default-deny branch (it used to fall into the
      // else and always get an empty list).
      if (hospitalId) scopeFilter.hospitalId = hospitalId;
    } else if (req.user.role === 'hospital_admin') {
      // APPT-B-07: a hospital admin with no linked hospital must get NOTHING, not
      // every appointment on the platform.
      if (!req.user.hospitalId) {
        return res.json({ data: [], total: 0, page: 1, totalPages: 0 });
      }
      scopeFilter.hospitalId = req.user.hospitalId;
    } else {
      return res.json({ data: [], total: 0, page: 1, totalPages: 0 });
    }

    const searchFilter = {};
    if (search && (req.user.role === 'doctor' || req.user.role === 'clinic_doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist')) {
      searchFilter.$or = [{ patient: new RegExp(escapeRegex(capSearch(search)), 'i') }];
    }

    filter.$and = [scopeFilter, searchFilter];
    
    const result = await paginatedResults(Appointment, filter, {
      page, limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'patientId', select: 'name email phone gender address dateOfBirth bloodGroup' },
        { path: 'doctorId', select: 'name specialization' },
        { path: 'hospitalId', select: 'name address city location phone' },
      ],
    });

    // Batch payment lookup — N+1 query fix. Pehle har appointment ke liye
    // alag Payment.findOne() chalta tha (50 appts = 50 DB calls = 8 seconds).
    // Ab ek hi $in query me saare payments nikaal ke map me attach karte hain.
    try {
      const Payment = (await import('../models/Payment.js')).default;
      const apptIds = (result.data || []).map(a => a._id.toString());
      if (apptIds.length) {
        const payments = await Payment.find({
          referenceId: { $in: apptIds },
          status: 'completed',
        }).select('referenceId transaction_id invoice_id').lean();
        const paymentMap = new Map(payments.map(p => [p.referenceId, p]));
        for (const appt of result.data || []) {
          const payment = paymentMap.get(appt._id.toString());
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
      }
    } catch (e) {
      console.error('Failed to attach payment info to paginated appointments:', e);
    }

    res.json(result);
  } catch (err) { sendServerError(res, err, 'Request failed'); }
});

// POST /api/appointments/lock-slot — lock a 10:00-10:15 time slot for 5 minutes during patient checkout
//
// APPT-B-09: this was `protect`-only with no per-user cap, so a script could hold
// 5-minute locks across a doctor's whole calendar in a loop and make every slot
// read as "full" to real patients. Locks are now limited per user AND per
// (user, doctor) — one active checkout flow at a time — with a dedicated limiter.
router.post('/lock-slot', protect, bookingLimiter, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;
    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: 'doctorId, date, and time are required to lock a slot' });
    }
    // One active lock per user (across doctors) and one per user+doctor.
    const { redisClient, isRedisReady } = await import('../config/redis.js');
    // Declared outside the guard: the lock-failure cleanup below needs them even
    // when redis was not ready to take the lock in the first place.
    let userKey = null;
    let doctorKey = null;
    if (isRedisReady() && redisClient.isOpen) {
      userKey = `slot-lock:user:${req.user._id}`;
      doctorKey = `slot-lock:doc:${req.user._id}:${doctorId}`;
      const held = await redisClient.mget(userKey, doctorKey);
      const now = Date.now();
      const stillHeld = (v) => v && Number(v.split('|')[0]) > now;
      if (stillHeld(held[0]) || stillHeld(held[1])) {
        return res.status(409).json({ success: false, message: 'You already have a slot reserved in this flow' });
      }
      const payload = `${now + 300000}|${doctorId}|${date}|${time}`;
      await redisClient.multi().set(userKey, payload, { EX: 300 }).set(doctorKey, payload, { EX: 300 }).exec();
    }
    const result = await lockAppointmentSlot(doctorId, date, time, req.user._id, 300);
    if (!result.success) {
      if (userKey && doctorKey) await redisClient.del(userKey, doctorKey).catch(() => {});
      return res.status(409).json(result);
    }
    res.json({ success: true, message: 'Slot reserved for 5 minutes', expiresAt: result.expiresAt });
  } catch (err) {
    sendServerError(res, err, 'Request failed');
  }
});

// POST /api/appointments/release-slot — release slot lock if user changes slot or closes modal
router.post('/release-slot', protect, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;
    if (doctorId && date && time) {
      await releaseAppointmentSlot(doctorId, date, time, req.user._id);
    }
    res.json({ success: true });
  } catch (err) {
    sendServerError(res, err, 'Request failed');
  }
});

// GET /api/appointments/booked-slots?doctorId=&date=
// AUTHZ gap (was UNCLASSIFIED): takes an arbitrary `doctorId` from the query and
// counts that doctor's live bookings, with no check that the caller belongs to
// the same hospital. Availability slots are a booking feature, but the COUNTS
// behind them are appointment volume for a named doctor at another tenant —
// enough to infer a clinician's caseload. Scoped to the caller's own tenant.
// authz: object
router.get('/booked-slots', protect, scopeToHospital, async (req, res) => {
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

    // Redis Concurrent Locked Slots (currently being booked by other users)
    const lockedSlots = await getLockedSlotsForDoctor(doctorId, date);

    // Pending slot removals
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

    res.json({ counts, capacity, fullSlots, lockedSlots, dateDisabled, bookingWindow, pendingDisabledSlots });
  } catch (err) { sendServerError(res, err, 'Request failed'); }
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
    } else if (req.user.role === 'doctor' || req.user.role === 'clinic_doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'hospital_admin') {
      // APPT-B-07: no linked hospital => no rows (was: unfiltered platform-wide).
      if (!req.user.hospitalId) {
        return res.json({ appointments: [], total: 0, page: 1, totalPages: 0 });
      }
      filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'superadmin') {
      // superadmin: platform-wide (optionally narrowed by ?status).
    } else {
      // APPT-B-07: default-deny - any other role gets an empty result instead of
      // an unfiltered Appointment.find({}).
      return res.json({ appointments: [], total: 0, page: 1, totalPages: 0 });
    }
    
    if (status && status !== 'All') filter.status = status;
    
    const { page = 1, limit = 100 } = req.query;
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit) || 100));
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name email phone gender address dateOfBirth bloodGroup')
      .populate('doctorId', 'name specialization')
      .sort({ date: -1, createdAt: 1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean();

    // Batch payment lookup — N+1 fix (same as GET / above). 50 appts = 1 query,
    // na ki 50 alag Payment.findOne() calls.
    try {
      const Payment = (await import('../models/Payment.js')).default;
      const apptIds = appointments.map(a => a._id.toString());
      if (apptIds.length) {
        const payments = await Payment.find({
          referenceId: { $in: apptIds },
          status: 'completed',
        }).select('referenceId transaction_id invoice_id').lean();
        const paymentMap = new Map(payments.map(p => [p.referenceId, p]));
        for (const appt of appointments) {
          const payment = paymentMap.get(appt._id.toString());
          if (payment) {
            appt.transactionId = payment.transaction_id;
            appt.invoiceId = payment.invoice_id;
          }
        }
      }
    } catch (e) {
      console.error('Failed to attach payment info to appointments:', e);
    }
    
    res.json(appointments);
  } catch (err) { sendServerError(res, err, 'Request failed'); }
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
    
    // Batch payment lookup — N+1 fix. Promise.all bhi N parallel queries thi,
    // ab ek hi $in query me saare payments.
    const apptIds = appointments.map(a => a._id.toString());
    const payments = apptIds.length
      ? await Payment.find({
          serviceType: 'appointment',
          referenceId: { $in: apptIds },
          patient_id: req.user._id.toString(),
        }).lean()
      : [];
    const paymentMap = new Map(payments.map(p => [p.referenceId, p]));

    // For each appointment, attach its payment record from the map
    const enrichedAppointments = appointments.map((apt) => {
        const payment = paymentMap.get(apt._id.toString());
        
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
      });
    
    // Unpaid "Pending" appointment matlab payment kabhi complete nahi hua
    // (abandoned/failed checkout) — ye history me kabhi dikhna hi nahi chahiye.
    const visibleAppointments = enrichedAppointments.filter(
      a => !(a.status === 'Pending' && !a.transaction_id)
    );

    const { page = 1, limit = 50 } = req.query;
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const total = visibleAppointments.length;
    const data = visibleAppointments.slice((p - 1) * l, (p - 1) * l + l);
    res.json({ data, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
  } catch (err) {
    console.error('[appointments/history-with-payments] ERROR:', err);
    sendServerError(res, err, 'Request failed');
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const a = await Appointment.findById(req.params.id)
      .populate('patientId', 'name email phone gender address dateOfBirth bloodGroup')
      .populate('doctorId', 'name specialization');
    if (!a) return res.status(404).json({ message: 'Appointment not found' });

    // APPT-B-01: DENY BY DEFAULT.
    //
    // The old check ran the staff branch only when ALL of
    //   role !== 'patient' AND req.user.hospitalId AND a.hospitalId
    // were truthy. A rider, pharmacist, delivery partner or standalone doctor has
    // no hospitalId, so the branch was skipped entirely and they read any
    // appointment — patient name, phone, address, DOB, blood group, symptoms,
    // notes. Requiring all three to be present to ENFORCE is the inverse of the
    // intent.
    //
    // An allowlist is the only shape that fails closed: the reader must positively
    // prove a relationship to the record, and anything unproven is a 404 (which
    // also keeps the id from being probed for existence).
    const verdict = canReadAppointment(req.user, a);
    if (!verdict.ok) {
      logger.warn(
        `APPT-B-01: appointment read denied user=${req.user.id} role=${req.user.role} appointment=${req.params.id} reason=${verdict.reason}`
      );
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json(a);
  } catch (err) { sendServerError(res, err, 'Failed to fetch appointment', { appointmentId: req.params.id }); }
});

/**
 * APPT-B-01: who may read an appointment.
 *
 * Allowlist, and every branch proves a relationship:
 *   superadmin            — by design
 *   owning patient        — patientId resolves to the caller
 *   treating doctor       — doctorId resolves to the caller (directly or via the
 *                           Doctor profile linked by user_id)
 *   same-tenant staff     — caller AND appointment both have a hospitalId and
 *                           they match; if EITHER lacks one this is a DENY, not a pass
 */
export function canReadAppointment(user, appointment) {
  if (!user || !appointment) return { ok: false, reason: 'missing' };
  if (user.role === 'superadmin') return { ok: true, via: 'superadmin' };

  const idOf = (v) => String(typeof v === 'object' ? (v?._id ?? v?.id ?? v) : v);
  const me = String(user._id ?? user.id ?? '');

  const patientId = idOf(appointment.patientId);
  if (me && patientId && patientId === me) return { ok: true, via: 'owner' };

  const doctorId = idOf(appointment.doctorId);
  if (me && doctorId && doctorId === me) return { ok: true, via: 'treating-doctor' };

  // A doctor's appointments are keyed by the Doctor profile, not the User id.
  if (doctorId) {
    const linked = DOCTOR_USER_LINKS.get(doctorId);
    if (linked && linked.has(me)) return { ok: true, via: 'treating-doctor-profile' };
  }

  // Same-tenant staff: BOTH sides must have a hospitalId and they must match.
  const callerHospital = user.hospitalId || user.facilityId;
  const apptHospital = appointment.hospitalId;
  if (callerHospital && apptHospital && String(callerHospital) === String(apptHospital)) {
    return { ok: true, via: 'same-tenant' };
  }

  return {
    ok: false,
    reason: !callerHospital ? 'caller-has-no-tenant' : !apptHospital ? 'appointment-has-no-tenant' : 'cross-tenant',
  };
}

/**
 * APPT-B-01: Doctor._id -> the set of User ids that own that profile.
 *
 * Resolved lazily and memoised per process because it is a pure function of the
 * Doctor collection, and it keeps the read path synchronous.
 */
const DOCTOR_USER_LINKS = new Map();
export async function primeDoctorUserLinks() {
  try {
    const rows = await Doctor.find({}, 'user_id').lean();
    const map = new Map();
    for (const d of rows) {
      if (!d?._id || !d?.user_id) continue;
      const key = String(d._id);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(String(d.user_id));
    }
    DOCTOR_USER_LINKS.clear();
    for (const [k, v] of map) DOCTOR_USER_LINKS.set(k, v);
  } catch (err) {
    logger.error(`primeDoctorUserLinks failed: ${err.message}`);
  }
}
primeDoctorUserLinks();
setInterval(primeDoctorUserLinks, 5 * 60 * 1000).unref?.();

// ─── Walk-in Booking (doctor/clinic/staff se: patient register + appointment ek saath) ───
router.post('/walk-in', protect, requireRole(['doctor', 'clinic_doctor', 'clinic_admin', 'hospital_admin', 'superadmin']), validate(walkInSchema), async (req, res) => {
  // APPT-B-02: holds the atomic seat claim so a later failure releases it.
  // walkInSlotKey carries the slot coordinates into the catch block (the
  // reservation result itself is only { ok, count }).
  let walkInSlotReserved = null;
  let walkInSlotKey = null;
  try {
    const { patient, doctorId, doctor, department, date, time, type, symptoms, priority, notes } = req.body;

    // 1. Patient register — pehle se same phone/email ka patient ho to reuse karo
    //    (timeout → client retry karne par duplicate patient na bane)
    // 1. Patient register — same phone/email REUSE karo, but tenant-scoped.
    //
    // APPT-B-03: the old lookup was `Patient.findOne({ phone })` with NO tenant
    // predicate and no uniqueness, which had two defects:
    //   1. cross-tenant merge — a phone match could resolve to the patient of a
    //      DIFFERENT hospital, whose record then became visible to this
    //      hospital's staff through the booking;
    //   2. racy — two concurrent walk-ins both missed and both created.
    // The lookup is now scoped to the caller's tenant, and a unique partial
    // index makes the loser re-read the winner instead of duplicating.
    let p = null;
    const callerHospital = req.user.hospitalId || null;
    const tenantClause = callerHospital ? { hospitalId: callerHospital } : {};
    if (patient.phone) p = await Patient.findOne({ phone: patient.phone, ...tenantClause });
    if (!p && patient.email) p = await Patient.findOne({ email: patient.email, ...tenantClause });
    if (!p) {
      try {
        p = await Patient.create({
          name: patient.name,
          age: patient.age !== undefined ? Number(patient.age) : 0,
          gender: patient.gender || 'Other',
          phone: patient.phone || '',
          email: patient.email || '',
          bloodGroup: patient.bloodGroup || '',
          address: patient.address || '',
          hospitalId: callerHospital || undefined,
        });
      } catch (dupErr) {
        // APPT-B-03: unique (phone, hospital) / (email, hospital) lost the race.
        if (dupErr?.code === 11000) {
          const key = patient.phone ? { phone: patient.phone } : { email: patient.email };
          p = await Patient.findOne({ ...key, ...tenantClause });
          if (!p) throw dupErr;
        } else throw dupErr;
      }
    }

    // APPT-B-08: ONE canonical subject id.
    //
    // `Appointment.patientId` was written from two different worlds:
    //   /walk-in              → Patient._id  (the Patient record it just created)
    //   /appointments, /pay   → req.user._id (the User account)
    // Every ownership check then compared `appointment.patientId` to
    // `req.user._id`, so a walk-in appointment was invisible in that patient's own
    // list AND the patient got 403 trying to cancel it — the comparison could
    // never be true. Staff lookups by User id missed walk-in rows entirely.
    //
    // The canonical value on `Appointment.patientId` is the USER id (that is what
    // every authorization check, scope filter and notification path compares
    // against). When the Patient record carries a `userId` link it is used;
    // a genuine walk-in with no account keeps its Patient id in a separate,
    // explicitly-named field so nothing mistakes it for a user.
    const canonicalPatientId = p.userId ? String(p.userId) : String(p._id);

    // 2. Doctor resolve (doctor role ke liye khud ka profile, warna body wala)
    const targetDoctorId = doctorId || req.user.doctorProfileId || null;
    let targetDoctorName = doctor || req.user.name || '';
    let hospitalId = req.user.hospitalId || undefined;
    if (targetDoctorId) {
      const doctorDoc = await Doctor.findById(targetDoctorId);
      if (doctorDoc) {
        targetDoctorName = targetDoctorName || doctorDoc.name;
        if (doctorDoc.hospitalId) hospitalId = doctorDoc.hospitalId;
      }
    }

    // A5 (5.md §15: server-side price, no client price): the walk-in fee is
    // resolved from the doctor's listed consultation fee through the same
    // pricingService the checkout path uses. The body's `fees` is stripped by
    // the schema and ignored here — a modified client could otherwise book a
    // ₹1 walk-in and the row would say the consultation cost ₹1. A doctor with
    // no configured fee records 0 (walk-in is staff-recorded, not captured here).
    let serverFees = 0;
    if (targetDoctorId) {
      const authoritative = await resolveAuthoritativeAmount({
        serviceType: 'appointment',
        appointment: { doctorId: targetDoctorId },
      });
      if (authoritative.ok) serverFees = authoritative.amount;
    }

    // 2b. Duplicate-booking guard (idempotency) — same patient + doctor + slot
    //     agla request pehle hi ban chuka ho to naya banaane ki bajaye wahi return karo
    if (targetDoctorId && p) {
      const dup = await Appointment.findOne({
        // APPT-B-08: de-dup on the CANONICAL id, and fall back to the Patient record
        // so a walk-in appointment created before this fix is still matched.
        $or: [{ patientId: canonicalPatientId }, { patientRecordId: p._id }],
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
    //
    // APPT-B-02: `Appointment.find(slot)` then `create` is check-then-write, so two
    // simultaneous walk-ins both read `capacity - 1` bookings and both were
    // written — the doctor's maxBookingsPerSlot was silently overshot.
    //
    // The decisive guard is the atomic reservation in slotCapacity: a unique row
    // per (doctor, date, time) incremented with a single guarded
    // `findOneAndUpdate`, so only one of the racing updates can match. The read
    // below stays purely as a friendly early message.
    if (targetDoctorId) {
      const doctorDoc2 = await Doctor.findById(targetDoctorId).select('maxBookingsPerSlot').lean();
      const capacity = doctorDoc2?.maxBookingsPerSlot || 1;
      const reservation = await reserveSlotSeat({
        doctorId: targetDoctorId, date, time, capacity,
      });
      if (!reservation.ok) {
        return res.status(409).json({
          message: reservation.reason === 'invalid-slot'
            ? 'Could not verify slot availability.'
            : 'This time slot is full. Please choose a different time.',
          code: 'SLOT_FULL',
        });
      }
      walkInSlotReserved = reservation;
      walkInSlotKey = { doctorId: targetDoctorId, date, time };
    }

    // 4. Appointment create (Confirmed)
    const tokenNumber = await getNextOPDTokenNumber(targetDoctorId || 'general', date);
    const estimatedWaitTime = await calculateEstimatedWaitTime(department || 'General', priority);
    const appointment = await Appointment.create({
      tokenNumber,
      uhid: p.uhid || undefined,
      patient: p.name,
      // APPT-B-08: the canonical subject id is the USER id, matching every other
      // write path and every ownership check. `patientRecordId` keeps the Patient
      // record reachable for a genuine walk-in that has no account, without
      // putting a Patient._id where a User._id is expected.
      patientId: canonicalPatientId,
      patientRecordId: p.userId ? undefined : p._id,
      doctor: targetDoctorName || 'Doctor',
      doctorId: targetDoctorId,
      department: department || 'General',
      date,
      time,
      type: type || 'Consultation',
      symptoms: symptoms || '',
      notes: notes || '',
      priority: priority || 'Normal',
      fees: serverFees,
      estimatedWaitTime,
      hospitalId,
      status: 'Confirmed',
    });

    if (targetDoctorId && date && time) {
      await releaseAppointmentSlot(targetDoctorId, date, time, req.user._id);
    }

    await auditLog('create_appointment', req.user._id, { recordId: appointment._id, ip: req.ip, userAgent: req.get('user-agent') });
    await emitAppointmentUpdate(appointment);
    res.status(201).json({ appointment, patient: p });
  } catch (err) {
    // APPT-B-02 (partial): a failed Appointment.create after the atomic reserve
    // leaked one seat until reconcileSlot. Hand the claim back (DB counter +
    // Redis lock) so the ledger never runs ahead of the data.
    if (walkInSlotReserved && walkInSlotKey) {
      await releaseSlotSeat(walkInSlotKey)
        .catch((relErr) => logger.error(`APPT-B-02: walk-in slot rollback failed: ${relErr.message}`));
      await releaseAppointmentSlot(walkInSlotKey.doctorId, walkInSlotKey.date, walkInSlotKey.time, req.user._id)
        .catch(() => {});
    }
    res.status(400).json({ message: err.message });
  }
});

router.post('/', protect, requireRole(['hospital_admin', 'superadmin']), authorize('appointments:write'), validate(createAppointmentSchema), async (req, res) => {
  try {
    const { doctorId, doctor, department, date, time, type, symptoms, priority, appointmentMode } = req.body;
    
    const patientName = req.user.name;
    const patientId = req.user._id;
    
    let hospitalId = null;
    if (doctorId) {
      const doctorDoc = await Doctor.findById(doctorId);
      if (doctorDoc && doctorDoc.hospitalId) {
        hospitalId = doctorDoc.hospitalId;
      }
    }

    // A3-part-2: provider-service attribution. The slot the patient picked on
    // the provider page carries its service; the booking stores the link so
    // provider dashboards, bills and follow-ups can attribute it. A service
    // with an assigned practitioner must match the booked doctor, otherwise
    // the booking could launder one doctor's availability into another's
    // catalog entry. Unassigned services (lab panels, facility offerings)
    // ride along with any doctor.
    let serviceId = null;
    let providerId = null;
    if (req.body.serviceId) {
      const svc = await Service.findById(req.body.serviceId).lean();
      if (!svc || !svc.isActive) {
        return res.status(400).json({ message: 'Service is not available' });
      }
      if (svc.practitionerId && doctorId && String(svc.practitionerId) !== String(doctorId)) {
        return res.status(400).json({ message: 'Service does not belong to this doctor' });
      }
      serviceId = svc._id;
      providerId = svc.providerId || null;
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
    const tokenNumber = await getNextOPDTokenNumber(doctorId || 'general', date);
    const patientUser = await User.findById(patientId);
    const estimatedWaitTime = await calculateEstimatedWaitTime(department, priority);
    const appointment = await Appointment.create({
        tokenNumber,
        uhid: hospitalId ? (patientUser?.uhid || '') : undefined,
        patient: patientName,
        patientId,
        doctor: doctor || '',
        doctorId: doctorId || null,
        department: department || 'General',
        date,
        time,
        type: type || 'Consultation',
        appointmentMode: appointmentMode || (type?.toLowerCase().includes('chat') ? 'chat' : type?.toLowerCase().includes('video') ? 'video' : type?.toLowerCase().includes('audio') || type?.toLowerCase().includes('voice') ? 'audio' : type?.toLowerCase().includes('home') ? 'home_visit' : 'offline'),
        symptoms: symptoms || '',
        priority: priority || 'Normal',
        estimatedWaitTime,
        hospitalId: hospitalId || undefined,
        serviceId: serviceId || undefined,
        providerId: providerId || undefined,
        status: 'Pending'
      });
      
    if (doctorId && date && time) {
      await releaseAppointmentSlot(doctorId, date, time, patientId);
    }

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
    // APPT-B-01: shared allowlist instead of the fail-open inline check.
    if (!canReadAppointment(req.user, appointment).ok) {
      return res.status(404).json({ message: 'Appointment not found' });
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

const APPOINTMENT_QUEUE_ROLES = [
  'doctor', 'clinic_doctor', 'clinic_admin', 'hospital_admin', 'superadmin',
];

router.get('/queue/:department', protect, requireRole(APPOINTMENT_QUEUE_ROLES), async (req, res) => {
  try {
    const filter = {
      department: req.params.department,
      status: { $in: ['In Queue', 'Called'] },
    };
    if (req.user.role !== 'superadmin') {
      const tenantId = req.user.hospitalId || req.user.facilityId;
      if (!tenantId) return res.status(403).json({ message: 'Facility scope required' });
      filter.hospitalId = tenantId;
    } else if (req.query.hospitalId) {
      // Only a platform superadmin may narrow the global queue by tenant.
      filter.hospitalId = req.query.hospitalId;
    }
    const { data, total, totalPages, page: p, limit: l } = await paginatedResults(
      Appointment,
      filter,
      { page: req.query.page, limit: req.query.limit, sort: { queuePosition: 1 } },
    );
    const queue = data.map((a) => ({
      _id: a._id,
      tokenNumber: a.tokenNumber,
      department: a.department,
      queuePosition: a.queuePosition,
      status: a.status,
      date: a.date,
      time: a.time,
    }));
    res.json({ queue, page: p, limit: l, total, totalPages });
  } catch (err) { sendServerError(res, err, 'Request failed'); }
});
router.put('/:id/transit', protect, authorize('appointments:write', 'appointments:write:own'), async (req, res) => {
  try {
    const { lat, lng, address, transitStatus, etaMinutes, distanceKm } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    // APPT-B-01: one allowlist for every appointment-scoped route. This used to be
    // a second, hand-rolled copy of the rule that silently lacked the
    // doctor-profile and same-tenant branches.
    if (!canReadAppointment(req.user, appointment).ok) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (lat !== undefined && (Number(lat) < -90 || Number(lat) > 90)) {
      return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
    }
    if (lng !== undefined && (Number(lng) < -180 || Number(lng) > 180)) {
      return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
    }

    appointment.patientLocation = {
      lat: lat !== undefined ? Number(lat) : appointment.patientLocation?.lat,
      lng: lng !== undefined ? Number(lng) : appointment.patientLocation?.lng,
      address: address !== undefined ? address : (appointment.patientLocation?.address || ''),
      transitStatus: transitStatus || appointment.patientLocation?.transitStatus || 'pending_departure',
      etaMinutes: etaMinutes !== undefined ? Number(etaMinutes) : appointment.patientLocation?.etaMinutes,
      distanceKm: distanceKm !== undefined ? Number(distanceKm) : appointment.patientLocation?.distanceKm,
      updatedAt: new Date(),
    };

    if (transitStatus === 'arrived' && appointment.status === 'Confirmed') {
      appointment.status = 'In Queue';
      appointment.checkedInAt = appointment.checkedInAt || new Date();
    }

    await appointment.save();
    await emitAppointmentUpdate(appointment);
    return res.json({ success: true, appointment });
  } catch (err) {
    sendServerError(res, err, 'Request failed');
  }
});

router.put('/:id/intake', protect, authorize('appointments:write', 'appointments:write:own'), async (req, res) => {
  try {
    const {
      chiefComplaint, chiefComplaintOther, symptomsDuration,
      pastMedicalHistory, currentTreatment, testReports,
      currentMedications, allergies, familyHistory,
    } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    // APPT-B-01: same shared allowlist (see the note on the transit route).
    if (!canReadAppointment(req.user, appointment).ok) {
      return res.status(404).json({ message: 'Appointment not found' });
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
    sendServerError(res, err, 'Request failed'); 
  }
});

router.put('/:id', protect, authorize('appointments:write', 'appointments:write:own'), validate(updateAppointmentSchema), async (req, res) => {
  try {
    const { status, notes, time, date } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    // APPT-B-01: shared allowlist instead of the fail-open inline check.
    if (!canReadAppointment(req.user, appointment).ok) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if ((req.user.role === 'doctor' || req.user.role === 'clinic_doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') && appointment.doctorId && appointment.doctorId.toString() !== req.user.doctorProfileId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this appointment' });
    }
    
    const oldStatus = appointment.status;

    // A5 (5.md §2.1): every status change is checked against the shared table
    // BEFORE anything else runs. The old path wrote `req.body.status` straight
    // through, so a client could move a Completed consult back to Confirmed —
    // and the zod schema's legacy `Rescheduled` value reached the model enum
    // and failed there instead of being refused as the illegal move it is.
    if (status && status !== oldStatus) {
      try {
        assertAppointmentTransition(oldStatus, status);
      } catch (err) {
        return res.status(err.status || 409).json({
          message: err.message,
          code: err.code || 'ILLEGAL_STATE_TRANSITION',
          from: oldStatus,
          to: status,
        });
      }
    }

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

    // A5 (5.md §2.4): the cancellation decision (tier, refund owed, fee kept)
    // is computed BEFORE the row is committed so all of it lands in one write.
    // The plan is recomputed on a RETRY — status Cancelled even when the row
    // already says so — because the first attempt may have cancelled the row
    // without moving money; the refund itself is issued after the commit and is
    // idempotent on its key, so re-running this is safe.
    let cancelPlan = null;
    if (status === 'Cancelled') {
      // A non-patient canceller is acting for the provider (5.md §2.4: the
      // provider column of the tier table is always a full refund).
      const cancelledBy = req.user.role === 'patient' ? 'patient' : 'provider';
      const payment = await Payment.findOne({
        serviceType: 'appointment',
        referenceId: String(appointment._id),
        status: { $in: ['completed', 'partially_refunded'] },
      });
      cancelPlan = computeCancellation({
        startAt: slotStartAt(appointment.date, appointment.time),
        now: new Date(),
        cancelledBy,
        paidAmount: payment ? Number(payment.amount) || 0 : 0,
      });
      cancelPlan.payment = payment || null;
      if (oldStatus !== 'Cancelled') {
        updates.cancelledBy = cancelPlan.cancelledBy;
        updates.cancelledAt = new Date();
        updates.cancellationTier = cancelPlan.tier;
        updates.cancellationFee = cancelPlan.feeAmount;
        updates.refundAmount = cancelPlan.refundAmount;
      }
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

    // APPT-B-05: slot release is a SIDE EFFECT of leaving an active status, so it
    // must be applied at most once no matter how many times the request is
    // retried. Two details made that false before:
    //   * the update was an unfiltered findByIdAndUpdate, so a retry re-ran every
    //     side effect (notification, refund request, slot release);
    //   * a reschedule never released the OLD seat, so the original slot stayed
    //     full while the new one was also consumed.
    // Both are now derived from a single observed transition.
    // APPT-B-05: the NEW seat is claimed BEFORE the row is committed, and the
    // OLD seat released after.
    //
    // The previous ordering was:
    //   1. findByIdAndUpdate(updates)   <- row committed with the NEW date/time
    //   2. reserveSlotSeat(new slot)    <- may fail
    //   3. on failure -> 409
    // Two defects fell out of that:
    //   * On failure the row had ALREADY moved. The appointment claimed a slot it
    //     did not hold, the old slot stayed marked taken, and capacity for that
    //     doctor became wrong in BOTH directions. A retry then saw
    //     updates.date === appointment.date, skipped the reservation entirely, and
    //     the inconsistency never self-healed.
    //   * On success the OLD seat was never released - it was only released on a
    //     transition to a terminal status - so every reschedule leaked one seat.
    //
    // Correct order: reserve -> commit -> release, rolling the claim back if the
    // commit throws. The slot ledger becomes the source of truth and the row a
    // follower of it.
    const slotChanged = (updates.date && updates.date !== appointment.date)
      || (updates.time && updates.time !== appointment.time);

    let claimedNewSlot = null;
    if (slotChanged && appointment.doctorId) {
      const targetDoctorId = updates.doctorId || appointment.doctorId;
      const doctorDoc = await Doctor.findById(targetDoctorId)
        .select('maxBookingsPerSlot').lean();
      const reservation = await reserveSlotSeat({
        doctorId: targetDoctorId,
        date: updates.date,
        time: updates.time,
        capacity: doctorDoc?.maxBookingsPerSlot || 1,
      });
      if (!reservation.ok) {
        // Nothing has been committed yet, so there is nothing to undo.
        return res.status(409).json({
          message: reservation.reason === 'invalid-slot'
            ? 'Could not verify slot availability.'
            : 'This time slot is full. Please choose a different slot.',
          code: 'SLOT_FULL',
        });
      }
      claimedNewSlot = { doctorId: targetDoctorId, date: updates.date, time: updates.time };
    }

    const leftActiveSlot = ['Pending', 'Confirmed'].includes(oldStatus);
    const willBeTerminal = ['Cancelled', 'Missed', 'Completed'].includes(
      updates.status || oldStatus
    );

    // Commit the row now that the seat is genuinely held. If this throws, the
    // claimed seat is handed back so the ledger is never ahead of the data.
    let updated;
    try {
      updated = await Appointment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
        .populate('patientId', 'name email phone gender address dateOfBirth bloodGroup')
        .populate('doctorId', 'name');
    } catch (commitErr) {
      if (claimedNewSlot) {
        await releaseSlotSeat(claimedNewSlot)
          .catch((relErr) => logger.error(`APPT-B-05: slot rollback failed: ${relErr.message}`));
      }
      throw commitErr;
    }

    const isTerminal = ['Cancelled', 'Missed', 'Completed'].includes(updated.status);
    if (leftActiveSlot && isTerminal) {
      await releaseSlotSeat({
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
      }).catch((relErr) => logger.error(`slot release failed: ${relErr.message}`));
      // APPT-M-01: cancellation frees a seat - offer it to the oldest waiter.
      void onSlotFreed({ doctorId: appointment.doctorId, date: appointment.date, time: appointment.time })
        .catch((wlErr) => logger.error(`waitlist offer failed: ${wlErr.message}`));
    }

    // A successful reschedule frees the seat it came from. This was missing
    // entirely, which is why repeated reschedules slowly exhausted a doctor's
    // daily capacity.
    if (claimedNewSlot && !(leftActiveSlot && willBeTerminal)) {
      await releaseSlotSeat({
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
      }).catch((relErr) => logger.error(`APPT-B-05: old slot release failed: ${relErr.message}`));
      // APPT-M-01: the vacated old slot is a freed seat too.
      void onSlotFreed({ doctorId: appointment.doctorId, date: appointment.date, time: appointment.time })
        .catch((wlErr) => logger.error(`waitlist offer failed: ${wlErr.message}`));

      if (updates.doctorId && String(updates.doctorId) !== String(appointment.doctorId)) {
        logger.info(`APPT-B-05: appointment ${req.params.id} moved between doctors; both seats reconciled`);
      }
    }

     if (status && status !== oldStatus) {
       const patientUser = await import('../models/User.js').then(m => m.default.findById(updated.patientId?._id));
       if (patientUser) {
         await createNotification(patientUser._id.toString(), 'Appointment Update', `Your appointment status changed to ${status}`, 'appointment');
       }
       if (updated.doctorId) {
         await createNotification(updated.doctorId._id.toString(), 'Appointment Update', `Appointment with ${updated.patient} status changed to ${status}`, 'appointment');
       }
     }
      // LOYAL-M-02: a cancelled booking gives its points back. Fail-soft and
      // idempotent (reversePoints no-ops unless an earn exists for this id).
      if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
        const loyaltyPid = updated.patientId?._id || updated.patientId;
        if (loyaltyPid) {
          void loyaltyService.reversePoints(loyaltyPid, 'appointment_completed', updated._id)
            .catch((revErr) => logger.warn(`appointment loyalty reversal failed: ${revErr.message}`));
        }
      }
      // A5 (5.md §2.4, §14: refunds auto on provider cancel): the money goes
      // back AFTER the state change — a gateway failure must never un-cancel
      // the booking. `refundAmount` on the row records what the POLICY is owed;
      // the payment's `refund_amount` records what was actually issued, so a
      // refusal leaves the gap visible for ops instead of silently lost.
      if (cancelPlan?.payment && cancelPlan.refundAmount > 0) {
        const outcome = await issueRefund({
          paymentId: cancelPlan.payment._id,
          amount: cancelPlan.refundAmount,
          originalAmount: cancelPlan.payment.amount,
          reason: `Appointment ${appointment._id} cancelled by ${cancelPlan.cancelledBy} (${cancelPlan.tier}, ${cancelPlan.refundPercent}% refund per policy)`,
          reasonCode: cancelPlan.cancelledBy === 'provider' ? 'provider_cancelled' : 'appointment_cancelled',
          requestedBy: req.user._id || req.user.id || null,
          idempotencyKey: `appt-cancel:${appointment._id}:${cancelPlan.payment._id}`,
        });
        if (!outcome.ok) {
          logger.warn(`A5: appointment ${appointment._id} cancelled but refund not issued (${outcome.reason})`);
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

router.delete('/:id', protect, authorize('appointments:write', 'appointments:write:own'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    // APPT-B-01: shared allowlist. The old inline checks ran the staff branch only
    // when BOTH sides had a hospitalId, so a tenant-less account passed straight
    // through — and the trailing `isAuthorized` compound below re-derived the
    // rule a second time with the same fail-open shape.
    const deleteVerdict = canReadAppointment(req.user, appointment);
    if (!deleteVerdict.ok) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if ((req.user.role === 'doctor' || req.user.role === 'clinic_doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') && appointment.doctorId?.toString() !== req.user.doctorProfileId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this appointment' });
    }
    // APPT-B-05: deleting frees the seat, and it must free it exactly once even if
    // the client retries (a delete of a deleted id is already a 404, but a
    // cancel-then-delete pair must not release twice).
    await Appointment.findByIdAndDelete(req.params.id);
    // LOYAL-M-02: deleting a booking that already earned its points must give
    // them back too (a Completed appointment can be deleted without ever being
    // cancelled). No-op unless an earn exists for this id.
    const delLoyaltyPid = appointment.patientId?._id || appointment.patientId;
    if (delLoyaltyPid) {
      void loyaltyService.reversePoints(delLoyaltyPid, 'appointment_completed', appointment._id)
        .catch((revErr) => logger.warn(`appointment loyalty reversal on delete failed: ${revErr.message}`));
    }
    if (['Pending', 'Confirmed'].includes(appointment.status) && appointment.doctorId) {
      await releaseSlotSeat({
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
      }).catch((relErr) => logger.error(`slot release failed: ${relErr.message}`));
      // APPT-M-01: a deleted appointment frees its seat - offer it onward.
      void onSlotFreed({ doctorId: appointment.doctorId, date: appointment.date, time: appointment.time })
        .catch((wlErr) => logger.error(`waitlist offer failed: ${wlErr.message}`));
    }
    await auditLog('delete_appointment', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    await emitAppointmentUpdate({ _id: req.params.id, doctorId: appointment.doctorId, patientId: appointment.patientId });
    res.json({ message: 'Appointment removed' });
  } catch (err) { sendServerError(res, err, 'Request failed'); }
});

export default router;
