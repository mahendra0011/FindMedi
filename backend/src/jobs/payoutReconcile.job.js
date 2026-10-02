/**
 * PAY-M-03: daily payout-vs-settlement reconciliation + mismatch alert.
 *
 * Runs `services/payoutReconcile.js` once a day (03:00 server time by default,
 * offset from the 02:00 wallet job so the two don't share a tick). On a
 * mismatch the alert is deliberately multi-sink and deduped per IST day:
 *
 *   1. structured logger.warn  — greppable in container logs
 *   2. auditLog('payout.recon_mismatch')  — durable, who-can-see-it is already
 *      gated by the audit model; details are scrubbed by auditLog itself
 *   3. in-app notification to every active superadmin (dedupKey per day, so a
 *      mismatch that persists for a week does not burn the 12/day consent cap
 *      with 7 identical rows)
 *
 * The report itself is fetchable on demand via `GET /api/commission/recon`.
 */
import { schedule } from 'node-cron';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';
import { createNotification } from '../services/notificationService.js';
import { reconcilePayouts } from '../services/payoutReconcile.js';

/** Same IST day-stamp the reminder job uses, so dedup keys roll at IST midnight. */
function istDayKey(now) {
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  return ist.toISOString().slice(0, 10);
}

export async function runPayoutReconcileOnce(now = new Date()) {
  const report = await reconcilePayouts({ now });

  if (report.ok) {
    logger.info('payout reconciliation passed', {
      payoutsChecked: report.counts.payoutsChecked,
      configsChecked: report.counts.configsChecked,
    });
    return report;
  }

  const summary = { ...report.counts.byType };
  logger.warn('PAYOUT RECONCILIATION MISMATCH', {
    mismatchCount: report.counts.mismatchCount,
    byType: summary,
    unsweptGross: report.totals.unsweptGross,
  });

  await auditLog('payout.recon_mismatch', 'system', {
    checkedAt: report.checkedAt,
    mismatchCount: report.counts.mismatchCount,
    byType: summary,
    unsweptGross: report.totals.unsweptGross,
    unsweptRows: report.totals.unsweptRows,
    // bounded: a full dump of hundreds of rows makes the audit row unusable
    mismatches: report.mismatches.slice(0, 20),
  });

  try {
    const supers = await User.find({ role: 'superadmin', status: 'active' }).select('_id').lean();
    for (const s of supers) {
      await createNotification({
        userId: String(s._id),
        type: 'billing',
        priority: 'normal',
        title: 'Payout reconciliation mismatch',
        message: `${report.counts.mismatchCount} payout/ledger mismatches detected (${Object.entries(summary).map(([k, v]) => `${k}: ${v}`).join(', ')}). Open the commission recon report.`,
        dedupKey: `payout-recon:${istDayKey(now)}`,
        details: { mismatchCount: report.counts.mismatchCount, byType: summary },
        actor: 'payoutReconcileJob',
      });
    }
  } catch (e) {
    logger.warn('payout recon superadmin alert failed: ' + e.message);
  }

  return report;
}

export function startPayoutReconcile(cronExpression = '0 3 * * *') {
  logger.info(`Scheduling payout reconciliation: ${cronExpression}`);
  let timer;
  try {
    timer = schedule(cronExpression, () => runPayoutReconcileOnce().catch(() => {}));
  } catch {
    // node-cron rejected the expression — same fallback walletReconcile uses
    timer = setInterval(() => {
      runPayoutReconcileOnce().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  }
  return timer;
}
