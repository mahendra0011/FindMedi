/**
 * NOTIF-M-03: appointment reminder scheduler (T-24h / T-2h).
 *
 * `sendAppointmentReminder` existed in notificationService but was NEVER called
 * from anywhere — the function was dead and no appointment ever produced a
 * reminder. This job is the missing scheduler behind it.
 *
 * Design (the three properties the finding asked for):
 *
 *  1. DURABLE — per-milestone state lives on the Appointment document
 *     (`reminderState`), not in process memory. Every run re-scans a date
 *     window, so a missed/failed cron tick is recovered by the next tick: a
 *     reminder due while the process was down is still sent afterwards (within
 *     its window). A mid-send crash leaves a `sending` lease that expires after
 *     LEASE_MS and becomes claimable again.
 *
 *  2. RETRY / BACKOFF — a failed send records `nextAttemptAt` using the same
 *     jittered exponential `backoffMs` the notification delivery layer uses,
 *     capped at MAX_ATTEMPTS. Terminal outcomes (user opted out / type muted /
 *     quiet-hours-suppressed) are recorded as `skipped`, never retried.
 *
 *  3. TIMEZONE CORRECT — appointment `date`/`time` are IST wall-clock strings
 *     (`YYYY-MM-DD` + `HH:MM`, enforced by slotDate/slotTime in validate.js),
 *     written by `getISTDateString()`. The server may run in UTC, so the
 *     instant is reconstructed by subtracting the IST offset — NOT by
 *     `new Date('YYYY-MM-DDTHH:MM')`, which would silently read the wall clock
 *     as local time and shift every reminder by the host's UTC offset.
 *
 * Idempotency is two-layered: an atomic `findOneAndUpdate` claim on the
 * document (so two overlapping runs cannot both send) plus the notification
 * layer's (userId, dedupKey) unique index (so a lease-expiry resend cannot
 * create a second in-app row).
 */
import { schedule } from 'node-cron';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { createNotification, sendAppointmentReminder } from '../services/notificationService.js';
import { backoffMs } from '../services/notificationDelivery.js';
import { getISTDateString } from '../utils/dateUtils.js';

const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;

export const MILESTONES = [
  // key, when it becomes due (leadMs), and how stale it may be before we give
  // up rather than send a reminder whose headline is a lie (a "24h reminder"
  // arriving 30 minutes before the slot helps nobody).
  { key: 't24', leadMs: 24 * HOUR_MS, lateAfterMs: 6 * HOUR_MS, title: 'Appointment reminder' },
  { key: 't2', leadMs: 2 * HOUR_MS, lateAfterMs: 15 * MIN_MS, title: 'Appointment in 2 hours' },
];

/** A `sending` claim older than this belongs to a crashed run -> reclaimable. */
export const LEASE_MS = 10 * MIN_MS;
/** After this many failed attempts the milestone is parked (still recorded). */
export const MAX_ATTEMPTS = 10;
/** Only live appointments get reminders. */
export const ACTIVE_STATUSES = ['Pending', 'Confirmed'];
/** Reasons from `decide()` that mean "this will never succeed" — do not retry. */
const TERMINAL_SUPPRESSION = new Set(['type-muted', 'marketing-opted-out', 'channel-disabled', 'no-recipient']);

/**
 * IST wall-clock strings -> UTC instant. Returns null for anything that is not
 * a real calendar date (2026-02-31 normalises in Date.UTC, so it is rejected
 * explicitly rather than silently rolling into March).
 */
export function appointmentInstant(dateStr, timeStr) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? '').trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr ?? '').trim());
  if (!d || !t) return null;
  const [, y, mo, day] = d;
  const [, hh, mm] = t;
  const hour = Number(hh);
  const minute = Number(mm);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  // Validate the calendar date BEFORE applying the offset: comparing the UTC
  // fields of the shifted instant would reject every slot before 05:30 IST,
  // because 00:15 IST legitimately falls on the previous UTC day.
  const dayProbe = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(day)));
  if (dayProbe.getUTCFullYear() !== Number(y) || dayProbe.getUTCMonth() !== Number(mo) - 1 || dayProbe.getUTCDate() !== Number(day)) {
    return null; // Date.UTC normalised 2026-02-31 into March — not a real date
  }
  // IST is UTC+5:30 with no DST, so the offset is a constant.
  return new Date(dayProbe.getTime() + hour * HOUR_MS + minute * MIN_MS - 5.5 * HOUR_MS);
}

const milestoneOf = (appt, key) => appt.reminderState?.[key] || {};

/**
 * Atomically claim one milestone for this run. Returns the fresh document when
 * the claim won, null when another run (or a fresh lease) already owns it.
 */
async function claim(appt, key, now) {
  const path = `reminderState.${key}`;
  return Appointment.findOneAndUpdate(
    {
      _id: appt._id,
      $or: [
        { [path]: { $exists: false } },
        { [`${path}.status`]: 'pending' },
        { [`${path}.status`]: 'failed', [`${path}.nextAttemptAt`]: { $lte: now } },
        // stale lease: the previous claimant died between claim and completion
        { [`${path}.status`]: 'sending', [`${path}.claimedAt`]: { $lt: new Date(now.getTime() - LEASE_MS) } },
      ],
    },
    {
      $set: { [`${path}.status`]: 'sending', [`${path}.claimedAt`]: now },
      $inc: { [`${path}.attempts`]: 1 },
    },
    { new: true }
  );
}

/** Record the terminal outcome of a claim we hold. */
async function finish(appt, key, status, { now, reason = null, nextAttemptAt = null } = {}) {
  const path = `reminderState.${key}`;
  const set = { [`${path}.status`]: status };
  if (status === 'sent') {
    set[`${path}.sentAt`] = now;
    // keep the legacy boolean truthful now that something actually sent
    set.reminderSent = true;
  }
  if (reason) set[`${path}.lastReason`] = String(reason).slice(0, 200);
  if (nextAttemptAt) set[`${path}.nextAttemptAt`] = nextAttemptAt;
  await Appointment.updateOne({ _id: appt._id, [`${path}.status`]: 'sending' }, { $set: set });
}

/** Record a skip for a milestone we never claimed (guarded so it cannot stomp a claim). */
async function markSkipped(appt, key, reason) {
  const path = `reminderState.${key}`;
  await Appointment.updateOne(
    { _id: appt._id, [`${path}.status`]: { $nin: ['sending', 'sent', 'skipped'] } },
    { $set: { [`${path}.status`]: 'skipped', [`${path}.lastReason`] : reason } }
  );
}

function reminderMessage(appt, key) {
  const when = `on ${appt.date} at ${appt.time}`;
  return key === 't24'
    ? `Reminder: your appointment with ${appt.doctor} is ${when}. Please arrive 15 minutes early.`
    : `Your appointment with ${appt.doctor} starts ${when}. Please reach the hospital now.`;
}

/** In-app notification (dedup-keyed) + best-effort email. */
async function deliver(appt, milestone) {
  const { notification, reason } = await createNotification({
    userId: String(appt.patientId),
    type: 'appointment',
    priority: 'normal',
    title: milestone.title,
    message: reminderMessage(appt, milestone.key),
    dedupKey: `appointment-reminder:${appt._id}:${milestone.key}`,
    details: { appointmentId: String(appt._id), milestone: milestone.key, date: appt.date, time: appt.time },
    actor: 'appointmentReminderJob',
  });

  if (!notification && reason !== 'duplicate') return { delivered: false, reason };

  // Email rides on the in-app outcome: if consent/cap suppressed the in-app
  // row we do not go around the user's preference via a second channel.
  try {
    const user = await User.findById(appt.patientId).select('name email').lean();
    if (user?.email) {
      const res = await sendAppointmentReminder({
        patient: { name: user.name || appt.patient, email: user.email },
        doctor: appt.doctor,
        date: appt.date,
        time: appt.time,
      });
      if (!res?.success) logger.warn(`appointmentReminder email failed appt=${appt._id} milestone=${milestone.key}: ${res?.error || 'unknown'}`);
    }
  } catch (err) {
    logger.warn(`appointmentReminder email error appt=${appt._id} milestone=${milestone.key}: ${err.message}`);
  }

  return { delivered: true, reason: reason || null };
}

/**
 * One scan. Exported with an injectable clock so tests never depend on wall time.
 * @returns {Promise<{scanned:number,due:number,sent:number,skipped:number,failed:number,deferred:number}>}
 */
export async function runAppointmentRemindersOnce(now = new Date()) {
  const stats = { scanned: 0, due: 0, sent: 0, skipped: 0, failed: 0, deferred: 0 };

  // Window: an instant within the next 24h can only fall on today's or
  // tomorrow's IST date; +48h is deliberate slack for late-claim retries.
  const from = getISTDateString(now);
  const to = getISTDateString(new Date(now.getTime() + 48 * HOUR_MS));

  const appts = await Appointment.find({
    status: { $in: ACTIVE_STATUSES },
    date: { $gte: from, $lte: to },
    patientId: { $ne: null },
  })
    .select('date time status patient patientId doctor reminderState')
    .lean();

  for (const appt of appts) {
    stats.scanned += 1;
    const instant = appointmentInstant(appt.date, appt.time);
    if (!instant) {
      logger.warn(`appointmentReminder: unparseable slot date="${appt.date}" time="${appt.time}" appt=${appt._id}`);
      continue;
    }

    for (const milestone of MILESTONES) {
      const state = milestoneOf(appt, milestone.key);
      if (state.status === 'sent' || state.status === 'skipped') continue;
      if (state.status === 'sending' && state.claimedAt && now - new Date(state.claimedAt) < LEASE_MS) continue;
      if ((state.attempts || 0) >= MAX_ATTEMPTS) continue;

      const remainingMs = instant.getTime() - now.getTime();
      if (remainingMs <= 0) {
        // Slot has started/completed; a reminder now would be wrong.
        await markSkipped(appt, milestone.key, 'appointment-started');
        stats.skipped += 1;
        continue;
      }
      if (remainingMs > milestone.leadMs) continue; // not due yet
      if (remainingMs < milestone.lateAfterMs) {
        // Too stale to be truthful (downtime catch-up) — record, do not send.
        await markSkipped(appt, milestone.key, 'window-passed');
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
          await finish(claimed, milestone.key, 'sent', { now, reason: outcome.reason });
          stats.sent += 1;
        } else if (TERMINAL_SUPPRESSION.has(outcome.reason)) {
          await finish(claimed, milestone.key, 'skipped', { now, reason: outcome.reason });
          stats.skipped += 1;
        } else {
          // transient (quiet-hours, rate-capped) or an unexpected failure
          const attempts = milestoneOf(claimed, milestone.key).attempts || 1;
          await finish(claimed, milestone.key, 'failed', {
            now,
            reason: outcome.reason || 'send-failed',
            nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
          });
          stats.failed += 1;
        }
      } catch (err) {
        const attempts = milestoneOf(claimed, milestone.key).attempts || 1;
        await finish(claimed, milestone.key, 'failed', {
          now,
          reason: err.message,
          nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
        }).catch(() => {});
        stats.failed += 1;
        logger.warn(`appointmentReminder send failed appt=${appt._id} milestone=${milestone.key}: ${err.message}`);
      }
    }
  }

  if (stats.due > 0 || stats.failed > 0) logger.info('appointmentReminder run', stats);
  return stats;
}

/**
 * Cron entry point. Every 5 minutes by default: the scan window makes the
 * cadence a recovery mechanism (missed ticks are caught up by the next one)
 * rather than a correctness dependency.
 */
export function startAppointmentReminders(cronExpression = '*/5 * * * *') {
  logger.info(`Scheduling appointment reminders: ${cronExpression}`);
  let timer;
  try {
    timer = schedule(cronExpression, () => {
      runAppointmentRemindersOnce().catch((err) => logger.warn(`appointmentReminder run failed: ${err.message}`));
    });
  } catch {
    timer = setInterval(() => {
      runAppointmentRemindersOnce().catch(() => {});
    }, 5 * MIN_MS);
  }
  return timer;
}
