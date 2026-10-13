import mongoose from 'mongoose';

/**
 * CRM Account (file 24 §4.3/§8): Overlay on top of Provider for Supply CRM / Provider 360.
 * Tracks account ownership, health score (0-100), risk reasons, and check-in cadence.
 * Note: Kept separate from hospital-tenant `Account.js` (Chart of Accounts).
 */
const crmAccountSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, unique: true, index: true },
  accountOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  healthScore: { type: Number, min: 0, max: 100, default: 75 },
  healthBand: { type: String, enum: ['healthy', 'watch', 'at_risk'], default: 'healthy', index: true },
  riskReasons: [{ type: String }],
  plan: { type: String, default: 'standard' },
  lastContactAt: { type: Date, default: null },
  nextCheckInAt: { type: Date, default: null },
  notes: [{
    content: { type: String, maxlength: 2000 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

crmAccountSchema.index({ accountOwnerId: 1, healthBand: 1 });

export default mongoose.models.CrmAccount || mongoose.model('CrmAccount', crmAccountSchema);
