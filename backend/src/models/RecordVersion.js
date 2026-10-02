/**
 * REC-M-02: an append-only version history for clinical records.
 *
 * Records used to update IN PLACE. A medico-legal requirement is that any edit to
 * clinical data leaves a trail of who changed what, and when — and an in-place
 * update destroys the previous state, so the trail was unrecoverable by
 * construction rather than by accident.
 *
 * Properties that matter, and why:
 *
 *  1. APPEND-ONLY. No update, no delete, and no route that would accept one. A
 *     version history that can itself be edited is not an audit trail.
 *  2. The snapshot is the WHOLE prior document, not a diff. A diff is only
 *     reconstructible by replaying the chain, so one lost version makes every
 *     later one unreadable. Storage is cheap; a medico-legal trail that can
 *     silently lose a link is not.
 *  3. `version` is monotonic per record and enforced by a UNIQUE compound index,
 *     so two concurrent edits cannot both claim version N.
 *  4. The CHAIN HASH makes tampering detectable: each snapshot carries the hash
 *     of the previous one, so removing or altering an entry breaks every hash
 *     after it. That is what separates "we log it" from "we can prove it".
 */
import mongoose from 'mongoose';
import crypto from 'node:crypto';

const recordVersionSchema = new mongoose.Schema({
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  // The complete document as it stood BEFORE this edit.
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  // Field-level diff, for a human reviewer. Informational only - never the
  // source of truth, per property 2.
  changed: [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }],

  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  editedByRole: { type: String, default: '' },
  editedByName: { type: String, default: '' },
  editReason: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },

  // Chain hash. A tampered or removed entry breaks every hash after it.
  prevHash: { type: String, default: '' },
  hash: { type: String, required: true },
}, { versionKey: false });

// One version N per record: two concurrent edits cannot both claim the same slot.
recordVersionSchema.index({ recordId: 1, version: 1 }, { unique: true });
// History is read newest-first far more often than in full.
recordVersionSchema.index({ recordId: 1, createdAt: -1 });

/** Fields that are never clinically meaningful and would only add noise. */
const IGNORED_IN_DIFF = new Set(['updatedAt', '__v', '_id', 'createdAt']);

export const computeVersionHash = (recordId, version, snapshot, prevHash, at) =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        recordId: String(recordId),
        version,
        // Sorted keys, so the hash does not depend on property insertion order.
        snapshot: Object.fromEntries(Object.entries(snapshot || {}).sort(([a], [b]) => (a < b ? -1 : 1))),
        prevHash: prevHash || '',
        at: new Date(at).toISOString(),
      })
    )
    .digest('hex');

/**
 * Field-level diff between two versions of a record.
 *
 * Nested objects are compared as a whole rather than recursed into: a partial
 * clinical object is ambiguous to read, and a flat "this object changed" entry is
 * more honest than a deep diff that silently drops keys on a shape change.
 */
export const diffRecord = (before = {}, after = {}) => {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const out = [];
  for (const key of keys) {
    if (IGNORED_IN_DIFF.has(key)) continue;
    const a = before?.[key];
    const b = after?.[key];
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    out.push({ field: key, from: a ?? null, to: b ?? null });
  }
  return out;
};

/**
 * Append a version.
 *
 * A duplicate-key error is rethrown rather than swallowed: it means two edits
 * raced for the same version number, and quietly taking the loser's snapshot
 * would drop a clinical change out of the trail.
 */
recordVersionSchema.statics.appendVersion = async function appendVersion({
  recordId, before, after, editedBy, editedByRole = '', editedByName = '',
  editReason = '', ip = '', userAgent = '', at = new Date(),
}) {
  const prev = await this.findOne({ recordId }).sort({ version: -1 }).select('version hash').lean();
  const version = (prev?.version || 0) + 1;
  const prevHash = prev?.hash || '';
  const hash = computeVersionHash(recordId, version, before || {}, prevHash, at);

  return this.create({
    recordId,
    version,
    snapshot: before || {},
    changed: diffRecord(before, after),
    editedBy, editedByRole, editedByName, editReason, ip, userAgent,
    createdAt: at,
    prevHash, hash,
  });
};

/**
 * Verify a chain end to end.
 *
 * Returns the first broken link rather than a boolean, because "the audit trail
 * is broken" is useless without knowing WHERE. Any ok:false is an incident.
 */
recordVersionSchema.statics.verifyChain = async function verifyChain(recordId) {
  const versions = await this.find({ recordId }).sort({ version: 1 }).lean();
  if (versions.length === 0) return { ok: true, count: 0, reason: 'no-versions' };

  let prevHash = '';
  for (let i = 0; i < versions.length; i++) {
    const v = versions[i];
    if (v.version !== i + 1) return { ok: false, brokenAt: v.version, reason: 'version-gap' };
    if (v.prevHash !== prevHash) return { ok: false, brokenAt: v.version, reason: 'prev-hash-mismatch' };
    const expected = computeVersionHash(v.recordId, v.version, v.snapshot, v.prevHash, v.createdAt);
    if (expected !== v.hash) return { ok: false, brokenAt: v.version, reason: 'hash-mismatch' };
    prevHash = v.hash;
  }
  return { ok: true, count: versions.length };
};

export default mongoose.models.RecordVersion
  || mongoose.model('RecordVersion', recordVersionSchema);
