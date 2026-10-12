import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const bags = [];

const { as } = await mountApp('bmw', {
  '../../src/models/BmwBag.js': () => ({
    default: {
      find: () => ({
        populate: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => bags,
            }),
          }),
        }),
      }),
      findOne: (filter) => query(bags.find((b) => String(b._id) === String(filter._id)) || null),
      create: async (data) => {
        const item = { _id: '507f191e810c19729de860b1', ...data, save: async function () { return this; } };
        bags.push(item);
        return item;
      },
    },
    BMW_COLOR_CATEGORIES: ['YELLOW', 'RED', 'WHITE', 'BLUE'],
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
});

describe('Biomedical Waste (BMW) Management Integration', () => {
  const staff = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    role: 'nurse',
    hospitalId: '507f191e810c19729de860ed',
    permissions: ['records:write', 'operations:write', 'records:read', 'operations:read', 'inventory:manage', 'admin:manage'],
  };

  it('rejects invalid color categories', async () => {
    await as(staff)
      .post('/bags')
      .send({
        colorCategory: 'GREEN', // invalid for BMW statutory rules
        weightKg: 2.5,
        generatingDepartment: 'OT Complex',
      })
      .expect(400);
  });

  it('logs sealed waste bag with timestamped barcode', async () => {
    const res = await as(staff)
      .post('/bags')
      .send({
        colorCategory: 'YELLOW',
        weightKg: 4.8,
        generatingDepartment: 'OT Complex',
      })
      .expect(201);

    expect(res.body.bagBarcode).toMatch(/^BMW-YEL/);
    expect(res.body.status).toBe('SEALED');
    expect(res.body.weightKg).toBe(4.8);
  });

  it('dispatches bag to common treatment facility (CBWTF) generating manifest', async () => {
    const res = await as(staff)
      .patch('/bags/507f191e810c19729de860b1/dispatch')
      .send({
        cbwtfVendorName: 'BioClean Disposal Ltd',
        cbwtfVehicleNumber: 'MH-12-TR-9988',
      })
      .expect(200);

    expect(res.body.status).toBe('DISPATCHED_TO_CBWTF');
    expect(res.body.cbwtfManifestNumber).toMatch(/^MNF-BMW/);
  });
});
