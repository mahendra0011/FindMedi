import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// Setup Mock Entities with strict Hospital Isolation
const hospitalA = '507f191e810c19729de8600a';
const hospitalB = '507f191e810c19729de8600b';

const mockAssets = [
  { _id: '507f191e810c19729de860a1', hospitalId: hospitalA, equipmentName: 'Ventilator A', status: 'OPERATIONAL' },
  { _id: '507f191e810c19729de860a2', hospitalId: hospitalB, equipmentName: 'Ventilator B', status: 'OPERATIONAL' },
];

const mockBags = [
  { _id: '507f191e810c19729de860b1', hospitalId: hospitalA, colorCategory: 'YELLOW', weightKg: 2 },
  { _id: '507f191e810c19729de860b2', hospitalId: hospitalB, colorCategory: 'RED', weightKg: 4 },
];

const { as: asBiomedical } = await mountApp('biomedical', {
  '../../src/models/BiomedicalAsset.js': () => ({
    default: {
      find: (filter) => query(mockAssets.filter((a) => !filter.hospitalId || String(a.hospitalId) === String(filter.hospitalId))),
    },
  }),
});

const { as: asBmw } = await mountApp('bmw', {
  '../../src/models/BmwBag.js': () => ({
    default: {
      find: (filter) => ({
        populate: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => mockBags.filter((b) => !filter.hospitalId || String(b.hospitalId) === String(filter.hospitalId)),
            }),
          }),
        }),
      }),
    },
    BMW_COLOR_CATEGORIES: ['YELLOW', 'RED', 'WHITE', 'BLUE'],
  }),
});

describe('Multi-Tenant Isolation Matrix for New Modules', () => {
  const adminHospitalA = {
    _id: '507f191e810c19729de86011',
    id: '507f191e810c19729de86011',
    role: 'hospital_admin',
    hospitalId: hospitalA,
    permissions: ['inventory:read', 'operations:read', 'records:read'],
  };

  const adminHospitalB = {
    _id: '507f191e810c19729de86022',
    id: '507f191e810c19729de86022',
    role: 'hospital_admin',
    hospitalId: hospitalB,
    permissions: ['inventory:read', 'operations:read', 'records:read'],
  };

  it('prevents Hospital A user from reading Hospital B biomedical assets', async () => {
    const resA = await asBiomedical(adminHospitalA).get('/assets').expect(200);
    expect(resA.body.assets).toHaveLength(1);
    expect(resA.body.assets[0].equipmentName).toBe('Ventilator A');

    const resB = await asBiomedical(adminHospitalB).get('/assets').expect(200);
    expect(resB.body.assets).toHaveLength(1);
    expect(resB.body.assets[0].equipmentName).toBe('Ventilator B');
  });

  it('strictly partitions Biomedical Waste (BMW) bags across hospitals', async () => {
    const resA = await asBmw(adminHospitalA).get('/bags').expect(200);
    expect(resA.body.bags).toHaveLength(1);
    expect(resA.body.bags[0].colorCategory).toBe('YELLOW');

    const resB = await asBmw(adminHospitalB).get('/bags').expect(200);
    expect(resB.body.bags).toHaveLength(1);
    expect(resB.body.bags[0].colorCategory).toBe('RED');
  });
});
