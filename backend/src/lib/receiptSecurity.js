/**
 * Spec 24 §4 — receipt authenticity without image deps: HMAC-SHA256 of the
 * transaction ref (server secret), verifiable via GET /api/transactions/verify/:id.
 */
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'findmedi-receipt-fallback-secret';

export function signTxnRef(transactionRef) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(String(transactionRef || ''))
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

export function verifyTxnHash(transactionRef, hash) {
  if (!transactionRef || !hash) return false;
  const expected = signTxnRef(transactionRef);
  const a = Buffer.from(String(hash).toUpperCase());
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
