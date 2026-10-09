import mongoose from 'mongoose';
import { NEUTRAL_COPY } from '../lib/neutralCopy.js';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function getISTDateString() {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${M}-${D}`;
}

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  // NOTIF-B-05 (side effect): `lab` and `sos` were missing from this enum, so
  // every `Notification.create({ type: 'lab' | 'sos' })` failed mongoose
  // validation and was swallowed by the caller's `.catch(() => {})` — lab
  // reports and SOS alerts were silently never delivered. The enum now covers
  // every type actually used across the codebase.
  type: {
    type: String,
    enum: [
      'reminder', 'payment', 'appointment', 'records', 'system', 'ride',
      'assistant', 'lawyer', 'lab', 'sos', 'billing', 'emergency',
      'prescription', 'radiology', 'token',
      // Doc 12 §6: recall reminders (follow-up/vaccination dues).
      'recall',
    ],
    default: 'system',
  },
  read: { type: Boolean, default: false },
  userId: { type: String, required: true },
  referenceId: { type: String, default: null, index: true },
  date: { type: String, default: () => getISTDateString() },
  createdAt: { type: Date, default: Date.now },
  // NOTIF-B-05: rich in-app content that must never reach a lock screen. The
  // `message` field keeps the detailed text for the in-app view only; push
  // payloads must use `pushTitle`/`pushBody` (generic, PHI-free).
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  pushTitle: { type: String, default: null },
  pushBody: { type: String, default: null },
  // NOTIF-B-05: `critical` notifications (SOS, critical lab) bypass the
  // per-user/type daily cap and the quiet-hours suppression.
  priority: { type: String, enum: ['critical', 'normal'], default: 'normal' },
  // NOTIF-B-05: de-duplication key. Combined with `userId` in a unique sparse
  // index so repeated job retries cannot spam the same user.
  dedupKey: { type: String, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });
// NOTIF-B-05: one row per (user, dedupKey); rows without a dedupKey are exempt.
notificationSchema.index(
  { userId: 1, dedupKey: 1 },
  { unique: true, partialFilterExpression: { dedupKey: { $type: 'string' } } }
);

/**
 * NOTIF-B-05: generic, PHI-free push copy per type.
 *
 * `message` frequently embeds diagnoses, lab values, patient names or OTP codes.
 * Those are fine inside the authenticated in-app list but are PHI on a lock
 * screen, so the push-safe strings are generated from the TYPE only and never
 * from caller-supplied content.
 */
notificationSchema.pre('validate', function sanitizeNotification(doc) {
  const copy = NEUTRAL_COPY[doc.type] || NEUTRAL_COPY.system;
  if (!doc.pushTitle) doc.pushTitle = copy.title;
  if (!doc.pushBody) doc.pushBody = copy.body;
  if (doc.dedupKey) doc.dedupKey = String(doc.dedupKey);
});


export default mongoose.model('Notification', notificationSchema);
