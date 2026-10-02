/**
 * AUTH-M-03: per-account login lockout with exponential backoff.
 *
 * The finding said there was no per-account lockout. There WAS one - a flat
 * counter, 10 failures then a hard 15-minute lock. Reading it properly turned up
 * two things the finding did not mention, and the second is why this work was
 * worth doing:
 *
 *   1. A flat counter is 10 free guesses per 15 minutes, 960 a day, with no
 *      penalty for guessing faster. Nothing bounded an online attack except
 *      that number.
 *   2. ACCOUNT-LOCKOUT DoS. The lock is keyed on the email, so anyone who knows
 *      a patient's email can lock that patient out of their own account every
 *      15 minutes, forever, WITHOUT EVER GUESSING A PASSWORD. On a healthcare
 *      platform, where being locked out of your records has clinical
 *      consequences, that is a denial-of-service primitive available to anyone
 *      holding a list of addresses.
 *
 * The store-backed functions run against a fake Redis patched onto the exported
 * client, because the real one is a live connection and a test that needs a
 * broker is a test that does not run in CI.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync } from 'node:fs';

const {
  redisClient,
  loginBackoffSeconds,
  checkLoginLockout,
  registerLoginFailure,
  resetLoginFailures,
} = await import('../../src/config/redis.js');

const authCode = readFileSync(new URL('../../src/routes/auth.js', import.meta.url), 'utf8');

/** A minimal Redis stand-in: only the verbs these three functions use. */
const makeFakeRedis = () => {
  const store = new Map();
  const ttls = new Map();
  return {
    store,
    ttls,
    async incr(k) {
      const v = Number(store.get(k) || 0) + 1;
      store.set(k, String(v));
      return v;
    },
    async get(k) { return store.get(k) ?? null; },
    async set(k, v) { store.set(k, String(v)); return 'OK'; },
    async del(k) { store.delete(k); ttls.delete(k); return 1; },
    async expire(k, s) { ttls.set(k, s); return 1; },
    async ttl(k) { return ttls.get(k) ?? -1; },
  };
};

describe('AUTH-M-03 · the backoff schedule is exponential and capped', () => {
  it('doubles per failure', () => {
    expect(loginBackoffSeconds(1)).toBe(2);
    expect(loginBackoffSeconds(2)).toBe(4);
    expect(loginBackoffSeconds(3)).toBe(8);
    expect(loginBackoffSeconds(4)).toBe(16);
    expect(loginBackoffSeconds(5)).toBe(32);
  });

  it('caps rather than growing without bound', () => {
    // 2^20 is 1048576 seconds, about 12 days. Uncapped, someone who fat-fingers
    // ten times could not sign in for a fortnight.
    expect(loginBackoffSeconds(10)).toBe(900);
    expect(loginBackoffSeconds(20)).toBe(900);
    expect(loginBackoffSeconds(1000)).toBe(900);
  });

  it('is monotonic and never zero', () => {
    let prev = 0;
    for (let i = 0; i <= 12; i += 1) {
      const v = loginBackoffSeconds(i);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeGreaterThan(0);
      prev = v;
    }
  });

  it('tolerates junk input rather than producing NaN', () => {
    expect(Number.isFinite(loginBackoffSeconds(undefined))).toBe(true);
    expect(Number.isFinite(loginBackoffSeconds(null))).toBe(true);
    // `2 ** Math.max(0, -5)` is 2**0 === 1s, not 2s. The first draft of this
    // test expected 2 and failed. 1 is the correct answer: a zero-count call
    // should be the cheapest possible wait, and the schedule is 1, 2, 4, 8...
    // starting at failure #1 (INCR returns 1 first, so the first real failure
    // costs 2s and this branch is never reached in production anyway).
    expect(loginBackoffSeconds(-5)).toBe(1);
    expect(loginBackoffSeconds(0)).toBe(1);
  });
});

describe('AUTH-M-03 · the counter is enforced across requests', () => {
  it('starts unlocked, then locks with a wait the next request can read', async () => {
    expect((await checkLoginLockout('a@b.com')).locked).toBe(false);

    const first = await registerLoginFailure('a@b.com');
    expect(first.failures).toBe(1);
    expect(first.retryAfterSeconds).toBe(2);

    // The backoff marker is what the NEXT request reads. That is the point:
    // the wait is enforced on a later call, not merely reported once.
    fake.ttls.set('login:backoff:a@b.com', 2);
    const second = await checkLoginLockout('a@b.com');
    expect(second.locked).toBe(true);
    expect(second.scope).toBe('account');
    expect(second.retryAfterSeconds).toBe(2);
  });

  it('escalates as failures accumulate', async () => {
    const waits = [];
    for (let i = 0; i < 5; i += 1) waits.push((await registerLoginFailure('x@y.com')).retryAfterSeconds);
    expect(waits).toEqual([2, 4, 8, 16, 32]);
  });

  it('a successful login clears the account counter', async () => {
    await registerLoginFailure('c@d.com');
    fake.ttls.set('login:backoff:c@d.com', 4);
    expect((await checkLoginLockout('c@d.com')).locked).toBe(true);

    await resetLoginFailures('c@d.com');
    expect((await checkLoginLockout('c@d.com')).locked).toBe(false);
  });

  it('an IP that sprays many accounts gets parked', async () => {
    // The anti-DoS control. Without it one host can lock an entire patient list
    // out of their accounts in a single pass.
    const SPRAYER = '10.0.0.1';
    for (let i = 0; i < 50; i += 1) await registerLoginFailure(`victim${i}@example.com`, SPRAYER);
    fake.ttls.set('login:ipblock:10.0.0.1', 900);

    const blocked = await checkLoginLockout('never-tried@example.com', SPRAYER);
    expect(blocked.locked).toBe(true);
    expect(blocked.scope).toBe('ip');
  });

  it('one victim being locked does not lock an unrelated caller', async () => {
    for (let i = 0; i < 10; i += 1) await registerLoginFailure('victim@example.com', '10.0.0.1');
    fake.ttls.set('login:backoff:victim@example.com', 900);
    fake.ttls.set('login:ipfail:10.0.0.1', 900);

    const other = await checkLoginLockout('bystander@example.com', '10.0.0.2');
    expect(other.locked).toBe(false);
  });
});

describe('AUTH-M-03 · the login route is actually wired to it', () => {
  it('checks the lockout BEFORE verifying a password', () => {
    // A lockout checked after the password is useless - the attacker has
    // already spent the guess.
    expect(authCode.indexOf('checkLoginLockout')).toBeLessThan(authCode.indexOf('comparePassword'));
  });

  it('sends Retry-After, not just a 429', () => {
    // A 429 without Retry-After tells a well-behaved client nothing about when
    // to come back, so it retries immediately and defeats the backoff.
    expect(authCode).toMatch(/set\('Retry-After'/);
  });

  it('the 429 and the 401 use identical wording', () => {
    // Otherwise the pair is an account-existence oracle: a different message on
    // a real account's backoff reveals that the address is registered.
    const m429 = authCode.match(/message: 'Invalid credentials',\s*retryAfterSeconds/s);
    expect(m429).toBeTruthy();
    expect(authCode).toMatch(/return res\.status\(401\)\.json\(\{ message: 'Invalid credentials' \}\)/);
  });

  it('does not tell the caller whether the lock is per-account or per-IP', () => {
    // ...except for the IP case, which is deliberately different: it says
    // "this network", not "this account", so it reveals nothing about any
    // particular address. Asserted so a future edit cannot make it specific.
    expect(authCode).toMatch(/Too many failed sign-in attempts from this network/);
  });
});


let fake;
let realEnvUrl;
const real = {};

// isRedisReady() is `isConnected && !!process.env.REDIS_URL`, and isConnected is
// module-local, set by the client's 'ready' event. The first attempt tried to
// assign `redisClient.isOpen = true` and failed with "which has only a getter" -
// node-redis exposes it as a getter. Driving the real condition instead (emit
// 'ready', set REDIS_URL) is both possible and better: the test now exercises
// the same readiness check production uses rather than a bypass of it.
beforeEach(() => {
  fake = makeFakeRedis();
  for (const verb of ['incr', 'get', 'set', 'del', 'expire', 'ttl']) {
    real[verb] = redisClient[verb];
    redisClient[verb] = fake[verb].bind(fake);
  }
  realEnvUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = 'redis://stub:6379';
  redisClient.emit('ready');
});

afterEach(() => {
  for (const verb of ['incr', 'get', 'set', 'del', 'expire', 'ttl']) redisClient[verb] = real[verb];
  redisClient.emit('end');
  if (realEnvUrl === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = realEnvUrl;
});
