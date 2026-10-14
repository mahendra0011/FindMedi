/**
 * Join draft expiry + purge (docs/platform-expansion-plan.md:189 —
 * "drafts expire 30 days"; 2.md join flow, data minimisation).
 *
 *   every day:  drafts idle for 30 days  ->  status 'expired' (once), applicant
 *                                           notified in-app (once), audit row
 *   every day:  expired for 30 more days ->  payload + uploaded documents are
 *                                           purged (row survives for audit)
 *
 * Design, mirroring `documentExpiry.job.js` on purpose:
 *
 *  1. DURABLE — the clock lives on the ProviderApplication row (`updatedAt`
 *     for the draft's last touch, `purgedAt` as the purge claim), not in
 *     process memory, so a missed tick is recovered by the next run.
 *  2. EXPIRE ONCE / PURGE ONCE — both transitions are atomic conditional
 *     updates (`status: 'draft'` / `purgedAt: null`), so two replicas or two
 *     overlapping runs cannot produce a second notification or a second audit
 *     row, and a draft the applicant touched between the scan and the claim
 *     (updatedAt past the cutoff) is never expired out from under them.
 *  3. PURGE IS ORDERED FOR CRASH-SAFETY — scrub the payload, unlink the local
 *     files, delete the document rows, and only then stamp `purgedAt`. A crash
 *     anywhere in between re-runs the idempotent steps next tick; an unlink
 *     that fails for a reason other than ENOENT leaves `purgedAt` unset so the
 *     row retries tomorrow instead of silently keeping orphaned bytes.
 *
 * Only `status: 'draft'` expires — submitted/review lanes are the reviewer's
 * to decide, and `expired` already refuses edit/submit in routes/join.js
 * (EDITABLE_STATUSES / SUBMITTABLE_STATUSES), so the applicant's next move is
 * a fresh application (POST /join), which has always been allowed.
 */
import { schedule } from 'node-cron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ProviderApplication from '../models/ProviderApplication.js';
import ProviderDocument from '../models/ProviderDocument.js';
import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';
import { createNotification } from '../services/notificationService.js';
import { APPLICATION_DOCUMENTS_DIR } from '../services/applicationDocumentStore.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_MS = 60 * 1000;

/** The spec number: "drafts expire 30 days" of inactivity. */
export const DEFAULT_DRAFT_TTL_DAYS = 30;
/** Extra days after expiry before the payload + documents are purged. */
export const DEFAULT_PURGE_DAYS = 30;
/** Bound on rows touched per stage per run; the next tick picks up the rest. */
export const BATCH_LIMIT = 500;

/** Configurable draft TTL (days of inactivity before `expired`). */
export function configuredDraftTtlDays(env = process.env) {
  const raw = Number.parseInt(String(env.JOIN_DRAFT_TTL_DAYS ?? ''), 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_DRAFT_TTL_DAYS;
}

/** Configurable purge window (days after expiry before payload/documents go). */
export function configuredPurgeDays(env = process.env) {
  const raw = Number.parseInt(String(env.JOIN_DRAFT_PURGE_DAYS ?? ''), 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_PURGE_DAYS;
}

/**
 * One scan. Exported with an injectable clock so tests never depend on wall
 * time.
 * @returns {Promise<{expired:number,notified:number,purged:number,
 *                    expiredIds:string[],purgedIds:string[],
 *                    documentsDeleted:number,filesDeleted:number,purgeFailed:number}>}
 */
export async function runJoinDraftExpiryOnce(now = new Date()) {
  const ttlDays = configuredDraftTtlDays();
  const purgeDays = configuredPurgeDays();
  const report = {
    expired: 0, notified: 0, purged: 0,
    expiredIds: [], purgedIds: [],
    documentsDeleted: 0, filesDeleted: 0, purgeFailed: 0,
  };

  // ── Stage 1: expire idle drafts ───────────────────────────────────────────
  const draftCutoff = new Date(now.getTime() - ttlDays * DAY_MS);
  const idle = await ProviderApplication.find({ status: 'draft', updatedAt: { $lt: draftCutoff } })
    .select('_id applicationId applicantUserId typeKey updatedAt')
    .limit(BATCH_LIMIT)
    .lean();

  for (const app of idle) {
    // Re-assert the whole predicate atomically: a draft autosaved between the
    // scan and this claim (updatedAt now past the cutoff) must survive.
    const res = await ProviderApplication.updateOne(
      { _id: app._id, status: 'draft', updatedAt: { $lt: draftCutoff } },
      { $set: { status: 'expired', updatedAt: now } },
    );
    if (!res || res.modifiedCount !== 1) continue;

    report.expired += 1;
    report.expiredIds.push(String(app._id));

    if (app.applicantUserId) {
      try {
        const { notification, reason } = await createNotification({
          userId: String(app.applicantUserId),
          type: 'system',
          priority: 'normal',
          title: 'Application draft expired',
          message: `Your FindMedi application draft expired after ${ttlDays} days of inactivity. Start a new application to continue - drafts keep no data past expiry.`,
          dedupKey: `join-draft-expired:${app._id}`,
          details: { applicationId: app.applicationId || String(app._id), typeKey: app.typeKey, ttlDays },
          actor: 'joinDraftExpiryJob',
        });
        if (notification || reason === 'duplicate') report.notified += 1;
      } catch (err) {
        logger.warn(`joinDraftExpiry notify failed app=${app._id}: ${err.message}`);
      }
    }
  }

  if (report.expired > 0) {
    await auditLog('join_draft.expired', 'system', {
      at: now,
      ttlDays,
      count: report.expired,
      applicationIds: report.expiredIds.slice(0, 50),
    });
  }

  // ── Stage 2: purge expired applications (payload + uploaded documents) ────
  const purgeCutoff = new Date(now.getTime() - purgeDays * DAY_MS);
  const ripe = await ProviderApplication.find({
    status: 'expired',
    purgedAt: null,
    updatedAt: { $lt: purgeCutoff },
  })
    .select('_id applicationId applicantUserId updatedAt')
    .limit(BATCH_LIMIT)
    .lean();

  for (const app of ripe) {
    // 1. Read the document rows first: their file keys are the only way to
    //    find the bytes, so they must outlive the scrub below.
    const docs = await ProviderDocument.find({ applicationId: app._id })
      .select('fileRef.storage fileRef.key')
      .lean();

    // 2. Scrub the wizard payload. Idempotent; a crash after this simply
    //    re-runs steps 2-5 on the next tick (purgedAt is still null). The
    //    blind indexes go too (data minimisation) — they are HMACs of the
    //    encrypted tax fields that just left.
    await ProviderApplication.updateOne(
      { _id: app._id, status: 'expired', purgedAt: null },
      {
        $set: {
          'draft.stepData': {},
          'phiIndexes.pan': null,
          'phiIndexes.gstin': null,
          'phiIndexes.registration_number': null,
        },
      },
    );

    // 3. Unlink local bytes. Anything but ENOENT aborts this row so it stays a
    //    candidate for tomorrow - the rows still hold the keys needed to retry.
    let failed = 0;
    for (const doc of docs) {
      const ref = doc.fileRef || {};
      if (ref.storage !== 'local' || !ref.key) continue;
      try {
        // basename(): a key is a stored filename, never a path.
        await fs.unlink(path.join(APPLICATION_DOCUMENTS_DIR, path.basename(String(ref.key))));
        report.filesDeleted += 1;
      } catch (err) {
        if (err.code !== 'ENOENT') {
          failed += 1;
          logger.warn(`joinDraftExpiry unlink failed app=${app._id} key=${ref.key}: ${err.message}`);
        }
      }
    }
    if (failed > 0) {
      report.purgeFailed += 1;
      continue;
    }

    // 4. Drop the document rows, then 5. claim the purge. Both are conditional
    //    on purgedAt still being null, so a losing replica counts nothing.
    await ProviderDocument.deleteMany({ applicationId: app._id });
    const claimed = await ProviderApplication.updateOne(
      { _id: app._id, status: 'expired', purgedAt: null },
      { $set: { purgedAt: now } },
    );
    if (!claimed || claimed.modifiedCount !== 1) continue;

    report.purged += 1;
    report.purgedIds.push(String(app._id));
    report.documentsDeleted += docs.length;
  }

  if (report.purged > 0) {
    await auditLog('join_draft.purged', 'system', {
      at: now,
      purgeDays,
      count: report.purged,
      applicationIds: report.purgedIds.slice(0, 50),
      documentsDeleted: report.documentsDeleted,
      filesDeleted: report.filesDeleted,
    });
  }

  if (report.expired > 0 || report.purged > 0 || report.purgeFailed > 0) {
    logger.info('joinDraftExpiry run', {
      expired: report.expired,
      notified: report.notified,
      purged: report.purged,
      documentsDeleted: report.documentsDeleted,
      filesDeleted: report.filesDeleted,
      purgeFailed: report.purgeFailed,
    });
  }
  return report;
}

/**
 * Cron entry point. Daily by default (07:00 — after documentExpiry at 06:00
 * and the vendor KYC sweep at 06:30); the cutoff windows make the cadence a
 * recovery mechanism rather than a correctness dependency.
 */
export function startJoinDraftExpiry(cronExpression = process.env.JOIN_DRAFT_EXPIRY_CRON || '0 7 * * *') {
  logger.info(`Scheduling join draft expiry sweep: ${cronExpression}`);
  let timer;
  try {
    timer = schedule(cronExpression, () => {
      runJoinDraftExpiryOnce().catch((err) => logger.warn(`joinDraftExpiry run failed: ${err.message}`));
    });
  } catch {
    timer = setInterval(() => {
      runJoinDraftExpiryOnce().catch(() => {});
    }, 24 * 60 * MIN_MS);
  }
  return timer;
}
