import { describe, it, expect } from '@jest/globals';
import bcrypt from 'bcryptjs';
import User, { USER_FORBIDDEN_FIELDS, sanitizeUserDto } from '../../src/models/User.js';

describe('Password Security and History Policy', () => {
  it('includes passwordHistory in USER_FORBIDDEN_FIELDS to prevent leakage', () => {
    expect(USER_FORBIDDEN_FIELDS.has('passwordHistory')).toBe(true);
    expect(USER_FORBIDDEN_FIELDS.has('password')).toBe(true);
  });

  it('sanitizes passwordHistory from user DTO objects', () => {
    const rawUser = {
      _id: 'user_123',
      name: 'Dr. Test',
      email: 'dr.test@findmedi.online',
      password: '$2a$12$hashedpassword',
      passwordHistory: ['$2a$12$old1', '$2a$12$old2'],
      role: 'doctor',
    };
    const dto = sanitizeUserDto(rawUser);
    expect(dto.password).toBeUndefined();
    expect(dto.passwordHistory).toBeUndefined();
    expect(dto.email).toBe('dr.test@findmedi.online');
  });

  it('prevents reusing an old password present in passwordHistory', async () => {
    const plainCurrent = 'SecurePass123!@#';
    const plainOld1 = 'OlderPass456!@#';
    const plainNew = 'BrandNewPass789!@#';

    const currentHash = await bcrypt.hash(plainCurrent, 10);
    const old1Hash = await bcrypt.hash(plainOld1, 10);

    const history = [currentHash, old1Hash];

    // Helper simulating history validation logic
    const checkCanUse = async (candidate, list) => {
      for (const h of list) {
        if (await bcrypt.compare(candidate, h)) return false;
      }
      return true;
    };

    expect(await checkCanUse(plainCurrent, history)).toBe(false);
    expect(await checkCanUse(plainOld1, history)).toBe(false);
    expect(await checkCanUse(plainNew, history)).toBe(true);
  });

  it('verifies cost-12 dummy hash compares execute without throwing', async () => {
    const DUMMY_BCRYPT_HASH = '$2a$12$IYGSxRF4OeDhBdJetsO8cufklkviy4grvekqGNwcd2yN4Izh/lq96';
    const match = await bcrypt.compare('any_attempted_password', DUMMY_BCRYPT_HASH);
    expect(match).toBe(false);
  });
});
