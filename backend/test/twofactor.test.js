import { jest } from '@jest/globals';
import {
  generateSecret,
  generateTOTP,
  verifyToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../src/services/twoFactorService.js';

// RFC 6238 Appendix B test vector: ASCII secret "12345678901234567890"
// (20 bytes) encodes to this base32 value; at T=59s (counter=1) the
// HMAC-SHA1 6-digit code is 287082. This is the canonical proof that the
// server derives the SAME key an authenticator app does — the bug this file
// guards against was decoding the base32 secret as base64, which made every
// authenticator-app code fail silently.
const RFC6238_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('twoFactorService (RFC 6238 / RFC 4226)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('generateSecret returns a 32-char base32 secret (160-bit key)', () => {
    const secrets = new Set();
    for (let i = 0; i < 20; i++) {
      const secret = generateSecret();
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
      secrets.add(secret);
    }
    expect(secrets.size).toBe(20); // no collisions across calls
  });

  it('generateTOTP matches the RFC 6238 reference vector (T=59s → 287082)', () => {
    expect(generateTOTP(RFC6238_SECRET_BASE32, 1)).toBe('287082');
  });

  it('verifyToken accepts the current window and both ±1 drift windows', () => {
    jest.useFakeTimers().setSystemTime(new Date(59_000));
    expect(verifyToken('287082', RFC6238_SECRET_BASE32)).toBe(true); // counter 1 = now

    // Clock moved one window forward (T=60s → counter 2): codes for the
    // previous window (1) and next window (3) must both be accepted…
    jest.setSystemTime(new Date(60_000));
    const previousWindowCode = generateTOTP(RFC6238_SECRET_BASE32, 1);
    const nextWindowCode = generateTOTP(RFC6238_SECRET_BASE32, 3);
    expect(verifyToken(previousWindowCode, RFC6238_SECRET_BASE32)).toBe(true);
    expect(verifyToken(nextWindowCode, RFC6238_SECRET_BASE32)).toBe(true);

    // …but two windows away (counter 0) must be rejected — drift is ±1 only.
    expect(verifyToken(generateTOTP(RFC6238_SECRET_BASE32, 0), RFC6238_SECRET_BASE32)).toBe(false);
  });

  it('rejects malformed tokens and malformed secrets without throwing', () => {
    jest.useFakeTimers().setSystemTime(new Date(59_000));
    expect(verifyToken('12345', RFC6238_SECRET_BASE32)).toBe(false);   // wrong length
    expect(verifyToken('abcdef', RFC6238_SECRET_BASE32)).toBe(false);  // not numeric
    expect(verifyToken('287082', 'NOT-A-BASE32-SECRET!')).toBe(false); // invalid alphabet
    expect(verifyToken('287082', '')).toBe(false);
  });

  it('backup codes hash/verify round-trip and only match their own index', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);

    const hashed = codes.map(hashBackupCode);
    const result = verifyBackupCode(codes[3], hashed);
    expect(result).toEqual({ valid: true, codeIndex: 3 });

    expect(verifyBackupCode('ZZZZZZZZZZ', hashed)).toEqual({ valid: false, codeIndex: -1 });
    expect(verifyBackupCode('', hashed).valid).toBe(false);
  });
});
