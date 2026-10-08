import mongoose from 'mongoose';

/**
 * Version-stamped e-signature (2.md 3 step 9: "e-sign, version-stamped, stored
 * with IP+time"; 10.md 2.15 PolicyAcceptance). ProviderTypeConfig's
 * `agreementTemplateId` says WHICH template a flow uses — this row says that a
 * SPECIFIC user accepted a SPECIFIC version at a specific moment, which is the
 * only form a consent record can be disputed in later: "we accepted v3" is
 * provable, "the template was v3 at some point" is not.
 *
 * Acceptances are not edited or revoked — a new version produces a new row, so
 * the ledger of who accepted what is append-only. Retention: tracked gap until
 * a policy owner decides whether these ride the consent clock (see
 * docs/privacy/RETENTION.md "Known gaps" — consent-adjacent, not ABDM consent).
 */
const policyAcceptanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Optional: an acceptance made on behalf of / inside a provider's onboarding.
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null, index: true },

  templateId: { type: String, required: true, maxlength: 120 },
  templateVersion: { type: String, required: true, maxlength: 40 },
  context: {
    type: String,
    enum: ['provider_agreement', 'privacy_policy', 'terms_of_service', 'teleconsult_consent', 'booking_cancellation'],
    required: true,
  },

  acceptedAt: { type: Date, default: Date.now, index: true },
  // Evidence, not PII to display: the classic trio for "did they really sign?".
  ip: { type: String, maxlength: 64, default: '' },
  userAgent: { type: String, maxlength: 500, default: '' },
  // The rendered document's digest — proves WHAT was accepted, not just which
  // version label was recorded.
  documentHash: { type: String, maxlength: 128, default: '' },
}, { timestamps: true });

policyAcceptanceSchema.index({ userId: 1, templateId: 1, templateVersion: 1 });

export default mongoose.models.PolicyAcceptance || mongoose.model('PolicyAcceptance', policyAcceptanceSchema);
