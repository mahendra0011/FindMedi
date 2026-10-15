import { jest } from '@jest/globals';

const mockUserFindOneAndUpdate = jest.fn();
const mockReferralFindOne = jest.fn();
const mockReferralCreate = jest.fn();

jest.unstable_mockModule('../../src/models/User.js', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: mockUserFindOneAndUpdate,
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/models/RewardCatalogItem.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: () => Promise.resolve({
        _id: 'item_100',
        isActive: true,
        pointsRequired: 200,
        stockLimit: 10,
        redeemedCount: 2,
        validityDays: 30,
        code: 'MED200',
      }),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

jest.unstable_mockModule('../../src/models/RewardRedemption.js', () => {
  const MockModel = function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  };
  return {
    __esModule: true,
    default: MockModel,
  };
});

jest.unstable_mockModule('../../src/models/LoyaltyLedger.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) }),
  },
}));

const { loyaltyService } = await import('../../src/services/loyaltyService.js');

describe('Loyalty Points Concurrency & Sybil Prevention (LOYALTY-BUG-01 & 02)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Atomic Points Debit (LOYALTY-BUG-01)', () => {
    it('uses atomic $gte condition on points debit', async () => {
      mockUserFindOneAndUpdate.mockReturnValue({
        select: () => Promise.resolve({
          _id: 'user_1',
          loyalty: { pointsBalance: 300, lifetimePoints: 500, tier: 'Silver' },
        }),
      });

      const res = await loyaltyService.redeemReward('user_1', 'item_100');
      expect(res.success).toBe(true);
      expect(res.pointsSpent).toBe(200);
      expect(res.newBalance).toBe(300);

      // Verifies CAS query with $gte condition
      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: 'user_1',
          'loyalty.pointsBalance': { $gte: 200 },
        },
        {
          $inc: { 'loyalty.pointsBalance': -200 },
        },
        { new: true }
      );
    });

    it('rejects redemption when atomic update returns null due to insufficient balance', async () => {
      // Simulates second concurrent transaction losing the race condition
      mockUserFindOneAndUpdate.mockReturnValue({
        select: () => Promise.resolve(null),
      });

      const res = await loyaltyService.redeemReward('user_1', 'item_100');
      expect(res.success).toBe(false);
      expect(res.message).toBe('Insufficient points');
    });
  });
});
