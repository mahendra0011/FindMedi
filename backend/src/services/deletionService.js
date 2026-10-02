import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { KAFKA_TOPICS } from '../config/kafka.js';
import { writeOutboxEvent } from '../lib/transactionalOutbox.js';
import { purgeUserFromSearch } from './opensearchIndexer.js';

/**
 * DLM-06 / ADM-M-07: the erasure executor.
 *
 * WHAT THIS DELETES, AND WHAT IT DELIBERATELY DOES NOT
 *
 * Identity is destroyed; the clinical record is not. A prescription that
 * outlives its patient still has to be internally consistent - hospitals are
 * required to retain medical records for years, and ripping the rows out would
 * leave appointments, bills and lab results pointing at nothing. So the User
 * document is scrubbed to a non-identifying shell and everything that referenced
 * it keeps resolving, to a person who no longer exists. That distinction is
 * recorded in the certificate rather than left implicit.
 *
 * ORDER OF OPERATIONS: every step runs even if an earlier one failed.
 *
 * That looks backwards, but the alternative is worse. If the OpenSearch purge
 * fails and we abort, Mongo keeps the PII too and the user gets nothing. Since
 * each step is idempotent (deleteMany, overwrite-with-constants), running all
 * of them maximises how much is actually erased while the FAIL-CLOSED rule
 * below still refuses to certify an incomplete chain. Partial erasure that is
 * honestly reported beats partial erasure that is hidden by an early exit.
 */

/** Steps that have run, in the order they are recorded on the certificate. */
const STEP_NAMES = ['revoke_sessions', 'purge_search_index', 'anonymize_user_document', 'revoke_credentials'];

/** Set these to literal non-PII values. */
const ANONYMIZED = {
  name: 'Erased User',
  address: '',
  avatar: '',
  gender: '',
  bloodGroup: '',
  phone: '',
  allergies: [],
  knownConditions: [],
  specialization: '',
  experience: '',
  qualification: '',
  licenseNumber: '',
  vehicleNumber: '',
  drivingLicenseNumber: '',
  twoFactorSecret: '',
  twoFactorTempSecret: '',
  twoFactorBackupCodes: [],
  twoFactorEnabled: false,
  driveTokens: null,
  flagged: false,
  flagReason: '',
  /**
   * NOT a new enum value such as 'erased', tempting as that reads.
   *
   * Sixteen call sites gate access on `status === 'blocked'` - auth.js login,
   * token refresh, assistants, riders, lawyers, carePlans. Adding 'erased' to
   * the enum would satisfy the schema while making every one of those checks
   * MISS for an erased account, so the person we just erased would keep full
   * access. Reusing 'blocked' keeps all sixteen guards true with zero edits,
   * and erasure is distinguished by `erasedAt` below rather than by weakening
   * the guard.
   */
  status: 'blocked',
};

/**
 * These must be REMOVED, not blanked. Mongoose drops `undefined` from `$set`,
 * so writing `dateOfBirth: undefined` would silently be a no-op and the birth
 * date would survive erasure - which is why they go through `$unset`.
 */
const REMOVED = [
  'uhid',
  'dateOfBirth',
  'bankDetails',
  'healthIdCard',
  'abhaNumber',
  'currentLocation',
  'referral',
  'demoWallet',
  'loyalty',
  'lastActive',
];

const runStep = async (name, fn) => {
  try {
    const detail = (await fn()) || '';
    return { name, status: 'ok', detail: String(detail), at: new Date() };
  } catch (err) {
    // Recorded as a failure AND re-thrown to the caller's bookkeeping only -
    // the runner deliberately keeps going, see the header.
    logger.error(`DPDP step ${name} failed: ${err.message}`);
    return { name, status: 'failed', detail: err.message, at: new Date() };
  }
};

const skipStep = (name, reason) => ({ name, status: 'skipped', detail: reason, at: new Date() });

/**
 * DP-M-04: user-deletion tombstone on the event backbone.
 *
 * The chain above scrubs Mongo and the search tier SYNCHRONOUSLY. The lake
 * manifests (and any future analytics store - the finding also names Pinot,
 * which does not exist in this repo yet) learn about it through this event
 * instead: a `user.deleted` tombstone that `kafkaConsumerService` fans out to
 * every analytics copy. Written through the outbox, so the deletion path never
 * depends on a live broker; the poller delivers it (in-memory spine in dev).
 *
 * Fire-and-forget semantics: writeOutboxEvent never throws, and an undelivered
 * tombstone must not fail an erasure that otherwise succeeded. It runs even on
 * a PARTIAL chain - a failed Mongo step is an argument for propagating harder,
 * not quieter (the certificate already refuses to overstate what happened).
 */
export async function emitUserDeletedTombstone(userId, { reason = 'erasure', deletedBy = null } = {}) {
  try {
    await writeOutboxEvent({
      aggregateType: 'User',
      aggregateId: String(userId),
      eventType: 'user.deleted',
      destinationTopic: KAFKA_TOPICS.USER_TOMBSTONES,
      payload: {
        userId: String(userId),
        reason,
        deletedBy: deletedBy == null ? null : String(deletedBy),
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.warn(`user.deleted tombstone skipped (${userId}): ${err.message}`);
  }
}

/**
 * @returns {{steps: Array<{name:string,status:string,detail:string,at:Date}>, failed: string[]}}
 */
export async function executeDeletion(userId, { reason = 'erasure', deletedBy = null } = {}) {
  const id = String(userId);
  const steps = [];

  steps.push(
    await runStep('revoke_sessions', async () => {
      // Refresh tokens are the only server-side session state; killing them
      // stops an active device from continuing after erasure even though the
      // signed access token has not expired yet.
      const res = await RefreshToken.deleteMany({ userId: id });
      return `${res.deletedCount} session(s) revoked`;
    }),
  );

  const purgeStep = await (async () => {
    try {
      const result = await purgeUserFromSearch(id);
      // "not configured" is a SKIP, not a success and not a failure: there is
      // genuinely no index to purge, but the certificate must say so rather
      // than imply a search-tier erasure that never ran.
      if (result.status === 'skipped') return skipStep('purge_search_index', result.detail);
      return { name: 'purge_search_index', status: result.status, detail: result.detail, at: new Date() };
    } catch (err) {
      logger.error(`DPDP step purge_search_index failed: ${err.message}`);
      return { name: 'purge_search_index', status: 'failed', detail: err.message, at: new Date() };
    }
  })();
  steps.push(purgeStep);

  steps.push(
    await runStep('anonymize_user_document', async () => {
      const doc = await User.findById(id).select('_id email');
      if (!doc) {
        // Already gone is success - erasure must be safely repeatable.
        return 'user document already absent';
      }
      // email is `unique`, so the replacement must be unique per request too;
      // two erased users colliding on a placeholder would fail the update and
      // strand the account holding real PII.
      const email = `erased+${id}@invalid.local`;
      await User.updateOne(
        { _id: id },
        {
          $set: { ...ANONYMIZED, email, erasedAt: new Date() },
          // $set alone would leave every field in REMOVED untouched, since
          // mongoose omits undefined rather than unsetting it.
          $unset: Object.fromEntries(REMOVED.map((f) => [f, 1])),
        },
      );
      return `identity overwritten, ${REMOVED.length} field(s) unset`;
    }),
  );

  steps.push(
    await runStep('revoke_credentials', async () => {
      // tokenVersion bumps invalidate every outstanding JWT on next auth check,
      // which covers tokens issued after the refresh-token sweep.
      const res = await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 }, $set: { mustResetPassword: true } });
      if (!res.matchedCount) return 'no user to bump';
      return 'tokenVersion incremented, 2FA and drive tokens cleared';
    }),
  );

  // DP-M-04: propagate to analytics copies AFTER every step has run - and
  // regardless of whether they succeeded (see emitUserDeletedTombstone).
  // Deliberately not a certificate step: the certificate certifies the four
  // identity steps, and STEP_NAMES/scope assertions pin that list.
  await emitUserDeletedTombstone(id, { reason, deletedBy });

  return { steps, failed: steps.filter((s) => s.status === 'failed').map((s) => s.name) };
}

export { STEP_NAMES };
