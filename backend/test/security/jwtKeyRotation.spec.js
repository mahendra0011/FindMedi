import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

/**
 * AUTH-M-06: `kid`, key rotation, and an overlap window that does not log
 * everyone out.
 *
 * The property that matters most is the OVERLAP WINDOW test: rotating the
 * signing key must not invalidate tokens still within their lifetime. Before
 * this module, changing JWT_SECRET rejected every live session at once.
 */
describe('jwtKeys - key rotation with kid', () => {
  const SECRET_A = 'secret-aaaaaaaaaaaaaaaaaaaa';
  const SECRET_B = 'secret-bbbbbbbbbbbbbbbbbbbb';

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = SECRET_A;
    delete process.env.JWT_KEYS;
  });

  afterEach(() => {
    delete process.env.JWT_KEYS;
    process.env.JWT_SECRET = SECRET_A;
  });

  // jest.resetModules() does NOT evict an already-instantiated ESM module, and
  // loadKeyset() caches the parsed keyset at module scope. So without this the
  // second import in a test hands back the PREVIOUS test's keyset, and "unknown
  // kid" / "ambiguous keyset" assertions silently pass against stale config.
  const load = async () => {
    const m = await import('../../src/utils/jwtKeys.js');
    m.resetKeysetCache();
    return m;
  };

  it('stamps kid into the header and round-trips the payload', async () => {
    const { signToken, verifyToken, currentKid } = await load();
    const token = signToken({ id: 'u1', role: 'patient' }, { expiresIn: '15m' });

    expect(jwt.decode(token, { complete: true }).header.kid).toBe('default');
    expect(currentKid()).toBe('default');
    expect(verifyToken(token)).toMatchObject({ id: 'u1', role: 'patient' });
  });

  it('generates a jti, but does not override a caller-supplied one', async () => {
    const { signToken, verifyToken } = await load();
    const a = verifyToken(signToken({ id: 'u1' }));
    const b = verifyToken(signToken({ id: 'u1' }));
    expect(a.jti).toEqual(expect.any(String));
    expect(a.jti).not.toBe(b.jti);

    // The refresh-rotation chain depends on the caller's own jti surviving.
    expect(verifyToken(signToken({ id: 'u1', jti: 'caller-jti' })).jti).toBe('caller-jti');
  });

  it('signs with the active key when a keyset is configured', async () => {
    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k2', secret: SECRET_B, status: 'active' },
      { kid: 'k1', secret: SECRET_A, status: 'retiring' },
    ]);
    const { signToken, verifyToken, currentKid } = await load();
    const token = signToken({ id: 'u2' });

    expect(jwt.decode(token, { complete: true }).header.kid).toBe('k2');
    expect(currentKid()).toBe('k2');
    expect(verifyToken(token).id).toBe('u2');
  });

  it('OVERLAP WINDOW: a token signed by the retired key still verifies', async () => {
    const { signToken, verifyToken } = await load();
    const before = signToken({ id: 'u1' });

    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k2', secret: SECRET_B, status: 'active' },
      { kid: 'k1', secret: SECRET_A, status: 'retiring' },
    ]);
    const rotated = await load();
    expect(rotated.verifyToken(before).id).toBe('u1');
  });

  it('ZERO-DOWNTIME MIGRATION: a JWT_SECRET-only token survives the switch to JWT_KEYS', async () => {
    const { signToken, verifyToken } = await load();
    const legacy = signToken({ id: 'u1' }); // SECRET_A, kid=default

    process.env.JWT_KEYS = JSON.stringify([{ kid: 'k2', secret: SECRET_B, status: 'active' }]);
    const migrated = await load();

    // Otherwise every live session dies the instant an operator sets JWT_KEYS.
    expect(migrated.verifyToken(legacy).id).toBe('u1');
  });

  it('rejects forgery that merely CLAIMS a valid kid', async () => {
    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k2', secret: SECRET_B, status: 'active' },
      { kid: 'k1', secret: SECRET_A, status: 'retiring' },
    ]);
    const { verifyToken } = await load();

    // If the verifier "tried every key" instead of the named one, this forgery
    // is free. Claiming the legacy kid must not become a downgrade path either.
    expect(() => verifyToken(jwt.sign({ id: 'x' }, 'attacker-secret-zzzzzzzzzzzz', { keyid: 'k1' }))).toThrow();
    expect(() => verifyToken(jwt.sign({ id: 'x' }, 'attacker-secret-zzzzzzzzzzzz', { keyid: 'default' }))).toThrow();
  });

  it('refuses an ambiguous or malformed keyset instead of downgrading', async () => {
    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k1', secret: SECRET_A, status: 'active' },
      { kid: 'k2', secret: SECRET_B, status: 'active' },
    ]);
    // load() only imports; the keyset is validated lazily on first use, which is
    // what lets a keyset be swapped at runtime. So the assertion has to call it.
    await expect(load().then((m) => m.loadKeyset())).rejects.toThrow(/exactly one active key/);

    jest.resetModules();
    process.env.JWT_KEYS = '{not json';
    await expect(load().then((m) => m.loadKeyset())).rejects.toThrow(/not valid JSON/);
  });

  it('never exposes key material through describeKeyset()', async () => {
    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k2', secret: SECRET_B, status: 'active' },
      { kid: 'k1', secret: SECRET_A, status: 'retiring' },
    ]);
    const { describeKeyset } = await load();
    const serialised = JSON.stringify(describeKeyset());

    expect(serialised).not.toContain(SECRET_A);
    expect(serialised).not.toContain(SECRET_B);
    expect(describeKeyset()).toEqual([
      expect.objectContaining({ kid: 'k2', status: 'active' }),
      expect.objectContaining({ kid: 'k1', status: 'retiring' }),
    ]);
  });

  it('no auth route reads JWT_SECRET directly any more', async () => {
    const fs = await import('node:fs');
    for (const file of ['src/routes/auth.js', 'src/utils/twoFactorTicket.js']) {
      const src = fs.readFileSync(file, 'utf8');
      const live = src.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
      expect(live).not.toMatch(/JWT_SECRET/);
    }
  });

  it('rejects a token whose kid is not in the keyset', async () => {
    process.env.JWT_KEYS = JSON.stringify([
      { kid: 'k2', secret: SECRET_B, status: 'active' },
      { kid: 'k1', secret: SECRET_A, status: 'retiring' },
    ]);
    const { signToken, verifyToken } = await load();
    const token = signToken({ id: 'u2' });

    process.env.JWT_KEYS = JSON.stringify([{ kid: 'k3', secret: SECRET_B, status: 'active' }]);
    const afterDrop = await load();
    expect(() => afterDrop.verifyToken(token)).toThrow(/Unknown kid "k2"/);
  });
});