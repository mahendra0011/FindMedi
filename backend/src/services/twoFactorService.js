import crypto from 'crypto';
import { constantTimeCompare, OTP_HASH_ALGO, ACTIVE_OTP_HASH_ALGO } from './napiOtpService.js';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;

// RFC 4648 base32 alphabet — the encoding authenticator apps actually speak.
// (This file previously generated base32-SHAPED secrets but decoded them as
// base64 when computing the HMAC, so every authenticator-app code failed.
// See verifyToken/generateTOTP below for the fix.)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 encode (no padding — otpauth secrets omit it). */
function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

/** RFC 4648 base32 decode. Throws on characters outside the alphabet. */
export function base32Decode(secret) {
  const clean = String(secret || '').toUpperCase().replace(/[\s=]+/g, '');
  if (!clean) throw new Error('Empty TOTP secret');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generate a TOTP-compatible secret for authenticator apps.
 * 20 random bytes (160-bit key, RFC 4226 recommendation) base32-encoded —
 * ready to drop straight into an otpauth:// URL.
 */
export function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/**
 * Generate the otpauth:// URL for QR code
 * @param {string} secret - Base32 secret
 * @param {string} email - User email (for label)
 * @param {string} issuer - App name
 */
export function generateOtpAuthUrl(secret, email, issuer = 'FindMedi') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Verify a TOTP token against the secret
 * Uses time-based window of +/- 30 seconds to account for clock drift
 * @param {string} token - 6-digit code from authenticator app
 * @param {string} secret - Base32 secret
 * @returns {boolean}
 */
export function verifyToken(token, secret) {
  if (!token || !secret) return false;
  if (!/^\d{6}$/.test(token)) return false;

  const timeStep = 30; // seconds
  const currentTime = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(currentTime / timeStep);

  try {
    // Check current, previous, and next counter (3 windows) with a
    // constant-time comparison so a timing side-channel can't narrow guesses.
    for (let offset = -1; offset <= 1; offset++) {
      const counter = currentCounter + offset;
      const expected = generateTOTP(secret, counter);
      if (constantTimeCompare(expected, token)) return true;
    }
  } catch {
    // Malformed stored secret (not valid base32) → treat as not verified
    // instead of throwing a 500 out of the login path.
    return false;
  }
  return false;
}

/**
 * Generate TOTP code for a given counter.
 * Implements RFC 6238 / RFC 4226 (exported for tests).
 */
export function generateTOTP(secret, counter) {
  // HMAC-SHA1 as per the TOTP standard. The secret from
  // generateSecret/generateOtpAuthUrl is BASE32 — decoding it as base64 here
  // (the previous behaviour) produced a different key than every authenticator
  // app derives, so no code ever matched.
  const decodedSecret = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = counter & 0xff;
    counter >>>= 8;
  }

  const hmac = crypto.createHmac('sha1', decodedSecret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  );

  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

/**
 * Generate backup codes for recovery
 * @returns {string[]} Array of backup codes
 */
export function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(BACKUP_CODE_LENGTH)
      .toString('hex')
      .toUpperCase()
      .slice(0, BACKUP_CODE_LENGTH);
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 * @param {string} code
 * @returns {string}
 */
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a backup code against hashed codes
 * @param {string} code - User-provided backup code
 * @param {string[]} hashedCodes - Stored hashed codes
 * @returns {{ valid: boolean, codeIndex: number }}
 */
export function verifyBackupCode(code, hashedCodes) {
  if (!code || !hashedCodes?.length) return { valid: false, codeIndex: -1 };
  const hashed = hashBackupCode(code.toUpperCase());

  // Explicit contract: native constant-time compare is available exactly
  // when the active OTP hash backend is Rust ('rust-sha256').
  // Same behavior as the former implicit NATIVE_OTP_AVAILABLE check.
  if (ACTIVE_OTP_HASH_ALGO === OTP_HASH_ALGO.RUST_SHA256) {
    let found = false;
    let foundIndex = -1;
    hashedCodes.forEach((stored, i) => {
      if (constantTimeCompare(hashed, stored)) {
        found = true;
        foundIndex = i;
      }
    });
    return { valid: found, codeIndex: foundIndex };
  }

  const index = hashedCodes.indexOf(hashed);
  return { valid: index !== -1, codeIndex: index };
}