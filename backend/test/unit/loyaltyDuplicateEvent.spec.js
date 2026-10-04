/**
 * LOY-M-01: cross-module duplicate-event guard + ledger reconciliation.
 * earnPoints must be idempotent per (user, action, refId); reconcileBalance
 * must derive truth from the ledger so a drifted cached balance is detectable.
 */
import { jest } from '@jest/globals';

const ledgerFindOne = jest.fn();
const ledgerFind = jest.fn();
const ledgerCreate = jest.fn();
const ruleFindOne = jest.fn();
const userFindById = jest.fn();
const userFindLean = jest.fn();

jest.unstable_mockModule('../../src/models/LoyaltyLedger.js', () => ({
  default: {
    findOne: ledgerFindOne,
    find: ledgerFind,
    create: ledgerCreate,
  },
}));
jest.unstable_mockModule('../../src/models/LoyaltyEarnRule.js', () => ({
  default: { findOne: ruleFindOne },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: userFindById, findOneAndUpdate: jest.fn(), updateOne: jest.fn() },
}));
jest.unstable_mockModule('../../src/models/Referral.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/RewardCatalogItem.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/RewardRedemption.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const { loyaltyService } = await import('../../src/services/loyaltyService.js');

const uid = '64b000000000000000000099';

beforeEach(() => jest.clearAllMocks());

describe('LOY-M-01 duplicate earn guard', () => {
  it('second delivery of the same completion event earns 0 (no double credit)', async () => {
    ledgerFindOne.mockReturnValueOnce({ lean: async () => ({ points: 25 }) }); // dupe pre-check hit
    const pts = await loyaltyService.earnPoints(uid, 'ride_completed', 'ride-dup-1');
    expect(pts).toBe(0);
    expect(ruleFindOne).not.toHaveBeenCalled();
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it('concurrent double-earn losing the unique race returns 0 instead of crediting twice', async () => {
    ledgerFindOne.mockReturnValueOnce({ lean: async () => null });
    ruleFindOne.mockReturnValueOnce({ lean: async () => ({ points: 25, isActive: true }) });
    userFindById.mockResolvedValueOnce({
      loyalty: { pointsBalance: 0, lifetimePoints: 0 },
      save: jest.fn(async () => {}),
    });
    ledgerCreate.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
    const pts = await loyaltyService.earnPoints(uid, 'ride_completed', 'ride-race-1');
    expect(pts).toBe(0);
  });
});

describe('LOY-M-01 reconciliation', () => {
  it('detects drift between ledger truth and the cached user balance', async () => {
    ledgerFind.mockReturnValueOnce({
      select: () => ({ lean: async () => ([
        { type: 'earn', points: 25 },
        { type: 'earn', points: 30 },
        { type: 'reverse', points: -25 },
        { type: 'redeem', points: -10 },
      ]) }),
    });
    userFindById.mockReturnValueOnce({ select: () => ({ lean: async () => ({ loyalty: { pointsBalance: 20 } }) }) });
    const ok = await loyaltyService.reconcileBalance(uid);
    expect(ok.ledgerBalance).toBe(20);
    expect(ok.matches).toBe(true);

    ledgerFind.mockReturnValueOnce({
      select: () => ({ lean: async () => ([{ type: 'earn', points: 25 }]) }),
    });
    userFindById.mockReturnValueOnce({ select: () => ({ lean: async () => ({ loyalty: { pointsBalance: 999 } }) }) });
    const drifted = await loyaltyService.reconcileBalance(uid);
    expect(drifted.ledgerBalance).toBe(25);
    expect(drifted.storedBalance).toBe(999);
    expect(drifted.matches).toBe(false);
  });
});
