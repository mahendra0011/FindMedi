/**
 * 5.md §11: review-prompt scheduler (T+2h / T+1day after completion).
 *
 * The review request existed nowhere — completed visits never asked for a
 * rating, so the verified-review pipeline starved. Same durability contract
 * as appointmentReminder.job.js:
 *
 *  1. DURABLE — per-milestone state lives on the Appointment document
 *     (`reviewPrompt`), not in process memory; missed ticks recover.
 *  2. IDEMPOTENT — atomic findOneAndUpdate claim + dedupKey on the
 *     notification write; a visit reviewed already is SKIPPED, never asked.
 *  3. TRUTHFUL — prompts send inside their window (t2h: +2h..+24h,
 *     t1d: +24h..+72h); stale ones are recorded as skipped, not sent late.
 */
import { schedule } from 'node-cron';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import logger from '../config/logger.js';
import { createNotification } from '../services/notificationService.js';
import { backoffMs } from '../services/notificationDelivery.js';

const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;

export const MILESTONES = [
  { key: 't2h', afterMs: 2 * HOUR_MS, staleAfterMs: 24 * HOUR_MS, title: 'How was your visit?' },
  { key: 't1d', afterMs: 24 * HOUR_MS, staleAfterMs: 72 * HOUR_MS, title: 'Rate your recent visit' },
];

export const LEASE_MS = 10 * MIN_MS;
export const MAX_ATTEMPTS = 10;

/** Reasons from decide() that mean "will never succeed" — do not retry. */
const TERMINAL_SUPPRESSION = new Set(['type-muted', 'marketing-opted-out', 'channel-disabled', 'no-recipient']);

const milestoneOf = (appt, key) => appt?.reviewPrompt?.[key] || { status: 'pending', attempts: 0 };

async function claim(appt, key, now) {
  const path = `reviewPrompt.${key}`;
  return Appointment.findOneAndUpdate(
    {
      _id: appt._id,
      $or: [
        { [`${path}.status`]: { $exists: false } },
        { [`${path}.status`]: 'pending' },
        { [`${path}.status`]: 'failed', [`${path}.nextAttemptAt`]: { $lte: now } },
        { [`${path}.status`]: 'sending', [`${path}.claimedAt`]: { $lt: new Date(now.getTime() - LEASE_MS) } },
      ],
    },
    {
      $set: { [`${path}.status`]: 'sending', [`${path}.claimedAt`]: now },
      $inc: { [`${path}.attempts`]: 1 },
    },
    { new: true },
  );
}

async function finish(apptId, key, status, { now, reason = null, nextAttemptAt = null } = {}) {
  const path = `reviewPrompt.${key}`;
  const set = { [`${path}.status`]: status };
  if (status === 'sent') set[`${path}.sentAt`] = now;
  if (reason) set[`${path}.lastReason`] = String(reason).slice(0, 200);
  if (nextAttemptAt) set[`${path}.nextAttemptAt`] = nextAttemptAt;
  await Appointment.updateOne({ _id: apptId, [`${path}.status`]: 'sending' }, { $set: set });
}

async function markSkipped(apptId, key, reason) {
  const path = `reviewPrompt.${key}`;
  await Appointment.updateOne(
    { _id: apptId, [`${path}.status`]: { $nin: ['sending', 'sent', 'skipped'] } },
    { $set: { [`${path}.status`]: 'skipped', [`${path}.lastReason`]: reason } },
  );
}

function promptMessage(appt) {
  return `How was your visit with ${appt.doctor || 'your doctor'}? Your rating helps other patients choose with confidence.`;
}

async function deliver(appt, milestone) {
  // Already reviewed → ask nothing. The bookingRef link is what makes a
  // review "verified" downstream, so its presence is the exact skip signal.
  const existing = await Review.findOne({ bookingRef: appt._id }).select('_id').lean();
  if (existing) return { delivered: false, reason: 'already-reviewed' };
  const { notification, reason } = await createNotification({
    userId: String(appt.patientId),
    type: 'review_request',
    priority: 'normal',
    title: milestone.title,
    message: promptMessage(appt),
    dedupKey: `review-prompt:${appt._id}:${milestone.key}`,
    details: { appointmentId: String(appt._id), milestone: milestone.key },
    actor: 'reviewPromptJob',
  });
  if (!notification && reason !== 'duplicate') return { delivered: false, reason };
  return { delivered: true, reason: reason || null };
}

/**
 * One scan. Exported with an injectable clock so tests never depend on wall time.
 */
export async function runReviewPromptsOnce(now = new Date()) {
  const stats = { scanned: 0, due: 0, sent: 0, skipped: 0, failed: 0, deferred: 0 };
  const floor = new Date(now.getTime() - 72 * HOUR_MS - HOUR_MS);

  const appts = await Appointment.find({
    status: 'Completed',
    updatedAt: { $gte: floor },
    patientId: { $ne: null },
  })
    .select('status patient patientId doctor updatedAt createdAt reviewPrompt')
    .lean();

  for (const appt of appts) {
    stats.scanned += 1;
    const completedAt = new Date(appt.updatedAt || appt.createdAt || 0).getTime();
    if (!completedAt) continue;
    const elapsedMs = now.getTime() - completedAt;
    if (elapsedMs < 0) continue;

    for (const milestone of MILESTONES) {
      const state = milestoneOf(appt, milestone.key);
      if (state.status === 'sent' || state.status === 'skipped') continue;
      if (state.status === 'sending' && state.claimedAt && now - new Date(state.claimedAt) < LEASE_MS) continue;
      if ((state.attempts || 0) >= MAX_ATTEMPTS) continue;
      if (elapsedMs < milestone.afterMs) continue; // not due yet
      if (elapsedMs > milestone.staleAfterMs) {
        await markSkipped(appt._id, milestone.key, 'window-passed');
        stats.skipped += 1;
        continue;
      }

      stats.due += 1;
      const claimed = await claim(appt, milestone.key, now);
      if (!claimed) {
        stats.deferred += 1;
        continue;
      }

      try {
        const outcome = await deliver(claimed, milestone);
        if (outcome.delivered || outcome.reason === 'duplicate') {
          await finish(claimed._id, milestone.key, 'sent', { now, reason: outcome.reason });
          stats.sent += 1;
        } else if (outcome.reason === 'already-reviewed' || TERMINAL_SUPPRESSION.has(outcome.reason)) {
          await finish(claimed._id, milestone.key, 'skipped', { now, reason: outcome.reason });
          stats.skipped += 1;
        } else {
          const attempts = milestoneOf(claimed, milestone.key).attempts || 1;
          await finish(claimed._id, milestone.key, 'failed', {
            now,
            reason: outcome.reason || 'send-failed',
            nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
          });
          stats.failed += 1;
        }
      } catch (err) {
        const attempts = milestoneOf(claimed, milestone.key).attempts || 1;
        await finish(claimed._id, milestone.key, 'failed', {
          now,
          reason: err.message,
          nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
        }).catch(() => {});
        stats.failed += 1;
        logger.warn(`reviewPrompt send failed appt=${appt._id} milestone=${milestone.key}: ${err.message}`);
      }
    }
  }

  if (stats.due > 0 || stats.failed > 0) logger.info('reviewPrompt run', stats);
  return stats;
}

/** Cron entry point. Every 15 minutes by default (prompts are not urgent). */
export function startReviewPrompts(cronExpression = '*/15 * * * *') {
  logger.info(`Scheduling review prompts: ${cronExpression}`);
  let timer;
  try {
    timer = schedule(cronExpression, () => {
      runReviewPromptsOnce().catch((err) => logger.warn(`reviewPrompt run failed: ${err.message}`));
    });
  } catch {
    timer = setInterval(() => {
      runReviewPromptsOnce().catch(() => {});
    }, 15 * MIN_MS);
  }
  return timer;
}
