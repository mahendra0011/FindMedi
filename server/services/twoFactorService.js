import crypto from 'crypto';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;

/**
 * Generate a TOTP-compatible secret for authenticator apps
 * Returns a base32 encoded secret
 */
export function generateSecret() {
  const secret = crypto.randomBytes(20).toString('base64')
    .replace(/[^A-Za-z2-7]/g, '')
    .slice(0, 32)
    .toUpperCase();
  return secret;
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

  // Check current, previous, and next counter (3 windows)
  for (let offset = -1; offset <= 1; offset++) {
    const counter = currentCounter + offset;
    const expected = generateTOTP(secret, counter);
    if (expected === token) return true;
  }
  return false;
}

/**
 * Generate TOTP code for a given counter
 * Implements RFC 6238 / RFC 4226
 */
function generateTOTP(secret, counter) {
  // Use HMAC-SHA1 as per TOTP standard
  const decodedSecret = Buffer.from(secret, 'base64');
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
  const index = hashedCodes.indexOf(hashed);
  return { valid: index !== -1, codeIndex: index };
}