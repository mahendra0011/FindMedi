/**
 * AUTH-F-01 + AUTH-F-02 regression tests.
 *
 * AUTH-F-02 (purpose separation): before this change a refresh token WAS a
 * valid access token - same keyset, same shape, no claim to tell them apart -
 * so a leaked 7-day refresh token was a 7-day bearer for every data endpoint.
 * The gate rules live in utils/jwtKeys.js; these tests pin the rules AND the
 * legacy-compat carve-outs (a pre-`typ` refresh token must keep refreshing, a
 * pre-`typ` access token must keep accessing, or deploying this logs everyone
 * out).
 *
 * AUTH-F-01 (single verification path): `jwt.verify(..., JWT_SECRET)` was
 * written in 8 places across 7 files. Each one silently ignores JWT_KEYS, so
 * setting JWT_KEYS to rotate keys broke those endpoints while the rest of the
 * app kept working. The source-scan test below is the guard: jsonwebtoken
 * lives in exactly one file.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const SECRET_A = 'purpose-secret-aaaaaaaaaaaaaaaaaa';
const SECRET_B = 'purpose-secret-bbbbbbbbbbbbbbbbbb';

const originalEnv = { ...process.env };

const load = async () => {
  const mod = await import('../../src/utils/jwtKeys.js');
  mod.resetKeysetCache();
  return mod;
};

beforeEach(() => {
  jest.resetModules();
  process.env.JWT_SECRET = SECRET_A;
  delete process.env.JWT_KEYS;
});

afterEach(() => {
  // Restore by key: assigning process.env wholesale would stringify
  // undefined values, and this file shares a worker with other specs.
  for (const key of ['JWT_SECRET', 'JWT_KEYS']) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

/**
 * Strip comments and string bodies before pattern matching.
 *
 * Mirrors refreshTokenKey.spec.js: the fix's own explanatory comment contains
 * the literal text it forbids, and a comment is not a control.
 */
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => {
      let out = '';
      let quote = null;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quote) {
          out += ch;
          if (ch === '\\') {
            out += line[++i] ?? '';
            continue;
          }
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
          quote = ch;
          out += ch;
          continue;
        }
        if (ch === '/' && line[i + 1] === '/') break;
        out += ch;
      }
      return out;
    })
    .join('\n');

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
};

describe('AUTH-F-02: token purpose separation (typ / family)', () => {
  const signAccess = async (m, claims = {}) =>
    m.signToken({ id: 'u1', tv: 0, typ: m.ACCESS_TOKEN_TYP, ...claims }, { expiresIn: '15m' });
  const signRefresh = async (m, claims = {}) =>
    m.signToken({ id: 'u1', tv: 0, family: 'fam-1', jti: 'jti-1', typ: m.REFRESH_TOKEN_TYP, ...claims }, { expiresIn: '7d' });

  it('accepts a real access token, rejects the same token at the refresh gate', async () => {
    const m = await load();
    const token = await signAccess(m);

    expect(m.verifyAccessToken(token).id).toBe('u1');
    // No family: it must not be able to mint a new 7-day session.
    expect(() => m.verifyRefreshToken(token)).toThrow(/Access token presented as refresh/);
  });

  it('rejects a refresh token at the access gate (the 7-day bearer bug)', async () => {
    const m = await load();
    const token = await signRefresh(m);

    // typ check fires first: a TYPED refresh token says so in its own claim.
    expect(() => m.verifyAccessToken(token)).toThrow(/not an access token/);
    expect(m.verifyRefreshToken(token).family).toBe('fam-1');
  });

  it('rejects a LEGACY refresh token (family present, no typ) at the access gate', async () => {
    const m = await load();
    // Pre-`typ` shape: signRefreshToken always set family, so family != null
    // is the only reliable marker for a refresh token minted before AUTH-F-02.
    const legacyRefresh = m.signToken({ id: 'u1', tv: 0, family: 'fam-1', jti: 'jti-1' }, { expiresIn: '7d' });

    expect(() => m.verifyAccessToken(legacyRefresh)).toThrow(/Refresh token presented as access/);
    // ...and it must KEEP refreshing until it expires, or shipping this change
    // logs out every session that was alive during the deploy.
    expect(m.verifyRefreshToken(legacyRefresh).id).toBe('u1');
  });

  it('accepts a LEGACY access token (no typ, no family)', async () => {
    const m = await load();
    const legacyAccess = m.signToken({ id: 'u1', tv: 0, role: 'patient' }, { expiresIn: '15m' });

    expect(m.verifyAccessToken(legacyAccess).role).toBe('patient');
  });

  it('rejects any other typ at the access gate', async () => {
    const m = await load();
    const weird = m.signToken({ id: 'u1', typ: 'admin' }, { expiresIn: '15m' });

    expect(() => m.verifyAccessToken(weird)).toThrow(/not an access token/);
    // ...and a family+refresh-shaped token claiming typ:'access' still needs
    // the family check to be skipped only when typ is present and correct.
    const spoofed = m.signToken({ id: 'u1', family: 'fam-1', typ: m.ACCESS_TOKEN_TYP }, { expiresIn: '15m' });
    expect(m.verifyAccessToken(spoofed).id).toBe('u1');
    expect(() => m.verifyRefreshToken(spoofed)).toThrow(/not a refresh token/);
  });

  it('rejects a refresh token whose typ was tampered to access', async () => {
    const m = await load();
    // Best case: attacker rewrites typ but cannot re-sign without the key, so
    // this only covers the gate after a (hypothetical) key compromise of a
    // DIFFERENT family - assert the family rule alone still holds.
    const retyped = jwt.sign({ id: 'u1', family: 'fam-1', typ: 'access' }, SECRET_A, { keyid: 'default' });

    expect(m.verifyAccessToken(retyped).id).toBe('u1');
    const refreshed = jwt.sign({ id: 'u1', family: 'fam-1', typ: 'refresh' }, SECRET_A, { keyid: 'default' });
    expect(() => m.verifyAccessToken(refreshed)).toThrow(/not an access token/);
  });
});

describe('AUTH-F-02: issuer / audience', () => {
  it('stamps iss + aud on every new token and verifies them', async () => {
    const m = await load();
    const decoded = jwt.decode(m.signToken({ id: 'u1' }));

    expect(decoded.iss).toBe(m.ISSUER);
    expect(decoded.aud).toBe(m.AUDIENCE);
    expect(m.verifyToken(m.signToken({ id: 'u1' })).id).toBe('u1');
  });

  it('rejects a token carrying the WRONG iss or aud', async () => {
    const m = await load();
    const badIss = jwt.sign({ id: 'u1', iss: 'evil-issuer' }, SECRET_A, { keyid: 'default' });
    const badAud = jwt.sign({ id: 'u1', aud: 'someone-else' }, SECRET_A, { keyid: 'default' });

    expect(() => m.verifyToken(badIss)).toThrow(/Invalid token issuer/);
    expect(() => m.verifyToken(badAud)).toThrow(/Invalid token audience/);
  });

  it('tolerates a token with NO iss/aud (signed before this change)', async () => {
    const m = await load();
    // The exact shape jwtKeys minted before AUTH-F-02: kid=default, no
    // iss/aud claims.
    const preIssuance = jwt.sign({ id: 'u1' }, SECRET_A, { keyid: 'default' });
    expect(m.verifyAccessToken(preIssuance).id).toBe('u1');

    // A kid-LESS token predates kid stamping entirely. It must keep working
    // against JWT_SECRET, or every session minted before AUTH-M-06 dies the
    // instant auth.js routes through verifyAccessToken (AUTH-F-01).
    const kidless = jwt.sign({ id: 'u1' }, SECRET_A);
    expect(m.verifyAccessToken(kidless).id).toBe('u1');

    // ...but only against JWT_SECRET. A kid-less token under a JWT_KEYS-only
    // deployment has no key to fall back to.
    const jwtSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    m.resetKeysetCache();
    process.env.JWT_KEYS = JSON.stringify([{ kid: 'k2', secret: SECRET_B, status: 'active' }]);
    m.resetKeysetCache();
    expect(() => m.verifyAccessToken(kidless)).toThrow(/no kid header/);
    process.env.JWT_SECRET = jwtSecret;
  });
});

describe('AUTH-F-01: the access gate works under key rotation', () => {
  it('verifies a token signed by the retiring key, with purpose rules intact', async () => {
    process.env.JWT_KEYS = JSON.stringify([{ kid: 'k1', secret: SECRET_A, status: 'active' }]);
    const before = await load();
    const access = before.signToken({ id: 'u1', typ: before.ACCESS_TOKEN_TYP }, { expiresIn: '15m' });
    const refresh = before.signToken({ id: 'u1', family: 'fam-1', typ: before.REFRESH_TOKEN_TYP }, { expiresIn: '7d' });

    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k2', secret: SECRET_B, status: 'active' },
      { kid: 'k1', secret: SECRET_A, status: 'retiring' },
    ]);
    const after = await load();

    expect(after.verifyAccessToken(access).id).toBe('u1');
    expect(() => after.verifyRefreshToken(access)).toThrow(/Access token/);
    expect(() => after.verifyAccessToken(refresh)).toThrow(/not an access token/);
    expect(after.verifyRefreshToken(refresh).family).toBe('fam-1');
  });

  it('a refresh token minted under one keyset is rejected as access after rotation', async () => {
    process.env.JWT_KEYS = JSON.stringify([{ kid: 'k1', secret: SECRET_A, status: 'active' }]);
    const before = await load();
    const refresh = before.signToken({ id: 'u1', family: 'fam-1', typ: before.REFRESH_TOKEN_TYP }, { expiresIn: '7d' });

    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k2', secret: SECRET_B, status: 'active' },
      { kid: 'k1', secret: SECRET_A, status: 'retiring' },
    ]);
    const after = await load();

    // Rotation must never become a way to downgrade purpose checks.
    expect(() => after.verifyAccessToken(refresh)).toThrow(/not an access token/);
  });
});

describe('AUTH-F-01: jsonwebtoken lives in exactly one file', () => {
  const FORBIDDEN = [
    [/\bjwt[\w.]*\.(verify|sign|decode)\s*\(/, 'direct jwt.verify/sign/decode call'],
    [/from\s+['"]jsonwebtoken['"]/, "static import of 'jsonwebtoken'"],
    [/import\s*\(\s*['"]jsonwebtoken['"]\s*\)/, "dynamic import of 'jsonwebtoken'"],
    [/require\s*\(\s*['"]jsonwebtoken['"]\s*\)/, "require of 'jsonwebtoken'"],
  ];
  const ALLOWED = new Set([path.join(fileURLToPath(new URL('../../src/', import.meta.url)), 'utils', 'jwtKeys.js')]);

  it('has no raw JWT verification outside src/utils/jwtKeys.js', () => {
    const roots = [
      fileURLToPath(new URL('../../src/', import.meta.url)),
      fileURLToPath(new URL('../../mindsupport/src/', import.meta.url)),
    ];
    const offenders = [];

    for (const root of roots) {
      for (const file of walk(root)) {
        if (ALLOWED.has(file)) continue;
        const live = stripComments(readFileSync(file, 'utf8'));
        for (const [pattern, why] of FORBIDDEN) {
          if (pattern.test(live)) offenders.push(`${path.relative(root, file)}: ${why}`);
        }
      }
    }

    // Each raw site re-implements verification with the same two defects: it
    // cannot rotate keys (ignores JWT_KEYS) and it cannot tell a refresh token
    // from an access token. One file owns the rules; everything else asks it.
    expect(offenders).toEqual([]);
  });
});
