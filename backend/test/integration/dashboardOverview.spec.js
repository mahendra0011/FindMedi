/**
 * File 22 P0-7: overview (compare + sparkline) and live queue endpoints.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const { as } = await mountApp('dashboard', {
  '../../src/models/Patient.js': () => ({ default: { countDocuments: async () => 0 } }),
  '../../src/models/Doctor.js': () => ({ default: { countDocuments: async () => 0 } }),
  '../../src/models/User.js': () => ({ default: { countDocuments: async () => 0 } }),
  '../../src/models/Appointment.js': () => ({
    default: {
      countDocuments: async () => 5,
      aggregate: async () => [],
      find: () => ({ select: () => ({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }) }),
    },
  }),
  '../../src/models/Billing.js': () => ({
    default: {
      aggregate: async () => [{ paid: 1000, billed: 1500 }],
    },
  }),
  '../../src/models/Admission.js': () => ({ default: { countDocuments: async () => 2 } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };

describe('dashboard overview + queue', () => {
  test('GET /overview returns kpis with deltas + sparkline', async () => {
    const r = await as(admin).get('/overview?from=2026-10-01&to=2026-10-07&compare=1');
    expect(r.status).toBe(200);
    expect(r.body.kpis.collected.value).toBe(1000);
    expect(r.body.kpis.appointments.value).toBe(5);
    expect(r.body.kpis.collected.deltaPct).toBe(0);
    expect(Array.isArray(r.body.spark)).toBe(true);
    expect(r.body.spark.length).toBe(7);
    expect(r.body.prevWindow).not.toBeNull();
  });

  test('GET /overview?compare=0 omits previous window', async () => {
    const r = await as(admin).get('/overview?compare=0');
    expect(r.status).toBe(200);
    expect(r.body.prevWindow).toBeNull();
  });

  test('GET /queue returns live snapshot', async () => {
    const r = await as(admin).get('/queue');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(0);
    expect(Array.isArray(r.body.departments)).toBe(true);
  });

  test('non-admin is forbidden', async () => {
    const r = await as({ _id: 'p1', id: 'p1', role: 'patient' }).get('/overview');
    expect(r.status).toBe(403);
  });
});
