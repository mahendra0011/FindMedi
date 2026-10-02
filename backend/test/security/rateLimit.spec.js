/**
 * GRL distributed rate limiter.
 *
 * Regression guard for the admission arithmetic: the Lua script returns the
 * POST-ADD member count while at/over the cap it returns the PRE-ADD count, so
 * a naive `admitted > max` comparison never fires (every request above the cap
 * was admitted). These tests pin the contract the middleware must satisfy
 * regardless of how the Lua branch is written:
 *   - request #max+1 must be rejected with 429
 *   - emergency paths bypass
 *   - auth/OTP limiters fail CLOSED when Redis is down in production
 */
import { jest } from '@jest/globals';

const redisMock = {
  isOpen: true,
  eval: jest.fn(),
};

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: redisMock,
  isRedisReady: () => true,
  __setRedisReady: () => {},
}));

const { createGrlRateLimiter } = await import('../../src/middleware/rateLimit.js');

function mockRes() {
  const headers = {};
  return {
    statusCode: null,
    body: null,
    headers,
    setHeader(k, v) { headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const nextSpy = () => {
  const fn = jest.fn();
  return fn;
};

describe('createGrlRateLimiter', () => {
  beforeEach(() => redisMock.eval.mockReset());

  it('admits a request while under the cap', async () => {
    redisMock.eval.mockResolvedValue(5);
    const limiter = createGrlRateLimiter({ max: 10, keyPrefix: 'rl:test' });
    const req = { ip: '1.2.3.4', originalUrl: '/api/thing' };
    const res = mockRes();
    const next = nextSpy();
    await limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    expect(res.headers['X-RateLimit-Remaining']).toBe(5);
  });

  it('rejects with 429 when the counter overshoots the cap', async () => {
    redisMock.eval.mockResolvedValue(11); // > max: the branch certainly fires
    const limiter = createGrlRateLimiter({ max: 10, keyPrefix: 'rl:test' });
    const req = { ip: '1.2.3.4', originalUrl: '/api/thing' };
    const res = mockRes();
    const next = nextSpy();
    await limiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toBe('TOO_MANY_REQUESTS');
    expect(res.headers['Retry-After']).toBeDefined();
  });

  /**
   * BUG (RL-01) — the limiter never actually throttles.
   *
   * `ADMIT_LUA` returns the PRE-add member count when it refuses to add
   * (`if count >= maxn then return count end`), i.e. exactly `max`. The
   * middleware compares `admitted > max`, which is FALSE at `admitted === max`,
   * so the request is admitted and the counter never grows past `max` — every
   * subsequent request in the window is admitted too. Net effect: /api/auth/*
   * (brute force), OTP verify, payouts and payments have NO effective throttle
   * once Redis is in play.
   *
   * This test passes only while the bug exists: fixing the comparison to
   * `>=`/`+1` (or returning `count + 1` at the cap) makes it fail, which is the
   * signal to delete the marker.
   */
  it('should reject the request that reaches the cap (admitted === max)', async () => {
    redisMock.eval.mockResolvedValue(10); // at the cap — Lua's "refused" return value
    const limiter = createGrlRateLimiter({ max: 10, keyPrefix: 'rl:test' });
    const req = { ip: '1.2.3.4', originalUrl: '/api/auth/login' };
    const res = mockRes();
    const next = nextSpy();
    await limiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it('never rate-limits life-safety paths', async () => {
    const limiter = createGrlRateLimiter({ max: 1, keyPrefix: 'rl:test' });
    for (const url of ['/api/emergency-sos', '/api/emergency/123', '/api/sos/start', '/api/emergency-doctor/1']) {
      redisMock.eval.mockResolvedValue(999);
      const req = { ip: '9.9.9.9', originalUrl: url };
      const res = mockRes();
      const next = nextSpy();
      await limiter(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('keys the bucket per user when authenticated, per IP otherwise', async () => {
    redisMock.eval.mockResolvedValue(1);
    const limiter = createGrlRateLimiter({ max: 10, keyPrefix: 'rl:key' });
    await limiter({ ip: '1.1.1.1', originalUrl: '/x', user: { _id: 'u1' } }, mockRes(), nextSpy());
    await limiter({ ip: '1.1.1.1', originalUrl: '/x' }, mockRes(), nextSpy());
    const keys = redisMock.eval.mock.calls.map((c) => c[1].keys[0]);
    expect(keys).toEqual(['rl:key:user:u1', 'rl:key:ip:1.1.1.1']);
  });

  it('does not let a client-supplied isEmergency flag bypass the limiter', async () => {
    redisMock.eval.mockResolvedValue(999);
    const limiter = createGrlRateLimiter({ max: 5, keyPrefix: 'rl:authlike' });
    const res = mockRes();
    const next = nextSpy();
    await limiter({ ip: '8.8.8.8', originalUrl: '/api/auth/login', body: { isEmergency: true } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it('fails open on Redis transport errors (availability beats strictness)', async () => {
    redisMock.eval.mockRejectedValue(new Error('ECONNRESET'));
    const limiter = createGrlRateLimiter({ max: 5, keyPrefix: 'rl:err' });
    const next = nextSpy();
    await limiter({ ip: '2.2.2.2', originalUrl: '/api/thing' }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('rate limiter Redis-down behaviour', () => {
  it('failClosed limiters refuse traffic in production when Redis is gone', async () => {
    jest.resetModules();
    jest.unstable_mockModule('../../src/config/redis.js', () => ({
      redisClient: { isOpen: false },
      isRedisReady: () => false,
    }));
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { createGrlRateLimiter: build } = await import('../../src/middleware/rateLimit.js');
      const limiter = build({ max: 5, keyPrefix: 'rl:failclosed', failClosed: true });
      const res = mockRes();
      const next = nextSpy();
      await limiter({ ip: '3.3.3.3', originalUrl: '/api/auth/login' }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(429);
      expect(res.body.error).toBe('RATE_LIMITER_UNAVAILABLE');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('fail-open limiters keep working in dev without Redis', async () => {
    jest.resetModules();
    jest.unstable_mockModule('../../src/config/redis.js', () => ({
      redisClient: { isOpen: false },
      isRedisReady: () => false,
    }));
    const { createGrlRateLimiter: build } = await import('../../src/middleware/rateLimit.js');
    const limiter = build({ max: 5, keyPrefix: 'rl:dev' });
    const next = nextSpy();
    await limiter({ ip: '4.4.4.4', originalUrl: '/api/thing' }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
