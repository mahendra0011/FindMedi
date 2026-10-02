/**
 * PAY-M-07: critical-path payment tests.
 *
 * The commission arithmetic was already covered in unit/ledger.spec.js. What was
 * missing is the part that actually moves money twice: a retried request, a
 * double-clicked refund button, and a replay guard that quietly stops working
 * when Redis is unavailable.
 *
 * The idempotency guard is the whole defence against a double charge, and it
 * has three ways to fail open. Each is asserted here rather than assumed.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const redisGet = jest.fn();
const redisSet = jest.fn();
const redisState = { ready: true, open: true };

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: {
    get: redisGet,
    set: redisSet,
    isOpen: true,
  },
  isRedisReady: () => redisState.ready,
}));

const { idempotencyGuard } = await import('../../src/middleware/idempotency.js');
const { default: Refund } = await import('../../src/models/Refund.js');

/**
 * A res double that records what the middleware did.
 *
 * `json` sets `ended` without touching `statusCode`: the guard answers 503 via
 * `res.status(503).json(...)`, and a `json` that reset the code to 200 would have
 * hidden exactly the assertion that matters.
 */
const res = () => {
  const r = {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this.ended = true; return this; },
  };
  return r;
};

const req = ({ key, userId = 'u1', ip = '10.0.0.1' } = {}) => ({
  header: (name) => (name.toLowerCase() === 'idempotency-key' ? key : undefined),
  user: userId ? { _id: userId } : undefined,
  ip,
});

/**
 * Run the guard and report whether it let the request through.
 *
 * The first version used a no-op `() => {}` for `next` and then asserted on a
 * `reached` flag the caller had to maintain by hand — so every test using this
 * helper silently saw `reached === false` even on the success path. Two of the
 * three failures were this, not the product.
 */
const run = async (opts, request, response) => {
  let reached = false;
  await idempotencyGuard(opts)(request, response, () => { reached = true; });
  return reached;
};

/** Decide what a SET .. NX returns, so both the acquire and replay paths run. */
const setReturns = (value) => redisSet.mockResolvedValue(value);

beforeEach(() => {
  redisGet.mockReset();
  redisSet.mockReset();
  redisState.ready = true;
  redisState.open = true;
});

describe('PAY · the refund/payment path is fail-closed without a replay guard', () => {
  it('refuses the request outright when no Idempotency-Key is sent', async () => {
    // A refund with no key has nothing to deduplicate on, so a double-click
    // issues two refunds. This must never reach the handler.
    const r = res();
    expect(await run({ prefix: 'refund', failClosed: true }, req({}), r)).toBe(false);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('503s and does NOT process when Redis is unavailable', async () => {
    // The dangerous failure mode: a money path that silently degrades into
    // "charge every time" because its guard could not reach its store.
    redisState.ready = false;
    const r = res();
    expect(await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1' }), r)).toBe(false);
    expect(r.statusCode).toBe(503);
    expect(r.body.error).toBe('IDEMPOTENCY_UNAVAILABLE');
  });

  it('a Redis exception on the reservation does NOT fall through to the handler', async () => {
    // The guard's own catch used to call next() unconditionally, so a Redis blip
    // mid-reservation silently disabled the double-charge guard on exactly the
    // endpoints that declared themselves fail-closed.
    redisSet.mockRejectedValue(new Error('ECONNRESET'));
    const r = res();
    const reached = await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1' }), r);
    expect(reached).toBe(false);
    expect(r.statusCode).toBe(503);
    expect(r.body.error).toBe('IDEMPOTENCY_UNAVAILABLE');
  });

  it('still fails open on an exception for a NON-money endpoint', async () => {
    // The same exception must NOT 503 a dispatch endpoint that never opted in;
    // making every guarded route fail closed would take the whole platform down
    // whenever Redis hiccups.
    redisSet.mockRejectedValue(new Error('ECONNRESET'));
    const r = res();
    expect(await run({ prefix: 'dispatch' }, req({ key: 'k1' }), r)).toBe(true);
  });

  it('fails OPEN by default, for endpoints that have not opted in', async () => {
    const r = res();
    expect(await run({}, req({}), r)).toBe(true);
  });
});

describe('PAY · the same key does not move money twice', () => {
  it('passes the FIRST request through and reserves the key atomically', async () => {
    setReturns('OK');
    const r = res();
    expect(await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1' }), r)).toBe(true);
    // NX is what closes the TOCTOU window; a plain SET would let two concurrent
    // retries both execute.
    expect(redisSet).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('inFlight'),
      expect.objectContaining({ NX: true })
    );
  });

  it('replays the STORED response for a second request with the same key', async () => {
    setReturns(null);
    redisGet.mockResolvedValue(JSON.stringify({ replayed: true, status: 200, body: { ok: true, charged: 1 } }));
    const r = res();
    expect(await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1' }), r)).toBe(false);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual({ ok: true, charged: 1 });
  });

  it('409s rather than executing when the first request is still in flight', async () => {
    // The dangerous case: a second click while the first refund is mid-settle.
    // Replaying nothing and executing nothing is the only safe answer.
    setReturns(null);
    redisGet.mockResolvedValue(JSON.stringify({ replayed: false, inFlight: true }));
    const r = res();
    expect(await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1' }), r)).toBe(false);
    expect(r.statusCode).toBe(409);
    expect(r.body.error).toBe('IDEMPOTENT_IN_FLIGHT');
  });

  it('records the response so the NEXT retry can replay it', async () => {
    setReturns('OK');
    const r = res();
    await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1' }), r);
    // The middleware wraps res.json; the handler's own call is what stores it.
    r.json({ charged: 1 });
    const stored = redisSet.mock.calls[redisSet.mock.calls.length - 1][1];
    expect(JSON.parse(stored)).toMatchObject({ replayed: true, status: 200, body: { charged: 1 } });
  });
});

describe('REFUND · the model refuses to record the same refund twice', () => {
  // The Redis guard stops a retried HTTP request. This model-level key stops a
  // DIFFERENT failure: two admins (or an admin and a scheduled job) refunding
  // the same payment concurrently. Redis is per-request; this unique index is
  // the last line, and it has to be the one that is right.
  //
  // The REAL model is imported at the top of the file and its statics are
  // spied on. The first version built a plain `{ create, findOne }` object,
  // which of course has no `requestRefund` on it — so every case below failed
  // on a missing method rather than on refund behaviour.
  const base = {
    paymentId: 'pay1', amount: 100, originalAmount: 500,
    reason: 'test', idempotencyKey: 'refund:pay1:100', requestedBy: 'admin1',
  };

  it('rejects a refund with no idempotency key at all', async () => {
    const create = jest.spyOn(Refund, 'create');
    await expect(Refund.requestRefund({ ...base, idempotencyKey: null })).rejects.toThrow(/idempotencyKey is required/);
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
  });

  it('rejects a zero or negative amount', async () => {
    const create = jest.spyOn(Refund, 'create');
    await expect(Refund.requestRefund({ ...base, amount: 0 })).rejects.toThrow(/greater than 0/);
    await expect(Refund.requestRefund({ ...base, amount: -5 })).rejects.toThrow(/greater than 0/);
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
  });

  it('rejects a refund larger than the original payment', async () => {
    const create = jest.spyOn(Refund, 'create').mockResolvedValue({});
    await expect(Refund.requestRefund({ ...base, amount: 501 })).rejects.toThrow(/cannot exceed/);
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
  });

  it('compares in integer paise, not floating rupees', async () => {
    // 100.1 is 100.099999999999994 in binary floating point. Comparing the raw
    // floats can reject a refund that is exactly the original amount.
    const create = jest.spyOn(Refund, 'create').mockImplementation(async (d) => ({ _id: 'r1', ...d }));
    const out = await Refund.requestRefund({ ...base, amount: 100.1, originalAmount: 100.1 });
    expect(out.created).toBe(true);
    create.mockRestore();
  });

  it('records a NEW refund as created', async () => {
    const create = jest.spyOn(Refund, 'create').mockImplementation(async (d) => ({ _id: 'r1', ...d }));
    const out = await Refund.requestRefund(base);
    expect(out.created).toBe(true);
    expect(out.refund.idempotencyKey).toBe(base.idempotencyKey);
    create.mockRestore();
  });

  it('returns the EXISTING refund, not a second one, on a duplicate key', async () => {
    // E11000 is what the unique index raises. Swallowing it as `created: false`
    // is what stops a double-click issuing two refunds.
    const existing = { _id: 'r-existing', idempotencyKey: base.idempotencyKey };
    const create = jest.spyOn(Refund, 'create').mockImplementation(async () => {
      const e = new Error('E11000 duplicate'); e.code = 11000; throw e;
    });
    const findOne = jest.spyOn(Refund, 'findOne').mockReturnValue({ lean: async () => existing });

    const out = await Refund.requestRefund(base);
    expect(out.created).toBe(false);
    expect(out.reason).toBe('duplicate');
    expect(out.refund).toBe(existing);
    create.mockRestore();
    findOne.mockRestore();
  });

  it('rethrows any error that is NOT a duplicate', async () => {
    // A validation failure must not be misreported as "already refunded" — that
    // would tell the caller their refund succeeded when nothing was recorded.
    const create = jest.spyOn(Refund, 'create').mockImplementation(async () => { throw new Error('validation failed'); });
    await expect(Refund.requestRefund(base)).rejects.toThrow(/validation failed/);
    create.mockRestore();
  });
});

describe('PAY · one user cannot replay another user key', () => {
  it('scopes the Redis key by user id', async () => {
    setReturns('OK');
    await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1', userId: 'alice' }), res());
    const aliceKey = redisSet.mock.calls[0][0];
    redisSet.mockClear();
    setReturns('OK');
    await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1', userId: 'bob' }), res());
    const bobKey = redisSet.mock.calls[0][0];
    // Same Idempotency-Key, two users: if these collided, Bob's refund would
    // replay Alice's stored response, or block on her in-flight request.
    expect(aliceKey).not.toBe(bobKey);
    expect(aliceKey).toContain('alice');
    expect(bobKey).toContain('bob');
  });

  it('prefixes by operation so a pay and a refund cannot collide', async () => {
    setReturns('OK');
    await run({ prefix: 'refund', failClosed: true }, req({ key: 'k1' }), res());
    expect(redisSet.mock.calls[0][0]).toMatch(/^refund:/);
  });
});
