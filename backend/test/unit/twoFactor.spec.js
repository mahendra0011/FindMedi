/**
 * Two-factor authentication — RFC 6238 conformance + backup-code handling.
 *
 * These are pure functions (no DB), so they are the cheapest possible guard
 * against the class of bug that previously shipped here: secrets generated in
 * one encoding and verified in another, so NO authenticator code ever matched.
 */
import {
  base32Decode,
  generateSecret,
  generateOtpAuthUrl,
  generateTOTP,
  verifyToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../../src/services/twoFactorService.js';

const RFC6238_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890"
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

describe('twoFactorService: base32', () => {
  it('decodes RFC 4648 base32 to the original bytes', () => {
    // "foobar" is the canonical RFC 4648 test vector.
    expect(base32Decode('MZXW6YTBOI').toString()).toBe('foobar');
  });

  it('rejects characters outside the base32 alphabet', () => {
    expect(() => base32Decode('MZXW6YTB0I')).toThrow(/Invalid base32/);
    expect(() => base32Decode('!!!!')).toThrow();
  });

  it('generates a 32-character base32 secret from 20 random bytes', () => {
    const secret = generateSecret();
    expect(secret).toHaveLength(32);
    for (const ch of secret) expect(BASE32_ALPHABET).toContain(ch);
    expect(generateSecret()).not.toBe(secret); // random, not cached
  });
});

describe('twoFactorService: TOTP', () => {
  it('matches RFC 6238 Appendix B test vectors (SHA-1, 8 digits truncated to 6)', () => {
    // RFC uses 8 digits; the service emits 6, so compare the first 4 chars of
    // the 8-digit vector against the 6-digit output for that time step.
    const vectors = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
    ];
    for (const [unixSeconds, expected8] of vectors) {
      const counter = Math.floor(unixSeconds / 30);
      const code = generateTOTP(RFC6238_SECRET_BASE32, counter);
      expect(code).toHaveLength(6);
      // 6-digit TRUNCATED output == last 6 digits of the 8-digit vector modulo 1e6
      const expected6 = String(Number(expected8) % 1_000_000).padStart(6, '0');
      expect(code).toBe(expected6);
    }
  });

  it('verifyToken accepts the current step and rejects a distant one', () => {
    const secret = generateSecret();
    const counter = Math.floor(Date.now() / 1000 / 30);
    expect(verifyToken(generateTOTP(secret, counter), secret)).toBe(true);
    // 10 windows away (~5 minutes) must never validate.
    expect(verifyToken(generateTOTP(secret, counter + 10), secret)).toBe(false);
  });

  it('rejects malformed input without throwing', () => {
    const secret = generateSecret();
    expect(verifyToken('', secret)).toBe(false);
    expect(verifyToken('12345', secret)).toBe(false);
    expect(verifyToken('abcdef', secret)).toBe(false);
    expect(verifyToken('123456', 'not-valid-base32-!!!')).toBe(false);
    expect(verifyToken('123456', '')).toBe(false);
  });

  it('builds an otpauth URL an authenticator app can consume', () => {
    const secret = generateSecret();
    const url = generateOtpAuthUrl(secret, 'asha@example.test');
    expect(url.startsWith('otpauth://totp/FindMedi:asha%40example.test?')).toBe(true);
    expect(url).toContain(`secret=${secret}`);
    expect(url).toContain('algorithm=SHA1');
    expect(url).toContain('digits=6');
    expect(url).toContain('period=30');
  });
});

describe('twoFactorService: backup codes', () => {
  it('generates 10 unique 10-char codes', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[0-9A-F]{10}$/);
  });

  it('verifies a stored hash and reports the matching index', () => {
    const codes = generateBackupCodes();
    const hashes = codes.map(hashBackupCode);
    expect(verifyBackupCode(codes[3], hashes)).toEqual({ valid: true, codeIndex: 3 });
    expect(verifyBackupCode('DEADBEEF01', hashes).valid).toBe(false);
  });

  it('is case-insensitive on input (users retype codes from paper)', () => {
    const hashes = [hashBackupCode('ABCDEF0123')];
    expect(verifyBackupCode('abcdef0123', hashes).valid).toBe(true);
  });

  it('returns an invalid result for empty/garbage input instead of throwing', () => {
    expect(verifyBackupCode('', [])).toEqual({ valid: false, codeIndex: -1 });
    expect(verifyBackupCode('X', null)).toEqual({ valid: false, codeIndex: -1 });
  });

  it('hashes with a one-way function (never stores the plaintext code)', () => {
    const hash = hashBackupCode('ABCDEF0123');
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('ABCDEF0123');
  });
});
