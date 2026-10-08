/**
 * 2.md 5 / 8.md 2 (re-verification) / 8.md 14 (ops alerts): document expiry.
 *
 *   reminders 60/30/7 days  ->  the provider owner, in-app, exactly once each
 *   expiry + configurable grace ->  the parent listing is suspended, once
 *   every expiry                ->  an ops alert (logger + audit + superadmin
 *                                   in-app), deduped per IST day
 *
 * Design, mirroring `appointmentReminder.job.js` on purpose:
 *
 *  1. DURABLE — the per-threshold state lives on the ProviderDocument row
 *     (`expiryReminders.<threshold>`), not in process memory. The scan window
 *     is "anything at or before now+60d", so a missed tick is recovered by the
 *     next one, and a mid-send crash leaves a `sending` lease that expires
 *     after LEASE_MS and becomes claimable again.
 *  2. AT MOST ONE REMINDER PER THRESHOLD — only the CURRENT bucket of a
 *     document fires (expired > 7 > 30 > 60). A licence at 20 days reports
 *     `d30`, not `d60` as well, so catching up after downtime can never turn
 *     into three identical notifications in one run; and once a bucket has
 *     fired it is recorded, so the next run cannot fire it again.
 *  3. SUSPEND ONCE — the suspension is an atomic conditional update on the
 *     Provider (`status: { $in: SUSPENDABLE }`), so two expired documents for
 *     the same listing, two API replicas, or two overlapping runs all produce
 *     exactly one status change, one audit row and one owner notification.
 *
 * Owner resolution follows how the rows are actually filed (2.md 5):
 * `ProviderDocument.providerId` when the listing already exists, otherwise
 * `ProviderDocument.applicationId -> ProviderApplication.providerId`, and the
 * applicant as the last resort for a draft that has no listing yet.
 */
import { schedule } from 'node-cron';
import ProviderDocument from '../models/ProviderDocument.js';
import ProviderApplication from '../models/ProviderApplication.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';
import { createNotification } from '../services/notificationService.js';
import { backoffMs } from '../services/notificationDelivery.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_MS = 60 * 1000;

/** The three thresholds 2.md 5 asks for, plus the expiry itself. */
export const EXPIRY_THRESHOLDS = [
  { key: 'd60', days: 60, title: 'Document expires in 60 days' },
  { key: 'd30', days: 30, title: 'Document expires in 30 days' },
  { key: 'd7', days: 7, title: 'Document expires in 7 days' },
  { key: 'expired', days: 0, title: 'Document expired' },
];

/** 8.md 2 re-verification / 2.md 12 "warning -> grace -> auto-hide". */
export const DEFAULT_GRACE_DAYS = 7;
/** A `sending` claim older than this belongs to a crashed run -> reclaimable. */
export const LEASE_MS = 10 * MIN_MS;
/** After this many failed attempts the threshold is parked (still recorded). */
export const MAX_ATTEMPTS = 5;
/** Listing statuses an expired licence may still take down. */
export const SUSPENDABLE_STATUSES = ['live', 'approved'];
/** Reasons from `decide()` that mean "this will never succeed" - do not retry. */
const TERMINAL_SUPPRESSION = new Set(['no-recipient', 'type-muted', 'marketing-opted-out', 'channel-disabled']);

/** Configurable grace period (days after expiry before suspension). */
export function configuredGraceDays(env = process.env) {
  const raw = Number.parseInt(String(env.DOC_EXPIRY_GRACE_DAYS ?? ''), 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_GRACE_DAYS;
}

/**
 * Which threshold a document is sitting in right now. `null` means "not yet
 * within 60 days of expiry" - outside the scan window entirely.
 */
export function thresholdFor(expiryDate, now = new Date()) {
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (!expiry || Number.isNaN(expiry.getTime())) return null;
  const msLeft = expiry.getTime() - now.getTime();
  if (msLeft <= 0) return 'expired';
  if (msLeft <= 7 * DAY_MS) return 'd7';
  if (msLeft <= 30 * DAY_MS) return 'd30';
  if (msLeft <= 60 * DAY_MS) return 'd60';
  return null;
}

/** `drug_licence` -> `drug licence`. No owner names or PII in the copy. */
const docLabel = (docType) => String(docType || 'document').replace(/_/g, ' ');

/** Same IST day-stamp the payout job uses, so dedup keys roll at IST midnight. */
function istDayKey(now) {
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  return ist.toISOString().slice(0, 10);
}

/**
 * Atomically claim one threshold for this run. Returns the fresh document when
 * the claim won, null when a live lease, a completed state or a not-yet-due
 * backoff already owns it.
 */
async function claim(doc, key, now) {
  const path = `expiryReminders.${key}`;
  const stale = new Date(now.getTime() - LEASE_MS);
  return ProviderDocument.findOneAndUpdate(
    {
      _id: doc._id,
      expiryDate: { $ne: null },
      $or: [
        { [path]: { $exists: false } },
        { [`${path}.status`]: 'sending', [`${path}.claimedAt`]: { $lt: stale } },
        { [`${path}.status`]: 'failed', [`${path}.nextAttemptAt`]: { $lte: now } },
      ],
    },
    { $set: { [`${path}.status`]: 'sending', [`${path}.claimedAt`]: now } },
    { new: true },
  );
}

/** Record the terminal outcome of a claim we hold. */
async function finish(doc, key, status, { now, reason = null, nextAttemptAt = null } = {}) {
  const path = `expiryReminders.${key}`;
  const set = { [`${path}.status`]: status };
  if (status === 'sent') {
    set[`${path}.sentAt`] = now;
    set.lastReminderAt = now;
  }
  if (reason) set[`${path}.lastReason`] = String(reason).slice(0, 200);
  if (nextAttemptAt) set[`${path}.nextAttemptAt`] = nextAttemptAt;
  await ProviderDocument.updateOne({ _id: doc._id, [`${path}.status`]: 'sending' }, { $set: set });
}

function reminderCopy(doc, key) {
  const spec = EXPIRY_THRESHOLDS.find((t) => t.key === key);
  const label = docLabel(doc.docType);
  const on = doc.expiryDate ? ` on ${new Date(doc.expiryDate).toISOString().slice(0, 10)}` : '';
  if (key === 'expired') {
    return {
      title: spec.title,
      message: `Your ${label} expired${on}. Upload a valid renewal to keep your listing live.`,
    };
  }
  return {
    title: spec.title,
    message: `Your ${label} expires${on} - ${spec.days} days from now. Upload a renewal before then to keep your listing live.`,
  };
}

/**
 * One batched owner lookup for the whole scan: a document is owned by the
 * listing it was filed under (`providerId`), else the listing its application
 * materialised (`applicationId -> providerId`), else the applicant/uploader.
 */
async function loadOwners(docs) {
  const applicationIds = [...new Set(docs.map((d) => d.applicationId).filter(Boolean).map(String))];
  const applications = applicationIds.length
    ? await ProviderApplication.find({ _id: { $in: applicationIds } })
      .select('providerId applicantUserId').lean()
    : [];
  const appById = new Map(applications.map((a) => [String(a._id), a]));

  const providerIds = new Set(docs.map((d) => d.providerId).filter(Boolean).map(String));
  for (const app of applications) if (app.providerId) providerIds.add(String(app.providerId));

  const providers = providerIds.size
    ? await Provider.find({ _id: { $in: [...providerIds] } })
      .select('ownerUserId status name').lean()
    : [];
  return { appById, providerById: new Map(providers.map((p) => [String(p._id), p])) };
}

function ownerOf(doc, { appById, providerById }) {
  const app = doc.applicationId ? appById.get(String(doc.applicationId)) : null;
  const provider = doc.providerId
    ? providerById.get(String(doc.providerId))
    : (app?.providerId ? providerById.get(String(app.providerId)) : null);
  const recipient = provider?.ownerUserId ?? app?.applicantUserId ?? doc.uploadedBy ?? null;
  return { provider, recipient: recipient ? String(recipient) : null };
}

/**
 * 2.md 12 "warning -> grace -> auto-hide". Conditional on the CURRENT status,
 * so a listing an admin already suspended is never re-suspended (and never
 * re-audited) by this job.
 */
async function suspendForExpiredDocument({ provider, doc, recipient, grace, report }) {
  if (!provider) return;
  if (!SUSPENDABLE_STATUSES.includes(provider.status)) return;

  const expiryIso = new Date(doc.expiryDate).toISOString().slice(0, 10);
  const graceEnd = new Date(new Date(doc.expiryDate).getTime() + grace * DAY_MS).toISOString().slice(0, 10);
  const reason = grace > 0
    ? `Required document "${docLabel(doc.docType)}" expired on ${expiryIso}; the ${grace}-day grace period ended on ${graceEnd}`
    : `Required document "${docLabel(doc.docType)}" expired on ${expiryIso}`;

  const res = await Provider.updateOne(
    { _id: provider._id, status: { $in: SUSPENDABLE_STATUSES } },
    { $set: { status: 'suspended' } },
  );
  // 0 modified == somebody (this job, a sibling replica, an admin) already
  // suspended it. Never suspend twice: no second audit row, no second ping.
  if (!res || res.modifiedCount !== 1) return;

  report.suspended += 1;
  report.suspendedProviderIds.push(String(provider._id));

  await auditLog('provider_suspended_document_expired', 'system', {
    providerId: String(provider._id),
    documentId: String(doc._id),
    docType: doc.docType,
    expiryDate: doc.expiryDate,
    graceDays: grace,
    reason,
    targetUserId: recipient || undefined,
  });

  if (recipient) {
    await createNotification({
      userId: recipient,
      type: 'system',
      priority: 'normal',
      title: 'Listing suspended',
      message: `Your listing was suspended because your ${docLabel(doc.docType)} expired. Upload a valid document to restore it.`,
      dedupKey: `doc-expiry-suspended:${provider._id}`,
      details: { providerId: String(provider._id), docType: doc.docType, expiryDate: expiryIso },
      actor: 'documentExpiryJob',
    }).catch(() => {});
  }
}

/** 8.md 14: logger + audit + superadmin in-app, deduped per IST day. */
async function sendOpsAlert(report, now) {
  const summary = {
    expired: report.expired,
    suspended: report.suspended,
    due: report.due,
    scanned: report.scanned,
  };
  logger.warn('DOCUMENT EXPIRY RUN', summary);
  await auditLog('document_expiry.ops_alert', 'system', {
    at: now,
    ...summary,
    suspendedProviderIds: report.suspendedProviderIds.slice(0, 50),
  });

  try {
    const supers = await User.find({ role: 'superadmin', status: 'active' }).select('_id').lean();
    for (const s of supers) {
      await createNotification({
        userId: String(s._id),
        type: 'system',
        priority: 'normal',
        title: 'Licence expiry alert',
        message: `${report.expired} provider document(s) expired and ${report.suspended} listing(s) were suspended after the grace period.`,
        dedupKey: `doc-expiry-ops:${istDayKey(now)}`,
        details: summary,
        actor: 'documentExpiryJob',
      });
    }
  } catch (err) {
    logger.warn(`document expiry superadmin alert failed: ${err.message}`);
  }
}

/**
 * One scan. Exported with an injectable clock so tests never depend on wall time.
 * @returns {Promise<{scanned:number,due:number,sent:number,skipped:number,failed:number,
 *                    deferred:number,expired:number,suspended:number,suspendedProviderIds:string[]}>}
 */
export async function runDocumentExpiryOnce(now = new Date(), options = {}) {
  const grace = Number.isFinite(options.graceDays) ? options.graceDays : configuredGraceDays();
  const report = {
    scanned: 0, due: 0, sent: 0, skipped: 0, failed: 0, deferred: 0,
    expired: 0, markedExpired: 0, suspended: 0, suspendedProviderIds: [],
  };

  const horizon = new Date(now.getTime() + 60 * DAY_MS);
  const docs = await ProviderDocument.find({
    expiryDate: { $ne: null, $lte: horizon },
    status: { $ne: 'rejected' },
  })
    .select('docType expiryDate status providerId applicationId uploadedBy expiryReminders')
    .lean();

  const owners = await loadOwners(docs);

  for (const doc of docs) {
    report.scanned += 1;
    const key = thresholdFor(doc.expiryDate, now);
    if (!key) continue; // outside the 60-day window (can only happen on a stale row)

    const { provider, recipient } = ownerOf(doc, owners);

    if (key === 'expired') {
      report.expired += 1;
      // Doc rows carry `expired` as a first-class state (DOCUMENT_STATUSES).
      if (doc.status !== 'expired') {
        const marked = await ProviderDocument.updateOne(
          { _id: doc._id, status: { $ne: 'expired' } },
          { $set: { status: 'expired' } },
        );
        if (marked?.modifiedCount === 1) report.markedExpired += 1;
      }
      if (now.getTime() > new Date(doc.expiryDate).getTime() + grace * DAY_MS) {
        await suspendForExpiredDocument({ provider, doc, recipient, now, grace, report });
      }
    }

    const state = doc.expiryReminders?.[key] || {};
    if (state.status === 'sent' || state.status === 'skipped') continue;
    if (state.status === 'sending' && state.claimedAt && now - new Date(state.claimedAt) < LEASE_MS) {
      report.deferred += 1; // a live lease: another run (or a replica) owns it
      continue;
    }
    if ((state.attempts || 0) >= MAX_ATTEMPTS) continue;

    report.due += 1;
    const claimed = await claim(doc, key, now);
    if (!claimed) {
      report.deferred += 1;
      continue;
    }

    try {
      if (!recipient) {
        await finish(claimed, key, 'skipped', { now, reason: 'no-recipient' });
        report.skipped += 1;
        continue;
      }
      const copy = reminderCopy(doc, key);
      const { notification, reason } = await createNotification({
        userId: recipient,
        type: 'reminder',
        priority: 'normal',
        title: copy.title,
        message: copy.message,
        dedupKey: `doc-expiry:${doc._id}:${key}`,
        details: { documentId: String(doc._id), docType: doc.docType, threshold: key },
        actor: 'documentExpiryJob',
      });
      if (notification || reason === 'duplicate') {
        await finish(claimed, key, 'sent', { now, reason });
        report.sent += 1;
      } else if (TERMINAL_SUPPRESSION.has(reason)) {
        await finish(claimed, key, 'skipped', { now, reason });
        report.skipped += 1;
      } else {
        const attempts = (state.attempts || 0) + 1;
        await finish(claimed, key, 'failed', {
          now,
          reason: reason || 'send-failed',
          nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
        });
        report.failed += 1;
      }
    } catch (err) {
      const attempts = (state.attempts || 0) + 1;
      await finish(claimed, key, 'failed', {
        now,
        reason: err.message,
        nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
      }).catch(() => {});
      report.failed += 1;
      logger.warn(`documentExpiry send failed doc=${doc._id} threshold=${key}: ${err.message}`);
    }
  }

  // Only a NEW expiry or a NEW suspension is news: re-alerting every day for a
  // document that expired last week would train ops to ignore the alert.
  if (report.markedExpired > 0 || report.suspended > 0) {
    try {
      await sendOpsAlert(report, now);
      report.opsAlerted = true;
    } catch (err) {
      logger.warn(`document expiry ops alert failed: ${err.message}`);
    }
  }

  if (report.due > 0 || report.expired > 0 || report.suspended > 0 || report.failed > 0) {
    logger.info('documentExpiry run', {
      scanned: report.scanned, due: report.due, sent: report.sent, expired: report.expired,
      suspended: report.suspended, failed: report.failed,
    });
  }
  return report;
}

/**
 * Cron entry point. Daily by default (06:00, offset from the 02:00 wallet and
 * 03:00 payout jobs); the scan window makes the cadence a recovery mechanism
 * rather than a correctness dependency.
 */
export function startDocumentExpiry(cronExpression = process.env.DOC_EXPIRY_CRON || '0 6 * * *') {
  logger.info(`Scheduling document expiry sweep: ${cronExpression}`);
  let timer;
  try {
    timer = schedule(cronExpression, () => {
      runDocumentExpiryOnce().catch((err) => logger.warn(`documentExpiry run failed: ${err.message}`));
    });
  } catch {
    timer = setInterval(() => {
      runDocumentExpiryOnce().catch(() => {});
    }, 24 * 60 * MIN_MS);
  }
  return timer;
}
