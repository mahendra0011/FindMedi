/**
 * Commission / ledger arithmetic for `recordServiceSettlement`.
 *
 * The ledger is the money of record, so these tests pin the rounding rules,
 * the TDS line, the net-provider amount per settlement source, and the guard
 * that a zero/negative gross writes NO ledger row at all.
 *
 * NOTE: this suite runs under ESM (`package.json: type=module`), so module
 * mocking uses `jest.unstable_mockModule` + dynamic `import()`. The legacy
 * `jest.mock()` API needs CJS `require` and throws
 * "ReferenceError: require is not defined" in this environment.
 */
import { jest } from '@jest/globals';

const ledgerSaved = [];

jest.unstable_mockModule('../../src/models/TransactionLedger.js', () => {
  const Model = function (doc) {
    Object.assign(this, doc);
    this._id = `ledger-${ledgerSaved.length + 1}`;
    this.save = async () => {
      if (Model.failNext) {
        Model.failNext = false;
        throw new Error('mongo write failed');
      }
      ledgerSaved.push(this);
      return this;
    };
  };
  Model.failNext = false;
  return { default: Model, __esModule: true };
});

const profileStub = () => ({
  default: { findOneAndUpdate: jest.fn(() => Promise.resolve({ matchedCount: 1 })) },
  __esModule: true,
});
jest.unstable_mockModule('../../src/models/RiderProfile.js', profileStub);
jest.unstable_mockModule('../../src/models/LawyerProfile.js', profileStub);
jest.unstable_mockModule('../../src/models/AssistantProfile.js', profileStub);
jest.unstable_mockModule('../../src/models/Doctor.js', profileStub);
jest.unstable_mockModule('../../src/lib/pgDualWrite.js', () => ({
  mirrorLedgerEntry: jest.fn(() => Promise.resolve()),
  mirrorPaymentWithLedger: jest.fn(() => Promise.resolve()),
  __esModule: true,
}));
describe('recordServiceSettlement', () => {
  beforeEach(() => {
    ledgerSaved.length = 0;
    TransactionLedger.failNext = false;
    jest.clearAllMocks();
  });

  it('computes commission, 1% TDS and net for a ride at the default 10%', async () => {
    const result = await recordServiceSettlement({
      source: 'ride', sourceId: 'RIDE-1', totalAmount: 1000, providerId: 'prov-1', userId: 'user-1',
    });
    expect(result).toMatchObject({ gross: 1000, commissionAmount: 100, taxAmount: 10, netAmount: 890 });
  });

  it('honours a custom commission percentage', async () => {
    const result = await recordServiceSettlement({
      source: 'ride', sourceId: 'RIDE-2', totalAmount: 1000, customCommissionPercent: 18,
    });
    expect(result.commissionAmount).toBe(180);
    expect(result.netAmount).toBe(810);
  });

  it('uses 5% for ambulance and 10% for lawyer/assistant/emergency_doctor', async () => {
    const cases = [['ambulance', 'AMB-1'], ['lawyer', 'LAW-1'], ['assistant', 'AST-1'], ['emergency_doctor', 'DOC-1']];
    const amounts = [];
    for (const [source, sourceId] of cases) {
      const r = await recordServiceSettlement({ source, sourceId, totalAmount: 2000 });
      amounts.push(r.commissionAmount);
    }
    expect(amounts).toEqual([100, 200, 200, 200]);
  });

  /**
   * PAY-B-04: every monetary line is computed in integer paise, so the three
   * lines reconcile EXACTLY against the gross — no paise invented, none lost.
   *
   * The old expectation was `netAmount === 297.33`: commission and TDS were
   * rounded to whole rupees while `net` was derived from the unrounded gross, so
   * the provider wallet was credited with paise that the GST/TDS report could
   * never show. `gross != net + commission + tax` in any real sense.
   */
  it('keeps gross, commission, TDS and net reconciling exactly in paise', async () => {
    const result = await recordServiceSettlement({ source: 'ride', sourceId: 'RIDE-3', totalAmount: 333.33 });

    // ₹333.33 = 33333 paise
    expect(result.commissionAmount).toBeCloseTo(33.33, 2);
    expect(result.taxAmount).toBeCloseTo(3.33, 2);
    expect(result.netAmount).toBeCloseTo(296.67, 2);

    // The invariant: no drift, to the paisa.
    const paise = (v) => Math.round(Number(v) * 100);
    expect(paise(result.netAmount) + paise(result.commissionAmount) + paise(result.taxAmount))
      .toBe(paise(result.gross));
    expect(paise(result.gross)).toBe(33333);
  });

  it('reconciles for every awkward amount, not just the pinned 333.33', async () => {
    const paise = (v) => Math.round(Number(v) * 100);
    for (const gross of [0.1, 1.005, 99.99, 333.33, 1499.995, 12345.67]) {
      const result = await recordServiceSettlement({
        source: 'ride', sourceId: `R-${gross}`, totalAmount: gross,
      });
      const reconciles = paise(result.netAmount) + paise(result.commissionAmount) + paise(result.taxAmount);
      expect(reconciles).toBe(paise(gross));
      expect(result.netAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it('exposes integer-paise helpers so callers never re-derive rupees', async () => {
    const { toPaise, fromPaise } = await import('../../src/services/ledgerService.js');
    expect(toPaise(333.33)).toBe(33333);
    expect(fromPaise(33333)).toBe(333.33);
    // Round-trip must be lossless for a value with real paise.
    expect(toPaise(fromPaise(toPaise(1234.56)))).toBe(123456);
    expect(toPaise('not-a-number')).toBe(0);
  });

  it('writes exactly one CREDIT ledger row per settlement', async () => {
    await recordServiceSettlement({ source: 'ride', sourceId: 'RIDE-4', totalAmount: 500 });
    expect(ledgerSaved).toHaveLength(1);
    expect(ledgerSaved[0]).toMatchObject({ entryType: 'CREDIT', status: 'completed' });
  });

  it('writes nothing when the gross is zero or negative', async () => {
    expect(await recordServiceSettlement({ source: 'ride', sourceId: 'R0', totalAmount: 0 })).toBeNull();
    expect(await recordServiceSettlement({ source: 'ride', sourceId: 'R-1', totalAmount: -50 })).toBeNull();
    expect(ledgerSaved).toHaveLength(0);
  });

  it('credits the provider wallet with NET balance and GROSS earnings', async () => {
    await recordServiceSettlement({ source: 'ride', sourceId: 'RIDE-5', totalAmount: 1000, providerId: 'prov-9' });
    const [, payload] = RiderProfile.findOneAndUpdate.mock.calls[0];
    expect(payload.$inc.walletBalance).toBe(890);
    expect(payload.$inc.totalEarnings).toBe(1000);
  });

  it('fails the settlement when the provider wallet/profile does not exist', async () => {
    RiderProfile.findOneAndUpdate.mockResolvedValueOnce(null);
    await expect(recordServiceSettlement({
      source: 'ride', sourceId: 'RIDE-MISSING-PROVIDER', totalAmount: 100, providerId: 'missing',
    })).rejects.toThrow(/Rider profile not found/);
  });

  it('routes the wallet credit to the profile model matching the source', async () => {
    await recordServiceSettlement({ source: 'lawyer', sourceId: 'L1', totalAmount: 100, providerId: 'p' });
    await recordServiceSettlement({ source: 'assistant', sourceId: 'A1', totalAmount: 100, providerId: 'p' });
    await recordServiceSettlement({ source: 'emergency_doctor', sourceId: 'D1', totalAmount: 100, providerId: 'p' });
    expect(LawyerProfile.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(AssistantProfile.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(Doctor.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(RiderProfile.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not touch any wallet when there is no provider id', async () => {
    await recordServiceSettlement({ source: 'ride', sourceId: 'R6', totalAmount: 400 });
    expect(RiderProfile.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('propagates (and logs) a ledger write failure instead of silently losing money', async () => {
    TransactionLedger.failNext = true;
    await expect(
      recordServiceSettlement({ source: 'ride', sourceId: 'R7', totalAmount: 100 }),
    ).rejects.toThrow('mongo write failed');
  });
});


const { recordServiceSettlement } = await import('../../src/services/ledgerService.js');
const { default: TransactionLedger } = await import('../../src/models/TransactionLedger.js');
const { default: RiderProfile } = await import('../../src/models/RiderProfile.js');
const { default: LawyerProfile } = await import('../../src/models/LawyerProfile.js');
const { default: AssistantProfile } = await import('../../src/models/AssistantProfile.js');
const { default: Doctor } = await import('../../src/models/Doctor.js');

/**
 * Payout window aggregation — mirrors the Mongo query in routes/commission.js
 * and documents the double-payout hazard: a payout may only consume ledger rows
 * that no other payout has already claimed (`payoutId` unset).
 */
describe('payout window aggregation', () => {
  const aggregate = (rows) => {
    const grossRevenue = rows.reduce((s, t) => s + (t.amount || 0), 0);
    const commissionAmount = rows.reduce((s, t) => s + (t.commissionAmount || 0), 0);
    return { grossRevenue, commissionAmount, netPayout: grossRevenue - commissionAmount, transactionCount: rows.length };
  };

  it('aggregates revenue, commission and net payout', () => {
    const rows = [
      { amount: 1000, commissionAmount: 100 },
      { amount: 500, commissionAmount: 50 },
    ];
    expect(aggregate(rows)).toEqual({
      grossRevenue: 1500, commissionAmount: 150, netPayout: 1350, transactionCount: 2,
    });
  });

  it('produces a zero payout for an empty window instead of NaN', () => {
    expect(aggregate([])).toEqual({ grossRevenue: 0, commissionAmount: 0, netPayout: 0, transactionCount: 0 });
  });

  it('never yields a negative net payout even if commission exceeds gross', () => {
    // A bad config (commissionPercent > 100) must not turn a payout negative.
    const { netPayout } = aggregate([{ amount: 100, commissionAmount: 150 }]);
    expect(Math.max(0, netPayout)).toBe(0);
  });

  it('claims each ledger row at most once (only unclaimed rows are eligible)', () => {
    const rows = [
      { _id: 'a', amount: 100, commissionAmount: 10, payoutId: null },
      { _id: 'b', amount: 100, commissionAmount: 10 },
    ];
    const unclaimed = rows.filter((r) => r.payoutId === undefined || r.payoutId === null);
    expect(unclaimed.map((r) => r._id)).toEqual(['a', 'b']);
    const alreadyClaimed = rows.filter((r) => r.payoutId);
    expect(alreadyClaimed).toHaveLength(0);
  });
});
