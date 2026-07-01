import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// TTL index - auto delete logs older than 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model('AuditLog', auditLogSchema);