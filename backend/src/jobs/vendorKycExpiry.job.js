/**
 * T7 (file 31): vendor KYC document / licence expiry sweep.
 *
 *  - Expired  → kycStatus='Expired' (Supplier can no longer raise POs — the
 *    inventory gate blocks on that status) + audit + one in-app alert.
 *  - Expiring within 30 days → one advance alert per vendor per IST day so
 *    procurement can collect fresh docs before the vendor is locked out.
 *
 * Dedupe rides on Notification.dedupKey (same pattern as documentExpiry.job),
 * so a missed tick recovers on the next run without spamming admins.
 */
import { schedule } from 'node-cron';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';
import { createNotification } from '../services/notificationService.js';

export const KYC_ALERT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function istDayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/** Expiry timestamps that live on a supplier (licence + per-doc). */
function expiryDates(supplier) {
  const dates = [];
  if (supplier.licenseExpiry) dates.push(new Date(supplier.licenseExpiry));
  for (const d of supplier.kycDocs || []) {
    if (d?.expiry) dates.push(new Date(d.expiry));
  }
  return dates;
}

async function notifyHospitalAdmins(hospitalId, title, message, dedupKey) {
  try {
    if (!hospitalId) return false;
    const admins = await User.find({ hospitalId, role: { $in: ['hospital_admin', 'purchase_officer', 'superadmin'] } })
      .select('_id').limit(5).lean();
    if (!admins.length) return false;
    let notified = false;
    for (const a of admins) {
      const { notification, reason } = await createNotification({
        userId: String(a._id),
        type: 'system',
        priority: 'high',
        title, message,
        dedupKey,
        details: { dedupKey },
        actor: 'vendorKycExpiryJob',
      }).catch(() => ({ notification: null, reason: 'error' }));
      if (notification || reason === 'duplicate') notified = true;
    }
    return notified;
  } catch (err) {
    logger.warn(`vendorKycExpiry notify failed: ${err.message}`);
    return false;
  }
}

/**
 * One sweep. Safe to call directly (tests) and idempotent per day.
 * @returns {Promise<{scanned:number, expired:number, alerted:number}>}
 */
export async function runVendorKycExpiryOnce(now = Date.now()) {
  const report = { scanned: 0, expired: 0, alerted: 0 };
  const nowDate = new Date(now);
  const windowEnd = new Date(now + KYC_ALERT_WINDOW_DAYS * DAY_MS);

  // 1) Anything already past its expiry → Expired (only when not already so).
  const overdue = await Supplier.find({
    kycStatus: { $ne: 'Expired' },
    $or: [{ licenseExpiry: { $lte: nowDate } }, { 'kycDocs.expiry': { $lte: nowDate } }],
  }).select('name hospitalId kycStatus licenseExpiry kycDocs').lean();
  report.scanned += overdue.length;

  for (const s of overdue) {
    const upd = await Supplier.updateOne(
      { _id: s._id, kycStatus: { $ne: 'Expired' } },
      {
        $set: {
          kycStatus: 'Expired',
          kycDecision: { status: 'Expired', reason: 'KYC document/licence expired (auto sweep)', by: null, at: nowDate },
        },
      },
    ).catch(() => null);
    if (upd?.modifiedCount > 0) {
      report.expired += 1;
      await auditLog('vendor_kyc_expired', 'system', {
        resourceType: 'Supplier', resourceId: String(s._id), vendorName: s.name,
      });
      await notifyHospitalAdmins(
        s.hospitalId,
        `Vendor KYC expired: ${s.name}`,
        `KYC document or licence for "${s.name}" has expired. Purchase orders are blocked until re-verification.`,
        `vendor-kyc-expired:${s._id}:${istDayKey(now)}`,
      );
    }
  }

  // 2) Expiring within the alert window but not yet expired → advance alert.
  const soon = await Supplier.find({
    kycStatus: { $ne: 'Expired' },
    $or: [
      { licenseExpiry: { $gt: nowDate, $lte: windowEnd } },
      { 'kycDocs.expiry': { $gt: nowDate, $lte: windowEnd } },
    ],
  }).select('name hospitalId licenseExpiry kycDocs').lean();
  report.scanned += soon.length;

  for (const s of soon) {
    const nearest = expiryDates(s)
      .filter((d) => d > nowDate && d <= windowEnd)
      .sort((a, b) => a - b)[0];
    if (!nearest) continue;
    const days = Math.ceil((nearest - now) / DAY_MS);
    const notified = await notifyHospitalAdmins(
      s.hospitalId,
      `Vendor KYC expiring in ${days}d: ${s.name}`,
      `KYC document/licence for "${s.name}" expires on ${nearest.toISOString().slice(0, 10)} (${days} days). Upload a renewal to avoid a PO block.`,
      `vendor-kyc-expiry-soon:${s._id}:${istDayKey(now)}`,
    );
    if (notified) report.alerted += 1;
  }

  if (report.expired > 0 || report.alerted > 0) {
    logger.info('vendorKycExpiry run', report);
  }
  return report;
}

/** Cron entry (daily 06:30 — after the 06:00 document expiry sweep). */
export function startVendorKycExpiry(cronExpression = process.env.VENDOR_KYC_EXPIRY_CRON || '30 6 * * *') {
  logger.info(`Scheduling vendor KYC expiry sweep: ${cronExpression}`);
  let timer;
  try {
    timer = schedule(cronExpression, () => {
      runVendorKycExpiryOnce().catch((err) => logger.warn(`vendorKycExpiry run failed: ${err.message}`));
    });
  } catch {
    timer = setInterval(() => {
      runVendorKycExpiryOnce().catch(() => {});
    }, DAY_MS);
  }
  return timer;
}
