import express from 'express';
import ModerationItem from '../models/ModerationItem.js';
import Strike from '../models/Strike.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import {
  validate, moderationActionSchema, moderationNoteSchema,
  moderationAppealSchema, moderationAppealResolveSchema, moderationEnqueueSchema,
} from '../utils/validate.js';
import {
  MODERATION_SEVERITIES, isOverdue, needsSecondReviewer,
} from '../lib/moderationRules.js';
import {
  ensureModerationItem, applyModerationAction, restoreModerationTarget,
  issueStrike, recomputeStrikeEscalation, notifySubject, notifyStrike,
} from '../lib/moderationActions.js';

// 8.md §5 (moderation queues + tools) and §6 (strikes + appeals).
//
// The queue API for ModerationItem rows: list/claim/note, the canned actions
// with the §5.2 two-person gate, the ONE-appeal appeal flow resolved by a
// reviewer who did not take the original decision, and the strike table.
//
// Two rules are enforced HERE rather than in moderationActions.js because both
// are about WHO is acting, not about writing rows:
//   1. needsSecondReviewer(): a destructive action on a high/critical item (and
//      ANY strike) is parked as pendingAction and only takes effect when a
//      SECOND, different reviewer confirms it — the same shape
//      routes/adminApplications.js uses for two-person approvals.
//   2. Appeals resolve by someone who is NOT among the item's action takers.
//
// Every write is audited; the queue row's actions[] is the append-only
// decision log (8.md §2).

const OPS_ROLES = ['superadmin', 'moderator', 'compliance_officer'];

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;

const ACTIVE_STATUSES = ['open', 'in_review', 'appealed'];

/** An illegal move. 409, because the item EXISTS and simply is not there. */
const deny = (res, message, code) => res.status(409).json({ message, code });

// authz: role
//
// Queue reads are ops-only and deliberately UNSCOPED by tenant: a moderator is
// a platform role (rolesmd 8.md §5 "first-line ops"). Filters narrow the queue;
// they never widen who may open it.
router.get('/', protect, requireRole(OPS_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.targetType) filter.targetType = String(req.query.targetType);
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.severity && MODERATION_SEVERITIES.includes(String(req.query.severity))) {
      filter.severity = String(req.query.severity);
    }
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.assignee === 'me') filter.assignee = actorId(req);
    else if (req.query.assignee) filter.assignee = String(req.query.assignee);
    else if (req.query.unassigned === 'true') filter.assignee = null;
    if (req.query.overdue === 'true') {
      filter.slaDueAt = { $lt: new Date() };
      filter.status = { $in: ACTIVE_STATUSES };
    }

    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? 25), 10) || 25, 1), 100);
    const page = Math.max(Number.parseInt(String(req.query.page ?? 1), 10) || 1, 1);
    const [items, total] = await Promise.all([
      ModerationItem.find(filter)
        .select('-updatedAt -__v')
        .sort({ slaDueAt: 1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ModerationItem.countDocuments(filter),
    ]);
    return res.json({
      items: items.map((item) => ({ ...item, overdue: isOverdue(item) })),
      total, page, pages: Math.ceil(total / limit) || 1, limit,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.get('/strikes', protect, requireRole(OPS_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.subjectType) filter.subjectType = String(req.query.subjectType);
    if (req.query.subjectId) filter.subjectId = String(req.query.subjectId);
    if (req.query.status) filter.status = String(req.query.status);
    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? 25), 10) || 25, 1), 100);
    const [strikes, total] = await Promise.all([
      Strike.find(filter).sort({ issuedAt: -1 }).limit(limit).lean(),
      Strike.countDocuments(filter),
    ]);
    return res.json({ strikes, total, limit });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.get('/:id', protect, requireObjectId, requireRole(OPS_ROLES), async (req, res) => {
  try {
    const item = await ModerationItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json({ ...item, overdue: isOverdue(item) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
//
// Claiming moves open -> in_review and pins the assignee. Re-claiming something
// already in review is allowed only while it is unassigned: the queue must not
// let two moderators work the same row from opposite ends.
router.post('/:id/claim', protect, requireObjectId, requireRole(OPS_ROLES), async (req, res) => {
  try {
    const updated = await ModerationItem.findOneAndUpdate(
      { _id: req.params.id, status: 'open', assignee: null },
      {
        $set: { status: 'in_review', assignee: actorId(req) },
        $push: { notes: { note: 'claimed', by: actorId(req), at: new Date() } },
      },
      { new: true },
    );
    if (!updated) {
      const existing = await ModerationItem.findById(req.params.id).lean();
      if (!existing) return res.status(404).json({ message: 'Not found' });
      if (existing.status !== 'open') return deny(res, `Item is already ${existing.status}`, 'NOT_CLAIMABLE');
      return deny(res, 'Item is already assigned', 'ALREADY_CLAIMED');
    }
    await auditLog('moderation_claimed', actorId(req), { itemId: updated._id, ip: req.ip });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.post('/:id/note', protect, requireObjectId, requireRole(OPS_ROLES), validate(moderationNoteSchema), async (req, res) => {
  try {
    const item = await ModerationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    item.notes.push({ note: req.body.note, by: actorId(req), at: new Date() });
    await item.save();
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * Apply a confirmed action to the row: target enforcement, the append-only
 * decision log, escalation side effects. Called by both the single-reviewer
 * path and the second-reviewer confirmation.
 */
async function applyAction(item, action, by, note, { secondReviewer = false } = {}) {
  if (secondReviewer) item.pendingAction = { action: null, by: null, at: null, note: '' };
  if (action === 'strike') {
    const { strike, activeCount, level } = await issueStrike({ item, by, note });
    item.strikeIssued = true;
    await notifyStrike(item.subjectUserId, level, strike._id);
    item.actions.push({ action, by, at: new Date(), note, secondReviewer });
    item.status = 'actioned';
    await item.save();
    return { item, strike, activeCount, level };
  }

  if (action === 'restore') {
    const restored = await restoreModerationTarget(item, { note });
    item.actions.push({ action, by, at: new Date(), note, secondReviewer });
    item.status = 'actioned';
    item.targetSnapshot = null;
    await item.save();
    return { item, restored };
  }

  if (action === 'escalate') {
    item.escalated = true;
    item.actions.push({ action, by, at: new Date(), note, secondReviewer });
    // Escalation does not decide anything: the row stays open for the senior
    // reviewer, and the clock restarts at the escalated severity.
    item.severity = 'critical';
    item.slaDueAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await item.save();
    return { item };
  }

  const result = await applyModerationAction(item, action, { by, note });
  if (result.applied && result.snapshot) item.targetSnapshot = result.snapshot;
  item.actions.push({ action, by, at: new Date(), note, secondReviewer });
  item.status = 'actioned';
  if (!item.assignee) item.assignee = by;
  await item.save();

  if (action === 'warn_user') {
    await notifySubject(
      item.subjectUserId,
      'Content policy warning',
      note || 'Your content was found to violate the FindMedi content policy.',
      item._id,
    );
  } else if (['hide', 'remove', 'shadow_hide'].includes(action) && item.subjectUserId) {
    await notifySubject(
      item.subjectUserId,
      'Content actioned',
      'One of your posts or listings was actioned by the FindMedi moderation team. You may appeal once from the item.',
      item._id,
    );
  }
  return { item, result };
}

// authz: role
//
// The canned action endpoint. Flow:
//   needsSecondReviewer(severity, action)?
//     no  -> apply now
//     yes -> first reviewer PARKS it (202, nothing happens to the content);
//            second, DIFFERENT reviewer confirms with the same action body.
// Same reviewer twice = 403: that is exactly the accident two-person review
// exists to prevent.
router.post('/:id/action', protect, requireObjectId, requireRole(OPS_ROLES), validate(moderationActionSchema), async (req, res) => {
  try {
    const item = await ModerationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    if (!ACTIVE_STATUSES.includes(item.status)) {
      return deny(res, `Item is ${item.status} and no longer accepts actions`, 'ITEM_CLOSED');
    }
    const { action, note = '' } = req.body;
    const me = actorId(req);

    if (needsSecondReviewer(item.severity, action)) {
      const pending = item.pendingAction;
      if (!pending?.action || pending.action !== action) {
        item.pendingAction = { action, by: me, at: new Date(), note };
        item.notes.push({ note: `pending action ${action}: awaiting second reviewer`, by: me, at: new Date() });
        if (item.status === 'open') {
          item.status = 'in_review';
          if (!item.assignee) item.assignee = me;
        }
        await item.save();
        await auditLog('moderation_action_parked', me, { itemId: item._id, action, ip: req.ip });
        return res.status(202).json({
          message: 'Awaiting second reviewer',
          code: 'NEEDS_SECOND_REVIEWER',
          pendingAction: item.pendingAction,
        });
      }
      if (String(pending.by) === String(me)) {
        return res.status(403).json({
          message: 'Second reviewer must be a different person',
          code: 'SAME_REVIEWER',
        });
      }
      // Confirmation wins the race with a CAS on the parked action: two
      // confirms (or a confirm racing a re-park) cannot both apply.
      const confirmed = await ModerationItem.findOneAndUpdate(
        { _id: item._id, 'pendingAction.action': action, 'pendingAction.by': { $ne: me } },
        { new: true },
      );
      if (!confirmed) return deny(res, 'Pending action changed; reload the item', 'PENDING_CHANGED');
      const out = await applyAction(confirmed, action, me, note, { secondReviewer: true });
      await auditLog('moderation_action_confirmed', me, {
        itemId: confirmed._id, action, firstBy: pending.by, ip: req.ip,
      });
      return res.json({ item: out.item, strike: out.strike ?? null, secondReviewer: true });
    }

    const out = await applyAction(item, action, me, note);
    await auditLog('moderation_action', me, { itemId: item._id, action, ip: req.ip });
    return res.json(out);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

//
// The account that owns the flagged CONTENT may appeal - exactly once, and only
// against a decision that was actually taken. The subject check is in the
// handler because `assignee`/`subjectUserId` ownership is not an
// authorizeObject field pattern (the item has no single owner field shared with
// other routes).
// authz: self
router.post('/:id/appeal', protect, requireObjectId, validate(moderationAppealSchema), async (req, res) => {
  try {
    const item = await ModerationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    const me = actorId(req);
    if (!item.subjectUserId || String(item.subjectUserId) !== String(me)) {
      return res.status(404).json({ message: 'Not found' });
    }
    if (item.appeal?.appealedAt) return deny(res, 'This item has already been appealed', 'ALREADY_APPEALED');
    if (!['actioned', 'dismissed'].includes(item.status)) {
      return deny(res, 'Only a taken decision can be appealed', 'NOT_APPEALABLE');
    }
    item.status = 'appealed';
    item.appeal = {
      appealedBy: me, appealedAt: new Date(), note: req.body.note,
      resolvedBy: null, resolvedAt: null, outcome: null, resolutionNote: '',
    };
    await item.save();
    await auditLog('moderation_appeal_filed', me, { itemId: item._id, ip: req.ip });
    return res.status(201).json(item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
//
// A reviewer who did NOT take the original decision resolves the appeal —
// upholding it, or overturning it (which restores the target and, when a
// strike was issued for this item, flips that strike to `overturned` and
// recomputes the escalation the remaining strikes justify).
router.post('/:id/appeal/resolve', protect, requireObjectId, requireRole(OPS_ROLES), validate(moderationAppealResolveSchema), async (req, res) => {
  try {
    const item = await ModerationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    if (item.status !== 'appealed' || !item.appeal?.appealedAt) {
      return deny(res, 'Item has no open appeal', 'NO_OPEN_APPEAL');
    }
    const me = actorId(req);
    const takers = (item.actions || []).map((a) => String(a.by));
    if (takers.includes(String(me))) {
      return res.status(403).json({
        message: 'Appeals must be resolved by a reviewer who did not take the original decision',
        code: 'SAME_REVIEWER',
      });
    }

    const { outcome, resolutionNote = '' } = req.body;
    let strike = null;
    if (outcome === 'overturned') {
      await restoreModerationTarget(item, { note: `appeal overturned: ${resolutionNote}` });
      item.targetSnapshot = null;
      if (item.strikeIssued) {
        strike = await Strike.findOne({ moderationItemId: item._id, status: 'active' });
        if (strike) {
          strike.status = 'overturned';
          strike.appeal = {
            appealedBy: item.appeal.appealedBy,
            appealedAt: item.appeal.appealedAt,
            note: item.appeal.note,
            resolvedBy: me,
            resolvedAt: new Date(),
            outcome,
            resolutionNote,
          };
          await strike.save();
          await recomputeStrikeEscalation(strike);
        }
      }
    }

    item.appeal = {
      ...item.appeal.toObject?.() ?? item.appeal,
      resolvedBy: me, resolvedAt: new Date(), outcome, resolutionNote,
    };
    item.status = outcome === 'overturned' ? 'dismissed' : 'actioned';
    item.actions.push({
      action: 'restore', by: me, at: new Date(),
      note: `appeal ${outcome}: ${resolutionNote}`.slice(0, 1000),
      secondReviewer: true,
    });
    await item.save();
    await auditLog('moderation_appeal_resolved', me, {
      itemId: item._id, outcome, strikeOverturned: Boolean(strike), ip: req.ip,
    });
    return res.json({ item, strikeOverturned: Boolean(strike) });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
//
// Manual queue entry: an operator can put any target in the queue without a
// detector firing (a report, a fake-provider suspicion). ensureModerationItem
// collapses repeats onto the one OPEN row per target, so a burst of manual
// entries cannot multiply the work.
router.post('/', protect, requireRole(OPS_ROLES), validate(moderationEnqueueSchema), async (req, res) => {
  try {
    const { targetType, targetId, category, severity, reason } = req.body;
    const { item, created } = await ensureModerationItem({
      targetType,
      targetId,
      category,
      reason,
      severity,
      source: 'ops',
      reporterId: actorId(req),
      subjectUserId: req.body.subjectUserId || null,
      subjectProviderId: req.body.subjectProviderId || null,
      note: req.body.note || '',
    });
    await auditLog('moderation_enqueued', actorId(req), { itemId: item._id, targetType, targetId, ip: req.ip });
    return res.status(created ? 201 : 200).json({ item, created });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
