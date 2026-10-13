/**
 * File 25 §11/§12: immutable per-access activity log.
 *
 * Three consumers, one append-only row:
 *   1. Patient-visible access log ("who viewed my record") — `patientId`.
 *   2. Reason-for-access trail — `accessReason` captured from the caller,
 *      `reason` carries the engine/legacy decision reason.
 *   3. Snooping review source — `flagged` / `flagReason` set at insert time
 *      by the sliding-window volume detector.
 *
 * Append-only by construction: no route updates or deletes these rows, and
 * `flagged` is computed BEFORE the insert so the detector never needs to
 * mutate a logged event.
 */
import mongoose from 'mongoose';

const iamAccessLogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorRole: { type: String, maxlength: 40, default: '' },
  action: { type: String, required: true, maxlength: 80 },
  resourceType: { type: String, maxlength: 40, default: '' },
  resourceId: { type: String, maxlength: 64, default: '' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  sensitivity: {
    type: String,
    enum: ['standard', 'sensitive', 'restricted', 'vip', 'minor'],
    default: 'standard',
  },
  decision: { type: String, enum: ['allow', 'deny'], required: true },
  // Engine/legacy decision reason (e.g. 'default-deny', 'consent').
  reason: { type: String, maxlength: 200, default: '' },
  // Caller-provided reason-for-access (restricted/vip/minor reads).
  accessReason: { type: String, maxlength: 300, default: '' },
  obligations: [{ type: String, maxlength: 40 }],
  route: { type: String, maxlength: 160, default: '' },
  ip: { type: String, maxlength: 64, default: '' },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, maxlength: 160, default: '' },
}, { timestamps: true });

iamAccessLogSchema.index({ tenantId: 1, createdAt: -1 });
iamAccessLogSchema.index({ patientId: 1, createdAt: -1 });
iamAccessLogSchema.index({ actorId: 1, createdAt: -1 });
iamAccessLogSchema.index({ flagged: 1, createdAt: -1 });

export default mongoose.models.IamAccessLog || mongoose.model('IamAccessLog', iamAccessLogSchema);
