/**
 * File 25 §12: activity-log writer + IAM observability.
 *
 * Three properties the clinical request path depends on:
 *   1. NEVER throws — a failed log write increments `writeErrors` and the
 *      request continues (the log is a witness, not a gate).
 *   2. Fire-and-forget shaped — routes `void logAccess(...)`; the insert runs
 *      detached from the response.
 *   3. Detection is in-process only — a sliding window per actor; no DB query
 *      per event (a read-heavy PHI endpoint cannot afford one).
 *
 * Thresholds are env-tunable so tests can drive the detector without 60
 * fabricated reads: IAM_PHI_VOLUME_LIMIT (default 60 reads / 15 min) and
 * IAM_RESTRICTED_VOLUME_LIMIT (default 10 / 15 min). A trip FLAGS the entry
 * and warns — it never blocks a clinical read (review signal, §12).
 */
import logger from '../config/logger.js';

const WINDOW_MS = 15 * 60 * 1000;
const PHI_PREFIXES = ['records:', 'prescriptions:', 'patients:', 'lab:', 'radiology:', 'billing:', 'insurance:'];

const buckets = new Map(); // actorId -> { events: [{ at, restricted }] }

const metrics = {
  writes: 0,
  allow: 0,
  deny: 0,
  flagged: 0,
  writeErrors: 0,
  shadowMismatches: 0,
};

const intEnv = (key, fallback) => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const isPhiAction = (action) => PHI_PREFIXES.some((p) => String(action || '').startsWith(p));

/**
 * Sliding-window volume check. Returns a flagReason string or null.
 * Pure enough to unit-test: `now` is injectable, `actorId` keys the bucket.
 */
export function detectSnooping({ actorId, action, sensitivity }, now = Date.now()) {
  if (!isPhiAction(action)) return null;
  const key = String(actorId || '');
  if (!key) return null;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { events: [] };
    buckets.set(key, bucket);
  }
  bucket.events.push({ at: now, restricted: ['restricted', 'vip'].includes(String(sensitivity || '')) });
  // Prune the window in place (buckets stay small; a stale bucket costs one array).
  bucket.events = bucket.events.filter((e) => now - e.at < WINDOW_MS);

  const restrictedCount = bucket.events.filter((e) => e.restricted).length;
  const restrictedLimit = intEnv('IAM_RESTRICTED_VOLUME_LIMIT', 10);
  if (restrictedCount > restrictedLimit) {
    return `restricted-volume:${restrictedCount}reads/${Math.round(WINDOW_MS / 60000)}m`;
  }
  const total = bucket.events.length;
  const totalLimit = intEnv('IAM_PHI_VOLUME_LIMIT', 60);
  if (total > totalLimit) {
    return `phi-volume:${total}reads/${Math.round(WINDOW_MS / 60000)}m`;
  }
  return null;
}

/** Called by iamShadow() on old/new disagreement — §12 mismatch counter. */
export function noteShadowMismatch() {
  metrics.shadowMismatches += 1;
}

export function getIamMetrics(now = Date.now()) {
  return {
    ...metrics,
    windows: buckets.size,
    windowMs: WINDOW_MS,
    phiVolumeLimit: intEnv('IAM_PHI_VOLUME_LIMIT', 60),
    restrictedVolumeLimit: intEnv('IAM_RESTRICTED_VOLUME_LIMIT', 10),
    at: new Date(now).toISOString(),
  };
}

/** Test seam — clears both counters and detector buckets. */
export function resetIamAccessLogState() {
  buckets.clear();
  for (const k of Object.keys(metrics)) metrics[k] = 0;
}

/**
 * Append one access event. Resolves to the stored doc, or null when the
 * write failed (never rejects — see property 1).
 *
 * @param {object} entry
 * @param {string} entry.decision 'allow' | 'deny'
 * @param {string} entry.action   IAM action, e.g. 'records:read'
 * @returns {Promise<object|null>}
 */
export async function logAccess(entry) {
  try {
    metrics.writes += 1;
    const decision = entry?.decision === 'deny' ? 'deny' : 'allow';
    metrics[decision] += 1;

    const flagReason = detectSnooping(entry) || '';
    const doc = {
      ...entry,
      decision,
      flagged: Boolean(flagReason),
      flagReason,
      reason: String(entry?.reason || '').slice(0, 200),
      accessReason: String(entry?.accessReason || '').slice(0, 300),
    };
    if (doc.flagged) {
      metrics.flagged += 1;
      logger.warn(
        `[iam-access] snooping flag actor=${doc.actorId} action=${doc.action} `
        + `role=${doc.actorRole} reason=${doc.flagReason} route=${doc.route}`,
      );
    }

    const { default: IamAccessLog } = await import('../models/IamAccessLog.js');
    const stored = await IamAccessLog.create(doc);
    return stored;
  } catch (e) {
    metrics.writeErrors += 1;
    logger.warn(`[iam-access] log write failed: ${e.message}`);
    return null;
  }
}
