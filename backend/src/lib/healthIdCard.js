/**
 * REC-M-04 / HI-B-04 follow-through: ONE place that mints and revokes QR tokens.
 *
 * WHY THIS EXISTS
 * The audit fixed the mint/revoke semantics in routes/healthId.js and wrote
 * "every mint path uses the single QR_TOKEN_TTL_MS lifetime" — but the patient
 * portal's own duplicates (routes/patient.js, the path PatientHealthId.tsx
 * actually calls) were never converted:
 *
 *   - its generate minted a token with NO expiry and NO rotation stamp, and the
 *     scan path treats "no expiry and no rotation stamp" as REVOKED — so a card
 *     minted through the shipped UI was dead on its first scan;
 *   - its settings route could disable the card without revoking the token, so
 *     the revocation HI-B-04 added did not propagate through every path that can
 *     turn a card off.
 *
 * Two copies of sensitive state transitions is the bug; this module is how the
 * two route files stop drifting again.
 */
import { randomBytes } from 'crypto';
import { z } from 'zod';

/** One lifetime for the QR token, used by EVERY mint path. */
export const QR_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Mint a fresh token with the fields the scan path requires (expiry is
 * mandatory — a token without one is revoked on first read).
 */
export function mintQrToken(card) {
  card.qrToken = randomBytes(16).toString('base64url');
  card.qrTokenExpiry = new Date(Date.now() + QR_TOKEN_TTL_MS);
  card.qrTokenRotatedAt = new Date();
  return card;
}

/**
 * Revoke the current token: nothing that already printed or cached can resolve
 * afterwards, because the scan endpoint looks the token up in the database and
 * there is no cache layer in front of it. `qrTokenRotatedAt` is cleared too so
 * the legacy-row fallback (expiry missing → rotation stamp + TTL) cannot
 * resurrect a revoked card.
 */
export function revokeQrToken(card, now = new Date()) {
  card.qrToken = undefined;
  card.qrTokenExpiry = undefined;
  card.qrTokenRotatedAt = undefined;
  card.qrTokenRevokedAt = now;
  return card;
}

/**
 * Shared settings schema (HI-B-03): closed enums on both route files, so the
 * patient-portal copy cannot accept a shareLevel the schema would reject at
 * save time as a 500.
 */
export const healthIdSettingsSchema = z.object({
  shareLevel: z.enum(['full', 'minimal']).optional(),
  isEnabled: z.boolean().optional(),
}).refine(
  (v) => v.shareLevel !== undefined || v.isEnabled !== undefined,
  { message: 'Provide shareLevel and/or isEnabled' }
);
