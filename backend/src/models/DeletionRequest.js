import mongoose from 'mongoose';
import crypto from 'node:crypto';

/**
 * DLM-06 / ADM-M-07: the DPDP erasure workflow.
 *
 * The finding was that `User.status = 'blocked'` was being called deletion. It
 * is not: the row survives, every PII column survives, and nothing downstream -
 * OpenSearch, sessions, credentials - is touched. A blocked account and an
 * erased one are indistinguishable to an auditor, which is precisely the state
 * a regulator asks you to prove you are not in.
 *
 * So this model is a CHAIN OF CUSTODY rather than a flag. Erasure is a sequence
 * of independently verifiable steps, each of which records its own outcome, and
 * a certificate is only ever minted when no step failed.
 *
 * `steps[].status` has three values and the third is the important one:
 *   ok      - performed and confirmed
 *   skipped - deliberately not performed, with a reason (e.g. OpenSearch is not
 *             configured, so there is no index to purge)
 *   failed  - attempted and did not confirm
 *
 * Collapsing `skipped` into `ok` would let a deployment with OpenSearch turned
 * off claim a certificate covering a purge that never happened, so the two are
 * kept apart and the skip reason travels with the certificate.
 */
const deletionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'executing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    reason: { type: String, default: '' },
    channel: {
      type: String,
      enum: ['user_self_service', 'admin_initiated'],
      default: 'user_self_service',
    },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date, default: null },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executedAt: { type: Date, default: null },

    /**
     * The verification chain. Written as execution proceeds, never rewritten
     * afterwards - a step that has recorded a result is immutable, so a later
     * retry APPENDS rather than edits.
     */
    steps: [
      {
        name: { type: String, required: true },
        status: { type: String, enum: ['ok', 'skipped', 'failed'], required: true },
        detail: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],

    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },

    /**
     * Present only on a completed request. Its hash covers every recorded step
     * result, so editing a step after the fact invalidates it - the certificate
     * cannot be laundered by quietly flipping a `failed` to `ok`.
     */
    certificate: {
      id: { type: String },
      sha256: { type: String },
      issuedAt: { type: Date },
      scope: [{ type: String }],
      skipped: [
        {
          name: { type: String },
          reason: { type: String },
        },
      ],
      schemaVersion: { type: Number, default: 1 },
    },
  },
  { timestamps: true },
);

/**
 * Canonical bytes for the certificate hash. Field ORDER is fixed rather than
 * derived from enumeration order, so the same chain always hashes the same way
 * across Node versions and mongoose versions.
 */
function certificatePayload(req) {
  const steps = (req.steps || []).map((s) => ({
    name: s.name,
    status: s.status,
    detail: s.detail || '',
  }));
  return JSON.stringify({
    v: 1,
    requestId: String(req._id),
    userId: String(req.userId),
    executedAt: req.executedAt ? new Date(req.executedAt).toISOString() : null,
    steps,
  });
}

/**
 * Mint a certificate. Returns null rather than throwing when the chain still
 * contains a failure - the caller decides how to report it, but the invariant
 * "no failed step means no certificate" holds here in one place instead of at
 * every call site.
 */
deletionRequestSchema.methods.issueCertificate = function issueCertificate() {
  if (!this.steps?.length) return null;
  if (this.steps.some((s) => s.status === 'failed')) return null;

  const sha256 = crypto.createHash('sha256').update(certificatePayload(this)).digest('hex');
  const skipped = this.steps
    .filter((s) => s.status === 'skipped')
    .map((s) => ({ name: s.name, reason: s.detail || '' }));

  this.certificate = {
    id: `dpc_${sha256.slice(0, 32)}`,
    sha256,
    issuedAt: new Date(),
    scope: this.steps.filter((s) => s.status === 'ok').map((s) => s.name),
    skipped,
    schemaVersion: 1,
  };
  return this.certificate;
};

/**
 * True when the stored certificate still matches the recorded chain. An
 * auditor can re-run this; a tampered step invalidates the certificate rather
 * than merely looking odd.
 */
deletionRequestSchema.methods.certificateIsValid = function certificateIsValid() {
  if (!this.certificate?.sha256) return false;
  if (this.steps.some((s) => s.status === 'failed')) return false;
  return this.certificate.sha256 === crypto.createHash('sha256').update(certificatePayload(this)).digest('hex');
};

export default mongoose.model('DeletionRequest', deletionRequestSchema);
