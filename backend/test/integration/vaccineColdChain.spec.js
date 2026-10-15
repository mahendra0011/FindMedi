/**
 * Vaccines are cold-chain stock (2–8°C): a Vaccines-category row without
 * coldChain:true is spoiled stock by definition, so create/update refuse it.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const created = [];
let rowById = () => null;

jestApi.unstable_mockModule('../../src/models/Inventory.js', () => ({
  default: {
    create: async (doc) => {
      const row = { _id: 'inv-1', ...doc };
      created.push(row);
      return row;
    },
    findById: (id) => query(rowById(id)),
  },
}));
jestApi.unstable_mockModule('../../src/models/AuditLog.js', () => ({
  default: { create: async () => ({}) },
}));

const { as } = await mountApp('inventory', {});
const mgr = { _id: 'm1', id: 'm1', role: 'hospital_admin', hospitalId: 'h1' };

beforeEach(() => {
  created.length = 0;
  rowById = () => null;
});

describe('vaccine cold-chain rule', () => {
  it('creates a vaccine row with coldChain:true', async () => {
    const res = await as(mgr).post('/items').send({
      itemName: 'BCG Vaccine',
      category: 'Vaccines',
      coldChain: true,
      currentStock: 50,
    });
    expect(res.status).toBe(201);
    expect(created[0]).toMatchObject({ category: 'Vaccines', coldChain: true });
  });

  it('400s a Vaccines row without coldChain:true', async () => {
    for (const body of [
      { itemName: 'OPV', category: 'Vaccines' },
      { itemName: 'OPV', category: 'Vaccines', coldChain: false },
    ]) {
      const res = await as(mgr).post('/items').send(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VACCINE_COLD_CHAIN_REQUIRED');
    }
    expect(created).toHaveLength(0);
  });

  it('400s turning coldChain off on a vaccine row', async () => {
    const row = { _id: '507f1f77bcf86cd799439010', category: 'Vaccines', coldChain: true, hospitalId: 'h1', save: jestApi.fn(async () => row) };
    rowById = () => query(row);
    const res = await as(mgr).put('/items/507f1f77bcf86cd799439010').send({ coldChain: false });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VACCINE_COLD_CHAIN_REQUIRED');
    expect(row.save).not.toHaveBeenCalled();
  });

  it('still creates non-vaccine rows without the flag', async () => {
    const res = await as(mgr).post('/items').send({
      itemName: 'Gauze Roll',
      category: 'Disposables',
      currentStock: 400,
    });
    expect(res.status).toBe(201);
  });
});
