import mongoose from 'mongoose';

/**
 * AUTH-M-08: login history, so "new device" and "impossible travel" can be
 * decided from data instead of guessed at.
 *
 * There was no login-event store at all: `auditLog('user_login', ...)` recorded
 * that a login happened but nothing retained the device/IP history needed to
 * compare a login against, so no anomaly was detectable no matter how much
 * alerting you layered on top.
 *
 * This is deliberately append-only and TTL'd. It is a security signal store, not
 * a record of care: it must not become a second, unbounded PHI store, and a
 * login from 18 months ago is not evidence about today's login.
 */
const loginEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ip: { type: String, required: true },
  // SHA-256 of the User-Agent. A hash, not the raw string: UA is a fingerprint
  // with poor entropy and does not need to be readable to be comparable.
  deviceHash: { type: String, required: true, index: true },
  // Truncated raw UA for human review of an alert. Capped so a hostile client
  // cannot stuff megabytes into the collection.
  userAgent: { type: String, default: '', maxlength: 256 },

  success: { type: Boolean, default: true },

  // Anomalies detected AT THE TIME of this login. Stored on the event because
  // "was this login flagged?" must be answerable later without re-running
  // detection against a history that has since been TTL'd away.
  anomalies: { type: [String], default: [] },

  // Resolved country when a GeoIP resolver is configured, else null.
  country: { type: String, default: null },
  city: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

// 180 days: long enough to cover an account that is only used occasionally,
// short enough that this is not a permanent behavioural record.
loginEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
loginEventSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('LoginEvent', loginEventSchema);