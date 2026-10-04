import { jest } from '@jest/globals';

const session = {
  startTransaction: jest.fn(), commitTransaction: jest.fn(), abortTransaction: jest.fn(), endSession: jest.fn(),
};
const startSession = jest.fn(async () => session);
const medicineFindOneAndUpdate = jest.fn();
const medicineFindById = jest.fn();
const prescriptionFindOneAndUpdate = jest.fn();
const prescriptionUpdateOne = jest.fn();
const outboxInsertMany = jest.fn();

jest.unstable_mockModule('mongoose', () => ({ default: { startSession } }));
jest.unstable_mockModule('../../src/models/Medicine.js', () => ({ default: {
  findOneAndUpdate: (...args) => medicineFindOneAndUpdate(...args),
  findById: (...args) => medicineFindById(...args),
} }));
jest.unstable_mockModule('../../src/models/Prescription.js', () => ({ default: {
  findOneAndUpdate: (...args) => prescriptionFindOneAndUpdate(...args),
  updateOne: (...args) => prescriptionUpdateOne(...args),
} }));
jest.unstable_mockModule('../../src/models/OutboxEvent.js', () => ({ default: { insertMany: (...args) => outboxInsertMany(...args) } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const { dispensePrescriptionMedicine } = await import('../../src/services/pharmacyDispenseService.js');

describe('pharmacy dispense atomic state transition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    medicineFindOneAndUpdate.mockResolvedValue({ _id: 'med-1', currentStock: 3, facilityId: 'facility-1' });
    prescriptionFindOneAndUpdate.mockResolvedValue({
      _id: 'rx-1', medicines: [{ _id: 'line-1', isDispensed: true }, { _id: 'line-2', isDispensed: false }],
    });
    prescriptionUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    outboxInsertMany.mockResolvedValue([]);
    medicineFindById.mockReturnValue({ select: () => ({ session: () => ({ lean: async () => ({ currentStock: 0 }) }) }) });
  });

  it('commits stock, prescription CAS and inventory outbox in one session', async () => {
    const result = await dispensePrescriptionMedicine({
      prescriptionId: 'rx-1', medicineLineId: 'line-1', medicineId: 'med-1', quantity: 2,
      dispensedBy: 'Pharmacist', createdBy: 'user-1', pharmacyId: 'facility-1', now: new Date('2026-10-04T00:00:00Z'),
    });

    expect(result.status).toBe('Partially Dispensed');
    expect(medicineFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'med-1', currentStock: { $gte: 2 }, expiryDate: { $gt: new Date('2026-10-04T00:00:00Z') } },
      [{ $set: {
        currentStock: { $subtract: ['$currentStock', 2] },
        isActive: { $gt: [{ $subtract: ['$currentStock', 2] }, 0] },
      } }], { new: true, session },
    );
    expect(prescriptionFindOneAndUpdate.mock.calls[0][0]).toMatchObject({
      _id: 'rx-1', verificationStatus: 'verified', medicines: { $elemMatch: { _id: 'line-1', isDispensed: { $ne: true } } },
    });
    expect(prescriptionFindOneAndUpdate.mock.calls[0][2].session).toBe(session);
    expect(prescriptionUpdateOne.mock.calls[0][2]).toEqual({ session });
    expect(outboxInsertMany.mock.calls[0][0][0]).toMatchObject({
      aggregateType: 'Prescription', aggregateId: 'rx-1', eventType: 'medicine.dispensed',
      destinationTopic: 'findmedi.pharmacy.inventory-delta.v1', payload: { pharmacyId: 'facility-1', medicineId: 'med-1', quantity: 2 },
    });
    expect(outboxInsertMany.mock.calls[0][1]).toEqual({ session });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('aborts the stock debit and writes no event when another request already dispensed the line', async () => {
    prescriptionFindOneAndUpdate.mockResolvedValueOnce(null);

    await expect(dispensePrescriptionMedicine({
      prescriptionId: 'rx-1', medicineLineId: 'line-1', medicineId: 'med-1', quantity: 2, dispensedBy: 'Pharmacist',
    })).rejects.toMatchObject({ status: 409, code: 'PRESCRIPTION_LINE_UNAVAILABLE' });

    expect(medicineFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(outboxInsertMany).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('rejects stock underflow before changing the prescription', async () => {
    medicineFindOneAndUpdate.mockResolvedValueOnce(null);
    medicineFindById.mockReturnValueOnce({ select: () => ({ session: () => ({ lean: async () => ({ currentStock: 1 }) }) }) });

    await expect(dispensePrescriptionMedicine({
      prescriptionId: 'rx-1', medicineLineId: 'line-1', medicineId: 'med-1', quantity: 2, dispensedBy: 'Pharmacist',
    })).rejects.toMatchObject({ status: 400, code: 'INSUFFICIENT_STOCK' });

    expect(prescriptionFindOneAndUpdate).not.toHaveBeenCalled();
    expect(outboxInsertMany).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back stock and prescription writes if durable outbox insertion fails', async () => {
    const outboxError = new Error('outbox unavailable');
    outboxInsertMany.mockRejectedValueOnce(outboxError);

    await expect(dispensePrescriptionMedicine({
      prescriptionId: 'rx-1', medicineLineId: 'line-1', medicineId: 'med-1', quantity: 2, dispensedBy: 'Pharmacist',
    })).rejects.toBe(outboxError);

    expect(medicineFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(prescriptionFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('preserves the commit error and aborts when commit fails', async () => {
    const commitError = new Error('commit failed');
    session.commitTransaction.mockRejectedValueOnce(commitError);

    await expect(dispensePrescriptionMedicine({
      prescriptionId: 'rx-1', medicineLineId: 'line-1', medicineId: 'med-1', quantity: 2, dispensedBy: 'Pharmacist',
    })).rejects.toBe(commitError);

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('retries the whole transaction only for Mongo transient transaction errors', async () => {
    const transientError = Object.assign(new Error('write conflict'), {
      hasErrorLabel: (label) => label === 'TransientTransactionError',
    });
    medicineFindOneAndUpdate.mockRejectedValueOnce(transientError);

    await expect(dispensePrescriptionMedicine({
      prescriptionId: 'rx-1', medicineLineId: 'line-1', medicineId: 'med-1', quantity: 2, dispensedBy: 'Pharmacist',
    })).resolves.toMatchObject({ status: 'Partially Dispensed' });

    expect(session.startTransaction).toHaveBeenCalledTimes(2);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(outboxInsertMany).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('does not mask the original failure if abort also fails', async () => {
    const stockError = Object.assign(new Error('stock failure'), { status: 409 });
    medicineFindOneAndUpdate.mockRejectedValueOnce(stockError);
    session.abortTransaction.mockRejectedValueOnce(new Error('abort failed'));

    await expect(dispensePrescriptionMedicine({
      prescriptionId: 'rx-1', medicineLineId: 'line-1', medicineId: 'med-1', quantity: 2, dispensedBy: 'Pharmacist',
    })).rejects.toBe(stockError);

    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});
