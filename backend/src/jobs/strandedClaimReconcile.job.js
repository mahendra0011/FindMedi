/**
 * RIDE-B-05 / ED-B-01: stranded-claim recovery sweep (hexCacheReconcile pattern).
 * A provider that accepted a wave holds `activeDispatchRequestId` until the
 * request assigns/completes or the claim is released. If the process dies
 * between `claimProvider` and assignment, the provider stays locked forever
 * and every later wave skips them (`activeDispatchRequestId: null` filter).
 * This job releases claims whose request is gone, terminal, or searching with
 * an expired wave deadline — i.e. claims no live wave can still need.
 * Fail-soft everywhere: never throws, never crashes the server.
 */
import logger from '../config/logger.js';

export const STRANDED_CLAIM_TTL_MS = Number(process.env.STRANDED_CLAIM_TTL_MS || 15 * 60 * 1000);

const TERMINAL_REQUEST_STATUSES = new Set([
  'completed',
  'cancelled_by_user',
  'cancelled_by_rider',
  'cancelled_by_doctor',
  'cancelled_by_patient',
  'cancelled_by_assistant',
  'cancelled_by_lawyer',
  'no_riders_found',
  'no_responders_found',
  'declined_by_assistant',
  'declined_by_lawyer',
]);

async function loadTargets() {
  const [
    { default: RiderProfile },
    { default: LawyerProfile },
    { default: AssistantProfile },
    { default: Doctor },
    { default: RideBooking },
    { default: LawyerBooking },
    { default: AssistantBooking },
    { default: EmergencyDoctorRequest },
  ] = await Promise.all([
    import('../models/RiderProfile.js'),
    import('../models/LawyerProfile.js'),
    import('../models/AssistantProfile.js'),
    import('../models/Doctor.js'),
    import('../models/RideBooking.js'),
    import('../models/LawyerBooking.js'),
    import('../models/AssistantBooking.js'),
    import('../models/EmergencyDoctorRequest.js'),
  ]);
  return [
    { name: 'rider', Provider: RiderProfile, Requests: [RideBooking] },
    { name: 'lawyer', Provider: LawyerProfile, Requests: [LawyerBooking] },
    { name: 'assistant', Provider: AssistantProfile, Requests: [AssistantBooking] },
    { name: 'emergency_doctor', Provider: Doctor, Requests: [EmergencyDoctorRequest] },
  ];
}

export function isClaimStranded(providerDoc, requestDoc, now = new Date()) {
  if (!providerDoc?.activeDispatchRequestId) return false;
  if (!requestDoc) return true; // request deleted — claim can never resolve
  if (TERMINAL_REQUEST_STATUSES.has(requestDoc.status)) return true;
  if (requestDoc.status === 'searching' && requestDoc.windowEndsAt) {
    // Wave deadline long past and no assignment happened: the wave died.
    if (new Date(requestDoc.windowEndsAt).getTime() + STRANDED_CLAIM_TTL_MS < now.getTime()) return true;
  }
  const touched = providerDoc.updatedAt || providerDoc.lastLocationAt || null;
  if (touched && now.getTime() - new Date(touched).getTime() > STRANDED_CLAIM_TTL_MS
    && requestDoc.status !== 'searching') return true;
  return false;
}

export async function findRequestById(Requests, requestId) {
  for (const Model of Requests) {
    try {
      const row = await Model.findById(requestId).select('status windowEndsAt').lean();
      if (row) return row;
    } catch { /* try next model */ }
  }
  return null;
}

export async function runStrandedClaimReconcileOnce({ targets, now = new Date(), limit = 100 } = {}) {
  const list = targets || await loadTargets();
  let scanned = 0;
  let released = 0;
  for (const { Provider, Requests } of list) {
    let rows = [];
    try {
      rows = await Provider.find({ activeDispatchRequestId: { $ne: null } })
        .select('_id activeDispatchRequestId updatedAt lastLocationAt')
        .limit(limit)
        .lean();
    } catch (err) {
      logger.warn(`strandedClaimReconcile scan skipped: ${err.message}`);
      continue;
    }
    for (const row of rows) {
      scanned += 1;
      let requestDoc = null;
      try {
        requestDoc = await findRequestById(Requests, row.activeDispatchRequestId);
      } catch (err) {
        logger.warn(`strandedClaimReconcile lookup skipped: ${err.message}`);
        continue;
      }
      if (!isClaimStranded(row, requestDoc, now)) continue;
      try {
        const res = await Provider.updateOne(
          { _id: row._id, activeDispatchRequestId: row.activeDispatchRequestId },
          { $set: { activeDispatchRequestId: null } },
        );
        if (res?.modifiedCount) released += 1;
      } catch (err) {
        logger.warn(`strandedClaimReconcile release skipped: ${err.message}`);
      }
    }
  }
  logger.info(`strandedClaimReconcile done: scanned=${scanned} released=${released}`);
  return { scanned, released };
}

export function startStrandedClaimReconcile(intervalMs = 5 * 60 * 1000) {
  const timer = setInterval(() => {
    runStrandedClaimReconcileOnce().catch(() => {});
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}
