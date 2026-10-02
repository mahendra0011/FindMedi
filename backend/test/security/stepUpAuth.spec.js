/**
 * AUTHZ-M-03: step-up authentication.
 *
 * The property under test is that a session token alone is NOT enough for the
 * handful of actions that cost money. Each case below is a way that could
 * otherwise let a stolen long-lived token do something its owner never re-confirmed.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const userFindById = jest.fn();
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: userFindById },
}));

let verifyToken;
jest.unstable_mockModule('../../src/services/twoFactorService.js', () => ({
  verifyToken: (...a) => verifyToken(...a),
  verifyBackupCode: jest.fn(() => false),
}));

const {
  requireStepUp, issueStepUpFor, recordStepUp, consumeStepUp, hasStepUp, clearStepUps,
} = await import('../../src/middleware/stepUpAuth.js');

// A chainable thenable. `issueStepUpFor` reads `user.twoFactorEnabled` straight
// after `.select()` with no `.lean()`, so a mock that only supports
// `.select().lean()` resolves to a query object rather than the user, and every
// assertion downstream sees `undefined`.
const lean = (v) => {
  const q = {
    select: () => q,
    lean: () => q,
    then: (resolve) => Promise.resolve(v).then(resolve),
  };
  return q;
};
const req = (user, stepUpToken) => ({
  user,
  get: (n) => (n.toLowerCase() === 'x-step-up-token' ? stepUpToken : undefined),
});
const res = () => ({
  statusCode: 200, body: undefined,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
});
const run = async (scope, r, t) => {
  let nexted = false;
  await requireStepUp(scope)(r, res(), () => { nexted = true; });
  return nexted;
};

beforeEach(() => {
  userFindById.mockReset();
  verifyToken = jest.fn(() => true);
  clearStepUps('u1'); clearStepUps('u2');
});

describe('STEP-UP · an enabled 2FA user must re-prove for a money action', () => {
  it('403s with STEP_UP_REQUIRED when no proof is presented', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true }));
    const r = res();
    let nexted = false;
    await requireStepUp('payouts:add')(req({ _id: 'u1' }), r, () => { nexted = true; });
    expect(nexted).toBe(false);
    expect(r.statusCode).toBe(403);
    expect(r.body.error).toBe('STEP_UP_REQUIRED');
  });

  it('401s when there is no session at all', async () => {
    const r = res();
    let nexted = false;
    await requireStepUp('payouts:add')(req(undefined), r, () => { nexted = true; });
    expect(nexted).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it('passes when a valid token is presented', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true }));
    const issued = await issueStepUpFor('u1', '123456', 'payouts:add');
    expect(issued.ok).toBe(true);
    expect(await run('payouts:add', req({ _id: 'u1' }, issued.token))).toBe(true);
  });
});

describe('STEP-UP · a grant is single-use and bound to one scope', () => {
  it('cannot be replayed for the SAME action', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true }));
    const issued = await issueStepUpFor('u1', '123456', 'payouts:add');
    expect(await run('payouts:add', req({ _id: 'u1' }, issued.token))).toBe(true);
    // A captured header replayed by an attacker must not work a second time.
    expect(await run('payouts:add', req({ _id: 'u1' }, issued.token))).toBe(false);
  });

  it('cannot be used for a DIFFERENT action', async () => {
    // The whole point of scoping: an export grant must not also open a payout.
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true }));
    const issued = await issueStepUpFor('u1', '123456', 'export:full');
    expect(await run('payouts:add', req({ _id: 'u1' }, issued.token))).toBe(false);
  });

  it('cannot be used by a DIFFERENT user', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true }));
    const issued = await issueStepUpFor('u1', '123456', 'payouts:add');
    expect(await run('payouts:add', req({ _id: 'u2' }, issued.token))).toBe(false);
  });

  it('rejects a made-up token', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true }));
    expect(await run('payouts:add', req({ _id: 'u1' }, 'forged-token'))).toBe(false);
  });

  it('the internal grant store is single-use too', () => {
    recordStepUp('u1', 'payouts:add');
    expect(consumeStepUp('u1', 'payouts:add')).toBeTruthy();
    expect(consumeStepUp('u1', 'payouts:add')).toBeNull();
  });

  it('hasStepUp does not consume the grant', () => {
    recordStepUp('u1', 'export:full');
    expect(hasStepUp('u1', 'export:full')).toBe(true);
    expect(hasStepUp('u1', 'export:full')).toBe(true);
    expect(consumeStepUp('u1', 'export:full')).toBeTruthy();
  });
});

describe('STEP-UP · a user without 2FA is not locked out of their own account', () => {
  it('passes, and says in the log that the step-up was skipped', async () => {
    // Refusing here would lock out every user who never enabled 2FA. The gap is
    // recorded rather than hidden.
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: false }));
    const r = req({ _id: 'u1' });
    let captured;
    await requireStepUp('payouts:add')(r, res(), () => { captured = true; });
    expect(captured).toBe(true);
    expect(r.stepUp).toMatchObject({ skipped: 'two-factor-not-enabled' });
  });
});

describe('STEP-UP · issuing a grant requires a correct code', () => {
  it('refuses a bad TOTP', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true, twoFactorSecret: 'S' }));
    verifyToken = () => false;
    const out = await issueStepUpFor('u1', '000000', 'payouts:add');
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('bad-code');
  });

  it('refuses when 2FA is not enabled on the account', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: false }));
    const out = await issueStepUpFor('u1', '123456', 'payouts:add');
    expect(out).toMatchObject({ ok: false, reason: 'not-enabled' });
  });

  it('accepts a valid TOTP and mints a token', async () => {
    userFindById.mockReturnValue(lean({ _id: 'u1', twoFactorEnabled: true, twoFactorSecret: 'S' }));
    verifyToken = () => true;
    const out = await issueStepUpFor('u1', '123456', 'payouts:add');
    expect(out.ok).toBe(true);
    expect(out.token).toBeTruthy();
  });
});
