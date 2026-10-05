import { describe, it, expect } from '@jest/globals';
import { sanitizeDto, FORBIDDEN_RESPONSE_FIELDS } from '../../src/utils/safeError.js';
import { sanitizeUserDto } from '../../src/models/User.js';

// §5.3/§5.4/§24.9: har DTO se forbidden fields kabhi bahar nahi — regression gate.
describe('response DTO leak guard', () => {
  it('sanitizeDto strips every forbidden field', () => {
    const input = {};
    for (const field of FORBIDDEN_RESPONSE_FIELDS) input[field] = 'secret-value';
    input.name = 'Priya';
    input.role = 'patient';
    const out = sanitizeDto(input);
    for (const field of FORBIDDEN_RESPONSE_FIELDS) {
      expect(out[field]).toBeUndefined();
    }
    expect(out.name).toBe('Priya');
    expect(out.role).toBe('patient');
  });

  it('sanitizeDto passes through primitives', () => {
    expect(sanitizeDto(null)).toBeNull();
    expect(sanitizeDto('x')).toBe('x');
  });

  it('sanitizeUserDto strips auth secrets but keeps profile fields', () => {
    const out = sanitizeUserDto({
      name: 'Asha',
      email: 'a@example.com',
      password: 'hash',
      tokenVersion: 3,
      twoFactorSecret: 's',
      twoFactorTempSecret: 't',
      twoFactorBackupCodes: ['h'],
      driveTokens: {},
      abhaOtpHash: 'h',
      __v: 0,
    });
    expect(out.password).toBeUndefined();
    expect(out.tokenVersion).toBeUndefined();
    expect(out.twoFactorSecret).toBeUndefined();
    expect(out.name).toBe('Asha');
    expect(out.email).toBe('a@example.com');
  });

  it('covers the guide §5.4 forbidden keys', () => {
    for (const key of ['password', 'tokenVersion', 'twoFactorSecret', '__v']) {
      expect(FORBIDDEN_RESPONSE_FIELDS.has(key)).toBe(true);
    }
  });
});
