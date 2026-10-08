import mongoose from 'mongoose';

/**
 * File 25 §10: service-account API keys (HL7/PACS/lab machines). Hash at
 * rest (show once), scoped to ONE policy, expiry + IP binding + rate-limit
 * friendly (prefix for lookup), instant revoke, last-used tracking.
 */
const apiKeySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', default: null, index: true },
  name: { type: String, required: true, maxlength: 120 },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'IamPolicy', default: null },
  hash: { type: String, required: true, select: false },
  prefix: { type: String, required: true, index: true },
  ipBinding: [{ type: String, maxlength: 60 }],
  expiresAt: { type: Date, default: null, index: true },
  lastUsedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

apiKeySchema.index({ tenantId: 1, revokedAt: 1 });

export default mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
