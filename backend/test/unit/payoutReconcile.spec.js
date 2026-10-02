/**
 * PAY-M-03: payout-vs-settlement reconciliation (report + mismatch alert).
 *
 * The finding: payouts are created by claiming completed ledger rows, then
 * approved four-eyes and paid — but nothing ever re-derived the numbers
 * afterwards, so three failure modes were invisible: a payout whose totals do
 * not match the rows carrying its id, revenue that sits unclaimed forever, and
 * `CommissionConfig.pendingPayout` drifting when a payout is cancelled. This
 * suite pins the report engine, the daily job's alert path, and the wiring
 * (route + scheduler), because a reconciliation nobody can run is the same as
 * no reconciliation.
 *
 * It also pins the root-cause bug found while building it: the claim query used
 * `payoutId: { $exists: false }`, but the field has `default: null`, so every
 * row is written with the field present — each payout claimed ZERO rows and
 * the mismatch it would have caused was never detected (the report engine now
 * exists precisely to catch that class of bug).
 *
 * The Payout / TransactionLedger / CommissionConfig collections are in-memory
 * fakes honouring ONLY the query shapes the service uses; an unsupported
 * operator or $group form throws, so a query-shape change fails loudly instead
 * of passing against a mock that ignores filters.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';

// in-memory collections

const payoutStore = [];
const ledgerStore = [];
const configStore = [];

const getPath = (o, p) => p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
// Mongo treats a missing field as null for equality/$ne purposes.
const norm = (v) => (v === undefined ? null : v);

const matchesCond = (val, cond) => {
  if (cond !== null && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case '$in': return arg.includes(norm(val));
        case '$ne': return norm(val) !== norm(arg);
        case '$lte': return norm(val) !== null && val <= arg;
        case '$lt': return norm(val) !== null && val < arg;
        case '$gte': return norm(val) !== null && val >= arg;
        case '$gt': return norm(val) !== null && val > arg;
        default: throw new Error(`payoutReconcile fake: unsupported operator ${op}`);
      }
    });
  }
  return norm(val) === norm(cond);
};

const matchesFilter = (doc, filter) =>
  doc != null && Object.entries(filter).every(([key, cond]) => matchesCond(getPath(doc, key), cond));

const queryChain = (docs) => {
  const q = {
    select: () => q, lean: () => q, sort: () => q, limit: () => q, skip: () => q,
    then: (resolve, reject) => Promise.resolve(docs).then(resolve, reject),
  };
  return q;
};

/**
 * Minimal engine: $match + $group with a `'$field'` id ref and
 * `{$sum: 1 | '$field'}` accumulators — exactly what the service emits.
 * Anything else throws, so a pipeline change cannot silently pass here.
 */
const aggregate = (store) => async (pipeline) => {
  let rows = [...store];
  for (const stage of pipeline) {
    if (stage.$match) {
      rows = rows.filter((r) => matchesFilter(r, stage.$match));
      continue;
    }
    if (stage.$group) {
      const { _id: idExpr, ...accs } = stage.$group;
      if (typeof idExpr !== 'string' || !idExpr.startsWith('$')) {
        throw new Error(`payoutReconcile fake: unsupported _id expr ${JSON.stringify(idExpr)}`);
      }
      const idField = idExpr.slice(1);
      const groups = new Map();
      for (const r of rows) {
        const idVal = norm(getPath(r, idField));
        const key = JSON.stringify(idVal);
        let g = groups.get(key);
        if (!g) { g = { _id: idVal }; for (const k of Object.keys(accs)) g[k] = 0; groups.set(key, g); }
        for (const [k, expr] of Object.entries(accs)) {
          if (expr === 1) { g[k] += 1; continue; }
          if (expr && typeof expr === 'object' && expr.$sum !== undefined) {
            if (expr.$sum === 1) { g[k] += 1; continue; }
            const field = String(expr.$sum).slice(1);
            const v = getPath(r, field);
            g[k] += typeof v === 'number' ? v : 0; // Mongo: null/non-numeric contributes 0
            continue;
          }
          throw new Error(`payoutReconcile fake: unsupported accumulator ${k}`);
        }
      }
      rows = [...groups.values()];
      continue;
    }
    throw new Error(`payoutReconcile fake: unsupported stage ${Object.keys(stage)[0]}`);
  }
  return rows;
};

const payoutModel = {
  find: (filter) => queryChain(payoutStore.filter((d) => matchesFilter(d, filter))),
  aggregate: aggregate(payoutStore),
};
const ledgerModel = {
  find: (filter) => queryChain(ledgerStore.filter((d) => matchesFilter(d, filter))),
  aggregate: aggregate(ledgerStore),
};
const configModel = {
  find: () => queryChain([...configStore]),
};

// module mocks

const auditLogMock = jest.fn();
const createNotificationMock = jest.fn();
const userFindMock = jest.fn();
const loggerMock = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

jest.unstable_mockModule('../../src/models/Payout.js', () => ({ default: payoutModel }));
jest.unstable_mockModule('../../src/models/TransactionLedger.js', () => ({ default: ledgerModel }));
jest.unstable_mockModule('../../src/models/CommissionConfig.js', () => ({ default: configModel }));
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: { find: userFindMock } }));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: auditLogMock }));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: {},
  createNotification: createNotificationMock,
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: loggerMock }));

const { reconcilePayouts, unsweptGraceMs } = await import('../../src/services/payoutReconcile.js');
const job = await import('../../src/jobs/payoutReconcile.job.js');

// fixtures

const now = new Date('2026-06-15T12:00:00.000Z');
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

/**
 * A consistent world: payout p1 claims exactly two rows whose sums equal its
 * totals, config.pendingPayout equals the pending sum, and the only unclaimed
 * rows are recent (inside grace) or not completed — none should be flagged.
 */
function seedClean() {
  payoutStore.push({
    _id: 'p1', facilityId: 'f1', grossRevenue: 100, commissionAmount: 10,
    netPayout: 90, transactionCount: 2, status: 'pending', createdAt: daysAgo(1),
  });
  ledgerStore.push(
    { _id: 'l1', facilityId: 'f1', amount: 60, commissionAmount: 5, netAmount: 54, status: 'completed', payoutId: 'p1', createdAt: daysAgo(2) },
    { _id: 'l2', facilityId: 'f1', amount: 40, commissionAmount: 5, netAmount: 35, status: 'completed', payoutId: 'p1', createdAt: daysAgo(2) },
    // unclaimed but INSIDE the 3-day grace — must not be flagged
    { _id: 'l3', facilityId: 'f1', amount: 999, commissionAmount: 99, status: 'completed', payoutId: null, createdAt: daysAgo(1) },
    // old but NOT completed — must not be flagged as unswept revenue
    { _id: 'l4', facilityId: 'f1', amount: 777, commissionAmount: 0, status: 'failed', payoutId: null, createdAt: daysAgo(10) },
  );
  configStore.push({ facilityId: 'f1', facilityName: 'Apollo', pendingPayout: 90 });
}

beforeEach(() => {
  jest.clearAllMocks();
  payoutStore.length = 0;
  ledgerStore.length = 0;
  configStore.length = 0;
  userFindMock.mockReturnValue(queryChain([{ _id: 's1' }, { _id: 's2' }]));
});

afterEach(() => {
  delete process.env.PAYOUT_UNSWEPT_GRACE_DAYS;
});

// the report engine

describe('PAY-M-03 report: claimed rows vs payout totals', () => {
  it('reports a clean bill when totals match the claimed rows, and ignores recent/unsettled unclaimed rows', async () => {
    seedClean();
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(true);
    expect(report.mismatches).toEqual([]);
    expect(report.counts).toMatchObject({ payoutsChecked: 1, configsChecked: 1, mismatchCount: 0 });
  });

  it('flags a payout whose totals do not match the rows carrying its id, with signed deltas', async () => {
    seedClean();
    payoutStore[0].grossRevenue = 150; // rows sum to 100
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(false);
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      type: 'claimed-mismatch',
      payoutId: 'p1',
      facilityId: 'f1',
      status: 'pending',
      expected: { gross: 150, commission: 10, count: 2 },
      actual: { gross: 100, commission: 10, count: 2 },
      delta: { gross: -50, commission: 0, count: 0 },
    });
  });

  it('flags a payout claiming ZERO rows while its totals are non-zero (the $exists:false symptom)', async () => {
    seedClean();
    // no row carries payoutId 'p1' anymore — exactly what the old claim query produced
    ledgerStore.forEach((r) => { if (r.payoutId === 'p1') r.payoutId = null; });
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(false);
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      type: 'claimed-mismatch',
      payoutId: 'p1',
      actual: { gross: 0, commission: 0, count: 0 },
      delta: { gross: -100, commission: -10, count: -2 },
    });
  });
});

describe('PAY-M-03 report: dangling claims', () => {
  it('flags rows referencing a payout that does not exist', async () => {
    seedClean();
    ledgerStore.push({ _id: 'lX', facilityId: 'f1', amount: 7, commissionAmount: 1, status: 'completed', payoutId: 'pGone', createdAt: daysAgo(1) });
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(false);
    expect(report.mismatches).toEqual([
      expect.objectContaining({
        type: 'dangling-claim',
        payoutId: 'pGone',
        actual: { gross: 7, commission: 1, count: 1 },
      }),
    ]);
  });

  it('does not flag rows claiming an older payout that is outside the check window but still exists', async () => {
    seedClean();
    payoutStore.push({
      _id: 'pOld', facilityId: 'f1', grossRevenue: 10, commissionAmount: 1,
      netPayout: 9, transactionCount: 1, status: 'paid', createdAt: daysAgo(200),
    });
    ledgerStore.push({ _id: 'lOld', facilityId: 'f1', amount: 10, commissionAmount: 1, status: 'completed', payoutId: 'pOld', createdAt: daysAgo(200) });
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(true);
    expect(report.mismatches).toEqual([]);
  });
});

describe('PAY-M-03 report: unswept revenue', () => {
  it('flags completed rows older than the grace window, grouped by facility', async () => {
    seedClean();
    ledgerStore.push({ _id: 'l5', facilityId: 'f2', amount: 500, commissionAmount: 50, status: 'completed', payoutId: null, createdAt: daysAgo(10) });
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(false);
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      type: 'unswept-revenue',
      facilityId: 'f2',
      gross: 500,
      commission: 50,
      count: 1,
    });
    expect(report.mismatches[0].note).toContain('never claimed');
    expect(report.totals).toEqual({ unsweptGross: 500, unsweptRows: 1 });
  });

  it('surfaces rows that never got a facility stamp as unattributed instead of hiding them', async () => {
    seedClean();
    ledgerStore.push({ _id: 'l6', facilityId: null, amount: 40, commissionAmount: 4, status: 'completed', payoutId: null, createdAt: daysAgo(10) });
    const report = await reconcilePayouts({ now });
    expect(report.mismatches[0]).toMatchObject({ type: 'unswept-revenue', facilityId: null, gross: 40, count: 1 });
    expect(report.mismatches[0].note).toContain('no facilityId');
  });

  it('honours PAYOUT_UNSWEPT_GRACE_DAYS', async () => {
    seedClean();
    process.env.PAYOUT_UNSWEPT_GRACE_DAYS = '10';
    ledgerStore.push(
      { _id: 'l7', facilityId: 'f2', amount: 100, commissionAmount: 0, status: 'completed', payoutId: null, createdAt: daysAgo(5) },
      { _id: 'l8', facilityId: 'f2', amount: 200, commissionAmount: 0, status: 'completed', payoutId: null, createdAt: daysAgo(15) },
    );
    const report = await reconcilePayouts({ now });
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({ facilityId: 'f2', gross: 200, count: 1 });
    expect(unsweptGraceMs()).toBe(10 * 24 * 60 * 60 * 1000);
  });
});

describe('PAY-M-03 report: pending-drift', () => {
  it('flags config.pendingPayout that does not equal the sum of pending payouts', async () => {
    seedClean();
    configStore[0].pendingPayout = 500; // pending payouts actually sum to 90
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(false);
    expect(report.mismatches).toEqual([
      expect.objectContaining({
        type: 'pending-drift',
        facilityId: 'f1',
        facilityName: 'Apollo',
        expected: 90,
        actual: 500,
        delta: 410,
        pendingCount: 1,
      }),
    ]);
  });

  it('flags pending payouts for a facility with no CommissionConfig at all', async () => {
    seedClean();
    // consistent payout for an unconfigured facility: totals match its claimed
    // row, so ONLY the missing-config drift fires
    payoutStore.push({
      _id: 'p9', facilityId: 'f9', grossRevenue: 30, commissionAmount: 5,
      netPayout: 25, transactionCount: 1, status: 'pending', createdAt: daysAgo(3),
    });
    ledgerStore.push({ _id: 'l9', facilityId: 'f9', amount: 30, commissionAmount: 5, status: 'completed', payoutId: 'p9', createdAt: daysAgo(3) });
    const report = await reconcilePayouts({ now });
    expect(report.ok).toBe(false);
    expect(report.mismatches).toEqual([
      expect.objectContaining({
        type: 'pending-drift',
        facilityId: 'f9',
        expected: 25,
        actual: 0,
        delta: -25,
        pendingCount: 1,
        note: expect.stringContaining('no CommissionConfig'),
      }),
    ]);
  });
});

// the daily job and its alert path

describe('PAY-M-03 daily job: mismatch alert', () => {
  it('stays quiet when the report passes', async () => {
    seedClean();
    const report = await job.runPayoutReconcileOnce(now);
    expect(report.ok).toBe(true);
    expect(auditLogMock).not.toHaveBeenCalled();
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it('audits the mismatch and notifies every active superadmin exactly once per day', async () => {
    seedClean();
    configStore[0].pendingPayout = 500;
    const report = await job.runPayoutReconcileOnce(now);
    expect(report.ok).toBe(false);

    expect(auditLogMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock).toHaveBeenCalledWith(
      'payout.recon_mismatch',
      'system',
      expect.objectContaining({
        mismatchCount: 1,
        byType: { 'pending-drift': 1 },
        mismatches: [expect.objectContaining({ type: 'pending-drift' })],
      }),
    );

    expect(createNotificationMock).toHaveBeenCalledTimes(2); // s1 + s2
    for (const call of createNotificationMock.mock.calls) {
      expect(call[0]).toMatchObject({
        type: 'billing',
        priority: 'normal',
        title: 'Payout reconciliation mismatch',
        actor: 'payoutReconcileJob',
      });
      expect(call[0].dedupKey).toMatch(/^payout-recon:\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// wiring

describe('PAY-M-03 wiring', () => {
  const indexSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');
  const commissionSrc = fs.readFileSync(new URL('../../src/routes/commission.js', import.meta.url), 'utf8');

  it('index.js actually starts the daily reconciliation', () => {
    expect(indexSrc).toContain('payoutReconcile.job.js');
    expect(indexSrc).toContain('startPayoutReconcile(');
  });

  it('commission.js exposes the on-demand report as a superadmin route', () => {
    expect(commissionSrc).toContain("router.get('/recon', protect, superadminOnly,");
    expect(commissionSrc).toContain('reconcilePayouts');
  });

  it('the payout claim query no longer uses $exists:false (rows are written with payoutId:null)', () => {
    expect(commissionSrc).not.toContain('payoutId: { $exists: false }');
    expect(commissionSrc).toContain('payoutId: null,');
  });
});
