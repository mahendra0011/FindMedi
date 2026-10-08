import mongoose from 'mongoose';

/**
 * File 25 §8/§10: tenant-level emergency grant (doctor accessing a
 * not-in-care-team patient). Mirrors BreakGlassGrant (platform) but scoped
 * to ONE tenant + subject: reason + 30–60 min box + compliance alert +
 * patient-visible log. Dual approval for restricted subjects.
 */
const tenantGrantSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
  principalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: {
    type: { type: String, enum: ['patient', 'record'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  },
  actions: [{ type: String, maxlength: 120 }],
  reasonCode: {
    type: String,
    enum: ['emergency_care', 'safety_incident', 'legal_order', 'treatment'],
    required: true,
  },
  ticketId: { type: String, maxlength: 100, default: '' },
  reasonNote: { type: String, maxlength: 1000, default: '' },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'denied', 'expired', 'revoked'], default: 'pending', index: true },
  approvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  patientNotifiedAt: { type: Date, default: null },
  accessLog: [{
    ts: { type: Date, default: Date.now },
    route: { type: String, maxlength: 300 },
    objectId: { type: String, maxlength: 100 },
  }],
}, { timestamps: true });

tenantGrantSchema.index({ tenantId: 1, principalId: 1, status: 1 });

export default mongoose.models.TenantGrant || mongoose.model('TenantGrant', tenantGrantSchema);
