import express from 'express';
import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { notifyUser } from '../services/socketService.js';
import { validate, createNotificationSchema } from '../utils/validate.js';
import { paginatedResults } from '../utils/pagination.js';
import { createNotification } from '../services/notificationService.js';
import NotificationPreference from '../models/NotificationPreference.js';
import NotificationAudit from '../models/NotificationAudit.js';
import { loadPreference, applyDiscreetCopy } from '../services/notificationPreferences.js';
import { applyProviderEvent, receiptsFor } from '../services/notificationDelivery.js';

const router = express.Router();

/**
 * NOTIF-B-01/02/03: resolve the notification scope of the caller.
 *
 * The old version returned `req.query.userId || null` for a hospital_admin, and
 * every handler then did `if (effectiveUserId) filter.userId = ...` — with a null
 * id the filter stayed EMPTY, so `GET /`, `/unread-count`, `/mark-all-read` and
 * (worst) `DELETE /clear-all` operated on the WHOLE platform: any hospital admin
 * read every patient's notifications and could destroy the whole collection.
 *
 * Rules now:
 *   - no `?userId=`                  -> the caller's own notifications
 *   - `?userId=` of the own tenant   -> allowed (that staff member's rows)
 *   - `?userId=` of another hospital -> 403
 *   - superadmin                     -> any explicit id
 *   - unresolvable scope             -> 403 (never an empty filter)
 */
const STAFF_ROLES = ['hospital_admin', 'admin'];

const getNotificationUserId = async (req) => {
  const role = req.user.role;
  const rawId = req.user._id.toString();

  if (role === 'doctor' || role === 'counsellor' || role === 'psychiatrist') {
    const doctor = await Doctor.findOne({ user_id: rawId });
    return (doctor && doctor.user_id) ? doctor.user_id : rawId;
  }

  const requested = req.query?.userId || req.body?.userId;
  // NOTIF-B-02: default to the caller instead of leaving the filter empty.
  if (!requested) return rawId;
  if (String(requested) === rawId) return rawId;
  if (role === 'superadmin') return String(requested);

  if (STAFF_ROLES.includes(role)) {
    // NOTIF-B-03: the target must belong to the caller's own hospital.
    if (!req.user.hospitalId) {
      const err = new Error('No hospital linked to this account');
      err.status = 403;
      throw err;
    }
    const { default: User } = await import('../models/User.js');
    const target = await User.findById(requested).select('hospitalId').lean();
    if (!target || !target.hospitalId || String(target.hospitalId) !== String(req.user.hospitalId)) {
      const err = new Error('Not authorized to access this user notifications');
      err.status = 403;
      throw err;
    }
    return String(requested);
  }

  // Any other role may only ever address itself.
  const err = new Error('Not authorized to access this user notifications');
  err.status = 403;
  throw err;
};

router.get('/', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const effectiveUserId = await getNotificationUserId(req);
    // NOTIF-B-01/02: never list/query the whole collection.
    if (!effectiveUserId) {
      return res.status(403).json({ message: 'Refusing to list notifications without a user scope' });
    }
    const result = await paginatedResults(Notification, { userId: effectiveUserId }, { page, limit });
    // 6.md §2.15: the list is a PREVIEW surface, so for a user with discreet
    // mode on (and only for that user - a staff member listing someone else's
    // rows reads the OWNER's preference, not their own) each row arrives with
    // neutral copy. Critical rows pass through untouched: a neutralised SOS
    // preview is an SOS nobody reacts to.
    const pref = await loadPreference(effectiveUserId);
    res.json({
      ...result,
      data: (result.data || []).map((row) => applyDiscreetCopy(row, pref)),
    });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ message: err.message });
    next(err);
  }
});

router.get('/unread-count', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res) => {
  try {
    const effectiveUserId = await getNotificationUserId(req);
    if (!effectiveUserId) {
      return res.status(403).json({ message: 'Refusing to count notifications without a user scope' });
    }
    const count = await Notification.countDocuments({ read: false, userId: effectiveUserId });
    res.json({ count });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.put('/mark-all-read', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res) => {
  try {
    const effectiveUserId = await getNotificationUserId(req);
    if (!effectiveUserId) {
      return res.status(403).json({ message: 'Refusing to update notifications without a user scope' });
    }
    const result = await Notification.updateMany(
      { read: false, userId: effectiveUserId },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read', updated: result.modifiedCount });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('notifications:read', 'notifications:read:own'), adminOnly, validate(createNotificationSchema), async (req, res) => {
  try {
    // NOTIF-B-05: routed through the controlled writer (dedup + per-user cap).
    const { notification, reason } = await createNotification(req.body);
    if (reason === 'rate-capped') {
      return res.status(429).json({ message: 'Notification rate limit reached for this user today' });
    }
    if (!notification) {
      return res.status(400).json({ message: 'Notification could not be created' });
    }
    if (notification.userId) {
      notifyUser(notification.userId, notification);
    }
    res.status(201).json(notification);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── NOTIF-M-02: consent, quiet hours, channel choice ─────────────────────────
// Mounted BEFORE `/:id/read` so the literal path is not swallowed by a param
// route. Self-scoped: a user may read and write only their own preferences, so
// there is no object-level guard to get wrong here.
router.get('/preferences', protect, async (req, res) => {
  try {
    const pref = await loadPreference(req.user._id);
    res.json(pref);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/preferences', protect, async (req, res) => {
  try {
    const { channels, marketingOptIn, mutedTypes, quietHours, discreetMode } = req.body || {};

    // Validate rather than trust: quiet-hours minutes out of range would produce
    // a window that silently never matches, and a channel key that is not a real
    // channel would be stored and never consulted.
    for (const key of ['inApp', 'email', 'sms', 'push']) {
      if (channels?.[key] !== undefined && typeof channels[key] !== 'boolean') {
        return res.status(400).json({ message: `channels.${key} must be a boolean` });
      }
    }
    if (marketingOptIn !== undefined && typeof marketingOptIn !== 'boolean') {
      return res.status(400).json({ message: 'marketingOptIn must be a boolean' });
    }
    if (quietHours) {
      for (const key of ['startMinute', 'endMinute']) {
        const v = quietHours[key];
        if (v !== undefined && (!Number.isInteger(v) || v < 0 || v > 1439)) {
          return res.status(400).json({ message: `quietHours.${key} must be an integer 0-1439` });
        }
      }
      if (quietHours.enabled !== undefined && typeof quietHours.enabled !== 'boolean') {
        return res.status(400).json({ message: 'quietHours.enabled must be a boolean' });
      }
    }
    if (mutedTypes !== undefined && !Array.isArray(mutedTypes)) {
      return res.status(400).json({ message: 'mutedTypes must be an array' });
    }
    // 6.md §2.15: the flag was modelled (NotificationPreference.discreetMode)
    // but no writer accepted it, so it could never be turned on. It is a
    // display preference, not a mute - a non-boolean here is a bug, not a
    // coercion opportunity.
    if (discreetMode !== undefined && typeof discreetMode !== 'boolean') {
      return res.status(400).json({ message: 'discreetMode must be a boolean' });
    }

    const update = {};
    if (channels) update.channels = channels;
    if (marketingOptIn !== undefined) update.marketingOptIn = marketingOptIn;
    if (mutedTypes !== undefined) update.mutedTypes = mutedTypes;
    if (quietHours) update.quietHours = quietHours;
    if (discreetMode !== undefined) update.discreetMode = discreetMode;

    const saved = await NotificationPreference.findOneAndUpdate(
      { userId: String(req.user._id) },
      { $set: update, $setOnInsert: { userId: String(req.user._id) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
      channels: saved.channels,
      marketingOptIn: saved.marketingOptIn,
      mutedTypes: saved.mutedTypes,
      quietHours: saved.quietHours,
      discreetMode: saved.discreetMode === true,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/**
 * NOTIF-M-04: provider delivery webhooks.
 *
 * UNAUTHENTICATED BY DESIGN at the app layer, and that is only safe because
 * every update is scoped to an EXISTING receipt keyed by a provider message id
 * that only the provider and this platform have ever seen. There is no
 * user-supplied path into the collection: an unauthenticated caller cannot
 * create a receipt, only move one between states, and cannot name a recipient
 * because recipients are not part of the webhook body this endpoint reads.
 *
 * Rate-limit and provider-side signature verification should still be added -
 * see the finding's residual note in the report.
 */
router.post('/webhooks/delivery', async (req, res) => {
  try {
    const event = req.body?.event || req.body?.['event'];
    const messageId = req.body?.messageId || req.body?.['message-id'] || req.body?.message_id;
    if (!messageId || !event) return res.status(400).json({ message: 'messageId and event are required' });

    const applied = await applyProviderEvent({ messageId, event });
    // 202 for an unknown id: acknowledging stops the provider retrying, and this
    // endpoint cannot distinguish "already delivered" from "never existed".
    res.status(applied ? 200 : 202).json({ applied });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── NOTIF-M-06: the audit trail, for proving what was and was not sent ───────
router.get('/audit', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res) => {
  try {
    const effectiveUserId = await getNotificationUserId(req);
    const limit = req.query?.limit;
    const filter = { userId: String(effectiveUserId) };

    const rows = await NotificationAudit.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .select('-metadata')
      .lean();

    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── NOTIF-M-04: what actually happened to a notification ─────────────────────
router.get('/:id/delivery', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res) => {
  try {
    const effectiveUserId = await getNotificationUserId(req);
    const notification = await Notification.findOne({ _id: req.params.id, userId: String(effectiveUserId) });
    // 404, not 403: an ownership mismatch must not be an id-existence oracle.
    if (!notification) return res.status(404).json({ message: 'Not found' });

    res.json(await receiptsFor(notification._id));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/read', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res) => {
  try {
    const effectiveUserId = await getNotificationUserId(req);
    // NOTIF-B-04: an ownership mismatch answers 404 (not 403) so the response is
    // not an id-existence oracle.
    const notification = await Notification.findOne({ _id: req.params.id, userId: effectiveUserId });
    if (!notification) return res.status(404).json({ message: 'Not found' });
    notification.read = true;
    await notification.save();
    // The ack carries the whole row, so it is a preview surface too - the
    // client may render straight from this response.
    res.json(applyDiscreetCopy(notification, await loadPreference(effectiveUserId)));
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.delete('/clear-all', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res) => {
  try {
    const effectiveUserId = await getNotificationUserId(req);
    // NOTIF-B-01: an empty filter on deleteMany destroyed EVERY user's
    // notifications platform-wide. Fail closed instead.
    if (!effectiveUserId) {
      return res.status(403).json({ message: 'Refusing to clear notifications without a user scope' });
    }
    const result = await Notification.deleteMany({ userId: effectiveUserId });
    res.json({ message: 'All notifications cleared', deleted: result.deletedCount });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('notifications:read', 'notifications:read:own'), async (req, res) => {
  try {
    const effectiveUserId = await getNotificationUserId(req);
    // NOTIF-B-04: 404 (not 403) on an ownership mismatch — no existence oracle.
    const notification = await Notification.findOne({ _id: req.params.id, userId: effectiveUserId });
    if (!notification) return res.status(404).json({ message: 'Not found' });
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

export default router;
