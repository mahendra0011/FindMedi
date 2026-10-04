import { jest as jestApi } from '@jest/globals';

const medicineUpdateOne = jestApi.fn();
const orderFind = jestApi.fn();
const orderFindOneAndUpdate = jestApi.fn();
const executeWithOutbox = jestApi.fn();
jestApi.unstable_mockModule('../../src/models/Medicine.js', () => ({ default: { updateOne: (...args) => medicineUpdateOne(...args) } }));
jestApi.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({
  default: {
    find: (...args) => orderFind(...args),
    findOneAndUpdate: (...args) => orderFindOneAndUpdate(...args),
  },
}));
jestApi.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({
  executeWithOutbox: (...args) => executeWithOutbox(...args),
}));
jestApi.unstable_mockModule('../../src/config/logger.js', () => ({ default: { error: jestApi.fn() } }));

const { reservePharmacyOrderItems, releasePharmacyOrderItems, expirePharmacyOrderReservations } =
  await import('../../src/services/pharmacyInventoryService.js');

const session = { id: 'transaction-session' };

beforeEach(() => {
  medicineUpdateOne.mockReset().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  orderFind.mockReset();
  orderFindOneAndUpdate.mockReset();
  executeWithOutbox.mockReset().mockImplementation((fn) => fn(session));
});

describe('pharmacy stock reservations', () => {
  it('uses a conditional sellable-stock decrement inside the caller transaction', async () => {
    await reservePharmacyOrderItems([
      { medicineId: 'med-1', quantity: 2 },
      { medicineId: 'med-2', quantity: 1 },
    ], { session, now: new Date('2026-10-04T00:00:00Z') });

    expect(medicineUpdateOne).toHaveBeenCalledTimes(2);
    expect(medicineUpdateOne).toHaveBeenNthCalledWith(1,
      { _id: 'med-1', isActive: true, expiryDate: { $gt: new Date('2026-10-04T00:00:00Z') }, currentStock: { $gte: 2 } },
      { $inc: { currentStock: -2 } }, { session });
  });

  it('fails with a conflict if concurrent checkouts exhausted stock', async () => {
    medicineUpdateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });
    await expect(reservePharmacyOrderItems([{ medicineId: 'med-1', quantity: 3 }], { session }))
      .rejects.toMatchObject({ status: 409, code: 'MEDICINE_STOCK_RACE' });
  });

  it('pins reservation to the price observed during server-side cart pricing', async () => {
    medicineUpdateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });
    await expect(reservePharmacyOrderItems([{ medicineId: 'med-1', quantity: 1, expectedPrice: 12.5 }], { session }))
      .rejects.toMatchObject({ status: 409, code: 'CART_STALE' });
    expect(medicineUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ sellingPrice: 12.5 }),
      { $inc: { currentStock: -1 } },
      { session }
    );
  });

  it('coalesces duplicate cart lines before the atomic stock decrement', async () => {
    await reservePharmacyOrderItems([
      { medicineId: 'med-1', quantity: 2, expectedPrice: 12.5 },
      { medicineId: 'med-1', quantity: 3, expectedPrice: 12.5 },
    ], { session });
    expect(medicineUpdateOne).toHaveBeenCalledTimes(1);
    expect(medicineUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'med-1', currentStock: { $gte: 5 }, sellingPrice: 12.5 }),
      { $inc: { currentStock: -5 } }, { session }
    );
  });

  it('restores the exact quantities when an unpaid order reservation is released', async () => {
    await releasePharmacyOrderItems([
      { medicineId: 'med-1', qty: 2 },
      { medicineId: 'med-2', qty: 4 },
    ], { session });

    expect(medicineUpdateOne).toHaveBeenNthCalledWith(1, { _id: 'med-1' }, { $inc: { currentStock: 2 } }, { session });
    expect(medicineUpdateOne).toHaveBeenNthCalledWith(2, { _id: 'med-2' }, { $inc: { currentStock: 4 } }, { session });
  });

  it('expires pending unpaid reservations using a state CAS and transaction', async () => {
    const now = new Date('2026-10-04T00:15:00Z');
    const order = { items: [{ medicineId: 'med-1', qty: 2 }] };
    orderFind.mockReturnValue({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'order-1' }] }) }) }) });
    orderFindOneAndUpdate.mockResolvedValue(order);

    await expect(expirePharmacyOrderReservations({ now })).resolves.toBe(1);
    expect(executeWithOutbox).toHaveBeenCalledTimes(1);
    expect(orderFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Pending', paymentStatus: { $in: ['Pending', 'Unpaid'] }, inventoryReservationStatus: 'reserved' }),
      { $set: { status: 'Cancelled', inventoryReservationStatus: 'released' } },
      { new: true, session }
    );
    expect(medicineUpdateOne).toHaveBeenCalledWith({ _id: 'med-1' }, { $inc: { currentStock: 2 } }, { session });
  });

  it('does not release stock if payment or cancellation won the expiry race', async () => {
    orderFind.mockReturnValue({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'order-1' }] }) }) }) });
    orderFindOneAndUpdate.mockResolvedValue(null);

    await expect(expirePharmacyOrderReservations()).resolves.toBe(0);
    expect(medicineUpdateOne).not.toHaveBeenCalled();
  });
});
