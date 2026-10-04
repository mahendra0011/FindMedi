import { jest } from '@jest/globals';

const pharmacyOrderFindById = jest.fn();
const medicineFind = jest.fn();
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: { findById: jest.fn() } }));
jest.unstable_mockModule('../../src/models/LabBooking.js', () => ({ default: { findById: jest.fn() } }));
jest.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({ default: { findById: (...args) => pharmacyOrderFindById(...args) } }));
jest.unstable_mockModule('../../src/models/Medicine.js', () => ({ default: { find: (...args) => medicineFind(...args) } }));
jest.unstable_mockModule('../../src/models/Facility.js', () => ({ default: { findById: () => ({ select: () => ({ lean: async () => ({ type: 'pharmacy', status: 'approved', details: {} }) }) }) } }));
jest.unstable_mockModule('../../src/models/Appointment.js', () => ({ default: { findById: jest.fn() } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const { resolveAuthoritativeAmount } = await import('../../src/services/pricingService.js');

describe('authoritative pharmacy payment pricing', () => {
  const orderItems = [
    { medicineId: 'med-1', qty: 2, price: 0.01 },
    { medicineId: 'med-2', quantity: 1, price: 0.01 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    pharmacyOrderFindById.mockReturnValue({ select: () => ({ lean: async () => ({ items: orderItems, totalAmount: 0.03, facilityId: 'facility-1', deliveryMode: 'pickup' }) }) });
    medicineFind.mockReturnValue({ select: () => ({ lean: async () => [
      { _id: 'med-1', sellingPrice: 25.5 },
      { _id: 'med-2', sellingPrice: 80 },
    ] }) });
  });

  it('calculates order payment using catalogue selling prices and normalized quantities', async () => {
    await expect(resolveAuthoritativeAmount({ serviceType: 'medicine', referenceId: 'order-1' }))
      .resolves.toMatchObject({ ok: true, amount: 142.55, source: 'medicine.sellingPrice+serverFees' });
    expect(medicineFind).toHaveBeenCalledWith({ _id: { $in: ['med-1', 'med-2'] } });
  });

  it('refuses manual or legacy order lines without a catalogue medicine reference', async () => {
    pharmacyOrderFindById.mockReturnValueOnce({ select: () => ({ lean: async () => ({ items: [{ medicineName: 'Unlinked', qty: 1, price: 1 }] }) }) });
    await expect(resolveAuthoritativeAmount({ serviceType: 'pharmacy', referenceId: 'order-1' }))
      .resolves.toMatchObject({ ok: false, reason: 'no-price' });
    expect(medicineFind).not.toHaveBeenCalled();
  });

  it('refuses missing catalogue prices and invalid quantities rather than falling back to stored totals', async () => {
    medicineFind.mockReturnValueOnce({ select: () => ({ lean: async () => [{ _id: 'med-1', sellingPrice: 25 }] }) });
    await expect(resolveAuthoritativeAmount({ serviceType: 'medicine', referenceId: 'order-1' }))
      .resolves.toMatchObject({ ok: false, reason: 'no-price' });

    medicineFind.mockReturnValueOnce({ select: () => ({ lean: async () => [
      { _id: 'med-1', sellingPrice: 25 }, { _id: 'med-2', sellingPrice: 80 },
    ] }) });
    pharmacyOrderFindById.mockReturnValueOnce({ select: () => ({ lean: async () => ({
      items: [{ medicineId: 'med-1', qty: 0, price: 500 }], totalAmount: 500,
    }) }) });
    await expect(resolveAuthoritativeAmount({ serviceType: 'medicine', referenceId: 'order-2' }))
      .resolves.toMatchObject({ ok: false, reason: 'no-price' });
  });
});
