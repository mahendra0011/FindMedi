import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

/**
 * F8 / F9: fail-open posture must be COUNTABLE, and Turnstile's outage
 * behaviour must be flippable to fail-closed.
 *
 * Both controls here deliberately fail open by default (spam control and
 * capacity control respectively - refusing everyone when Cloudflare or Redis
 * is down converts their outage into ours). The finding was that neither
 * failure was observable: you could be running unprotected for hours and only
 * a log grep would tell you. So the properties under test are:
 *
 *   1. Every fail-open increments `security_fail_open_total{control=...}`.
 *   2. A fail-open that is actually a REJECTED token (403) does NOT count -
 *      a correct rejection is not a control failure.
 *   3. TURNSTILE_STRICT=true turns the provider-outage path into a 503 and
 *      still counts the event.
 *   4. The tenant quota guard counts both of its pass-through paths (redis
 *      down, unexpected guard error).
 */

// Mutable flag so one test file can drive BOTH tenant-quota paths: redis
// unavailable (the common fail-open) and redis "up" but failing (the error
// path). Registered before any import, as ESM mocks require.
let redisUp = false;
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: {
    get isOpen() { return redisUp; },
    eval: jest.fn(() => Promise.reject(new Error('redis eval failed'))),
  },
  isRedisReady: () => redisUp,
}));

const { botProtection, isTurnstileStrict } = await import('../../src/middleware/botProtection.js');
const { tenantQuotaGuard } = await import('../../src/services/tenantQuotaService.js');
const { securityFailOpenTotal } = await import('../../src/lib/metrics.js');

const readCount = async (control) => {
  const data = await securityFailOpenTotal.get();
  const sample = data.values.find((v) => v.labels.control === control);
  return sample ? sample.value : 0;
};

const resMock = () => ({
  statusCode: 200,
  body: undefined,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
  setHeader() {},
});

const runBot = async (req) => {
  const res = resMock();
  let nexted = false;
  await botProtection()(req, res, () => { nexted = true; });
  return { nexted, res };
};

const botReq = (token = 'tok') => ({
  body: { 'cf-turnstile-response': token },
  headers: {},
  ip: '203.0.113.9',
});

let fetchSpy;

beforeEach(() => {
  redisUp = false;
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  delete process.env.TURNSTILE_STRICT;
  // Default to a rejection so a test that forgets to stub cannot fire a REAL
  // request at Cloudflare (the call-through would eat a live 400 and flip the
  // posture being asserted).
  fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch not stubbed'));
});

afterEach(() => {
  fetchSpy.mockRestore();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_STRICT;
});

describe('F8: turnstile provider outage', () => {
  it('fails open (default) and counts the fail-open', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const before = await readCount('bot_protection');

    const { nexted } = await runBot(botReq());

    expect(nexted).toBe(true);
    expect(await readCount('bot_protection')).toBe(before + 1);
  });

  it('counts a provider HTTP failure too, not just network errors', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 502 });
    const before = await readCount('bot_protection');

    const { nexted } = await runBot(botReq());

    expect(nexted).toBe(true);
    expect(await readCount('bot_protection')).toBe(before + 1);
  });

  it('TURNSTILE_STRICT=true fails CLOSED with 503 and still counts', async () => {
    process.env.TURNSTILE_STRICT = 'true';
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const before = await readCount('bot_protection');

    const { nexted, res } = await runBot(botReq());

    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('BOT_CHECK_UNAVAILABLE');
    expect(await readCount('bot_protection')).toBe(before + 1);
  });

  it('a REJECTED token is a working control, not a fail-open - no count', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    const before = await readCount('bot_protection');

    const { nexted, res } = await runBot(botReq());

    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('BOT_CHECK_FAILED');
    expect(await readCount('bot_protection')).toBe(before);
  });

  it('a verified token passes without counting', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const before = await readCount('bot_protection');

    const { nexted } = await runBot(botReq());

    expect(nexted).toBe(true);
    expect(await readCount('bot_protection')).toBe(before);
  });

  it('a missing token is still 403 regardless of strict mode', async () => {
    process.env.TURNSTILE_STRICT = '1';
    const before = await readCount('bot_protection');

    // No body field at all - botReq(undefined) would trigger the default param.
    const { nexted, res } = await runBot({ body: {}, headers: {}, ip: '203.0.113.9' });

    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('BOT_CHECK_REQUIRED');
    expect(await readCount('bot_protection')).toBe(before);
  });

  it('TURNSTILE_STRICT parses truthy spellings only', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', 'Yes']) {
      process.env.TURNSTILE_STRICT = v;
      expect(isTurnstileStrict()).toBe(true);
    }
    for (const v of ['', '0', 'false', 'no', 'on-when-the-mood-strikes']) {
      process.env.TURNSTILE_STRICT = v;
      expect(isTurnstileStrict()).toBe(false);
    }
    delete process.env.TURNSTILE_STRICT;
    expect(isTurnstileStrict()).toBe(false);
  });
});

describe('F9: tenant quota guard fail-open is counted', () => {
  const reqFor = () => ({
    user: { _id: 'u1', role: 'hospital_admin', hospitalId: 'h1' },
    originalUrl: '/api/appointments',
    url: '/api/appointments',
  });

  it('redis unavailable: passes through and counts', async () => {
    redisUp = false;
    const before = await readCount('tenant_quota');

    let nexted = false;
    await tenantQuotaGuard(reqFor(), resMock(), () => { nexted = true; });

    expect(nexted).toBe(true);
    expect(await readCount('tenant_quota')).toBe(before + 1);
  });

  it('redis up but failing: the catch path passes through and counts', async () => {
    redisUp = true;
    const before = await readCount('tenant_quota');

    let nexted = false;
    await tenantQuotaGuard(reqFor(), resMock(), () => { nexted = true; });

    expect(nexted).toBe(true);
    expect(await readCount('tenant_quota')).toBe(before + 1);
  });

  it('non-tenant traffic never reaches the fail-open paths', async () => {
    redisUp = false;
    const before = await readCount('tenant_quota');

    let nexted = false;
    await tenantQuotaGuard(
      { user: { _id: 'p1', role: 'patient' }, originalUrl: '/api/appointments', url: '' },
      resMock(),
      () => { nexted = true; }
    );

    expect(nexted).toBe(true);
    expect(await readCount('tenant_quota')).toBe(before);
  });
});
