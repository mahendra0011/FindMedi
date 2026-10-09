/**
 * File 22 P1-12: duplicates scan + merge + ABHA link through real HTTP.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const patients = [
  { _id: 'p1', name: 'Ram Kumar', phone: '9811111111', hospitalId: 'h1', mergedInto: null, save: async function s() { return this; } },
  { _id: 'p2', name: 'Ram K.', phone: '9811111111', hospitalId: 'h1', mergedInto: null, save: async function s() { return this; } },
  { _id: 'p3', name: 'Sita', phone: '9822222222', hospitalId: 'h1', mergedInto: null, save: async function s() { return this; } },
];

const updated = [];
const { as } = await mountApp('patients', {
  '../../src/models/Patient.js': () => ({
    default: {
      find: () => query(patients),
      findById: (id) => query(patients.find((p) => String(p._id) === String(id)) || null),
      findOne: () => query(null),
      create: async (doc) => ({ _id: 'np', ...doc }),
    },
  }),
  '../../src/models/Appointment.js': () => ({ default: { updateMany: async () => updated.push('appt') } }),
  '../../src/models/Billing.js': () => ({ default: { updateMany: async () => updated.push('bill') } }),
  '../../src/models/LabOrder.js': () => ({ default: { updateMany: async () => updated.push('lab') } }),
  '../../src/models/PharmacyOrder.js': () => ({ default: { updateMany: async () => updated.push('pharm') } }),
  '../../src/models/Encounter.js': () => ({ default: { updateMany: async () => updated.push('enc') } }),
  '../../src/models/PatientFlag.js': () => ({
    default: { updateMany: async () => updated.push('flag'), find: () => query([]), findOne: () => query(null) },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const staff = { _id: 's1', id: 's1', role: 'receptionist', hospitalId: 'h1' };

describe('P1-12 front desk completion', () => {
  test('duplicates groups same-phone patients', async () => {
    const r = await as(staff).get('/duplicates');
    expect(r.status).toBe(200);
    expect(r.body.groups.length).toBe(1);
    expect(r.body.groups[0].patients.length).toBe(2);
  });

  test('merge re-points refs and marks the duplicate', async () => {
    const r = await as(staff).post('/p1/merge').send({ duplicateId: 'p2' });
    expect(r.status).toBe(200);
    expect(r.body.merged).toBe('p2');
    expect(updated).toEqual(expect.arrayContaining(['appt', 'bill', 'lab', 'pharm', 'enc', 'flag']));
    expect(patients.find((p) => p._id === 'p2').mergedInto).toBe('p1');
  });

  test('merging an already-merged record conflicts', async () => {
    const r = await as(staff).post('/p1/merge').send({ duplicateId: 'p2' });
    expect(r.status).toBe(409);
  });

  test('ABHA link validates format and stores Unverified', async () => {
    const bad = await as(staff).post('/p3/abha').send({ abhaAddress: 'nope' });
    expect(bad.status).toBe(400);
    const ok = await as(staff).post('/p3/abha').send({ abhaAddress: 'sita@sbx' });
    expect(ok.status).toBe(200);
    expect(ok.body.abhaStatus).toBe('Unverified');
  });
});
