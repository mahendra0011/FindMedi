import express from 'express';
import MealSubscription from '../models/MealSubscription.js';
import Provider from '../models/Provider.js';
import Plan from '../models/Plan.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { canTransition, MEAL_TRANSITIONS } from '../lib/flowStates.js';
import {
  validate, createMealSubscriptionSchema, mealPauseSchema, mealSkipSchema,
} from '../utils/validate.js';
import logger from '../config/logger.js';

// A4 / rolesmd 6.md §2.7 + §4 route table (page /patient/meals: "meal
// subscriptions (pause/skip)"); 5.md:108 is the FLOW-D family this sits in.
//
// Self-service commerce, so protect + session-scoped reads like the waitlist
// and appointment-series routers (`// authz: self` on every route). No
// authorize() permission exists for meals in the matrix, and inventing one
// would gate a lunch order behind a grant no role holds - checkPermissionMatrix
// fails on exactly that.
//
// TRANSITIONS: pause/resume/cancel assert against MEAL_TRANSITIONS in
// lib/flowStates (the table a job reading `completed` shares). pause/resume
// additionally pin the SOURCE state, because canTransition treats
// `from === to` as a no-op re-assert - without the guard, pausing an already
// paused row would silently overwrite its window.
const router = express.Router();
router.use(protect);

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;
const DAY_MS = 24 * 60 * 60 * 1000;
// The skippedDates array is auditable DATA (model comment), so it is bounded:
// 30 per request (schema) and this running cap, or a client could grow it into
// an unbounded document one skip at a time.
const MAX_SKIPPED_DATES = 90;

// ─── List / create ──────────────────────────────────────────────────────────

// authz: self
router.get('/', async (req, res) => {
  try {
    const filter = { userId: actorId(req) };
    if (req.query.status) filter.status = req.query.status;
    const rows = await MealSubscription.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ subscriptions: rows });
  } catch (err) {
    logger.error(`List meal subscriptions error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: self
router.post('/', validate(createMealSubscriptionSchema), async (req, res) => {
  try {
    const provider = await Provider.findById(req.body.providerId).select('_id').lean();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    if (req.body.planId) {
      const plan = await Plan.findOne({ _id: req.body.planId, providerId: req.body.providerId }).lean();
      // 404, not 400: a planId outside this provider must not confirm whether
      // the id exists elsewhere (AUTHZ-M-01's oracle).
      if (!plan) return res.status(404).json({ message: 'Plan not found' });
      if (plan.type !== 'meal') return res.status(400).json({ message: 'Plan is not a meal plan' });
    }

    const created = await MealSubscription.create({
      ...req.body,
      userId: actorId(req),
      status: 'active',
    });
    await auditLog('meal_subscription_created', actorId(req), {
      subscriptionId: created._id, providerId: created.providerId, ip: req.ip,
    });
    // TODO(A4 payment seam): no charge is taken here - MealSubscription
    // carries no price, and the paid term rides Plan.price. Settling it is the
    // deferred membership/purchase flow's job, exactly as quotes.js holds its
    // escrow seam open rather than inventing an amount.
    return res.status(201).json(created);
  } catch (err) {
    logger.error(`Create meal subscription error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// ─── Detail ─────────────────────────────────────────────────────────────────

// authz: self
router.get('/:id', requireObjectId, async (req, res) => {
  try {
    const row = await MealSubscription.findOne({ _id: req.params.id, userId: actorId(req) }).lean();
    if (!row) return res.status(404).json({ message: 'Subscription not found' });
    return res.json(row);
  } catch (err) {
    logger.error(`Get meal subscription error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Pause / resume ─────────────────────────────────────────────────────────

// authz: self
router.post('/:id/pause', requireObjectId, validate(mealPauseSchema), async (req, res) => {
  try {
    const row = await MealSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Subscription not found' });
    if (row.status !== 'active') {
      return res.status(409).json({ message: `Cannot pause a subscription in status '${row.status}'` });
    }
    if (!canTransition(MEAL_TRANSITIONS, row.status, 'paused')) {
      return res.status(409).json({ message: `Cannot move a subscription from '${row.status}' to 'paused'` });
    }

    row.status = 'paused';
    row.pause = {
      from: req.body.from,
      to: req.body.to,
      reason: req.body.reason ?? '',
      // Accumulated across every past window; this one adds nothing yet.
      pausedDays: row.pause?.pausedDays ?? 0,
    };
    await row.save();
    await auditLog('meal_subscription_paused', actorId(req), {
      subscriptionId: row._id, from: row.pause.from, to: row.pause.to, ip: req.ip,
    });
    return res.json({ _id: row._id, status: row.status, pause: row.pause });
  } catch (err) {
    logger.error(`Pause meal subscription error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: self
router.post('/:id/resume', requireObjectId, async (req, res) => {
  try {
    const row = await MealSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Subscription not found' });
    if (row.status !== 'paused') {
      return res.status(409).json({ message: `Cannot resume a subscription in status '${row.status}'` });
    }
    if (!canTransition(MEAL_TRANSITIONS, row.status, 'active')) {
      return res.status(409).json({ message: `Cannot move a subscription from '${row.status}' to 'active'` });
    }

    // Charge the window that actually elapsed, whole days, clamped to the
    // window: resumed early counts to now, resumed late (no job closed it)
    // counts only to `to` - never beyond the window the member agreed to.
    const fromMs = row.pause?.from ? new Date(row.pause.from).getTime() : NaN;
    const toMs = row.pause?.to ? new Date(row.pause.to).getTime() : Date.now();
    let days = 0;
    if (Number.isFinite(fromMs)) {
      const endMs = Math.min(Date.now(), Number.isFinite(toMs) ? toMs : Date.now());
      days = Math.max(0, Math.floor((endMs - fromMs) / DAY_MS));
    }
    row.pause = {
      from: row.pause?.from ?? null,
      to: row.pause?.to ?? null,
      reason: row.pause?.reason ?? '',
      // The window fields stay as the record of the LAST pause; `status` is
      // what says whether it is still in force.
      pausedDays: Math.max(0, (row.pause?.pausedDays ?? 0) + days),
    };
    row.status = 'active';
    await row.save();
    await auditLog('meal_subscription_resumed', actorId(req), {
      subscriptionId: row._id, pausedDaysAdded: days, ip: req.ip,
    });
    return res.json({ _id: row._id, status: row.status, pause: row.pause });
  } catch (err) {
    logger.error(`Resume meal subscription error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Skip days ──────────────────────────────────────────────────────────────

// authz: self
router.post('/:id/skip', requireObjectId, validate(mealSkipSchema), async (req, res) => {
  try {
    const row = await MealSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Subscription not found' });
    if (row.status === 'cancelled' || row.status === 'completed') {
      return res.status(409).json({ message: `Cannot skip days on a '${row.status}' subscription` });
    }

    const seen = new Set((row.skippedDates || []).map((date) => new Date(date).getTime()));
    const fresh = req.body.dates
      .map((date) => new Date(date))
      .filter((date) => {
        const ms = date.getTime();
        if (seen.has(ms)) return false;
        seen.add(ms);
        return true;
      });
    if (seen.size > MAX_SKIPPED_DATES) {
      return res.status(400).json({ message: `A subscription may skip at most ${MAX_SKIPPED_DATES} days` });
    }
    if (fresh.length) row.skippedDates.push(...fresh);
    await row.save();

    return res.json({ _id: row._id, skippedDates: row.skippedDates });
  } catch (err) {
    logger.error(`Skip meal days error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Cancel ─────────────────────────────────────────────────────────────────

// Cancel-in-place: the subscription is commerce history (pauses, skips and a
// future paid term all cite it), so DELETE flips `status` rather than removing
// the row - providerCatalog's archive-on-delete reasoning, one flow over.
// authz: self
router.delete('/:id', requireObjectId, async (req, res) => {
  try {
    const row = await MealSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Subscription not found' });
    // `cancelled -> cancelled` is a same-state re-assert, and canTransition
    // returns TRUE for those by design (so racing clicks do not error) - so a
    // terminal row is rejected HERE, before the table gets a chance to nod.
    if (row.status === 'cancelled') {
      return res.status(409).json({ message: `Cannot move a subscription from '${row.status}' to 'cancelled'` });
    }
    if (!canTransition(MEAL_TRANSITIONS, row.status, 'cancelled')) {
      return res.status(409).json({ message: `Cannot move a subscription from '${row.status}' to 'cancelled'` });
    }
    row.status = 'cancelled';
    await row.save();
    await auditLog('meal_subscription_cancelled', actorId(req), {
      subscriptionId: row._id, ip: req.ip,
    });
    return res.json({ _id: row._id, status: row.status });
  } catch (err) {
    logger.error(`Cancel meal subscription error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
