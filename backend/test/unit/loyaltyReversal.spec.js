/**
 * LOYAL-M-02: reverse loyalty points on cancelled bookings.
 *
 * The finding was that points could be earned for a booking but never given
 * back when the booking was cancelled — every cancel inflated the balance.
 * This suite pins the contract of `reversePoints` plus the wiring at every
 * cancellation surface:
 *
 *   1. EXACT REVERSAL — claws back what the earn ACTUALLY credited (ledger
 *      lookup), not the current rule amount; reverses both balances and walks
 *      the tier down the same 500/1500/3000 ladder earnPoints climbs.
 *   2. IDEMPOTENT — at most one `reverse` ledger row per (user, action,
 *      refId); the unique-index race (E11000) undoes the decrement instead of
 *      double-deducting.
 *   3. NO-EARN IS A NO-OP — cancelling a booking that never earned must not
 *      move balances or create rows.
 *   4. WIRING — ride user-cancel, appointment status->Cancelled, appointment
 *      DELETE all call it fail-soft; the non-terminal rider-cancel branch and
 *      the series cancel (which only touches non-terminal occurrences, which
 *      by definition never earned) deliberately do not.
 *
 * Models are mocked at the module boundary (jest.unstable_mockModule) so no
 * Mongo is needed; the fake query honours ONLY the chains the service uses
 * (.lean()/.sort().lean()/.select()) so a query-shape change fails loudly.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'node:fs';

const userFindOneAndUpdate = jest.fn();
const userUpdateOne = jest.fn();
const ledgerFindOne = jest.fn();
const ledgerCreate = jest.fn();
const logError = jest.fn();

jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findOneAndUpdate: userFindOneAndUpdate,
    updateOne: userUpdateOne,
    findById: jest.fn(),
  },
}));
jest.unstable_mockModule('../../src/models/LoyaltyLedger.js', () => ({
  default: { findOne: ledgerFindOne, create: ledgerCreate },
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { error: logError, warn: jest.fn(), info: jest.fn() },
}));

const { loyaltyService } = await import('../../src/services/loyaltyService.js');

/** Chainable fake for LoyaltyLedger.findOne(...): supports .sort().lean() and .lean(). */
const fakeQuery = (value) => {
  const q = {
    sort: jest.fn(() => q),
    lean: jest.fn(() => Promise.resolve(value)),
  };
  return q;
};

/** Chainable fake for User.findOneAndUpdate(...): only .select('loyalty') is used. */
const fakeDoc = (value) => ({ select: jest.fn(() => Promise.resolve(value)) });

/** Sequences ledgerFindOne for the (reverse-check, earn-check) order the service uses. */
const ledgerSequence = (reverseRow, earnRow) => {
  ledgerFindOne.mockReturnValueOnce(fakeQuery(reverseRow));
  if (reverseRow === null && earnRow !== undefined) {
    ledgerFindOne.mockReturnValueOnce(fakeQuery(earnRow));
  }
};

const uid = '64b000000000000000000001';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loyaltyService.reversePoints', () => {
  it('reverses exactly the original earn: both balances, ledger row, tier kept', async () => {
    ledgerSequence(null, { points: 25 });
    userFindOneAndUpdate.mockReturnValue(fakeDoc({
      loyalty: { pointsBalance: 75, lifetimePoints: 575, tier: 'Silver' },
    }));
    ledgerCreate.mockResolvedValue({});

    const result = await loyaltyService.reversePoints(uid, 'ride_completed', 'ride-1');

    expect(result).toEqual({ reversed: 25, newBalance: 75, tier: 'Silver' });
    expect(userFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: uid },
      { $inc: { 'loyalty.pointsBalance': -25, 'loyalty.lifetimePoints': -25 } },
      { new: true },
    );
    expect(ledgerCreate).toHaveBeenCalledWith({
      userId: uid,
      type: 'reverse',
      points: -25,
      reason: 'reversed:ride_completed',
      refId: 'ride-1',
      balanceAfter: 75,
    });
    // lifetime 575 still >= 500 -> tier unchanged, no $set
    expect(userUpdateOne).not.toHaveBeenCalled();
  });

  it('walks the tier down when lifetime points cross a threshold', async () => {
    ledgerSequence(null, { points: 100 });
    userFindOneAndUpdate.mockReturnValue(fakeDoc({
      loyalty: { pointsBalance: 100, lifetimePoints: 1400, tier: 'Gold' },
    }));
    ledgerCreate.mockResolvedValue({});

    const result = await loyaltyService.reversePoints(uid, 'appointment_completed', 'apt-1');

    expect(result).toEqual({ reversed: 100, newBalance: 100, tier: 'Silver' });
    expect(userUpdateOne).toHaveBeenCalledWith(
      { _id: uid },
      { $set: { 'loyalty.tier': 'Silver' } },
    );
  });

  it('allows a negative spendable balance when points were already redeemed', async () => {
    ledgerSequence(null, { points: 25 });
    userFindOneAndUpdate.mockReturnValue(fakeDoc({
      loyalty: { pointsBalance: -15, lifetimePoints: 5, tier: 'Silver' },
    }));
    ledgerCreate.mockResolvedValue({});

    const result = await loyaltyService.reversePoints(uid, 'ride_completed', 'ride-2');

    expect(result).toEqual({ reversed: 25, newBalance: -15, tier: 'Bronze' });
    expect(userFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: uid },
      { $inc: { 'loyalty.pointsBalance': -25, 'loyalty.lifetimePoints': -25 } },
      { new: true },
    );
    expect(userUpdateOne).toHaveBeenCalledWith(
      { _id: uid },
      { $set: { 'loyalty.tier': 'Bronze' } },
    );
  });

  it('is a no-op when the booking never earned anything', async () => {
    ledgerSequence(null, null);

    const result = await loyaltyService.reversePoints(uid, 'appointment_completed', 'apt-2');

    expect(result).toEqual({ reversed: 0 });
    expect(userFindOneAndUpdate).not.toHaveBeenCalled();
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it('is idempotent when a reversal row already exists', async () => {
    ledgerSequence({ points: -25 });

    const result = await loyaltyService.reversePoints(uid, 'ride_completed', 'ride-1');

    expect(result).toEqual({ reversed: 0, alreadyReversed: true });
    expect(ledgerFindOne).toHaveBeenCalledTimes(1);
    expect(userFindOneAndUpdate).not.toHaveBeenCalled();
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it('undoes the decrement when the unique-index race is lost (E11000)', async () => {
    ledgerSequence(null, { points: 25 });
    userFindOneAndUpdate.mockReturnValue(fakeDoc({
      loyalty: { pointsBalance: 75, lifetimePoints: 575, tier: 'Silver' },
    }));
    ledgerCreate.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const result = await loyaltyService.reversePoints(uid, 'ride_completed', 'ride-3');

    expect(result).toEqual({ reversed: 0, alreadyReversed: true });
    expect(userUpdateOne).toHaveBeenCalledTimes(1);
    expect(userUpdateOne).toHaveBeenCalledWith(
      { _id: uid },
      { $inc: { 'loyalty.pointsBalance': 25, 'loyalty.lifetimePoints': 25 } },
    );
  });

  it('gives up quietly when the user no longer exists', async () => {
    ledgerSequence(null, { points: 25 });
    userFindOneAndUpdate.mockReturnValue(fakeDoc(null));

    const result = await loyaltyService.reversePoints(uid, 'ride_completed', 'ride-4');

    expect(result).toEqual({ reversed: 0 });
    expect(ledgerCreate).not.toHaveBeenCalled();
  });
});

describe('LOYAL-M-02 wiring pins', () => {
  const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

  it('ride user-cancel reverses points (terminal branch only)', () => {
    const src = read('../../src/routes/rides.js');
    expect(src).toContain('reversePoints(passengerId, \'ride_completed\', ride._id)');
    expect(src.match(/reversePoints\(/g)).toHaveLength(1);
    // The single call must sit AFTER the terminal status write, never in the
    // rider branch that only returns the ride to searching.
    const terminalWrite = src.indexOf("ride.status = 'cancelled_by_user'");
    const call = src.indexOf('reversePoints(');
    expect(terminalWrite).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(terminalWrite);
    const riderBranch = src.indexOf("ride.status = 'searching'");
    expect(call).toBeGreaterThan(riderBranch);
  });

  it('appointment cancel-status and delete both reverse points, fail-soft', () => {
    const src = read('../../src/routes/appointments.js');
    expect(src).toContain('import { loyaltyService } from \'../services/loyaltyService.js\'');
    expect(src.match(/loyaltyService\.reversePoints\(/g)).toHaveLength(2);
    expect(src).toContain('reversePoints(loyaltyPid, \'appointment_completed\', updated._id)');
    expect(src).toContain('reversePoints(delLoyaltyPid, \'appointment_completed\', appointment._id)');
    expect(src).toContain('appointment loyalty reversal failed');
    expect(src).toContain('appointment loyalty reversal on delete failed');
  });

  it('series cancel is deliberately NOT hooked (it only cancels never-earned occurrences)', () => {
    const src = read('../../src/services/appointmentSeriesService.js');
    expect(src).not.toContain('reversePoints');
    expect(src).toContain('status: ACTIVE_APPT');
  });
});
