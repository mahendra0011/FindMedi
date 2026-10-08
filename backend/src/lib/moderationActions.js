import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import ChatReport from '../models/ChatReport.js';
import ModerationItem from '../models/ModerationItem.js';
import Strike from '../models/Strike.js';
import Notification from '../models/Notification.js';
import logger from '../config/logger.js';
import {
  ACTION_VISIBILITY,
  MODERATION_POLICY_VERSION,
  escalationForStrikeCount,
  maxSeverity,
  severityForCategory,
  slaDueAtFor,
} from './moderationRules.js';

/**
 * 8.md §5 + §6 — the model-touching half of moderation.
 *
 * Routes stay thin on purpose: they decide WHO may act and WHEN (authz, the
 * two-person gate, the appeal rules); everything that WRITES to a target row,
 * the queue, or the strike table lives here so the public read path
 * (routes/reviews.js) and the ops queue (routes/moderation.js) cannot drift
 * apart — a review hidden by an auto-flag and a review hidden by a moderator
 * end up with the same `moderationStatus`.
 *
 * Audit rows are written by the ROUTES, not here: this module is also reached
 * from the review-create path, where the route's own `auditLog` already runs
 * and a duplicate trail entry would make the counts lie.
 */

const ACTIVE_STATUSES = ['open', 'in_review', 'appealed'];

const asId = (value) => (mongoose.isValidObjectId(value) ? value : null);

/**
 * Auto-flag / report entry point: one OPEN queue row per target, ever.
 *
 * A burst of reports on the same review must not turn into fifty rows that
 * each need their own decision — the second report raises the severity of the
 * row that already exists instead.
 *
 * @returns {Promise<{item: object, created: boolean}>}
 */
export async function ensureModerationItem({
  targetType,
  targetId,
  category = 'other',
  reason = '',
  severity,
  source = 'auto_filter',
  reporterId = null,
  subjectUserId = null,
  subjectProviderId = null,
  note = '',
}) {
  const id = String(targetId);
  const existing = await ModerationItem.findOne({
    targetType,
    targetId: id,
    status: { $in: ACTIVE_STATUSES },
  });

  const nextSeverity = severity || severityForCategory(category);

  if (existing) {
    const raised = maxSeverity(existing.severity, nextSeverity);
    if (raised !== existing.severity) {
      existing.severity = raised;
      existing.slaDueAt = slaDueAtFor(raised, new Date());
      if (note) existing.notes.push({ note, by: reporterId, at: new Date() });
      await existing.save();
    } else if (note) {
      existing.notes.push({ note, by: reporterId, at: new Date() });
      await existing.save();
    }
    return { item: existing, created: false };
  }

  const item = await ModerationItem.create({
    targetType,
    targetId: id,
    category,
    reason,
    severity: nextSeverity,
    status: 'open',
    source,
    reporterId,
    subjectUserId,
    subjectProviderId,
    policyVersion: MODERATION_POLICY_VERSION,
    slaDueAt: slaDueAtFor(nextSeverity, new Date()),
    notes: note ? [{ note, by: reporterId || subjectUserId, at: new Date() }] : [],
  });
  return { item, created: true };
}

/**
 * Push a canned action onto the target row itself. This is the half of "moderation
 * is immediately reflected" that the public read path depends on: a `hide` here
 * is what makes routes/reviews.js stop serving the review.
 *
 * @returns {Promise<{applied: boolean, snapshot: object|null, targetStatus: string|null}>}
 */
export async function applyModerationAction(item, action, { by = null, note = '' } = {}) {
  const visibility = ACTION_VISIBILITY[action];
  if (!visibility) return { applied: false, snapshot: null, targetStatus: null };

  if (item.targetType === 'review') {
    const reviewId = asId(item.targetId);
    if (!reviewId) return { applied: false, snapshot: null, targetStatus: null };
    const before = await Review.findById(reviewId).select('moderationStatus');
    if (!before) return { applied: false, snapshot: null, targetStatus: null };
    await Review.findByIdAndUpdate(reviewId, { moderationStatus: visibility });
    return {
      applied: true,
      snapshot: { moderationStatus: before.moderationStatus || 'visible' },
      targetStatus: visibility,
    };
  }

  if (item.targetType === 'provider_profile') {
    const providerId = asId(item.targetId);
    if (!providerId) return { applied: false, snapshot: null, targetStatus: null };
    const provider = await Provider.findById(providerId).select('status');
    if (!provider) return { applied: false, snapshot: null, targetStatus: null };
    // The directory only serves rows whose status is live/approved, so a
    // suspended row disappears from it. `restore` puts back whatever was there.
    if (visibility === 'visible') {
      const backTo = item.targetSnapshot?.status || provider.status;
      await Provider.findByIdAndUpdate(providerId, { status: backTo });
      return { applied: true, snapshot: null, targetStatus: backTo };
    }
    await Provider.findByIdAndUpdate(providerId, { status: 'suspended' });
    return { applied: true, snapshot: { status: provider.status }, targetStatus: 'suspended' };
  }

  if (item.targetType === 'chat_report') {
    const reportId = asId(item.targetId);
    if (!reportId) return { applied: false, snapshot: null, targetStatus: null };
    const next = visibility === 'visible' ? 'reviewed' : 'action_taken';
    const before = await ChatReport.findById(reportId).select('status');
    if (!before) return { applied: false, snapshot: null, targetStatus: null };
    await ChatReport.findByIdAndUpdate(reportId, { status: next });
    return { applied: true, snapshot: { status: before.status }, targetStatus: next };
  }

  // product_listing / event / article: those catalogues are modelled by other
  // workstreams (10.md §4). The queue row, the action log and the audit entry
  // still happen — enforcement lands the day the model does.
  return { applied: false, snapshot: null, targetStatus: null };
}

/** Undo a destructive action (appeal overturned): put the snapshot back. */
export async function restoreModerationTarget(item, { note = '' } = {}) {
  const restored = await applyModerationAction(item, 'restore', { note });
  return restored;
}

export async function countActiveStrikes(subjectType, subjectId) {
  return Strike.countDocuments({ subjectType, subjectId, status: 'active' });
}

/**
 * 8.md §6: turn an upheld violation into a permanent strike and climb the
 * threshold table (see STRIKE_THRESHOLDS in moderationRules.js).
 *
 * @returns {Promise<{strike: object, activeCount: number, level: string, applied: string[]}>}
 */
export async function issueStrike({ item, by, note = '' }) {
  const subject = resolveStrikeSubject(item);
  if (!subject) {
    throw new Error('Moderation item has no strike subject (author or provider unknown)');
  }

  const activeCount = await countActiveStrikes(subject.subjectType, subject.subjectId);
  const level = escalationForStrikeCount(activeCount + 1, subject.subjectType);

  const strike = await Strike.create({
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    providerId: subject.providerId,
    userId: subject.userId,
    moderationItemId: item._id,
    targetType: item.targetType,
    category: item.category,
    severity: item.severity,
    reason: note || item.reason,
    issuedBy: by,
    status: 'active',
    level,
    policyVersion: MODERATION_POLICY_VERSION,
  });

  const applied = await applyStrikeEscalation({ subject, level });
  return { strike, activeCount: activeCount + 1, level, applied };
}

function resolveStrikeSubject(item) {
  if (item.targetType === 'provider_profile') {
    const providerId = asId(item.targetId);
    if (providerId) {
      return { subjectType: 'provider', subjectId: providerId, providerId, userId: item.subjectUserId || null };
    }
  }
  if (item.subjectProviderId) {
    const providerId = asId(item.subjectProviderId);
    if (providerId) {
      return { subjectType: 'provider', subjectId: providerId, providerId, userId: item.subjectUserId || null };
    }
  }
  const userId = asId(item.subjectUserId);
  if (userId) return { subjectType: 'user', subjectId: userId, providerId: null, userId };
  return null;
}

/**
 * Climb (never fall) to the level the strike count demands:
 *   warning           → in-app notice only
 *   listing_suspension → provider delisted directory-wide
 *   account_suspension → owner (or the user) blocked platform-wide
 */
async function applyStrikeEscalation({ subject, level }) {
  const applied = [];
  if (subject.subjectType === 'provider') {
    if (level === 'listing_suspension' || level === 'account_suspension') {
      await Provider.findByIdAndUpdate(subject.subjectId, { status: 'suspended' });
      applied.push('provider_suspended');
    }
    if (level === 'account_suspension' && subject.userId) {
      await User.findByIdAndUpdate(subject.userId, { status: 'blocked' });
      applied.push('owner_account_blocked');
    }
  } else if (level === 'account_suspension') {
    await User.findByIdAndUpdate(subject.subjectId, { status: 'blocked' });
    applied.push('user_account_blocked');
  }
  return applied;
}

/**
 * After an appeal overturns a strike, drop back to the level the REMAINING
 * active strikes justify — and only un-suspend what this strike suspended.
 */
export async function recomputeStrikeEscalation(strike) {
  const remaining = await countActiveStrikes(strike.subjectType, strike.subjectId);
  const level = escalationForStrikeCount(remaining, strike.subjectType);

  const needsListingBack = ['listing_suspension', 'account_suspension'].includes(strike.level)
    && !['listing_suspension', 'account_suspension'].includes(level);
  const needsAccountBack = strike.level === 'account_suspension' && level !== 'account_suspension';

  if (strike.subjectType === 'provider') {
    if (needsListingBack && strike.providerId) {
      await Provider.findByIdAndUpdate(strike.providerId, { status: 'approved' });
    }
    if (needsAccountBack && strike.userId) {
      await User.findByIdAndUpdate(strike.userId, { status: 'active' });
    }
  } else if (needsAccountBack) {
    await User.findByIdAndUpdate(strike.subjectId, { status: 'active' });
  }
  return { remaining, level };
}

const STRIKE_COPY = {
  warning: {
    title: 'Community guideline warning',
    message: 'One of your posts or listings was found to violate the FindMedi content policy. Another upheld violation can lead to a suspension.',
  },
  listing_suspension: {
    title: 'Listing suspended',
    message: 'Your FindMedi listing has been suspended after repeated policy violations. Contact support to appeal.',
  },
  account_suspension: {
    title: 'Account suspended',
    message: 'Your FindMedi account has been suspended after repeated policy violations. Contact support to appeal.',
  },
};

/**
 * In-app notice (8.md §3 "suspend/unsuspend … notify"). Never throws: a
 * notification failure must not roll back a moderation decision that already
 * took effect.
 */
export async function notifySubject(userId, title, message, referenceId) {
  if (!userId) return null;
  try {
    return await Notification.create({
      userId: String(userId),
      title,
      message,
      type: 'system',
      referenceId: referenceId ? String(referenceId) : null,
    });
  } catch (err) {
    logger.warn(`moderation notification failed: ${err.message}`);
    return null;
  }
}

export async function notifyStrike(subjectUserId, level, referenceId) {
  const copy = STRIKE_COPY[level] || STRIKE_COPY.warning;
  return notifySubject(subjectUserId, copy.title, copy.message, referenceId);
}
