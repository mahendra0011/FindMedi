import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // ADM-M-02: an admin-activity trail that an admin can edit is not a trail.
  // No code path updates an AuditLog today (grep-verified), and these flags make
  // that a schema property instead of a convention: any future updateOne/set
  // through mongoose silently drops these paths. Retention is still the TTL
  // index below - immutable means append-only, not eternal.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    immutable: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
    immutable: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    immutable: true,
  },
  ip: {
    type: String,
    immutable: true,
  },
  userAgent: {
    type: String,
    immutable: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
// AUTH-B-05: `bufferCommands: false` — without it a Mongo outage makes every
// `AuditLog.create()` wait out mongoose' 10 s buffering timeout, so every
// audited mutation stalls for 10 s (observed in the test logs). Failing fast
// keeps the "audit must succeed" guarantee when Mongo is UP while removing the
// 10 s stall when it is DOWN (the failure is counted by the audit middleware).
}, { timestamps: true, bufferCommands: false });

// TTL index - auto delete logs older than 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model('AuditLog', auditLogSchema);