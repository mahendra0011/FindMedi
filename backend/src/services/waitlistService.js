import WaitlistEntry from '../models/WaitlistEntry.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { resolveAuthoritativeAmount } from './pricingService.js';
import { createNotification } from './notificationService.js';
import { emitAppointmentUpdate, notifyUser } from './socketService.js';
import { generateTokenNumber } from '../utils/idGenerator.js';
import logger from '../config/logger.js';

/**
 * APPT-M-01: waitlist / slot-cancellation backfill.
 *
 * When a slot frees (cancel, delete, checkout expiry), `onSlotFreed` offers it
 * to the oldest waiting entry. The offer is materialised as a Pending
 * Appointment with `checkoutExpiresAt = now + 15min` - deliberately the same
 * shape as a normal checkout hold, so:
 *   - the appointment count at the slot blocks other patients' checkouts
 *     (transactions/pay capacity gate) for the whole offer window, and
 *   - the EXISTING sweeps (billing cleanupStalePending, transactions
 *     cleanupStalePending) are the backstop if this module's own expiry never
 *     runs. No second parallel expiry mechanism to drift.
 *
 * Accepting is payment-backed: the FE pays against the hold via the existing
 * `POST /api/transactions/pay` (auto-confirms the appointment), then calls the
 * accept endpoint, which only verifies a completed payment exists before
 * marking the entry accepted. Decline / leave releases the Pending hold and
 * cascades to the next waiter.
 *
 * Every capacity decision uses the same gate as the patient checkout path:
 * live appointment count vs `maxBookingsPerSlot`. Reservations in
 * services/slotCapacity.js are the billing/pay path's counter; holds created
 * here never touch it (releaseSlotSeat floors at 0, so the sweeps' release on
 * these holds is a no-op - exactly like today's transactions-created
 * appointments).
 */

/** Mirrors CHECKOUT_HOLD_MINUTES in routes/billing.js - one number, two names. */
export const OFFER_HOLD_MS = 15 * 60 * 1000;

const IS_TEST = process.env.NODE_ENV === 'test';
const ACTIVE_APPT = { $nin: ['Cancelled', 'Completed', 'Missed'] };

const fail = (status, code, message) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

/** Map service errors onto the HTTP response; 500s keep the safe path. */
export const sendWaitlistError = (res, err) => {
  if (err.status) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }
  logger.error(`[waitlist] ${err.stack || err.message}`);
  return res.status(500).json({ message: 'Request failed' });
};

/**
 * Patient asks to be queued for one slot. Refuses (409/422) instead of
 * silently queueing when the slot is still open, the patient already holds a
 * seat, they are already queued, or the doctor has no configured fee (an
 * unpayable offer can never be accepted).
 */
export async function joinWaitlist({ patientId, patientName = '', doctorId, date, time }) {
  const doctor = await Doctor.findById(doctorId)
    .select('name department hospitalId maxBookingsPerSlot dateDisabledSlots')
    .lean();
  if (!doctor) throw fail(404, 'DOCTOR_NOT_FOUND', 'Doctor not found');

  const existing = await WaitlistEntry.findOne({
    patientId, doctorId, date, time, status: { $in: ['waiting', 'offered'] },
  }).lean();
  if (existing) {
    throw fail(409, 'ALREADY_WAITING', 'You are already on the waitlist for this slot.');
  }

  const price = await resolveAuthoritativeAmount({
    serviceType: 'appointment',
    appointment: { doctorId },
  });
  if (!price.ok) throw fail(422, 'NO_PRICE', price.message);

  const capacity = Number(doctor.maxBookingsPerSlot) > 0 ? Number(doctor.maxBookingsPerSlot) : 1;
  const mine = await Appointment.findOne({ patientId, doctorId, date, time, status: ACTIVE_APPT })
    .select('_id').lean();
  if (mine) throw fail(409, 'ALREADY_BOOKED', 'You already have an appointment at this slot.');

  const activeAtSlot = await Appointment.countDocuments({ doctorId, date, time, status: ACTIVE_APPT });
  if (activeAtSlot < capacity) {
    throw fail(409, 'SLOT_AVAILABLE', 'This slot is still open - book it directly instead of waiting.');
  }

  try {
    return await WaitlistEntry.create({
      patientId,
      patientName,
      doctorId,
      doctorName: doctor.name || '',
      hospitalId: doctor.hospitalId || undefined,
      department: doctor.department || 'General',
      date,
      time,
      status: 'waiting',
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw fail(409, 'ALREADY_WAITING', 'You are already on the waitlist for this slot.');
    }
    throw err;
  }
}

/** The patient's own queue view (offer card + countdown come from this). */
export async function listMyEntries(patientId) {
  return WaitlistEntry.find({ patientId }).sort({ updatedAt: -1 }).limit(50).lean();
}

const terminateEntry = async (entryId, status, note) =>
  WaitlistEntry.updateOne(
    { _id: entryId, status: { $in: ['waiting', 'offered'] } },
    { $set: { status, note } }
  );

/**
 * Turn a claimed entry into a live offer: create the Pending hold, then
 * re-verify the claim (the patient may have left during the write - in that
 * case the hold is released immediately and their own cascade already moved
 * the queue on).
 *
 * @returns {'held'|'next'|'aborted'} 'next' = this entry was terminated,
 *   try the next waiter; 'aborted' = the seat is gone, stop offering.
 */
async function createHoldForEntry(entry) {
  const doctor = await Doctor.findById(entry.doctorId)
    .select('name department hospitalId maxBookingsPerSlot')
    .lean();
  if (!doctor) {
    await terminateEntry(entry._id, 'expired', 'doctor no longer available');
    return 'next';
  }

  const price = await resolveAuthoritativeAmount({
    serviceType: 'appointment',
    appointment: { doctorId: entry.doctorId },
  });
  if (!price.ok) {
    await terminateEntry(entry._id, 'expired', 'no price configured');
    return 'next';
  }

  const mine = await Appointment.findOne({
    patientId: entry.patientId, doctorId: entry.doctorId,
    date: entry.date, time: entry.time, status: ACTIVE_APPT,
  }).select('_id').lean();
  if (mine) {
    await terminateEntry(entry._id, 'expired', 'patient already holds this slot');
    return 'next';
  }

  const capacity = Number(doctor.maxBookingsPerSlot) > 0 ? Number(doctor.maxBookingsPerSlot) : 1;
  const activeAtSlot = await Appointment.countDocuments({
    doctorId: entry.doctorId, date: entry.date, time: entry.time, status: ACTIVE_APPT,
  });
  if (activeAtSlot >= capacity) {
    // Somebody took the seat between the free event and this claim - hand the
    // entry back to the queue untouched so the next free event can use it.
    await WaitlistEntry.updateOne(
      { _id: entry._id, status: 'offered', offerAppointmentId: null },
      { $set: { status: 'waiting' }, $unset: { offeredAt: 1, offerExpiresAt: 1 } }
    );
    return 'aborted';
  }

  const patient = await User.findById(entry.patientId).select('name uhid').lean();

  const hold = await Appointment.create({
    tokenNumber: generateTokenNumber(),
    uhid: patient?.uhid || '',
    patient: entry.patientName || patient?.name || 'Patient',
    patientId: entry.patientId,
    doctor: doctor.name || '',
    doctorId: entry.doctorId,
    department: entry.department || doctor.department || 'General',
    date: entry.date,
    time: entry.time,
    type: 'Consultation',
    appointmentMode: 'offline',
    status: 'Pending',
    fees: price.amount,
    hospitalId: doctor.hospitalId || undefined,
    notes: 'Waitlist offer: auto-reserved for 15 minutes.',
    checkoutExpiresAt: new Date(Date.now() + OFFER_HOLD_MS),
  });

  const claimed = await WaitlistEntry.findOneAndUpdate(
    { _id: entry._id, status: 'offered' },
    { $set: { offerAppointmentId: hold._id, offerFee: price.amount } },
    { new: true }
  );
  if (!claimed) {
    await Appointment.updateOne(
      { _id: hold._id, status: 'Pending' },
      { $set: { status: 'Cancelled', cancellationReason: 'waitlist_offer_withdrawn', cancelledAt: new Date() } }
    );
    return 'aborted';
  }

  // The entry state is the source of truth (FE waitlist card); the notification
  // is the interruption. priority=critical because quiet hours / daily caps
  // must never eat a 15-minute deadline; dedupKey stops retries from spamming.
  try {
    const { notification } = await createNotification({
      userId: String(entry.patientId),
      type: 'appointment',
      priority: 'critical',
      channel: 'inApp',
      title: 'A slot opened - claim it in 15 minutes',
      message: `A slot with ${doctor.name} on ${entry.date} at ${entry.time} just opened up. Accept and pay within 15 minutes, or it passes to the next person.`,
      dedupKey: `waitlist-offer:${entry._id}`,
      actor: 'waitlist',
    });
    if (notification) notifyUser(String(entry.patientId), notification);
  } catch (err) {
    logger.error(`[waitlist] offer notification failed: ${err.message}`);
  }

  try {
    await emitAppointmentUpdate(hold);
  } catch (err) {
    logger.error(`[waitlist] offer socket emit failed: ${err.message}`);
  }

  return 'held';
}

/**
 * Slot-free hook - fire-and-forget from every cancellation path.
 *
 * ReadyState-gated: as a follow-up to a cancellation it must never add latency
 * (mongoose buffers offline queries for 10s) or throw into the cancelling
 * route; with no live connection the slot simply stays unoffered.
 */
export async function onSlotFreed({ doctorId, date, time } = {}) {
  if (!doctorId || !date || !time) return null;
  if (WaitlistEntry.db?.readyState === 0) return null;

  // Few passes: entries can be terminated in place (no fee, already booked) and
  // the next waiter should still get the chance.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let entry;
    try {
      entry = await WaitlistEntry.findOneAndUpdate(
        { doctorId, date, time, status: 'waiting' },
        {
          $set: {
            status: 'offered',
            offeredAt: new Date(),
            offerExpiresAt: new Date(Date.now() + OFFER_HOLD_MS),
          },
        },
        { sort: { createdAt: 1 }, new: true }
      );
    } catch (err) {
      logger.error(`[waitlist] claim failed: ${err.message}`);
      return null;
    }
    if (!entry) return null;

    let outcome;
    try {
      outcome = await createHoldForEntry(entry);
    } catch (err) {
      logger.error(`[waitlist] offer failed for entry ${entry._id}: ${err.message}`);
      try {
        await WaitlistEntry.updateOne(
          { _id: entry._id, status: 'offered', offerAppointmentId: null },
          { $set: { status: 'waiting' }, $unset: { offeredAt: 1, offerExpiresAt: 1 } }
        );
      } catch { /* the next free event will retry */ }
      return null;
    }

    if (outcome === 'held') return entry;
    if (outcome === 'next') continue;
    return null; // 'aborted'
  }
  return null;
}

const notifyOfferEnded = async (entry, title, message) => {
  try {
    const { notification } = await createNotification({
      userId: String(entry.patientId),
      type: 'appointment',
      priority: 'normal',
      channel: 'inApp',
      title,
      message,
      dedupKey: `waitlist-end:${entry._id}:${title}`,
      actor: 'waitlist',
    });
    if (notification) notifyUser(String(entry.patientId), notification);
  } catch (err) {
    logger.error(`[waitlist] end-state notification failed: ${err.message}`);
  }
};

/**
 * Settle offers whose 15-minute window has passed. Runs on a timer (skipped
 * under Jest - tests invoke it directly) and is safe to call inline from the
 * accept endpoint when a patient arrives late.
 *
 * Branch rule: a paid/confirmed hold means the seat was consumed -> accepted,
 * no cascade. A still-Pending hold is ours to release -> cancel + cascade.
 * A missing/already-cancelled hold means some OTHER canceller released it and
 * already fired its own onSlotFreed -> just expire the entry, no cascade.
 */
export async function expireDueOffers(now = new Date()) {
  const due = await WaitlistEntry.find({ status: 'offered', offerExpiresAt: { $lt: now } }).lean();
  let expired = 0;

  for (const entry of due) {
    try {
      const hold = entry.offerAppointmentId
        ? await Appointment.findById(entry.offerAppointmentId).lean()
        : null;
      const paid = hold
        ? await Payment.findOne({ referenceId: String(hold._id), status: 'completed' }).select('_id').lean()
        : null;

      if (paid || hold?.status === 'Confirmed') {
        await WaitlistEntry.updateOne(
          { _id: entry._id, status: 'offered' },
          { $set: { status: 'accepted' } }
        );
        continue;
      }

      if (hold && hold.status === 'Pending') {
        await Appointment.updateOne(
          { _id: hold._id, status: 'Pending' },
          { $set: { status: 'Cancelled', cancellationReason: 'waitlist_offer_expired', cancelledAt: new Date() } }
        );
        await WaitlistEntry.updateOne(
          { _id: entry._id, status: 'offered' },
          { $set: { status: 'expired', note: 'offer expired' } }
        );
        expired += 1;
        await notifyOfferEnded(
          entry,
          'Waitlist offer expired',
          `Your 15-minute hold for ${entry.date} at ${entry.time} expired. The slot has passed to the next person.`
        );
        await onSlotFreed({ doctorId: entry.doctorId, date: entry.date, time: entry.time });
      } else {
        await WaitlistEntry.updateOne(
          { _id: entry._id, status: 'offered' },
          { $set: { status: 'expired', note: 'offer expired' } }
        );
        expired += 1;
      }
    } catch (err) {
      logger.error(`[waitlist] expiry failed for entry ${entry._id}: ${err.message}`);
    }
  }

  return expired;
}

/**
 * Patient confirms a paid offer. Payment itself happens on the existing
 * checkout (`POST /api/transactions/pay` with `referenceId = hold`); this only
 * verifies it landed and flips the queue entry. Idempotent on repeat.
 */
export async function acceptOffer(entryId, user) {
  const entry = await WaitlistEntry.findOne({ _id: entryId, patientId: user._id }).lean();
  if (!entry) throw fail(404, 'ENTRY_NOT_FOUND', 'Waitlist entry not found');
  if (entry.status === 'accepted') {
    const acceptedHold = entry.offerAppointmentId
      ? await Appointment.findById(entry.offerAppointmentId).lean()
      : null;
    return { entry, appointment: acceptedHold, alreadyAccepted: true };
  }
  if (entry.status !== 'offered') {
    throw fail(409, 'NO_ACTIVE_OFFER', 'There is no active offer on this entry.');
  }
  if (!entry.offerExpiresAt || new Date(entry.offerExpiresAt).getTime() < Date.now()) {
    await expireDueOffers(new Date());
    throw fail(410, 'OFFER_EXPIRED', 'This offer has expired.');
  }
  if (!entry.offerAppointmentId) {
    throw fail(409, 'OFFER_NOT_READY', 'The reserved slot is not ready yet. Please retry in a moment.');
  }

  const hold = await Appointment.findById(entry.offerAppointmentId).lean();
  if (!hold || hold.status === 'Cancelled') {
    throw fail(410, 'OFFER_RELEASED', 'This slot is no longer available.');
  }

  const payment = await Payment.findOne({ referenceId: String(hold._id), status: 'completed' })
    .select('_id amount').lean();
  if (!payment) {
    throw fail(409, 'PAYMENT_REQUIRED', 'Complete the payment for this slot to confirm your waitlist offer.');
  }

  const updated = await WaitlistEntry.findOneAndUpdate(
    { _id: entryId, status: 'offered' },
    { $set: { status: 'accepted' } },
    { new: true }
  ).lean();

  return { entry: updated || entry, appointment: hold, alreadyAccepted: !updated };
}

/**
 * Leave the queue (waiting) or decline the live offer (offered). An offered
 * entry releases its Pending hold - but only when the hold is still Pending
 * (a paid hold means the seat is already theirs) - and only then cascades to
 * the next waiter, so the same seat is never offered twice.
 */
export async function leaveEntry(entryId, user) {
  const entry = await WaitlistEntry.findOne({ _id: entryId, patientId: user._id }).lean();
  if (!entry) throw fail(404, 'ENTRY_NOT_FOUND', 'Waitlist entry not found');
  if (!['waiting', 'offered'].includes(entry.status)) {
    return { entry, released: false };
  }

  const updated = await WaitlistEntry.findOneAndUpdate(
    { _id: entryId, status: { $in: ['waiting', 'offered'] } },
    { $set: { status: 'cancelled', note: 'left by patient' } },
    { new: true }
  ).lean();

  let released = false;
  if (entry.status === 'offered' && entry.offerAppointmentId) {
    const res = await Appointment.updateOne(
      { _id: entry.offerAppointmentId, status: 'Pending' },
      { $set: { status: 'Cancelled', cancellationReason: 'waitlist_offer_declined', cancelledAt: new Date() } }
    );
    released = res.modifiedCount > 0;
    if (released) {
      await onSlotFreed({ doctorId: entry.doctorId, date: entry.date, time: entry.time });
    }
  }

  return { entry: updated || entry, released };
}

let expiryTimer = null;
if (!IS_TEST) {
  // Backstop sweep. The billing/transactions checkout sweeps also kill an
  // unpaid hold at checkoutExpiresAt, but only THIS loop marks the queue entry
  // itself and cascades to the next waiter.
  const run = () => expireDueOffers().catch((err) => logger.error(`[waitlist] sweep failed: ${err.message}`));
  run();
  expiryTimer = setInterval(run, 60 * 1000);
  expiryTimer.unref?.();
}

export const waitlistJobs = {
  expireDueOffers,
  stop: () => {
    if (expiryTimer) clearInterval(expiryTimer);
    expiryTimer = null;
  },
};
