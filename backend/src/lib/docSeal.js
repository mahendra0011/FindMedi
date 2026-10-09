/**
 * File 14 §14.5: generic tamper seal, same pattern as prescriptionIntegrity
 * (HMAC over a canonical digest + nonce, keyed by server secret). Attests
 * "the platform issued this and has not altered it since" — NOT a licensed
 * prescriber's digital signature (that needs per-doctor keys + HSM).
 */
import crypto from 'node:crypto';

const getSecret = () => process.env.DOC_SEAL_SECRET || process.env.PRESCRIPTION_SIGNING_SECRET || process.env.JWT_SECRET || 'dev-only-seal-secret';

export const sealDoc = (docType, docId, bytes) => {
  const digest = crypto.createHash('sha256').update(`${docType}:${docId}:`).update(bytes).digest('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', getSecret()).update(`${digest}:${nonce}`).digest('hex');
  const nonceHash = crypto.createHash('sha256').update(nonce).digest('hex');
  return { digest, signature, nonce, nonceHash };
};

export const verifySeal = ({ digest, signature, nonce }) => {
  if (!digest || !signature || !nonce) return false;
  const expect = crypto.createHmac('sha256', getSecret()).update(`${digest}:${nonce}`).digest('hex');
  const a = Buffer.from(expect, 'hex');
  const b = Buffer.from(String(signature), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
