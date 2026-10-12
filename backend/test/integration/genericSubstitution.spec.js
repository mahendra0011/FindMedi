import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const originalMed = {
  _id: '507f191e810c19729de860a1',
  name: 'Augmentin 625 Duo',
  genericName: 'Amoxicillin + Clavulanic Acid',
  composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
  strength: '625mg',
  dosageForm: 'Tablet',
  sellingPrice: 200,
  currentStock: 50,
  isActive: true,
  facilityId: '507f191e810c19729de860f1',
};

const cheapSubstitute = {
  _id: '507f191e810c19729de860a2',
  name: 'Moxclav 625',
  genericName: 'Amoxicillin + Clavulanic Acid',
  composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
  strength: '625mg',
  dosageForm: 'Tablet',
  sellingPrice: 120, // Cheaper!
  currentStock: 100,
  isActive: true,
  facilityId: '507f191e810c19729de860f1',
};

const mockMedicines = [originalMed, cheapSubstitute];

const { as } = await mountApp('pharmacy', {
  '../../src/models/Medicine.js': () => ({
    default: {
      findById: async (id) => mockMedicines.find((m) => String(m._id) === String(id)) || null,
      find: (filter) => {
        let list = [...mockMedicines];
        if (filter?._id?.$ne) {
          list = list.filter((m) => String(m._id) !== String(filter._id.$ne));
        }
        return {
          sort: () => ({
            lean: async () => list,
          }),
        };
      },
    },
  }),
});

describe('Generic Substitution Finder (D1)', () => {
  const pharmacist = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    role: 'pharmacist',
    permissions: ['pharmacy:read', 'pharmacy:manage', 'pharmacy:dispense'],
  };

  it('finds in-stock substitute with identical generic composition and computes savings', async () => {
    const res = await as(pharmacist)
      .get(`/medicines/${originalMed._id}/substitutes`)
      .expect(200);

    expect(res.body.original).toBeDefined();
    expect(res.body.original.sellingPrice).toBe(200);
    expect(res.body.substitutes).toHaveLength(1);

    const sub = res.body.substitutes[0];
    expect(sub.name).toBe('Moxclav 625');
    expect(sub.sellingPrice).toBe(120);
    expect(sub.savingsPerUnit).toBe(80);
    expect(sub.savingsPct).toBe(40);
  });
});
