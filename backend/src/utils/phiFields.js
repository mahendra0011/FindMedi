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

// --- Join draft (P2-9: ProviderApplication.draft.stepData) ------------------
//
// The wizard draft carries tax IDs (pan/gstin/registration_number) and payout
// bank details (account_number/ifsc) from the applicant's own browser into
// the DB. Duplicate detection needs the tax fields, so plaintext equality
// alone is not enough: values are encrypted at rest and the HMAC blind
// indexes in `application.phiIndexes` are what the duplicate queries match.
// Legacy plaintext rows keep matching through the plaintext branch of the
// same query (applicationAutoChecks builds $or), so deploy needs no flag day.
// Keys live in a server-owned schema path — the draft PATCH payload cannot
// poison an index it does not write to.

export const JOIN_PHI_FIELDS = ['pan', 'gstin', 'registration_number', 'account_number', 'ifsc'];
export const JOIN_INDEXED_FIELDS = ['pan', 'gstin', 'registration_number'];

const joinPhiFieldPath = (field) => `draft.stepData.${field}`;

// Normalizes exactly like applicationAutoChecks.normalizeTaxId (strip + upper)
// so a plaintext row and its indexed twin hash identically.
export const joinPhiIndex = (field, value) => {
  const normalized = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return null;
  return blindIndex(normalized, `join_${field}_v1`);
};

// Encrypt every PHI field inside a merged stepData — wherever a step keeps
// them — and rebuild the blind indexes from the plaintext. `stored` is the
// previously-saved stepData (masked echo / already-encrypted values keep the
// stored ciphertext) and `existingIndexes` preserves the index of a field the
// masked echo preserved. Never throws: a field that fails to encrypt is left
// as the caller's plaintext rather than dropping the applicant's input.
export function encryptJoinDraftStep(stepData = {}, stored = {}, existingIndexes = {}) {
  const storedCipher = {};
  for (const data of Object.values(stored || {})) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const field of JOIN_PHI_FIELDS) {
        if (typeof data[field] === 'string' && data[field]) storedCipher[field] = data[field];
      }
    }
  }

  const out = {};
  const phiIndexes = { ...existingIndexes };
  const seen = new Set();

  for (const [stepKey, data] of Object.entries(stepData || {})) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      out[stepKey] = data;
      continue;
    }
    const copy = { ...data };
    for (const field of JOIN_PHI_FIELDS) {
      const v = copy[field];
      if (v === undefined) continue;
      seen.add(field);
      if (v === null || v === '') {
        copy[field] = v;
        if (JOIN_INDEXED_FIELDS.includes(field)) phiIndexes[field] = null;
        continue;
      }
      const str = String(v);
      if (looksMasked(str)) {
        // Masked echo: keep the stored secret (and its index), never the stars.
        if (storedCipher[field]) {
          copy[field] = storedCipher[field];
        } else {
          delete copy[field];
          if (JOIN_INDEXED_FIELDS.includes(field)) phiIndexes[field] = null;
        }
        continue;
      }
      try {
        const plain = isEncrypted(str)
          ? decryptPhi('ProviderApplication', joinPhiFieldPath(field), str)
          : str;
        copy[field] = isEncrypted(str)
          ? str
          : encryptPhi('ProviderApplication', joinPhiFieldPath(field), str);
        if (JOIN_INDEXED_FIELDS.includes(field)) phiIndexes[field] = joinPhiIndex(field, plain);
      } catch {
        /* keep plaintext rather than losing input — see header */
      }
    }
    out[stepKey] = copy;
  }

  // A field the shallow step-merge dropped carries no value any more — its
  // index must not outlive it.
  for (const field of JOIN_INDEXED_FIELDS) {
    if (!seen.has(field)) phiIndexes[field] = null;
  }
  return { stepData: out, phiIndexes };
}

// Owner-side read: the wizard re-fills its form from GET /join/applications/:id,
// so the applicant sees their own secrets as plaintext. Legacy plaintext and
// non-PHI values pass through untouched.
export function decryptJoinDraftStep(stepData = {}) {
  const out = {};
  for (const [stepKey, data] of Object.entries(stepData || {})) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      out[stepKey] = data;
      continue;
    }
    const copy = { ...data };
    for (const field of JOIN_PHI_FIELDS) {
      if (typeof copy[field] === 'string') {
        copy[field] = decryptPhi('ProviderApplication', joinPhiFieldPath(field), copy[field]);
      }
    }
    out[stepKey] = copy;
  }
  return out;
}
