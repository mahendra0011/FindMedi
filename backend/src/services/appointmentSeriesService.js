import Appointment from '../models/Appointment.js';
import AppointmentSeries from '../models/AppointmentSeries.js';
import Doctor from '../models/Doctor.js';
import { reserveSlotSeat, releaseSlotSeat } from './slotCapacity.js';
import { generateTokenNumber } from '../utils/idGenerator.js';
// APPT-M-02: cancelling an occurrence frees its seat like any other cancel.
import { onSlotFreed } from './waitlistService.js';
import logger from '../config/logger.js';

/**
 * APPT-M-02: recurring appointment series.
 *
 * The series is a container; every occurrence is a real Appointment created
 * up front (seriesId + seriesIndex), so reminders, queueing, payment
 * confirmation, per-occurrence cancel/reschedule and waitlist fan-out all keep
 * working on children with zero knowledge of "series". Capacity for each
 * occurrence is claimed through the same atomic reservation the walk-in and
 * reschedule paths use (compare-and-set, not check-then-write).
 *
 * Money: children are created Pending with the normal 15-minute checkout hold
 * and the existing checkout auto-confirms each one as the patient pays
 * (referenceId pay loop from the FE). An abandoned series therefore dies the
 * same way an abandoned single booking does - via the existing stale sweeps -
 * with no second expiry mechanism to maintain.
 */

export const SERIES_COUNT_MIN = 2;
export const SERIES_COUNT_MAX = 12;
/** Mirrors CHECKOUT_HOLD_MINUTES in routes/billing.js - one number, two names. */
export const SERIES_CHECKOUT_HOLD_MS = 15 * 60 * 1000;

const ACTIVE_APPT = { $nin: ['Cancelled', 'Completed', 'Missed'] };
const FREQUENCIES = ['weekly', 'biweekly', 'monthly'];

const fail = (status, code, message) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

/** Map service errors onto the HTTP response; 500s keep the safe path. */
export const sendSeriesError = (res, err) => {
  if (err.status) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }
  logger.error(`[appointmentSeries] ${err.stack || err.message}`);
  return res.status(500).json({ message: 'Request failed' });
};

const pad2 = (n) => String(n).padStart(2, '0');
const formatUTC = (year, monthIndex, day) => `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

/**
 * Occurrence dates for a pattern, computed in UTC so a server TZ can never
 * shift a date across a day boundary. monthly keeps the day-of-month of the
 * start date and clamps to the last day of shorter months (Jan 31 -> Feb 28/29).
 *
 * @returns {string[]} `count` YYYY-MM-DD strings, first === startDate.
 */
export function computeOccurrences(startDate, frequency, count) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(startDate || ''));
  if (!m) throw fail(422, 'BAD_DATE', 'date must be YYYY-MM-DD');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const base = new Date(Date.UTC(y, mo - 1, d));
  if (base.getUTCFullYear() !== y || base.getUTCMonth() !== mo - 1 || base.getUTCDate() !== d) {
    throw fail(422, 'BAD_DATE', 'date must be a real calendar date');
  }
  if (!FREQUENCIES.includes(frequency)) {
    throw fail(422, 'BAD_FREQUENCY', 'frequency must be weekly, biweekly or monthly');
  }
  const stepDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 0;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    if (frequency === 'monthly') {
      const targetMonth = (mo - 1) + i;
      const year = y + Math.floor(targetMonth / 12);
      const month = targetMonth % 12;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      out.push(formatUTC(year, month, Math.min(d, lastDay)));
    } else {
      out.push(new Date(base.getTime() + i * stepDays * 86400000).toISOString().slice(0, 10));
    }
  }
  return out;
}

const releaseAll = async (keys) => {
  for (const key of keys) {
    await releaseSlotSeat(key).catch((relErr) => {
      logger.error(`[appointmentSeries] seat rollback failed: ${relErr.message}`);
    });
  }
};

/**
 * Create the series container plus one Pending Appointment per occurrence.
 *
 * Order: capacity claims first (each occurrence is atomic), then the container,
 * then the children - a failure at any step hands back every seat already
 * claimed so the slot ledger never runs ahead of the data.
 */
export async function createSeries({
  patientId,
  patientName = '',
  doctorId,
  date,
  time,
  frequency,
  count,
  feesPerOccurrence = 0,
  appointmentMode = 'offline',
  type = 'Consultation',
  department,
  notes = '',
  symptoms = '',
}) {
  const doctor = await Doctor.findById(doctorId)
    .select('name specialization hospitalId maxBookingsPerSlot')
    .lean();
  if (!doctor) throw fail(404, 'DOCTOR_NOT_FOUND', 'Doctor not found');

  const occurrenceCount = Number(count);
  if (!Number.isInteger(occurrenceCount) || occurrenceCount < SERIES_COUNT_MIN || occurrenceCount > SERIES_COUNT_MAX) {
    throw fail(422, 'BAD_COUNT', `count must be an integer between ${SERIES_COUNT_MIN} and ${SERIES_COUNT_MAX}`);
  }
  // Throws 422 on a bad frequency or impossible calendar date.
  const occurrences = computeOccurrences(date, frequency, occurrenceCount);

  // Friendly early message; the atomic reservation below is the decisive guard.
  const mine = await Appointment.find({
    patientId, doctorId, date: { $in: occurrences }, time, status: ACTIVE_APPT,
  }).select('date').lean();
  if (mine.length) {
    throw fail(409, 'ALREADY_BOOKED', `You already have an appointment with this doctor on ${mine[0].date} at ${time}.`);
  }

  const capacity = Number(doctor.maxBookingsPerSlot) > 0 ? Number(doctor.maxBookingsPerSlot) : 1;
  const reservedKeys = [];
  for (const occDate of occurrences) {
    const reservation = await reserveSlotSeat({ doctorId, date: occDate, time, capacity });
    if (!reservation.ok) {
      await releaseAll(reservedKeys);
      throw fail(409, 'SLOT_FULL', `The slot on ${occDate} at ${time} is full. The series was not booked.`);
    }
    reservedKeys.push({ doctorId, date: occDate, time });
  }

  let series = null;
  try {
    series = await AppointmentSeries.create({
      patientId,
      patientName,
      doctorId,
      doctor: doctor.name,
      hospitalId: doctor.hospitalId || undefined,
      department: department || doctor.specialization || 'General',
      type,
      appointmentMode,
      notes,
      symptoms,
      frequency,
      count: occurrenceCount,
      startDate: date,
      time,
      occurrenceDates: occurrences,
      feesPerOccurrence: Number(feesPerOccurrence) || 0,
      totalFees: (Number(feesPerOccurrence) || 0) * occurrenceCount,
      status: 'active',
    });

    const children = [];
    for (let i = 0; i < occurrences.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- deterministic order keeps seriesIndex aligned with dates
      const appt = await Appointment.create({
        tokenNumber: generateTokenNumber(),
        patient: patientName,
        patientId,
        doctor: doctor.name,
        doctorId,
        department: series.department,
        date: occurrences[i],
        time,
        type,
        appointmentMode,
        notes,
        symptoms,
        status: 'Pending',
        fees: series.feesPerOccurrence,
        hospitalId: doctor.hospitalId || undefined,
        checkoutExpiresAt: new Date(Date.now() + SERIES_CHECKOUT_HOLD_MS),
        seriesId: series._id,
        seriesIndex: i,
      });
      children.push(appt);
    }

    series.occurrenceIds = children.map((c) => c._id);
    await series.save();
    return { series, appointments: children };
  } catch (err) {
    // Roll the whole attempt back: children were never paid for, the series
    // bookkeeping is meaningless without them, and every seat goes back.
    try {
      if (series) {
        await Appointment.deleteMany({ seriesId: series._id });
        await AppointmentSeries.deleteOne({ _id: series._id });
      }
    } catch (cleanupErr) {
      logger.error(`[appointmentSeries] rollback failed: ${cleanupErr.message}`);
    }
    await releaseAll(reservedKeys);
    throw err;
  }
}

/** The patient's series, newest first, each with its occurrence appointments. */
export async function listSeries(patientId) {
  const series = await AppointmentSeries.find({ patientId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  if (!series.length) return [];

  const occurrences = await Appointment.find({ seriesId: { $in: series.map((s) => s._id) } })
    .select('seriesId date time status fees seriesIndex cancellationReason cancelledAt')
    .lean();

  const bySeries = new Map();
  for (const appt of occurrences) {
    const key = String(appt.seriesId);
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key).push({
      _id: appt._id,
      date: appt.date,
      time: appt.time,
      status: appt.status,
      fees: appt.fees,
      seriesIndex: appt.seriesIndex,
      cancellationReason: appt.cancellationReason || '',
      cancelledAt: appt.cancelledAt || null,
    });
  }
  for (const list of bySeries.values()) {
    list.sort((a, b) => (a.seriesIndex ?? 0) - (b.seriesIndex ?? 0));
  }

  return series.map((s) => ({ ...s, occurrences: bySeries.get(String(s._id)) || [] }));
}

/**
 * Cancel every not-yet-terminal occurrence and mark the series cancelled.
 *
 * The route-level PUT/DELETE transition logic (release + waitlist fan-out)
 * lives in routes/appointments.js for single-row edits; a bulk cancel bypasses
 * it, so both side effects are applied here for each seat actually given back.
 * Idempotent: cancelling twice is a no-op with cancelledCount 0.
 */
export async function cancelSeries({ seriesId, patientId, reason = '' }) {
  const series = await AppointmentSeries.findOne({ _id: seriesId, patientId });
  if (!series) throw fail(404, 'NOT_FOUND', 'Series not found');
  if (series.status === 'cancelled') return { series, cancelledCount: 0 };

  const cancellable = await Appointment.find({ seriesId: series._id, status: ACTIVE_APPT })
    .select('doctorId date time')
    .lean();

  if (cancellable.length) {
    await Appointment.updateMany(
      { _id: { $in: cancellable.map((a) => a._id) } },
      {
        $set: {
          status: 'Cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason || 'Series cancelled',
        },
      },
    );
    for (const appt of cancellable) {
      await releaseSlotSeat({ doctorId: appt.doctorId, date: appt.date, time: appt.time })
        .catch((relErr) => logger.error(`[appointmentSeries] seat release failed: ${relErr.message}`));
      void onSlotFreed({ doctorId: appt.doctorId, date: appt.date, time: appt.time })
        .catch((wlErr) => logger.error(`[appointmentSeries] waitlist offer failed: ${wlErr.message}`));
    }
  }

  series.status = 'cancelled';
  series.cancelledAt = new Date();
  series.cancellationReason = reason || 'Series cancelled';
  await series.save();

  return { series, cancelledCount: cancellable.length };
}
