import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

/**
 * AUTH hardening gates (P1 #3):
 *  - verify pins `algorithms: ['HS256']` so the token's own header can never
 *    steer the verifier (alg:none, RS256-confusion);
 *  - `clockTolerance: 5` — small NTP skew passes, real expiry does not;
 *  - sign pins `algorithm: 'HS256'` regardless of caller options;
 *  - iss/aud must match when present (legacy tokens without them still pass);
 *  - refresh tokens cannot be replayed as access tokens (typ/family gates).
 *
 * Unknown-kid and key-rotation overlap live in jwtKeyRotation.spec.js;
 * this file owns the verification-hardening surface.
 */
describe('jwtKeys verification hardening', () => {
  const SECRET = 'hardening-secret-0123456789abcdef';

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.JWT_KEYS;
  });

  afterEach(() => {
    delete process.env.JWT_KEYS;
    process.env.JWT_SECRET = SECRET;
  });

  // Module-scope keyset cache — reset on every import (same contract as
  // jwtKeyRotation.spec.js).
  const load = async () => {
    const m = await import('../../src/utils/jwtKeys.js');
    m.resetKeysetCache();
    return m;
  };

  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  it('signs HS256 even when a caller option asks for another algorithm', async () => {
    const { signToken } = await load();
    const token = signToken({ id: 'u1' }, { algorithm: 'RS256', expiresIn: '5m' });

    expect(jwt.decode(token, { complete: true }).header.alg).toBe('HS256');
  });

  it('rejects an alg:none token (unauthenticated forgery)', async () => {
    const { verifyToken } = await load();
    const forged = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ id: 'u1' })}.`;

    expect(() => verifyToken(forged)).toThrow();
  });

  it('rejects a token whose header claims RS256', async () => {
    const { verifyToken } = await load();
    // Signature is a valid HS256 over the payload — only the HEADER lies. The
    // algorithms pin must reject it before signature semantics are considered.
    const header = b64url({ alg: 'RS256', typ: 'JWT', kid: 'default' });
    const payload = b64url({ id: 'u1' });
    const crypto = await import('node:crypto');
    const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
    const forged = `${header}.${payload}.${sig}`;

    expect(() => verifyToken(forged)).toThrow(/algorithm/i);
  });

  it('rejects a tampered payload', async () => {
    const { signToken, verifyToken } = await load();
    const token = signToken({ id: 'u1', role: 'patient' }, { expiresIn: '5m' });
    const [h, p, s] = token.split('.');
    const tampered = `${h}.${b64url({ id: 'u1', role: 'superadmin' })}.${s}`;

    expect(tampered).not.toBe(token);
    expect(p).toBeDefined();
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('rejects wrong issuer / audience claims', async () => {
    const { verifyToken } = await load();

    const wrongIss = jwt.sign({ id: 'u1', iss: 'evil' }, SECRET, { keyid: 'default' });
    const wrongAud = jwt.sign({ id: 'u1', aud: 'someone-else' }, SECRET, { keyid: 'default' });

    expect(() => verifyToken(wrongIss)).toThrow(/issuer/i);
    expect(() => verifyToken(wrongAud)).toThrow(/audience/i);
  });

  it('tolerates ≤5s of clock skew but rejects real expiry', async () => {
    const { verifyToken } = await load();
    const now = Math.floor(Date.now() / 1000);

    const justExpired = jwt.sign({ id: 'u1', exp: now - 3 }, SECRET, { keyid: 'default', noTimestamp: true });
    const longExpired = jwt.sign({ id: 'u1', exp: now - 60 }, SECRET, { keyid: 'default', noTimestamp: true });

    expect(verifyToken(justExpired).id).toBe('u1');
    expect(() => verifyToken(longExpired)).toThrow(/expired/i);
  });

  it('rejects a refresh token presented to the access gate', async () => {
    const m = await load();
    const refresh = m.signToken(
      { id: 'u1', tv: 0, family: 'fam-1', typ: m.REFRESH_TOKEN_TYP },
      { expiresIn: '7d' },
    );
    const legacyRefresh = m.signToken({ id: 'u1', family: 'fam-2' }, { expiresIn: '7d' });

    expect(() => m.verifyAccessToken(refresh)).toThrow(/not an access/i);
    expect(() => m.verifyAccessToken(legacyRefresh)).toThrow(/refresh/i);
    expect(m.verifyRefreshToken(refresh).id).toBe('u1');
  });

  it('rejects an unknown kid without falling back to any other key', async () => {
    const { verifyToken } = await load();
    const forged = jwt.sign({ id: 'x' }, 'attacker-secret-zzzzzzzzzzzz', { keyid: 'not-a-real-kid' });

    expect(() => verifyToken(forged)).toThrow(/kid/i);
  });
});
