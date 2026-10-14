import express from 'express';
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import { protect } from '../middleware/auth.js';
import {
  validate,
  createMembershipSchema,
  cancelMembershipSchema,
  freezeMembershipSchema,
  renewMembershipSchema,
} from '../utils/validate.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { auditLog } from '../middleware/audit.js';
import { verifiedPaymentFor } from '../services/paymentVerification.js';
import { MEMBERSHIP_STATUS, MEMBERSHIP_TRANSITIONS } from '../lib/flowStates.js';

const router = express.Router();

// A4 -> Flow D (5.md 5, 6.md 2.8, 10.md 4.3): GET/POST a member's own terms.
// Self-scoped on both routes - userId always comes from the session, never the
// body - so there is no object-level id to get wrong (the provider-side
// management half is a different surface).
const actorId = (req) => req.user._id ?? req.user.id;

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

// Route-level transition assert: the machine lives in lib/flowStates.js, the
// route enforces it (the model enum only bounds vocabulary, per Membership.js).
const canMove = (from, to) => (MEMBERSHIP_TRANSITIONS[from] || []).includes(to);

const pushHistory = (row, from, to, by, note) => {
  row.history = [...(row.history || []), { from, to, by, note: (note || '').slice(0, 300) }];
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Every status EXCEPT the terminal pair counts as "a term the user already
// holds" - flowStates documents CANCELLED and EXPIRED as terminal ("a lapsed
// membership is a new row"), so buying again after a lapse must pass.
const NON_TERMINAL = Object.values(MEMBERSHIP_STATUS).filter(
  (status) => status !== MEMBERSHIP_STATUS.CANCELLED && status !== MEMBERSHIP_STATUS.EXPIRED,
);

// Calendar-accurate term end: a 1/3/6/12-month plan means Jan 31 + 1 month =
// Feb 28, not "30 days later". Fixed-length months drift against the term the
// provider actually sold, and days-left is the number the member sees.
const termEnd = (startAt, value, unit) => {
  const end = new Date(startAt);
  if (unit === 'day') end.setDate(end.getDate() + value);
  else if (unit === 'week') end.setDate(end.getDate() + value * 7);
  else if (unit === 'year') end.setFullYear(end.getFullYear() + value);
  else end.setMonth(end.getMonth() + value);
  return end;
};

// Derived at read, never stored: a stored counter goes stale the moment the
// clock moves, and a freeze/grace window (later flows) will adjust it live.
const daysLeftOf = (row) => {
  if (!row.endAt) return null;
  const ms = new Date(row.endAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
};

// ─── My memberships (6.md 2.8 "days left") ─────────────────────────────────
// authz: self
router.get('/', protect, async (req, res) => {
  try {
    const rows = await Membership.find({ userId: actorId(req) }).sort({ createdAt: -1 }).lean();
    res.json({
      memberships: rows.map((row) => ({ ...row, daysLeft: daysLeftOf(row) })),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Purchase a term (5.md Flow D, rule 4: idempotency + server price) ─────
//
// The buyer purchases for THEMSELVES: userId from the session, price from the
// Plan row, term length from plan.duration. The body can only NAME a plan, a
// start date and a completed payment - never a price, never a status (the
// schema is strict, so `pricePaid: 1` is a 400 rather than a discount).
// authz: self
router.post('/', protect, bookingLimiter, idempotencyGuard({ prefix: 'membership-purchase' }), validate(createMembershipSchema), async (req, res) => {
  try {
    const plan = await Plan.findById(req.body.planId).lean();
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    if (plan.status !== 'active') {
      return res.status(409).json({ message: 'This plan is not available', code: 'PLAN_NOT_AVAILABLE' });
    }

    // One LIVE term per plan. A second purchase while the first still runs
    // is a double-click or a confusion, not an upgrade (upgrades are a
    // different planId). After CANCELLED/EXPIRED the same plan is
    // purchasable again, per the terminal rule above.
    const held = await Membership.findOne({
      userId: actorId(req),
      planId: plan._id,
      status: { $in: NON_TERMINAL },
    }).lean();
    if (held) {
      return res.status(409).json({ message: 'You already hold a term for this plan', code: 'TERM_EXISTS' });
    }

    // Server-owned amount: the plan's price plus its joining fee (5.md 104).
    // A future renewal flow may choose to skip the joining fee; this first
    // purchase charges what the plan row says, full stop.
    const required = (plan.price ?? 0) + (plan.joiningFee ?? 0);
    let payment = null;
    if (required > 0) {
      if (!req.body.paymentId) {
        return res.status(402).json({ message: 'Payment is required for this membership', code: 'PAYMENT_REQUIRED' });
      }
      payment = await verifiedPaymentFor(req.body.paymentId, actorId(req), required);
      if (!payment) {
        return res.status(402).json({ message: 'Payment could not be verified for this membership', code: 'PAYMENT_NOT_VERIFIED' });
      }
      // Clean 409 for the common reuse; the partial unique index on
      // Membership.paymentId is the backstop for the race this read cannot
      // see (two concurrent purchases naming one payment).
      const spent = await Membership.findOne({ paymentId: payment._id }).lean();
      if (spent) {
        return res.status(409).json({ message: 'This payment has already been used', code: 'PAYMENT_ALREADY_USED' });
      }
    }

    const startAt = req.body.startAt ?? new Date();
    try {
      const membership = await Membership.create({
        userId: actorId(req),
        planId: plan._id,
        providerId: plan.providerId,
        // A PURCHASED term starts ACTIVE. TRIAL is what a provider-granted
        // comp starts as (a different writer); MEMBERSHIP_TRANSITIONS only
        // governs CHANGES to a stored row, not which state a new one may be
        // created in.
        status: MEMBERSHIP_STATUS.ACTIVE,
        startAt,
        endAt: termEnd(startAt, plan.duration?.value ?? 1, plan.duration?.unit ?? 'month'),
        // Class packs burn credits; time-based terms are unlimited (null,
        // never 0 - 0 would read as "already used up").
        creditsLeft: plan.sessionCredits > 0 ? plan.sessionCredits : null,
        autoRenew: req.body.autoRenew === true,
        pricePaid: required,
        currency: plan.currency ?? 'INR',
        paymentId: payment?._id ?? null,
      });
      await auditLog('membership_purchased', actorId(req), {
        membershipId: membership._id,
        planId: plan._id,
        amount: required,
        paymentId: payment?._id ? String(payment._id) : null,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(201).json({ membership });
    } catch (err) {
      // Lost the race to another purchase holding the same payment: the
      // partial unique index answered before we did.
      if (err?.code === 11000 && String(err.message || '').includes('paymentId')) {
        return res.status(409).json({ message: 'This payment has already been used', code: 'PAYMENT_ALREADY_USED' });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Lifecycle: cancel / freeze / unfreeze / renew ──────────────────────────
// All self-scoped (userId from session) and transition-asserted. Terminal rows
// (CANCELLED/EXPIRED) can never move — a lapsed term is a new POST purchase.

// authz: self
router.post('/:id/cancel', protect, requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'membership-cancel' }), validate(cancelMembershipSchema), async (req, res) => {
  try {
    const row = await Membership.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Membership not found' });
    if (!canMove(row.status, MEMBERSHIP_STATUS.CANCELLED)) {
      return res.status(409).json({ message: `Cannot cancel a ${row.status} membership`, code: 'INVALID_TRANSITION' });
    }
    const prevStatus = row.status;
    row.status = MEMBERSHIP_STATUS.CANCELLED;
    row.cancelledAt = new Date();
    row.cancellationReason = (req.body.reason || '').slice(0, 500);
    pushHistory(row, prevStatus, MEMBERSHIP_STATUS.CANCELLED, actorId(req), req.body.reason);
    await row.save();
    await auditLog('membership_cancelled', actorId(req), {
      membershipId: String(row._id), reason: row.cancellationReason, ip: req.ip,
    });
    return res.json({ membership: row });
  } catch (err) {
    // A parallel cancel already wrote CANCELLED: the second write is a no-op
    // conflict, not a 500.
    if (err?.code === 11000) return res.status(409).json({ message: 'Membership already changed', code: 'WRITE_CONFLICT' });
    res.status(500).json({ message: err.message });
  }
});

// authz: self
router.post('/:id/freeze', protect, requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'membership-freeze' }), validate(freezeMembershipSchema), async (req, res) => {
  try {
    const row = await Membership.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Membership not found' });
    if (!canMove(row.status, MEMBERSHIP_STATUS.FROZEN)) {
      return res.status(409).json({ message: `Only an ACTIVE membership can be frozen (current: ${row.status})`, code: 'INVALID_TRANSITION' });
    }
    // Bounded benefit, not an unbounded pause: at most 3 windows per term.
    const windows = row.freeze?.windows || [];
    if (windows.length >= 3) {
      return res.status(409).json({ message: 'Freeze limit reached for this term (3 windows)', code: 'FREEZE_LIMIT' });
    }
    const days = req.body.days;
    const from = new Date();
    const to = new Date(from.getTime() + days * DAY_MS);
    const prevStatus = row.status;
    row.status = MEMBERSHIP_STATUS.FROZEN;
    row.freeze = {
      ...(row.freeze || {}),
      frozenAt: from,
      resumeAt: to,
      windows: [...windows, { from, to, days, reason: (req.body.reason || '').slice(0, 300) }],
    };
    // The term pauses: endAt moves forward by the frozen days.
    if (row.endAt) row.endAt = new Date(new Date(row.endAt).getTime() + days * DAY_MS);
    pushHistory(row, prevStatus, MEMBERSHIP_STATUS.FROZEN, actorId(req), `Frozen ${days}d: ${req.body.reason || ''}`);
    await row.save();
    await auditLog('membership_frozen', actorId(req), {
      membershipId: String(row._id), days, ip: req.ip,
    });
    return res.json({ membership: row });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// authz: self
router.post('/:id/unfreeze', protect, requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'membership-unfreeze' }), async (req, res) => {
  try {
    const row = await Membership.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Membership not found' });
    if (!canMove(row.status, MEMBERSHIP_STATUS.ACTIVE) || row.status !== MEMBERSHIP_STATUS.FROZEN) {
      return res.status(409).json({ message: `Only a FROZEN membership can resume (current: ${row.status})`, code: 'INVALID_TRANSITION' });
    }
    // Early resume returns the UNUSED frozen days to the term: the extension
    // granted at freeze time shrinks by what was never used.
    const now = new Date();
    const frozenAt = row.freeze?.frozenAt ? new Date(row.freeze.frozenAt) : now;
    const usedDays = Math.max(0, Math.ceil((now.getTime() - frozenAt.getTime()) / DAY_MS));
    const lastWindow = (row.freeze?.windows || []).slice(-1)[0];
    const granted = lastWindow?.days ?? 0;
    const unused = Math.max(0, granted - usedDays);
    if (row.endAt && unused > 0) row.endAt = new Date(new Date(row.endAt).getTime() - unused * DAY_MS);
    if (lastWindow) lastWindow.to = now;
    row.freeze = { ...(row.freeze || {}), frozenAt: null, resumeAt: null };
    row.status = MEMBERSHIP_STATUS.ACTIVE;
    pushHistory(row, MEMBERSHIP_STATUS.FROZEN, MEMBERSHIP_STATUS.ACTIVE, actorId(req), `Resumed early, ${unused}d returned`);
    await row.save();
    await auditLog('membership_unfrozen', actorId(req), {
      membershipId: String(row._id), unusedDays: unused, ip: req.ip,
    });
    return res.json({ membership: row });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// authz: self
router.post('/:id/renew', protect, requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'membership-renew' }), validate(renewMembershipSchema), async (req, res) => {
  try {
    const row = await Membership.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Membership not found' });
    if (!canMove(row.status, MEMBERSHIP_STATUS.RENEWED)) {
      return res.status(409).json({ message: `Only an ACTIVE membership can be renewed (current: ${row.status}); lapsed terms are re-purchased, not renewed`, code: 'INVALID_TRANSITION' });
    }
    const plan = await Plan.findById(row.planId).lean();
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    // Renewal skips the joining fee (charged once, at first purchase).
    const required = plan.price ?? 0;
    let payment = null;
    if (required > 0) {
      if (!req.body.paymentId) {
        return res.status(402).json({ message: 'Payment is required to renew', code: 'PAYMENT_REQUIRED' });
      }
      payment = await verifiedPaymentFor(req.body.paymentId, actorId(req), required);
      if (!payment) {
        return res.status(402).json({ message: 'Payment could not be verified for this renewal', code: 'PAYMENT_NOT_VERIFIED' });
      }
      const spent = await Membership.findOne({ paymentId: payment._id }).lean();
      if (spent) {
        return res.status(409).json({ message: 'This payment has already been used', code: 'PAYMENT_ALREADY_USED' });
      }
    }
    const base = row.endAt && new Date(row.endAt).getTime() > Date.now() ? new Date(row.endAt) : new Date();
    row.endAt = termEnd(base, plan.duration?.value ?? 1, plan.duration?.unit ?? 'month');
    const renewFrom = row.status;
    row.status = MEMBERSHIP_STATUS.RENEWED;
    row.pricePaid = (row.pricePaid ?? 0) + required;
    if (payment) row.paymentId = payment._id;
    if (typeof plan.sessionCredits === 'number' && plan.sessionCredits > 0) {
      row.creditsLeft = (row.creditsLeft ?? 0) + plan.sessionCredits;
    }
    pushHistory(row, renewFrom, MEMBERSHIP_STATUS.RENEWED, actorId(req), `Renewed 1 term, paid ${required}`);
    await row.save();
    await auditLog('membership_renewed', actorId(req), {
      membershipId: String(row._id), amount: required,
      paymentId: payment?._id ? String(payment._id) : null, ip: req.ip,
    });
    return res.json({ membership: row });
  } catch (err) {
    if (err?.code === 11000 && String(err.message || '').includes('paymentId')) {
      return res.status(409).json({ message: 'This payment has already been used', code: 'PAYMENT_ALREADY_USED' });
    }
    res.status(500).json({ message: err.message });
  }
});

export default router;
