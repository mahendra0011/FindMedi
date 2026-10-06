import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';

// P1-6 / P2-10 / P2-11 gates: bounded schemas, session policy, zxcvbn,
// peppered hashes, file-type sniffing. All DB-free.

describe('P1-6 bounded schema helpers', () => {
  let v;
  beforeEach(async () => {
    v = await import('../../src/utils/validate.js');
  });

  it('passwordSchema requires min 12 chars', () => {
    expect(() => v.passwordSchema.parse('Short1!x')).toThrow(/12 characters/);
    expect(() => v.passwordSchema.parse('LongEnough1!x')).not.toThrow();
  });

  it('vitalsShape accepts flat readings, rejects nested objects', () => {
    expect(() => v.vitalsShape.parse({ bp: '120/80', hr: 72 })).not.toThrow();
    expect(() => v.vitalsShape.parse({ bp: { sys: 120 } })).toThrow();
  });

  it('boundedShallow rejects unbounded strings and deep nesting', () => {
    expect(() => v.boundedShallow.parse('x'.repeat(9000))).toThrow();
    expect(() => v.boundedShallow.parse({ a: { b: { c: 1 } } })).toThrow();
    expect(() => v.boundedShallow.parse({ note: 'ok', n: 3 })).not.toThrow();
  });

  it('checklistMapShape accepts {item: done} maps only', () => {
    expect(() => v.checklistMapShape.parse({ gloves: true, note: 'x' })).not.toThrow();
    expect(() => v.checklistMapShape.parse([{ label: 'x' }])).toThrow();
  });
});

describe('P2-11 zxcvbn strength gate', () => {
  let ps;
  beforeEach(async () => {
    ps = await import('../../src/utils/passwordStrength.js');
  });

  it('accepts strong passphrases, rejects guessable ones', () => {
    expect(ps.checkPasswordStrength('BrandNewPass789!@#').ok).toBe(true);
    const weak = ps.checkPasswordStrength('Password123!');
    expect(weak.ok).toBe(false);
    expect(weak.score).toBeLessThan(ps.MIN_ZXCVBN_SCORE);
  });
});

describe('P2-11 pepper (passwordMatchesHash)', () => {
  const OLD_ENV = process.env.PASSWORD_PEPPER;
  afterEach(() => {
    if (OLD_ENV === undefined) delete process.env.PASSWORD_PEPPER;
    else process.env.PASSWORD_PEPPER = OLD_ENV;
  });

  it('matches unpeppered hashes when pepper is unset', async () => {
    delete process.env.PASSWORD_PEPPER;
    const { passwordMatchesHash } = await import('../../src/models/User.js');
    const hash = await bcrypt.hash('SomePass123!xy', 10);
    const r = await passwordMatchesHash('SomePass123!xy', hash);
    expect(r).toEqual({ ok: true, legacy: false });
    expect((await passwordMatchesHash('WrongPass999!xy', hash)).ok).toBe(false);
  });

  it('matches legacy hashes (legacy:true) and new peppered hashes after enabling pepper', async () => {
    const crypto = await import('node:crypto');
    const { passwordMatchesHash } = await import('../../src/models/User.js');
    const legacyHash = await bcrypt.hash('LegacyPass123!xy', 10);
    process.env.PASSWORD_PEPPER = 'test-pepper-that-is-long-enough-123';
    // What the pre-save hook stores once pepper is configured: bcrypt(HMAC(pw)).
    const pepperedHex = crypto.createHmac('sha256', process.env.PASSWORD_PEPPER).update('LegacyPass123!xy', 'utf8').digest('hex');
    const pepperedHash = await bcrypt.hash(pepperedHex, 10);
    // legacy row still verifies (flagged for upgrade), peppered row verifies clean
    expect(await passwordMatchesHash('LegacyPass123!xy', legacyHash)).toEqual({ ok: true, legacy: true });
    expect(await passwordMatchesHash('LegacyPass123!xy', pepperedHash)).toEqual({ ok: true, legacy: false });
    expect((await passwordMatchesHash('NopePass999!xy', legacyHash)).ok).toBe(false);
    expect((await passwordMatchesHash('NopePass999!xy', pepperedHash)).ok).toBe(false);
  });
});

describe('P2-10 session policy pure helpers', () => {
  const OLD = {
    max: process.env.SESSION_MAX_CONCURRENT,
    admin: process.env.SESSION_ADMIN_MAX_CONCURRENT,
    idle: process.env.SESSION_IDLE_TIMEOUT_MS,
    abs: process.env.SESSION_ABSOLUTE_TIMEOUT_MS,
  };
  afterEach(() => {
    for (const [k, env] of [['max', 'SESSION_MAX_CONCURRENT'], ['admin', 'SESSION_ADMIN_MAX_CONCURRENT'], ['idle', 'SESSION_IDLE_TIMEOUT_MS'], ['abs', 'SESSION_ABSOLUTE_TIMEOUT_MS']]) {
      if (OLD[k] === undefined) delete process.env[env];
      else process.env[env] = OLD[k];
    }
  });

  it('caps: privileged roles 3, others 10 by default', async () => {
    const sp = await import('../../src/utils/sessionPolicy.js');
    expect(sp.sessionCapsFor('doctor')).toEqual({ maxConcurrent: 3 });
    expect(sp.sessionCapsFor('superadmin')).toEqual({ maxConcurrent: 3 });
    expect(sp.sessionCapsFor('patient')).toEqual({ maxConcurrent: 10 });
  });

  it('idle/absolute disabled by default, enforced when set', async () => {
    const sp = await import('../../src/utils/sessionPolicy.js');
    const hourAgo = new Date(Date.now() - 3600e3);
    expect(sp.idleExceeded(hourAgo)).toBe(false);
    expect(sp.absoluteExceeded(hourAgo)).toBe(false);
    process.env.SESSION_IDLE_TIMEOUT_MS = '1800000';
    process.env.SESSION_ABSOLUTE_TIMEOUT_MS = '600000';
    expect(sp.idleExceeded(hourAgo)).toBe(true);
    expect(sp.idleExceeded(new Date())).toBe(false);
    expect(sp.absoluteExceeded(hourAgo)).toBe(true);
    expect(sp.absoluteExceeded(new Date())).toBe(false);
  });
});

describe('P1-5 file-type content sniff', () => {
  it('accepts matching content, rejects spoofed MIME', async () => {
    const { validateFileContent } = await import('../../src/middleware/upload.js');
    // Real 1x1 PNG (file-type needs a complete signature, not a stub header).
    const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082', 'hex');
    expect(await validateFileContent(PNG, 'image/png')).toBe(true);
    expect(await validateFileContent(PNG, 'application/pdf')).toBe(false);
    expect(await validateFileContent(Buffer.from('not-an-image-at-all-................'), 'image/png')).toBe(false);
  });
});
