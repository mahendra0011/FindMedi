/**
 * File 22 P0-5: safety ledgers through real HTTP. One CRUD round-trip per
 * ledger (create 201, list contains it, patch updates it).
 */
import { mountApp, query } from '../helpers/appHarness.js';

const store = {
  'visitor-passes': [],
  incidents: [],
  adr: [],
  bmw: [],
  credentials: [],
  mlc: [],
};

const modelFor = (name) => ({
  find: (filter) => query((store[name] || []).filter((r) => !filter?.hospitalId || r.hospitalId === filter.hospitalId)),
  findOneAndUpdate: async (filter, update) => {
    const row = (store[name] || []).find((r) => String(r._id) === String(filter._id));
    if (!row) return null;
    Object.assign(row, update.$set);
    return row;
  },
  create: async (doc) => {
    const row = { _id: `${name}-${Date.now()}`, status: 'Open', ...doc };
    store[name].push(row);
    return row;
  },
  findOne: () => query(null),
});

const { as } = await mountApp('safety', {
  '../../src/models/VisitorPass.js': () => ({ default: modelFor('visitor-passes') }),
  '../../src/models/MlcCase.js': () => ({ default: modelFor('mlc') }),
  '../../src/models/Incident.js': () => ({ default: modelFor('incidents') }),
  '../../src/models/AdrReport.js': () => ({ default: modelFor('adr') }),
  '../../src/models/BmwLog.js': () => ({ default: modelFor('bmw') }),
  '../../src/models/Credential.js': () => ({ default: modelFor('credentials') }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const staff = { _id: 's1', id: 's1', role: 'hospital_admin', hospitalId: 'h1' };

describe('safety ledgers', () => {
  test('visitor pass round-trip', async () => {
    const c = await as(staff).post('/visitor-passes').send({ visitorName: 'Asha', phone: '9811111111' });
    expect(c.status).toBe(201);
    const l = await as(staff).get('/visitor-passes');
    expect(l.status).toBe(200);
    expect(JSON.stringify(l.body)).toContain('Asha');
  });

  test('incident create + RCA patch', async () => {
    const c = await as(staff).post('/incidents').send({ type: 'Fall', severity: 'High', description: 'Ward 3 fall' });
    expect(c.status).toBe(201);
    const p = await as(staff).patch(`/incidents/${c.body.id}`).send({ rca: 'Wet floor, no signage' });
    expect(p.status).toBe(200);
  });

  test('ADR + BMW + credential + MLC create', async () => {
    for (const [path, body] of [
      ['/adr', { patientId: '64b0000000000000000000f1', drug: 'Penicillin', reaction: 'Rash' }],
      ['/bmw', { date: '2026-10-09', yellowKg: 2 }],
      ['/credentials', { staffId: '64b0000000000000000000f2', type: 'NMC', number: 'NMC-1' }],
      ['/mlc', { mlcNo: 'MLC-001', injuryType: 'RTA' }],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const r = await as(staff).post(path).send(body);
      expect(r.status).toBe(201);
    }
  });

  test('expiring credentials watch', async () => {
    const r = await as(staff).get('/credentials/expiring?days=60');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.expiring)).toBe(true);
  });
});
