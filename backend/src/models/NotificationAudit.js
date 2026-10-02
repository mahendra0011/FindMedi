import mongoose from 'mongoose';

/**
 * NOTIF-M-06: a medico-legal audit trail for every notification decision.
 *
 * WHY THIS IS NOT THE SAME AS THE `notifications` COLLECTION
 * That collection holds what the user was shown. This holds what the platform
 * decided, INCLUDING what it did not send. The clinically important question -
 * "was this patient told their critical lab result was ready?" - has two
 * possible answers that look identical in `notifications`:
 *
 *   - it was never created (a bug, or a silently swallowed write), or
 *   - it was created and later suppressed by a preference.
 *
 * Without a separate record of suppressed sends, "we have no record of telling
 * them" is unfalsifiable and the platform cannot answer the question at all.
 *
 * So EVERY decision gets a row: delivered, and every reason for not delivering.
 *
 * PHI: `metadata` carries identifiers, never notification bodies. A notification
 * body can contain a diagnosis. `metadata` is written by the caller and is
 * treated as non-PHI by contract; the test suite asserts body text never lands
 * here.
 */
const notificationAuditSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true },
  priority: { type: String, enum: ['critical', 'normal'], default: 'normal' },

  // 'sent'      - a Notification row exists and the user can see it
  // 'suppressed'- deliberately not sent; `reason` says why
  // 'duplicate' - a prior identical send exists (dedupKey hit)
  outcome: {
    type: String,
    enum: ['sent', 'suppressed', 'duplicate'],
    required: true,
    index: true,
  },

  // Why it was suppressed: channel-disabled | quiet-hours | type-muted |
  // marketing-opted-out | rate-capped. Null when outcome is 'sent'.
  reason: { type: String, default: null },

  notificationId: { type: String, default: null },
  dedupKey: { type: String, default: null },

  // Caller-supplied context. Identifiers only - never titles or message bodies.
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },

  actor: { type: String, default: 'system' },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Audit rows are compliance evidence: they are written once and never updated.
// Query middleware only - `deleteOne`/`updateOne` also exist as DOCUMENT
// methods, and registering one hook array for both kinds makes it fire for
// `Model.deleteOne()` as well as `doc.deleteOne()`, which is what we want but is
// easy to get wrong silently.
notificationAuditSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'deleteOne', 'deleteMany'],
  function (next) {
    next(new Error('NotificationAudit is append-only'));
  }
);

notificationAuditSchema.index({ userId: 1, createdAt: -1 });
notificationAuditSchema.index({ outcome: 1, createdAt: -1 });

export default mongoose.model('NotificationAudit', notificationAuditSchema);