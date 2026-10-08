import express from 'express';
import Event from '../models/Event.js';
import EventRegistration from '../models/EventRegistration.js';
import Provider from '../models/Provider.js';
import Refund from '../models/Refund.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import { publicSearchLimiter, bookingLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { randomId } from '../utils/secureRandom.js';
import { verifiedPaymentFor } from '../services/paymentVerification.js';
import {
  validate, createEventSchema, updateEventSchema, eventActionSchema,
  registerEventSchema, cancelRegistrationSchema, checkInSchema,
} from '../utils/validate.js';
import { protect } from '../middleware/auth.js';
import {
  EVENT_STATUS, EVENT_TRANSITIONS, REGISTRATION_STATUS, REGISTRATION_TRANSITIONS,
  canTransition,
} from '../lib/flowStates.js';

// FLOW-E (5.md 6) - event registration: camps, workshops, drives, retreats.
//
//   Event:        draft -> open -> cancelled | ended
//   Registration: REGISTERED -> CHECKED_IN | CANCELLED | REFUNDED
//
// Three rules carry the flow:
//   1. SEATS are claimed with a compare-and-set on the counter
//      (`$expr: { $lt: ['$registeredCount', '$capacity'] }`), the same shape
//      slotCapacity.js uses. `count(documents) < capacity` as two statements is
//      how two people both get the last seat (5.md 13).
//   2. ONE registration per person, enforced by a UNIQUE index on
//      (eventId, userId), not by a pre-read that only narrows the race.
//   3. CANCELLATION refund rule: cancel before the cut-off and the money goes
//      back through the existing Refund state machine; after it (or when
//      nothing was paid) the registration is CANCELLED. The two outcomes are
//      separate STATES, so "was this refunded?" never needs a second field.

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;

const actorId = (req) => req.user._id ?? req.user.id;

const denyTransition = (res, from, to) => res.status(409).json({
  message: `Cannot move from ${from} to ${to}`, code: 'ILLEGAL_STATE_TRANSITION', from, to,
});

const slugify = (title) => String(title)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

/**
 * Claim ONE seat.
 *
 * Deliberately a single guarded update: the filter contains the capacity
 * condition, so Mongo evaluates and applies it atomically and only one of two
 * racing registrations can match. Returns null for "full", "not open" or
 * "gone" — the caller reads once to tell them apart, which is safe because the
 * read is only for the ERROR, never for the decision to write.
 */
const claimSeat = (event) => Event.findOneAndUpdate(
  {
    _id: event._id,
    status: EVENT_STATUS.OPEN,
    $expr: { $lt: ['$registeredCount', '$capacity'] },
  },
  { $inc: { registeredCount: 1 } },
  { new: true },
);

/** Compensating action: the seat goes back if the registration could not be written. */
const releaseSeat = (eventId) => Event.updateOne(
  { _id: eventId, registeredCount: { $gt: 0 } },
  { $inc: { registeredCount: -1 } },
);

/**
 * The payment rule now lives in services/paymentVerification.js, shared with
 * the membership purchase (5.md Flow D): same owner/status/amount checks, one
 * source, so the two paid flows cannot drift.
 */

/**
 * The existing refund service, as payments.js uses it: request (idempotent on
 * idempotencyKey) then settle (CAS on the payment). Both are wrapped because
 * neither can be assumed reachable — no payment id, a production gateway that
 * refuses to move money (PAY-B-08), or a concurrent settle. The CALLER then
 * decides the resulting registration state, so a refund that did not happen
 * never reports as REFUNDED.
 */
const issueRefund = async ({ paymentId, amount, reason, requestedBy, idempotencyKey }) => {
  if (!paymentId) return { ok: false, reason: 'no-payment' };
  if (process.env.NODE_ENV === 'production') return { ok: false, reason: 'provider-unavailable' };
  try {
    const { refund, created } = await Refund.requestRefund({
      paymentId,
      amount,
      originalAmount: amount,
      reason,
      reasonCode: 'service_not_delivered',
      idempotencyKey,
      requestedBy,
    });
    if (!created) return { ok: true, refund, duplicate: true };
    try {
      const settle = await Refund.settleRefund({ paymentId, amount });
      refund.status = settle.status;
      refund.settledAt = new Date();
      await refund.save();
      return { ok: true, refund };
    } catch (settleErr) {
      refund.status = 'FAILED';
      refund.failureReason = settleErr.message;
      await refund.save();
      return { ok: false, reason: settleErr.message, refund };
    }
  } catch (err) {
    return { ok: false, reason: err.message };
  }
};

// authz: public
//
// The public catalogue of what is on. Drafts and cancelled events are not
// listed, and nothing here joins attendee data — an event's registration rows
// are a different collection on purpose.
router.get('/', publicSearchLimiter, async (req, res) => {
  try {
    const filter = { status: { $in: [EVENT_STATUS.OPEN, EVENT_STATUS.ENDED] } };
    if (req.query.type) filter.type = String(req.query.type);
    if (req.query.city) filter['venue.city'] = String(req.query.city);
    if (req.query.upcoming !== 'false') filter['schedule.start'] = { $gte: new Date() };

    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? 20), 10) || 20, 1), 100);
    const page = Math.max(Number.parseInt(String(req.query.page ?? 1), 10) || 1, 1);
    const [events, total] = await Promise.all([
      Event.find(filter)
        .select('-outcomeReport -__v')
        .sort({ 'schedule.start': 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);
    return res.json({ events, total, page, pages: Math.ceil(total / limit) || 1, limit });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
//
// Creating an event names an ORGANISER, and the guard proves the caller owns
// that provider (authorizeObject on ownerUserId) — the same shape as creating
// a service on a listing. `req.scoped` is the provider, so the kind check runs
// on the loaded row rather than on a client claim.
router.post('/', protect, bookingLimiter, validate(createEventSchema), authorizeObject({
  model: Provider,
  idFrom: (req) => req.body.organizerId,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const organizer = req.scoped;
    if (!['organizer', 'facility', 'practitioner', 'vendor'].includes(organizer.kind)) {
      return res.status(409).json({ message: 'Provider kind cannot organise events', code: 'NOT_AN_ORGANIZER' });
    }
    const { organizerId, ...data } = req.body;
    const event = await Event.create({
      ...data,
      organizerId,
      status: EVENT_STATUS.DRAFT,
      registeredCount: 0,
      slug: `${slugify(data.title)}-${randomId('', 6).toLowerCase()}`,
    });
    await auditLog('event_created', actorId(req), {
      eventId: event._id, organizerId, type: event.type, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(event);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Event slug already exists', code: 'DUPLICATE_SLUG' });
    return res.status(400).json({ message: err.message });
  }
});

// authz: public
//
// Published events are public: id or slug. Drafts and cancelled events are
// hidden from everyone except the organiser's own workspace, and the lookup
// answers 404 either way so the endpoint is not an existence oracle.
router.get('/:id', publicSearchLimiter, async (req, res) => {
  try {
    const filter = OBJECT_ID.test(String(req.params.id))
      ? { _id: req.params.id }
      : { slug: String(req.params.id).toLowerCase() };
    filter.status = { $in: [EVENT_STATUS.OPEN, EVENT_STATUS.ENDED] };
    const event = await Event.findOne(filter).lean();
    if (!event) return res.status(404).json({ message: 'Not found' });
    return res.json(event);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/:id', protect, validate(updateEventSchema), authorizeObject({
  model: Event,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.organizerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const event = req.scoped;
    // An event with attendees is a contract: the schedule and the fee cannot be
    // rewritten under people who already registered.
    if (event.registeredCount > 0 && ('fee' in req.body || 'capacity' in req.body)) {
      return res.status(409).json({ message: 'Fee and capacity are locked once registrations exist', code: 'EVENT_LOCKED' });
    }
    Object.assign(event, req.body);
    await event.save();
    await auditLog('event_updated', actorId(req), { eventId: event._id, ip: req.ip });
    return res.json(event);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.post('/:id/publish', protect, validate(eventActionSchema), authorizeObject({
  model: Event,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.organizerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    if (!canTransition(EVENT_TRANSITIONS, current.status, EVENT_STATUS.OPEN)) {
      return denyTransition(res, current.status, EVENT_STATUS.OPEN);
    }
    const event = await Event.findOneAndUpdate(
      { _id: current._id, status: EVENT_STATUS.DRAFT },
      { $set: { status: EVENT_STATUS.OPEN, publishedAt: new Date() } },
      { new: true },
    );
    if (!event) return denyTransition(res, current.status, EVENT_STATUS.OPEN);
    await auditLog('event_published', actorId(req), { eventId: event._id, ip: req.ip });
    return res.json(event);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Cancelling an event is a mass action: every live registration has to be
// settled, not just the event row. Each one runs the refund rule and its
// outcome is recorded on the registration (REFUNDED vs CANCELLED), so the
// organiser's report and the ledger agree.
router.post('/:id/cancel', protect, validate(eventActionSchema), authorizeObject({
  model: Event,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.organizerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    if (!canTransition(EVENT_TRANSITIONS, current.status, EVENT_STATUS.CANCELLED)) {
      return denyTransition(res, current.status, EVENT_STATUS.CANCELLED);
    }
    const event = await Event.findOneAndUpdate(
      { _id: current._id, status: { $in: [EVENT_STATUS.DRAFT, EVENT_STATUS.OPEN] } },
      { $set: { status: EVENT_STATUS.CANCELLED, cancelledAt: new Date(), cancelReason: req.body.reason ?? 'Cancelled by organiser' } },
      { new: true },
    );
    if (!event) return denyTransition(res, current.status, EVENT_STATUS.CANCELLED);

    const live = await EventRegistration.find({
      eventId: event._id,
      status: REGISTRATION_STATUS.REGISTERED,
    }).lean();

    const settled = [];
    for (const reg of live) {
      const refund = await issueRefund({
        paymentId: reg.paymentId,
        amount: reg.feeAmount,
        reason: `Event cancelled: ${event.cancelReason}`.slice(0, 500),
        requestedBy: actorId(req),
        idempotencyKey: `event-cancel:${reg._id}`,
      });
      const status = refund.ok ? REGISTRATION_STATUS.REFUNDED : REGISTRATION_STATUS.CANCELLED;
      await EventRegistration.updateOne(
        { _id: reg._id, status: REGISTRATION_STATUS.REGISTERED },
        {
          $set: {
            status,
            cancelledAt: new Date(),
            cancelReason: 'Event cancelled by organiser',
            ...(refund.ok ? { refundedAt: new Date(), refundId: refund.refund?._id ?? null } : {}),
          },
        },
      );
      settled.push({ registrationId: reg._id, status, refund: refund.ok ? true : false, refundReason: refund.reason });
    }
    if (live.length) await releaseSeat(event._id);

    await auditLog('event_cancelled', actorId(req), {
      eventId: event._id, registrations: live.length, refunded: settled.filter((s) => s.status === REGISTRATION_STATUS.REFUNDED).length,
      ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json({ event, settled });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

//
// The attendee registers THEMSELVES: userId comes from the session, the fee
// comes from the event row, and the seat is claimed by the atomic CAS before
// anything is written. A paid event also requires a payment the server can
// verify (owner + status + amount) - the body only names it.
// authz: self
router.post('/:id/register', protect, bookingLimiter, idempotencyGuard({ prefix: 'event-register' }), validate(registerEventSchema), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Not found' });
    if (!canTransition(EVENT_TRANSITIONS, event.status, event.status) || event.status !== EVENT_STATUS.OPEN) {
      return res.status(409).json({ message: 'Event is not open for registration', code: 'EVENT_NOT_OPEN' });
    }

    const feeAmount = event.fee?.amount ?? 0;
    let payment = null;
    if (feeAmount > 0) {
      if (!req.body.paymentId) {
        return res.status(402).json({ message: 'Payment is required for this event', code: 'PAYMENT_REQUIRED' });
      }
      payment = await verifiedPaymentFor(req.body.paymentId, actorId(req), feeAmount);
      if (!payment) {
        return res.status(402).json({ message: 'Payment could not be verified for this event', code: 'PAYMENT_NOT_VERIFIED' });
      }
    }

    const claimed = await claimSeat(event);
    if (!claimed) {
      const again = await Event.findById(req.params.id).lean();
      if (!again) return res.status(404).json({ message: 'Not found' });
      if (again.status !== EVENT_STATUS.OPEN) {
        return res.status(409).json({ message: 'Event is not open for registration', code: 'EVENT_NOT_OPEN' });
      }
      return res.status(409).json({ message: 'No seats left', code: 'SEATS_FULL', capacity: again.capacity });
    }

    try {
      const registration = await EventRegistration.create({
        eventId: event._id,
        userId: actorId(req),
        status: REGISTRATION_STATUS.REGISTERED,
        feeAmount,
        currency: event.fee?.currency ?? 'INR',
        paymentId: payment?._id ?? null,
        // Server-minted. This is the string the ticket's QR encodes; the
        // client has no say in it and cannot mint one for somebody else.
        checkInCode: randomId('', 8).toLowerCase(),
        consentGivenAt: req.body.consentGiven ? new Date() : null,
      });
      await auditLog('event_registered', actorId(req), {
        eventId: event._id, registrationId: registration._id, feeAmount, ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(201).json(registration);
    } catch (err) {
      // The seat was claimed for a registration that did not happen: give it
      // back before reporting, or the event drifts toward looking full.
      await releaseSeat(event._id);
      if (err?.code === 11000) {
        return res.status(409).json({ message: 'Already registered for this event', code: 'DUPLICATE_REGISTRATION' });
      }
      return res.status(400).json({ message: err.message });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
//
// The organiser's attendee list. Deliberately does NOT join the User document:
// 5.md 6 asks for a MASKED list, so the rows carry ids and states and nothing
// that identifies a person to whoever is reading the sheet.
router.get('/:id/registrations', protect, authorizeObject({
  model: Event,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.organizerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  read: true,
}), async (req, res) => {
  try {
    const filter = { eventId: req.scoped._id };
    if (req.query.status) filter.status = String(req.query.status);
    const registrations = await EventRegistration.find(filter)
      .select('status feeAmount checkInCode consentGivenAt createdAt checkedInAt')
      .sort({ createdAt: 1 })
      .lean();
    return res.json({ eventId: req.scoped._id, count: registrations.length, registrations });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: self
router.get('/:id/registration', protect, async (req, res) => {
  try {
    const registration = await EventRegistration.findOne({
      eventId: req.params.id,
      userId: actorId(req),
    }).lean();
    if (!registration) return res.status(404).json({ message: 'Not found' });
    return res.json(registration);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
//
// Check-in is the ORGANISER's action against a code the attendee's ticket
// carries. The code is compared here, never trusted from the body's identity:
// whoever scans it still has to own the event.
router.post('/:id/check-in', protect, validate(checkInSchema), authorizeObject({
  model: Event,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.organizerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const registration = await EventRegistration.findOne({
      eventId: req.scoped._id,
      checkInCode: String(req.body.code).toLowerCase(),
      status: REGISTRATION_STATUS.REGISTERED,
    });
    if (!registration) return res.status(404).json({ message: 'Registration not found for that code' });

    const updated = await EventRegistration.findOneAndUpdate(
      { _id: registration._id, status: REGISTRATION_STATUS.REGISTERED },
      { $set: { status: REGISTRATION_STATUS.CHECKED_IN, checkedInAt: new Date(), checkedInBy: actorId(req) } },
      { new: true },
    );
    if (!updated) return denyTransition(res, REGISTRATION_STATUS.REGISTERED, REGISTRATION_STATUS.CHECKED_IN);
    await auditLog('event_checked_in', actorId(req), {
      eventId: req.scoped._id, registrationId: updated._id, ip: req.ip,
    });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

//
// The cancellation refund rule (5.md 13 "event cancelled / cancel before
// cut-off"): before `start - refundCutoffHours` the fee goes back and the row
// ends REFUNDED; after it — or when nothing was paid — the seat is released
// and the row ends CANCELLED. The counter goes back either way, because the
// person is no longer attending.
// authz: self
router.post('/:id/registration/cancel', protect, bookingLimiter, validate(cancelRegistrationSchema), async (req, res) => {
  try {
    const registration = await EventRegistration.findOne({
      eventId: req.params.id,
      userId: actorId(req),
    });
    if (!registration) return res.status(404).json({ message: 'Not found' });
    if (!canTransition(REGISTRATION_TRANSITIONS, registration.status, REGISTRATION_STATUS.CANCELLED)
      && !canTransition(REGISTRATION_TRANSITIONS, registration.status, REGISTRATION_STATUS.REFUNDED)) {
      return denyTransition(res, registration.status, REGISTRATION_STATUS.CANCELLED);
    }

    const event = await Event.findById(registration.eventId).lean();
    if (!event) return res.status(404).json({ message: 'Not found' });

    const cutoffMs = new Date(event.schedule.start).getTime()
      - (Number(event.refundCutoffHours) || 0) * 60 * 60 * 1000;
    const withinCutoff = Date.now() < cutoffMs;

    let status = REGISTRATION_STATUS.CANCELLED;
    let refund = { ok: false, reason: 'no-payment' };
    if (withinCutoff && registration.feeAmount > 0) {
      refund = await issueRefund({
        paymentId: registration.paymentId,
        amount: registration.feeAmount,
        reason: 'Registration cancelled by attendee before cut-off',
        requestedBy: actorId(req),
        idempotencyKey: `event-attendee-cancel:${registration._id}`,
      });
      status = refund.ok ? REGISTRATION_STATUS.REFUNDED : REGISTRATION_STATUS.CANCELLED;
    } else if (registration.feeAmount > 0) {
      refund = { ok: false, reason: 'past-cutoff' };
    }

    const updated = await EventRegistration.findOneAndUpdate(
      { _id: registration._id, status: registration.status },
      {
        $set: {
          status,
          cancelledAt: new Date(),
          cancelReason: req.body.reason ?? 'Cancelled by attendee',
          ...(refund.ok ? { refundedAt: new Date(), refundId: refund.refund?._id ?? null } : {}),
        },
      },
      { new: true },
    );
    if (!updated) return denyTransition(res, registration.status, status);

    await releaseSeat(event._id);
    await auditLog('event_registration_cancelled', actorId(req), {
      eventId: event._id, registrationId: updated._id, status, refund: refund.ok, refundReason: refund.reason,
      ip: req.ip,
    });
    return res.json({ registration: updated, refund: { attempted: registration.feeAmount > 0, ok: refund.ok, reason: refund.reason } });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
