import PolicyAcceptance from '../models/PolicyAcceptance.js';

/**
 * Versioned ToS / policy acceptance ledger (see docs/legal/ACCEPTANCE-LOG.md).
 *
 * A consent record is only disputable as "a SPECIFIC user accepted a SPECIFIC
 * version at a specific moment" — so every acceptance is an append-only row
 * (userId + templateId + templateVersion + acceptedAt + IP/UA + documentHash).
 * Never edited, never revoked: a new version produces a new row.
 */

export const POLICY_CONTEXTS = [
  'provider_agreement',
  'privacy_policy',
  'terms_of_service',
  'teleconsult_consent',
  'booking_cancellation',
];

/**
 * Record that a user accepted a policy version. Idempotent per
 * (userId, templateId, templateVersion): repeat calls return the existing row
 * instead of duplicating the ledger.
 */
export async function recordPolicyAcceptance({
  userId,
  providerId = null,
  templateId,
  templateVersion,
  context,
  ip = '',
  userAgent = '',
  documentHash = '',
}) {
  if (!userId) throw new Error('recordPolicyAcceptance: userId is required');
  if (!templateId || !templateVersion) {
    throw new Error('recordPolicyAcceptance: templateId + templateVersion are required');
  }
  if (!POLICY_CONTEXTS.includes(context)) {
    throw new Error(`recordPolicyAcceptance: unknown context "${context}"`);
  }

  const existing = await PolicyAcceptance.findOne({ userId, templateId, templateVersion }).lean();
  if (existing) return existing;

  const row = await PolicyAcceptance.create({
    userId,
    providerId,
    templateId,
    templateVersion,
    context,
    ip: String(ip).slice(0, 64),
    userAgent: String(userAgent).slice(0, 500),
    documentHash: String(documentHash).slice(0, 128),
  });
  return row.toObject();
}

/** Latest acceptance of a template by a user (any version), or null. */
export async function getLatestAcceptance(userId, templateId) {
  return PolicyAcceptance.findOne({ userId, templateId }).sort({ acceptedAt: -1 }).lean();
}

/** True when the user already accepted this exact template version. */
export async function hasAccepted(userId, templateId, templateVersion) {
  const row = await PolicyAcceptance.findOne({ userId, templateId, templateVersion })
    .select('_id')
    .lean();
  return Boolean(row);
}
