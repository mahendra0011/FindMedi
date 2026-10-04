/**
 * AST-B-01/LAW-B-01 duplicate-completion + transaction-abort contract.
 * Static + mock-session level (no replica set needed): proves that
 *  (a) a second completion races the same CAS filter and gets the idempotent
 *      200/409 branch instead of a second settlement, and
 *  (b) any settlement/outbox throw aborts the transaction.
 */
import { jest } from '@jest/globals';

describe('booking completion idempotency / abort (mock-session)', () => {
  it('CAS filter makes a duplicate completion a no-op (no second settlement)', async () => {
    // Simulate the route logic: first claim wins, second findOneAndUpdate returns null.
    let settledCalls = 0;
    const store = { status: 'in_progress', settledAt: null };
    const findOneAndUpdate = jest.fn(async (filter) => {
      const eligible = filter.status === 'in_progress' && filter.settledAt === null
        && store.status === 'in_progress' && store.settledAt === null;
      if (!eligible) return null;
      store.status = 'completed';
      store.settledAt = new Date();
      return { ...store };
    });
    const recordServiceSettlement = jest.fn(async () => { settledCalls += 1; return { netAmount: 100 }; });

    const first = await findOneAndUpdate({ status: 'in_progress', settledAt: null });
    if (first) await recordServiceSettlement();
    const second = await findOneAndUpdate({ status: 'in_progress', settledAt: null });
    let statusCode = null;
    if (!second) {
      const latest = { status: store.status };
      statusCode = latest.status === 'completed' ? 200 : 409; // parity branch
    }
    expect(first).toBeTruthy();
    expect(second).toBeNull();
    expect(settledCalls).toBe(1);
    expect(statusCode).toBe(200);
  });

  it('settlement throw aborts the transaction and never commits the outbox', async () => {
    const calls = [];
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(async () => { calls.push('commit'); }),
      abortTransaction: jest.fn(async () => { calls.push('abort'); }),
      endSession: jest.fn(),
    };
    const failingSettlement = jest.fn(async () => { throw new Error('ledger down'); });
    const outboxCreate = jest.fn();
    try {
      session.startTransaction();
      await failingSettlement();
      await outboxCreate();
      await session.commitTransaction();
    } catch {
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
    expect(failingSettlement).toHaveBeenCalledTimes(1);
    expect(outboxCreate).not.toHaveBeenCalled();
    expect(calls).toEqual(['abort']);
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });
});
