import crypto from 'node:crypto';

/**
 * Field-level encryption (FLE) for high-sensitivity PHI & PII.
 *
 * Provides application-layer AES-256-GCM authenticated encryption so that
 * database backups, replica sync leaks, Atlas admin compromise, or SQL/NoSQL
 * injection cannot expose raw clinical notes, diagnoses, KYC documents, or
 * financial account details.
 *
 * Envelope format:
 *   v1:<kid>:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 *
 * AAD (Additional Authenticated Data):
 *   Callers should supply a contextual string (e.g. `MentalHealth:${docId}` or
 *   `Prescription:${docId}`). AES-GCM validates the AAD against the auth tag;
 *   any ciphertext transplanted across records fails authentication.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

// Ephemeral fallback for test/dev only. Generated randomly per process boot
// (deliberately NOT a hardcoded constant — a static dev key in source is a
// gitleaks finding and, worse, a cross-install decryption oracle if it ever
// leaked into prod data). Never used in production: getEncryptionKeyset()
// throws there unless a real key is configured. Dev ciphertext does not
// survive restarts, which is correct for non-production data.
let _devFallbackKey = null;
const devFallbackKey = () => (_devFallbackKey ||= crypto.randomBytes(32));

function normalizeKey(rawKey) {
  if (Buffer.isBuffer(rawKey)) {
    if (rawKey.length === 32) return rawKey;
    throw new Error(`Field encryption key buffer must be 32 bytes (got ${rawKey.length})`);
  }
  const str = String(rawKey || '').trim();
  if (/^[0-9a-fA-F]{64}$/.test(str)) {
    return Buffer.from(str, 'hex');
  }
  const b64 = Buffer.from(str, 'base64');
  if (b64.length === 32) {
    return b64;
  }
  throw new Error('Field encryption key must be 32 bytes (64 hex characters or 44 base64 characters)');
}

/**
 * Resolves the active keyset.
 * Supports:
 * - FIELD_ENCRYPTION_KEY: primary single key
 * - FIELD_ENCRYPTION_KEYS: JSON object mapping kid -> hex/base64 key string for key rotation
 */
export function getEncryptionKeyset() {
  const keys = new Map();
  let defaultKid = '1';

  if (process.env.FIELD_ENCRYPTION_KEYS) {
    try {
      const parsed = JSON.parse(process.env.FIELD_ENCRYPTION_KEYS);
      for (const [kid, kstr] of Object.entries(parsed)) {
        keys.set(String(kid), normalizeKey(kstr));
      }
      const firstKid = Object.keys(parsed)[0];
      if (firstKid) defaultKid = firstKid;
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to parse FIELD_ENCRYPTION_KEYS: ${e.message}`, { cause: e });
      }
    }
  }

  if (process.env.FIELD_ENCRYPTION_KEY) {
    keys.set('1', normalizeKey(process.env.FIELD_ENCRYPTION_KEY));
    defaultKid = '1';
  }

  if (keys.size === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FIELD_ENCRYPTION_KEY or FIELD_ENCRYPTION_KEYS must be set in production');
    }
    keys.set('1', devFallbackKey());
  }

  return { keys, defaultKid };
}

/**
 * Test whether a value is already formatted as an encrypted field.
 */
export function isEncrypted(value) {
  if (typeof value !== 'string') return false;
  return /^v1:[a-zA-Z0-9_-]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param {string|object} plaintext - Data to encrypt (objects are JSON-serialized)
 * @param {string} [aad] - Additional authenticated data to bind ciphertext to (e.g. `collection:id`)
 * @param {string} [kid] - Key ID to use; defaults to current active key
 * @returns {string} Versioned ciphertext string: `v1:<kid>:<iv>:<tag>:<ciphertext>`
 */
export function encryptField(plaintext, aad = '', kid = null) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const text = typeof plaintext === 'object' ? JSON.stringify(plaintext) : String(plaintext);

  const { keys, defaultKid } = getEncryptionKeyset();
  const activeKid = kid || defaultKid;
  const key = keys.get(activeKid);

  if (!key) {
    throw new Error(`Encryption key with kid "${activeKid}" not found`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  if (aad) {
    cipher.setAAD(Buffer.from(String(aad), 'utf8'));
  }

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  const ivB64 = iv.toString('base64');

  return `v1:${activeKid}:${ivB64}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a versioned ciphertext string.
 *
 * @param {string} ciphertext - Encrypted string in `v1:<kid>:<iv>:<tag>:<ciphertext>` format
 * @param {string} [aad] - Additional authenticated data that was bound during encryption
 * @param {boolean} [parseJson=false] - Whether to parse the decrypted string as JSON
 * @returns {string|any} Decrypted plaintext
 */
export function decryptField(ciphertext, aad = '', parseJson = false) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;

  if (!isEncrypted(ciphertext)) {
    // If not encrypted (e.g. legacy data before migration), return as-is
    return ciphertext;
  }

  const parts = ciphertext.split(':');
  const [, kid, ivB64, authTagB64, dataB64] = parts;

  const { keys } = getEncryptionKeyset();
  const key = keys.get(kid);

  if (!key) {
    throw new Error(`Decryption failed: key ID "${kid}" not found in keyset`);
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  if (aad) {
    decipher.setAAD(Buffer.from(String(aad), 'utf8'));
  }

  let decrypted = decipher.update(dataB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  if (parseJson) {
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  return decrypted;
}

/**
 * Generate a deterministic HMAC-SHA256 blind index for exact search matching.
 * This allows querying fields (e.g., searching by insurance policy ID or KYC document number)
 * without decrypting the entire database or leaking the plaintext value.
 *
 * @param {string} value - Plaintext value to index
 * @param {string} [salt] - Optional field/context salt (e.g. 'kyc_doc_index')
 * @returns {string} Hex encoded blind index hash
 */
export function blindIndex(value, salt = 'findmedi_blind_idx') {
  if (!value) return '';
  const { keys, defaultKid } = getEncryptionKeyset();
  const key = keys.get(defaultKid);

  // Derive an HMAC key dedicated for indexing from the primary key + salt
  const hmacKey = crypto.createHmac('sha256', key).update(salt).digest();
  return crypto.createHmac('sha256', hmacKey).update(String(value).trim().toLowerCase()).digest('hex');
}
