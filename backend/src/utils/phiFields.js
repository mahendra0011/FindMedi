import { encryptField, decryptField, blindIndex, isEncrypted } from './fieldEncryption.js';

// P2-9: PHI/PII field encryption, PHASE 1 — government IDs + bank details on
// the three public-onboarding profiles (Assistant/Rider/Lawyer) plus
// DeliveryPartner bank details.
//
// Design (explicit, no mongoose magic):
// - Writes encrypt here at the route layer; reads decrypt here at the
//   display layer. No getters/setters, so `.lean()` and raw-shape code paths
//   behave identically and nothing silently changes shape.
// - Legacy plaintext rows pass through BOTH directions untouched, so deploy
//   needs no flag day: run scripts/migrate-encrypt-phi.mjs afterwards to
//   encrypt old rows in place (with --dry-run first, --rollback available).
// - Duplicate checks query the HMAC blind index (`govtIdNumberHash`), never
//   the plaintext — searching works without decrypting the collection.
// - AAD is field-scoped (`Model:path`): ciphertext transplanted across
//   fields/collections fails authentication. Per-document binding is the
//   documented phase-2 upgrade (needs post-save re-encrypt, since `_id` is
//   unknown pre-create).
// - Masked echo guard: display layers show `****1234`. If a client echoes a
//   masked value back into an update, it must NOT be stored as the new
//   secret — looksMasked() keeps the stored value instead.

export const phiAad = (model, field) => `${model}:${field}`;

// Salt per indexed field so one HMAC table cannot be reused across fields.
export const GOVT_ID_INDEX_SALT = 'govt_id_index_v1';

export const normalizeGovtId = (v) => String(v || '').trim().toUpperCase();

export function encryptPhi(model, field, value) {
  if (value === undefined || value === null || value === '') return value;
  const v = String(value);
  if (isEncrypted(v)) return v; // idempotent — never double-encrypt
  return encryptField(v, phiAad(model, field));
}

export function decryptPhi(model, field, value) {
  if (typeof value !== 'string' || value === '') return value;
  if (!isEncrypted(value)) return value; // legacy plaintext passthrough
  try {
    return decryptField(value, phiAad(model, field));
  } catch {
    // Key rotation gap or corruption: never crash a read; surface shows
    // nothing rather than throwing (caller masks whatever comes back).
    return '';
  }
}

export const phiBlindIndex = (value) => blindIndex(normalizeGovtId(value), GOVT_ID_INDEX_SALT);

export const looksMasked = (v) =>
  typeof v === 'string' && (v.includes('*') || v.includes('•'));

// bankDetails subdoc: accountNumber/ifsc/upiId encrypted, holder plaintext.
// `model` binds the AAD (AssistantProfile vs RiderProfile ciphertext differs).
export function encryptBankDetails(model, bank = {}) {
  return {
    accountHolder: bank.accountHolder || '',
    accountNumber: encryptPhi(model, 'bankDetails.accountNumber', bank.accountNumber || ''),
    ifsc: encryptPhi(model, 'bankDetails.ifsc', bank.ifsc || ''),
    upiId: encryptPhi(model, 'bankDetails.upiId', bank.upiId || ''),
    verified: Boolean(bank.verified),
  };
}

// Profile-update merge: encrypt only genuinely-new plaintext; a masked echo
// (`****1234`) or absent key keeps the stored value.
export function mergeBankDetails(model, stored = {}, incoming = {}) {
  const base = stored && typeof stored.toObject === 'function' ? stored.toObject() : { ...(stored || {}) };
  const out = { ...base };
  if (incoming.accountHolder !== undefined) out.accountHolder = incoming.accountHolder || '';
  for (const f of ['accountNumber', 'ifsc', 'upiId']) {
    const v = incoming[f];
    if (v === undefined || v === '' || looksMasked(v)) continue; // keep stored
    out[f] = encryptPhi(model, `bankDetails.${f}`, v);
  }
  if (incoming.verified !== undefined) out.verified = Boolean(incoming.verified);
  return out;
}

// Display helper: decrypt-then-mask in the caller's existing mask format.
export const revealPhi = (model, field, value) => decryptPhi(model, field, value);
