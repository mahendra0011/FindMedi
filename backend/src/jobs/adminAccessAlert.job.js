/**
 * File 23 §5.2 / 25 §10 — admin-PHI access alerting.
 *
 * Break-glass reads are individually audited (`phi_access`), but an audit row
 * nobody watches is not an alert. This hourly job flags two abuse shapes:
 *
 *   mass-view  — one actor with ≥ `massThreshold` admin-PHI reads in a rolling
 *                `windowMinutes` window (defaults: 10 reads / 60 minutes);
 *   off-hours  — ANY admin-PHI read between 23:00 and 06:00 local time
 *                (opt-out via `offHours: false`).
 *
 * Flagging creates a `security_alert` Notification for every active DPO /
 * security / super-admin recipient (deduped per recipient × actor × calendar
 * day) and writes a hash-chained `admin_phi_access_alert` audit row. It never
 * blocks or rewrites the underlying reads — detection only.
 */
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

const ADMIN_PHI_ACTIONS = ['phi_access', 'restricted_access'];
const RECIPIENT_ROLES = ['dpo', 'security_admin', 'superadmin', 'super_admin'];

export async function runAdminAccessAlerts(now = new Date(), opts = {}) {
  const windowMinutes = opts.windowMinutes ?? 60;
  const massThreshold = opts.massThreshold ?? 10;
  const offHours = opts.offHours !== false;
  const startHour = opts.offHoursStart ?? 23;
  const endHour = opts.offHoursEnd ?? 6;
  const since = new Date(now.getTime() - windowMinutes * 60_000);

  const hour = now.getHours();
  const isOffHours = offHours && (hour >= startHour || hour < endHour);

  let counts = [];
  try {
    counts = await AuditLog.aggregate([
      { $match: { action: { $in: ADMIN_PHI_ACTIONS }, timestamp: { $gte: since, $lt: now } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, lastAt: { $max: '$timestamp' }, lastIp: { $last: '$ip' } } },
    ]);
  } catch (err) {
    logger.warn(`[adminAccessAlerts] aggregate failed: ${err.message}`);
    return { scanned: 0, flagged: 0, notified: 0, reason: 'aggregate-failed' };
  }

  const flagged = [];
  for (const row of counts) {
    const reasons = [];
    if (Number(row.count) >= massThreshold) reasons.push('mass-view');
    if (isOffHours && Number(row.count) >= 1) reasons.push('off-hours');
    if (reasons.length) {
      flagged.push({ actorId: String(row._id), count: Number(row.count), lastAt: row.lastAt, lastIp: row.lastIp, reasons });
    }
  }

  const day = now.toISOString().slice(0, 10);
  let notified = 0;
  for (const flag of flagged) {
    try {
      const recipients = await User.find({ role: { $in: RECIPIENT_ROLES }, status: 'active' })
        .select('_id').limit(20).lean();
      const reason = flag.reasons.includes('mass-view')
        ? `mass-view: ${flag.count} admin-PHI reads in ${windowMinutes}m`
        : `off-hours access at ${new Date(flag.lastAt).toISOString()}`;
      for (const recipient of recipients) {
        // eslint-disable-next-line no-await-in-loop
        await Notification.updateOne(
          { userId: recipient._id, dedupKey: `adminphi:${flag.actorId}:${day}` },
          {
            $setOnInsert: {
              userId: String(recipient._id),
              title: 'Admin PHI access alert',
              message: `${reason} by operator ${flag.actorId}. Last IP: ${flag.lastIp || 'unknown'}. Review in the break-glass/audit log.`,
              type: 'security_alert',
              priority: 'critical',
              dedupKey: `adminphi:${flag.actorId}:${day}`,
            },
          },
          { upsert: true },
        );
        notified += 1;
      }
      await auditLog('admin_phi_access_alert', flag.actorId, {
        windowMinutes, count: flag.count, reasons: flag.reasons, lastIp: flag.lastIp, recipients: recipients.length,
      });
    } catch (err) {
      logger.warn(`[adminAccessAlerts] flag ${flag.actorId} failed: ${err.message}`);
    }
  }

  return { scanned: counts.length, flagged: flagged.length, notified, offHours: isOffHours };
}
