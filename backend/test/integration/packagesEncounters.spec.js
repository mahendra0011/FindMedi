import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const packages = [
  { _id: '507f191e810c19729de860k1', name: 'Executive Health Checkup', price: 2999, hospitalId: '507f191e810c19729de860ed' },
];

const encounters = [
  {
    _id: '507f191e810c19729de860e1',
    encounterNo: 'ENC-2026-001',
    patientId: '507f191e810c19729de860ea',
    status: 'Open',
    hospitalId: '507f191e810c19729de860ed',
    openedAt: new Date(),
  },
];

const { as: asPackages } = await mountApp('clinicPackages', {
  '../../src/models/ClinicPackage.js': () => ({
    default: {
      find: () => query(packages),
      create: async (data) => ({ _id: '507f191e810c19729de860k2', ...data }),
      findOneAndUpdate: async () => packages[0],
      deleteOne: async () => ({ deletedCount: 1 }),
    },
  }),
});

const { as: asEncounters } = await mountApp('encounters', {
  '../../src/models/Encounter.js': () => ({
    default: {
      find: () => ({ sort: () => ({ limit: () => ({ lean: async () => encounters }) }) }),
      findOne: (filter) => query(encounters[0]),
      findOneAndUpdate: async (filter, update) => {
        encounters[0].status = 'Open';
        return encounters[0];
      },
    },
  }),
  '../../src/lib/encounter.js': () => ({
    closeEncounter: async () => {
      encounters[0].status = 'Closed';
      return encounters[0];
    },
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}) }),
});

describe('Clinic Packages & Patient Encounters Integration', () => {
  const staff = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    role: 'hospital_admin',
    hospitalId: '507f191e810c19729de860ed',
    permissions: ['records:read', 'appointments:read', 'records:write', 'appointments:write'],
  };

  it('lists clinic health checkup packages', async () => {
    const res = await asPackages(staff).get('/').expect(200);
    expect(res.body.packages).toHaveLength(1);
    expect(res.body.packages[0].name).toBe('Executive Health Checkup');
  });

  it('fetches clinical encounters list and single encounter by ID', async () => {
    const res = await asEncounters(staff).get('/').expect(200);
    expect(res.body.encounters).toHaveLength(1);
    expect(res.body.encounters[0].encounterNo).toBe('ENC-2026-001');

    const singleRes = await asEncounters(staff).get('/507f191e810c19729de860e1').expect(200);
    expect(singleRes.body.encounter.encounterNo).toBe('ENC-2026-001');
  });

  it('closes an active encounter with audit logging', async () => {
    const res = await asEncounters(staff)
      .put('/507f191e810c19729de860e1/close')
      .expect(200);

    expect(res.body.encounter.status).toBe('Closed');
  });
});
