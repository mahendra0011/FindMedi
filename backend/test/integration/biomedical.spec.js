import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const assets = [
  {
    _id: '507f191e810c19729de860b1',
    hospitalId: '507f191e810c19729de860ed',
    assetTag: 'BME-VENT-01',
    equipmentName: 'ICU Ventilator',
    criticalityCategory: 'A',
    department: 'ICU',
    status: 'OPERATIONAL',
    breakdownCount: 0,
    save: async function () { return this; },
  },
];

const workOrders = [];

const { as } = await mountApp('biomedical', {
  '../../src/models/BiomedicalAsset.js': () => ({
    default: {
      find: (filter) => query(assets),
      findOne: (filter) => query(assets.find((a) => String(a._id) === String(filter._id)) || null),
      findById: async (id) => assets.find((a) => String(a._id) === String(id)) || null,
      create: async (data) => ({ _id: '507f191e810c19729de860b2', ...data }),
    },
  }),
  '../../src/models/BiomedicalWorkOrder.js': () => ({
    default: {
      find: () => ({
        populate: () => ({
          populate: () => ({
            populate: () => ({
              sort: () => ({
                limit: () => ({
                  lean: async () => workOrders,
                }),
              }),
            }),
          }),
        }),
      }),
      findOne: (filter) => query(workOrders.find((w) => String(w._id) === String(filter._id)) || null),
      create: async (data) => {
        const item = { _id: '507f191e810c19729de860w1', ...data, save: async function () { return this; } };
        workOrders.push(item);
        return item;
      },
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
});

describe('Biomedical Engineering & Equipment Asset Integration', () => {
  const engineer = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    role: 'biomedical_engineer',
    hospitalId: '507f191e810c19729de860ed',
    permissions: ['inventory:read', 'inventory:manage', 'operations:read', 'admin:manage'],
  };

  it('lists biomedical assets and calculates status totals', async () => {
    const res = await as(engineer).get('/assets').expect(200);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.operational).toBe(1);
    expect(res.body.stats.criticalCatA).toBe(1);
  });

  it('creates breakdown work order and marks asset status as BREAKDOWN', async () => {
    const res = await as(engineer)
      .post('/work-orders')
      .send({
        assetId: '507f191e810c19729de860b1',
        ticketType: 'BREAKDOWN',
        symptomDescription: 'Oxygen pressure sensor failure alarm',
      })
      .expect(201);

    expect(res.body.ticketNumber).toMatch(/^BME/);
    expect(res.body.priority).toBe('CRITICAL');
    expect(assets[0].status).toBe('BREAKDOWN');
    expect(assets[0].breakdownCount).toBe(1);
  });

  it('updates work order lifecycle through resolution', async () => {
    const res = await as(engineer)
      .patch('/work-orders/507f191e810c19729de860w1/status')
      .send({
        status: 'RESOLVED',
        rootCauseAnalysis: 'Replaced faulty O2 intake valve and re-calibrated',
        electricalSafetyTestPassed: true,
      })
      .expect(200);

    expect(res.body.status).toBe('RESOLVED');
  });
});
