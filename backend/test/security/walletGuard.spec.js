/**
 * PAY-M-02: wallet withdrawal limits, KYC state, velocity freeze.
 *
 * The withdrawal route previously enforced exactly one rule (balance ≥ amount
 * + ₹100), so the finding's three asks — limits, velocity checks, freeze —
 * were all absent. This suite pins the guard service that now carries them,
 * and the route wiring, because a guard nobody calls is the same as no guard
 * (the failure mode that produced NOTIF-M-03 in the same backlog).
 *
 * The WalletGuard collection is an in-memory fake that honours ONLY the query
 * shapes the service uses; an unsupported operator throws, so a query-shape
 * change fails loudly instead of passing against a mock that ignores filters.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';

// ── in-memory WalletGuard collection ─────────────────────────────────────────

const guardStore = new Map();

const getPath = (o, p) => p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
const setPath = (o, p, val) => {
  const ks = p.split('.');
  let cur = o;
  for (const k of ks.slice(0, -1)) {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[ks[ks.length - 1]] = val;
};
const norm = (v) => (v === undefined ? null : v);

const matchesCond = (val, cond) => {
  if (cond !== null && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case '$ne': return norm(val) !== norm(arg);
        case '$lte': return norm(val) !== null && val <= arg;
        case '$lt': return norm(val) !== null && val < arg;
        case '$gte': return norm(val) !== null && val >= arg;
        case '$gt': return norm(val) !== null && val > arg;
        default: throw new Error(`walletGuard fake: unsupported operator ${op}`);
      }
    });
  }
  return norm(val) === norm(cond);
};

const matchesFilter = (doc, filter) =>
  doc != null && Object.entries(filter).every(([key, cond]) => matchesCond(getPath(doc, key), cond));

const applyUpdate = (doc, update) => {
  for (const [k, v] of Object.entries({ ...(update.$setOnInsert || {}), ...(update.$set || {}) })) {
    setPath(doc, k, v);
  }
  for (const [k, v] of Object.entries(update.$inc || {})) {
    setPath(doc, k, (getPath(doc, k) || 0) + v);
  }
};

// Defaults the schema would apply on insert (setDefaultsOnInsert).
const newDoc = (userId) => ({
  userId,
  kycStatus: 'unverified',
  frozen: { active: false, reason: '', by: 'system' },
  daily: { dayKey: '', amount: 0, count: 0 },
  hourly: { hourKey: '', count: 0 },
});

const leanable = (value) => ({ lean: () => value, then: (res, rej) => Promise.resolve(value).then(res, rej) });

const guardModel = {
  findOne: (filter) => leanable(guardStore.get(filter.userId) || null),
  findOneAndUpdate: (filter, update, opts = {}) => leanable((() => {
    let doc = guardStore.get(filter.userId);
    if (!doc) {
      if (!opts.upsert) return null;
      doc = newDoc(filter.userId);
      guardStore.set(filter.userId, doc);
    }
    applyUpdate(doc, update);
    return doc;
  })()),
  updateOne: async (filter, update) => {
    const doc = [...guardStore.values()].find((d) => matchesFilter(d, filter));
    if (!doc) return { modifiedCount: 0 };
    applyUpdate(doc, update);
    return { modifiedCount: 1 };
  },
};

const auditLog = jest.fn(async () => {});

jest.unstable_mockModule('../../src/models/WalletGuard.js', () => ({ default: guardModel }));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog,
  scrubAuditDetails: (v) => v,
}));

const svc = await import('../../src/services/walletGuard.js');
const {
  walletLimits,
  dayKeyOf,
  hourKeyOf,
  checkWithdrawal,
  claimBudget,
  releaseBudget,
  freezeWallet,
  unfreezeWallet,
  setKycStatus,
} = svc;

// ── fixtures ─────────────────────────────────────────────────────────────────

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-10-01T12:00:00Z'); // 17:30 IST
const USER = 'provider-1';

const GUARD_ENV = ['WALLET_MAX_PER_TXN', 'WALLET_DAILY_CAP', 'WALLET_HOURLY_MAX_COUNT', 'WALLET_KYC_REQUIRED'];

beforeEach(() => {
  guardStore.clear();
  auditLog.mockReset();
  for (const k of GUARD_ENV) delete process.env[k];
});

afterEach(() => {
  for (const k of GUARD_ENV) delete process.env[k];
});

// ── 1. limits ────────────────────────────────────────────────────────────────

describe('PAY-M-02 limits', () => {
  it('ships sane defaults and honours env overrides', () => {
    expect(walletLimits()).toEqual({ perTxn: 20000, daily: 50000, hourlyMaxCount: 5, kycRequired: false });
    process.env.WALLET_MAX_PER_TXN = '5000';
    process.env.WALLET_DAILY_CAP = '9000';
    process.env.WALLET_HOURLY_MAX_COUNT = '2';
    expect(walletLimits()).toEqual({ perTxn: 5000, daily: 9000, hourlyMaxCount: 2, kycRequired: false });
  });

  it('keys windows in IST regardless of host zone', () => {
    expect(dayKeyOf(NOW)).toBe('2026-10-01');
    expect(hourKeyOf(NOW)).toBe('2026-10-01-17');
  });

  it('rejects an amount above the per-transaction cap before anything is claimed', async () => {
    const res = await checkWithdrawal({ userId: USER, amount: 25000, now: NOW });
    expect(res).toMatchObject({ allowed: false, code: 400, reason: 'per-txn-limit' });
    expect(guardStore.get(USER).daily.amount).toBe(0);
  });

  it('refuses the withdrawal that would cross the daily cap, and allows it again tomorrow', async () => {
    process.env.WALLET_DAILY_CAP = '50000';
    expect(await claimBudget({ userId: USER, amount: 15000, now: NOW })).toMatchObject({ allowed: true });
    expect(await claimBudget({ userId: USER, amount: 15000, now: NOW })).toMatchObject({ allowed: true });
    expect(await claimBudget({ userId: USER, amount: 15000, now: NOW })).toMatchObject({ allowed: true });

    const over = await claimBudget({ userId: USER, amount: 15000, now: NOW });
    expect(over).toMatchObject({ allowed: false, reason: 'daily-cap' });
    expect(guardStore.get(USER).daily.amount).toBe(45000);

    // next IST day: the window rolls and the cap is fresh again
    const tomorrow = new Date(NOW.getTime() + 25 * HOUR);
    expect(await claimBudget({ userId: USER, amount: 15000, now: tomorrow })).toMatchObject({ allowed: true });
    expect(guardStore.get(USER).daily.amount).toBe(15000);
  });

  it('releaseBudget gives the quota back (failed balance debit) and cannot go negative', async () => {
    await claimBudget({ userId: USER, amount: 5000, now: NOW });
    expect(guardStore.get(USER).daily).toMatchObject({ amount: 5000, count: 1 });
    expect(guardStore.get(USER).hourly.count).toBe(1);

    await releaseBudget({ userId: USER, amount: 5000, now: NOW });
    expect(guardStore.get(USER).daily).toMatchObject({ amount: 0, count: 0 });
    expect(guardStore.get(USER).hourly.count).toBe(0);

    // double release (two failure paths racing) must not drive counters below 0
    await releaseBudget({ userId: USER, amount: 5000, now: NOW });
    expect(guardStore.get(USER).daily.amount).toBe(0);
    expect(guardStore.get(USER).hourly.count).toBe(0);
  });
});

// ── 2. velocity freeze ───────────────────────────────────────────────────────

describe('PAY-M-02 velocity check freezes on anomaly', () => {
  it('allows exactly hourlyMaxCount withdrawals, then freezes on the next attempt', async () => {
    process.env.WALLET_HOURLY_MAX_COUNT = '3';
    for (let i = 0; i < 3; i += 1) {
      expect(await claimBudget({ userId: USER, amount: 1000, now: NOW })).toMatchObject({ allowed: true });
    }
    expect(guardStore.get(USER).hourly.count).toBe(3);

    const over = await claimBudget({ userId: USER, amount: 1000, now: NOW });
    expect(over).toMatchObject({ allowed: false, reason: 'velocity-freeze', frozen: true });

    const guard = guardStore.get(USER);
    expect(guard.frozen.active).toBe(true);
    expect(guard.frozen.reason).toBe('velocity');
    expect(auditLog).toHaveBeenCalledWith('wallet.freeze', USER, expect.objectContaining({ reason: 'velocity' }));

    // the freeze is now enforced as a policy, not just remembered
    const pre = await checkWithdrawal({ userId: USER, amount: 1000, now: NOW });
    expect(pre).toMatchObject({ allowed: false, code: 403, reason: 'wallet-frozen' });
  });

  it('the hour window rolls without unfreezing — freeze is deliberate, not time-based', async () => {
    process.env.WALLET_HOURLY_MAX_COUNT = '1';
    await claimBudget({ userId: USER, amount: 1000, now: NOW });
    await claimBudget({ userId: USER, amount: 1000, now: NOW }); // freezes
    expect(guardStore.get(USER).frozen.active).toBe(true);

    const later = new Date(NOW.getTime() + 2 * HOUR);
    const pre = await checkWithdrawal({ userId: USER, amount: 1000, now: later });
    expect(pre).toMatchObject({ allowed: false, reason: 'wallet-frozen' });
  });

  it('an admin unfreeze releases the wallet and is audited', async () => {
    await freezeWallet(USER, 'velocity', 'system', { hourlyCount: 9 });
    expect(guardStore.get(USER).frozen.active).toBe(true);

    expect(await unfreezeWallet(USER, 'superadmin-1')).toBe(true);
    expect(guardStore.get(USER).frozen.active).toBe(false);
    expect(auditLog).toHaveBeenCalledWith('wallet.unfreeze', USER, { by: 'superadmin-1' });

    const pre = await checkWithdrawal({ userId: USER, amount: 1000, now: NOW });
    expect(pre.allowed).toBe(true);
  });

  it('a second freeze does not overwrite the first reason (the original anomaly is the evidence)', async () => {
    await freezeWallet(USER, 'velocity', 'system', { hourlyCount: 6 });
    const again = await freezeWallet(USER, 'manual', 'someone-else');
    expect(again).toBe(false);
    expect(guardStore.get(USER).frozen.reason).toBe('velocity');
    expect(auditLog).toHaveBeenCalledTimes(1);
  });
});

// ── 3. KYC state ─────────────────────────────────────────────────────────────

describe('PAY-M-02 KYC state', () => {
  it('defaults to unverified and does NOT block withdrawals until KYC enforcement is on', async () => {
    const pre = await checkWithdrawal({ userId: USER, amount: 1000, now: NOW });
    expect(pre.allowed).toBe(true);
    expect(pre.guard.kycStatus).toBe('unverified');
  });

  it('with WALLET_KYC_REQUIRED=true an unverified wallet is refused', async () => {
    process.env.WALLET_KYC_REQUIRED = 'true';
    const pre = await checkWithdrawal({ userId: USER, amount: 1000, now: NOW });
    expect(pre).toMatchObject({ allowed: false, code: 403, reason: 'kyc-required' });
  });

  it('verification (superadmin) flips the wallet to allowed and is audited', async () => {
    process.env.WALLET_KYC_REQUIRED = 'true';
    expect((await checkWithdrawal({ userId: USER, amount: 1000, now: NOW })).reason).toBe('kyc-required');

    const guard = await setKycStatus(USER, 'verified', 'superadmin-1');
    expect(guard.kycStatus).toBe('verified');
    expect(guard.kycVerifiedBy).toBe('superadmin-1');
    expect(auditLog).toHaveBeenCalledWith('wallet.kyc', USER, { status: 'verified', actor: 'superadmin-1' });

    expect((await checkWithdrawal({ userId: USER, amount: 1000, now: NOW })).allowed).toBe(true);
  });

  it('a rejected KYC stays refused when enforcement is on', async () => {
    process.env.WALLET_KYC_REQUIRED = 'true';
    await setKycStatus(USER, 'rejected', 'superadmin-1');
    const pre = await checkWithdrawal({ userId: USER, amount: 1000, now: NOW });
    expect(pre).toMatchObject({ allowed: false, reason: 'kyc-required' });
  });
});

// ── 4. wiring: a guard nobody calls is no guard ──────────────────────────────

describe('PAY-M-02 wiring', () => {
  const txSrc = fs.readFileSync(new URL('../../src/routes/transactions.js', import.meta.url), 'utf8');
  const idxSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');

  it('the withdraw route runs the guard BEFORE the balance moves and releases on debit failure', () => {
    expect(txSrc).toContain('checkWithdrawal');
    expect(txSrc).toContain('claimBudget');
    expect(txSrc).toContain('releaseBudget');
    // ordering: guards first, then the balance $gte/$inc debit
    const guardAt = txSrc.indexOf('await checkWithdrawal(');
    const debitAt = txSrc.indexOf('walletBalance: { $gte: amount + MIN_RESERVE }');
    const releaseAt = txSrc.indexOf('await releaseBudget(');
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(debitAt);
    expect(releaseAt).toBeGreaterThan(debitAt);
  });

  it('the wallet-guards router is mounted', () => {
    expect(idxSrc).toContain("app.use('/api/wallet-guards', walletGuardRoutes)");
  });

  it('new routes classify correctly under the repo authz grammar', async () => {
    const { buildInventory } = await import('../../scripts/lib/authzClassify.mjs');
    const { fileURLToPath } = await import('node:url');
    const rows = buildInventory(fileURLToPath(new URL('../../src/routes', import.meta.url)))
      .filter((r) => r.file === 'walletGuards.js');
    // scanRoutes keeps the quotes in rawTarget — this suite must speak the
    // classifier's own dialect rather than a prettier version of it.
    const byKey = Object.fromEntries(rows.map((r) => [`${r.method} ${r.target}`, r.tag]));
    expect(byKey).toEqual({
      "GET '/me'": 'self',
      "GET '/:userId'": 'role',
      "PUT '/:userId'": 'role',
    });
    expect(rows.every((r) => r.tag !== 'unclassified')).toBe(true);
  });
});
