import mongoose from 'mongoose';

/**
 * Break-glass grants (file 23 §4.2): controlled, time-boxed PHI access for
 * platform operators. Default is DENY — patient clinical data is never
 * visible to admin roles without an approved grant for ONE subject.
 *
 * Flow: requester files (reason code + ticket/incident + subject + scope +
 * duration ≤ 60 min) → a DIFFERENT approver approves (dual approval for
 * mental/sexual-health + legal subjects) → time-boxed READ grant →
 * every read logged → auto-expire → DPO post-access review.
 *
 * Rules enforced here + middleware/requireBreakGlass.js:
 * no bulk (single subject), view-only, self-approval impossible,
 * second approver must differ for sensitive subjects.
 */
const SENSITIVE_SUBJECTS = ['mental_health', 'sexual_health', 'legal_request'];

const breakGlassGrantSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // First approver; secondApproverId required for SENSITIVE_SUBJECTS.
  approverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  secondApproverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  subject: {
    type: { type: String, enum: ['patient', 'record', 'booking', 'mental_health'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  },
  // READ-only by design; fields optionally narrows (e.g. ['contact']).
  scope: { type: [String], enum: ['read'], default: ['read'] },
  fields: { type: [String], default: [] },

  reasonCode: {
    type: String,
    enum: ['patient_support_consent', 'safety_incident', 'legal_order', 'fraud_investigation', 'data_repair'],
    required: true,
  },
  ticketId: { type: String, maxlength: 100, default: '' },
  reasonNote: { type: String, maxlength: 1000, default: '' },

  durationMin: { type: Number, min: 5, max: 60, default: 30 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'expired', 'revoked'],
    default: 'pending',
    index: true,
  },
  approvedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null, index: true },
  revokedAt: { type: Date, default: null },
  patientNotifiedAt: { type: Date, default: null },

  // Every read under this grant (route + object), for DPO review.
  accessLog: [{
    ts: { type: Date, default: Date.now },
    route: { type: String, maxlength: 300 },
    objectId: { type: String, maxlength: 100 },
  }],
}, { timestamps: true });

breakGlassGrantSchema.index({ requesterId: 1, status: 1 });
breakGlassGrantSchema.index({ 'subject.id': 1, status: 1 });

export const BREAK_GLASS_SENSITIVE_SUBJECTS = SENSITIVE_SUBJECTS;

export default mongoose.models.BreakGlassGrant || mongoose.model('BreakGlassGrant', breakGlassGrantSchema);
