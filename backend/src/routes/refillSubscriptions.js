import express from 'express';
import RefillSubscription from '../models/RefillSubscription.js';
import Prescription from '../models/Prescription.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createRefillSubscriptionSchema, refillActionSchema } from '../utils/validate.js';
import logger from '../config/logger.js';

// Spec 2.3: refill subscriptions. Self-service for patients (`// authz: self`),
// with one staff-only sweep endpoint that a scheduler/admin can call.
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

const REFILL_TRANSITIONS = {
  active: ['paused', 'cancelled'],
  paused: ['active', 'cancelled'],
  cancelled: [],
};
const canTransition = (from, to) => (REFILL_TRANSITIONS[from] || []).includes(to);

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

// authz: self
router.get('/', async (req, res) => {
  try {
    const filter = { userId: actorId(req) };
    if (req.query.status) filter.status = req.query.status;
    const rows = await RefillSubscription.find(filter).sort({ nextRefillAt: 1 }).limit(200).lean();
    return res.json({ subscriptions: rows });
  } catch (err) {
    logger.error(`Refill subscription list error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch refill subscriptions' });
  }
});

// authz: role
router.get('/due', requireRole(['hospital_admin', 'pharmacy_owner', 'superadmin']), async (req, res) => {
  try {
    const now = new Date();
    const within = new Date(now.getTime() + (Number(req.query.days) || 0) * DAY_MS);
    const rows = await RefillSubscription.find({
      status: 'active',
      nextRefillAt: { $lte: within },
    }).sort({ nextRefillAt: 1 }).limit(500).lean();
    return res.json({ due: rows, count: rows.length });
  } catch (err) {
    logger.error(`Refill due list error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch due refills' });
  }
});

// authz: self
router.post('/', validate(createRefillSubscriptionSchema), async (req, res) => {
  try {
    const body = req.body;
    if (body.prescriptionId) {
      const rx = await Prescription.findOne({ _id: body.prescriptionId, patientId: actorId(req) }).select('_id').lean();
      if (!rx) return res.status(404).json({ message: 'Prescription not found' });
    }
    const startAt = body.startAt ? new Date(body.startAt) : new Date();
    const sub = await RefillSubscription.create({
      ...body,
      userId: actorId(req),
      startAt,
      nextRefillAt: addDays(startAt, body.intervalDays || 30),
      history: [{ action: 'created', by: actorId(req) }],
    });
    await auditLog('create_refill_subscription', actorId(req), {
      recordId: sub._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(sub);
  } catch (err) {
    logger.error(`Refill subscription create error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
router.patch('/:id/pause', requireObjectId, async (req, res) => {
  try {
    const sub = await RefillSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!sub) return res.status(404).json({ message: 'Refill subscription not found' });
    if (!canTransition(sub.status, 'paused')) {
      return res.status(409).json({ message: `Cannot pause a ${sub.status} subscription` });
    }
    sub.status = 'paused';
    sub.history.push({ action: 'paused', by: actorId(req), note: String(req.body?.reason || '').slice(0, 300) });
    await sub.save();
    return res.json(sub);
  } catch (err) {
    logger.error(`Refill pause error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to pause refill subscription' });
  }
});

// authz: self
router.patch('/:id/resume', requireObjectId, async (req, res) => {
  try {
    const sub = await RefillSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!sub) return res.status(404).json({ message: 'Refill subscription not found' });
    if (!canTransition(sub.status, 'active')) {
      return res.status(409).json({ message: `Cannot resume a ${sub.status} subscription` });
    }
    sub.status = 'active';
    if (!sub.nextRefillAt || sub.nextRefillAt < new Date()) {
      sub.nextRefillAt = addDays(new Date(), sub.intervalDays);
    }
    sub.history.push({ action: 'resumed', by: actorId(req) });
    await sub.save();
    return res.json(sub);
  } catch (err) {
    logger.error(`Refill resume error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to resume refill subscription' });
  }
});

// authz: self
router.patch('/:id/cancel', requireObjectId, async (req, res) => {
  try {
    const sub = await RefillSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!sub) return res.status(404).json({ message: 'Refill subscription not found' });
    if (!canTransition(sub.status, 'cancelled')) {
      return res.status(409).json({ message: `Subscription already ${sub.status}` });
    }
    sub.status = 'cancelled';
    sub.history.push({ action: 'cancelled', by: actorId(req), note: String(req.body?.reason || '').slice(0, 300) });
    await sub.save();
    return res.json(sub);
  } catch (err) {
    logger.error(`Refill cancel error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to cancel refill subscription' });
  }
});

// authz: self
router.post('/:id/refill', requireObjectId, validate(refillActionSchema), async (req, res) => {
  try {
    const sub = await RefillSubscription.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!sub) return res.status(404).json({ message: 'Refill subscription not found' });
    if (sub.status !== 'active') {
      return res.status(409).json({ message: `Cannot refill a ${sub.status} subscription` });
    }
    const now = new Date();
    if (!req.body?.early && sub.nextRefillAt && sub.nextRefillAt > now) {
      return res.status(409).json({ message: 'Refill is not due yet', nextRefillAt: sub.nextRefillAt });
    }
    sub.lastRefilledAt = now;
    sub.refillCount += 1;
    sub.nextRefillAt = addDays(sub.nextRefillAt && sub.nextRefillAt > now ? sub.nextRefillAt : now, sub.intervalDays);
    sub.history.push({ action: 'refilled', by: actorId(req), note: String(req.body?.note || '').slice(0, 300) });
    await sub.save();
    await auditLog('refill_subscription_refill', actorId(req), {
      recordId: sub._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(sub);
  } catch (err) {
    logger.error(`Refill error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to refill subscription' });
  }
});

export default router;
