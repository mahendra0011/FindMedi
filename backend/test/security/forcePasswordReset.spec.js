import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';

/**
 * AUTH-F-06: mustResetPassword (temp-password) enforcement.
 *
 * The old check lived in the LOGIN route, before token issuance, so it (a)
 * never ran for google/2FA-issued tokens or sessions flagged after login and
 * (b) blocked PUT /auth/change-password itself - the one route that clears the
 * flag - making the account permanently stuck. Enforcement now lives in
 * `protect` as a session gate with a four-path exact allowlist.
 *
 * `protect` is unit-tested against the REAL middleware (only `User` and the
 * tenant quota guard are stubbed); a mounted-app harness would replace
 * `protect` with a header-driven stub and test nothing of this logic.
 */

const findById = jest.fn();
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: { findById } }));
jest.unstable_mockModule('../../src/services/tenantQuotaService.js', () => ({
  tenantQuotaGuard: (_req, _res, next) => next(),
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'f6-force-reset-test-secret';
delete process.env.JWT_KEYS;

const { protect, optionalProtect } = await import('../../src/middleware/auth.js');
const { signToken, resetKeysetCache } = await import('../../src/utils/jwtKeys.js');

const EXEMPT_PATHS = [
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/logout-all',
  '/api/auth/me',
];

const makeUser = (over = {}) => ({
  _id: 'u1',
  role: 'patient',
  status: 'active',
  isVerified: true,
  tokenVersion: 0,
  mustResetPassword: true,
  name: 'Temp Account',
  email: 'temp@example.com',
  ...over,
});

const stubFindById = (user) =>
  findById.mockImplementation(() => ({ select: () => Promise.resolve(user) }));

const tokenFor = (claims = {}) =>
  signToken({ id: 'u1', typ: 'access', tv: 0, ...claims }, { expiresIn: '5m' });

const reqFor = (token, originalUrl = '/api/appointments') => ({
  cookies: {},
  headers: token ? { authorization: `Bearer ${token}` } : {},
  originalUrl,
});

const resMock = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

beforeEach(() => {
  resetKeysetCache();
  findById.mockReset();
  stubFindById(makeUser());
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('protect: a mustResetPassword session is locked to the allowlist', () => {
  it('403s PASSWORD_RESET_REQUIRED on an ordinary endpoint', async () => {
    const req = reqFor(tokenFor());
    const res = resMock();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      code: 'PASSWORD_RESET_REQUIRED',
      mustResetPassword: true,
    });
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it.each(EXEMPT_PATHS)('allows %s so the flag can actually be cleared', async (path) => {
    const req = reqFor(tokenFor(), path);
    const res = resMock();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(req.user?._id).toBe('u1');
  });

  it('allows an exempt path with a query string', async () => {
    const req = reqFor(tokenFor(), '/api/auth/logout?force=1');
    const res = resMock();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('allows an exempt path with a trailing slash', async () => {
    const req = reqFor(tokenFor(), '/api/auth/change-password/');
    const res = resMock();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('rejects prefix-lookalike paths - the allowlist is exact, not a prefix match', async () => {
    for (const evil of ['/api/auth/change-password-evil', '/api/auth/change-passwordX', '/api/auth/me/../../appointments']) {
      const req = reqFor(tokenFor(), evil);
      const res = resMock();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe('PASSWORD_RESET_REQUIRED');
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('does not gate a session that has already rotated its password', async () => {
    stubFindById(makeUser({ mustResetPassword: false }));
    const req = reqFor(tokenFor(), '/api/appointments');
    const res = resMock();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(req.user.mustResetPassword).toBe(false);
  });

  it('puts the flag on req.user so downstream handlers can react', async () => {
    const req = reqFor(tokenFor(), '/api/auth/me');
    const res = resMock();

    await protect(req, res, jest.fn());

    expect(req.user.mustResetPassword).toBe(true);
  });

  it('the gate runs AFTER the blocked-account check (blocked still wins)', async () => {
    stubFindById(makeUser({ status: 'blocked' }));
    const req = reqFor(tokenFor(), '/api/auth/me');
    const res = resMock();

    await protect(req, res, jest.fn());

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/blocked/i);
    expect(res.body?.code).not.toBe('PASSWORD_RESET_REQUIRED');
  });

  it('the gate runs BEFORE the unverified check (reset is reachable first)', async () => {
    stubFindById(makeUser({ isVerified: false }));
    const req = reqFor(tokenFor(), '/api/appointments');
    const res = resMock();

    await protect(req, res, jest.fn());

    expect(res.statusCode).toBe(403);
    expect(res.body?.code).toBe('PASSWORD_RESET_REQUIRED');
    expect(res.body?.requiresVerification).toBeUndefined();
  });
});

describe('optionalProtect: anonymous-but-flagged sessions degrade quietly', () => {
  it('detaches a mustResetPassword user instead of 403-ing public routes', async () => {
    const req = reqFor(tokenFor(), '/api/doctors');
    const res = resMock();
    const next = jest.fn();

    await optionalProtect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(req.user).toBeNull();
  });

  it('still attaches a clean session', async () => {
    stubFindById(makeUser({ mustResetPassword: false }));
    const req = reqFor(tokenFor(), '/api/doctors');
    const res = resMock();
    const next = jest.fn();

    await optionalProtect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?._id).toBe('u1');
  });

  it('leaves anonymous requests anonymous', async () => {
    const req = { cookies: {}, headers: {}, originalUrl: '/api/doctors' };
    const res = resMock();
    const next = jest.fn();

    await optionalProtect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
  });
});

describe('wiring: the login-time dead-end is gone, the flag is on every response', () => {
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const authSrc = () =>
    stripComments(fs.readFileSync(new URL('../../src/routes/auth.js', import.meta.url), 'utf8'));

  it('login no longer pre-blocks temp-password accounts before token issuance', () => {
    // If this fires, PUT /auth/change-password is unreachable again and every
    // temp-password account is a permanent dead end.
    expect(authSrc()).not.toMatch(/mustResetPassword[\s\S]{0,160}return res\.status\(403\)/);
  });

  it('userResponse carries mustResetPassword on every auth response', () => {
    expect(authSrc()).toMatch(/mustResetPassword:\s*Boolean\(user\.mustResetPassword\)/);
  });

  it('the middleware exports exactly the four-path allowlist', () => {
    const mw = fs.readFileSync(new URL('../../src/middleware/auth.js', import.meta.url), 'utf8');
    const list = mw.slice(mw.indexOf('PASSWORD_RESET_EXEMPT_PATHS = ['), mw.indexOf('];'));
    for (const p of EXEMPT_PATHS) expect(list).toContain(`'${p}'`);
    expect(list.match(/'\/api\//g)).toHaveLength(EXEMPT_PATHS.length);
  });
});
