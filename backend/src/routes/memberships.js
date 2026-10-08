import express from 'express';
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import { protect } from '../middleware/auth.js';
import { validate, createMembershipSchema } from '../utils/validate.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { auditLog } from '../middleware/audit.js';
import { verifiedPaymentFor } from '../services/paymentVerification.js';
import { MEMBERSHIP_STATUS } from '../lib/flowStates.js';

const router = express.Router();

// A4 -> Flow D (5.md 5, 6.md 2.8, 10.md 4.3): GET/POST a member's own terms.
// Self-scoped on both routes - userId always comes from the session, never the
// body - so there is no object-level id to get wrong (the provider-side
// management half is a different surface).
const actorId = (req) => req.user._id ?? req.user.id;

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

export default router;
