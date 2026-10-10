/**
 * File 22 P0-5: safety ledgers through real HTTP. Full CRUD per ledger
 * (create 201, list contains it, get by id, patch, delete), regulatory
 * deletes are status-voids, and another hospital's id is a 404.
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

const modelFor = (name) => {
  const match = (filter = {}) => (store[name] || []).find((r) => String(r._id) === String(filter._id)
    && (!filter.hospitalId || String(r.hospitalId) === String(filter.hospitalId)));
  return {
    find: (filter) => query((store[name] || []).filter((r) => !filter?.hospitalId || r.hospitalId === filter.hospitalId)),
    findOne: (filter) => query(match(filter) || null),
    findOneAndUpdate: async (filter, update) => {
      const row = match(filter);
      if (!row) return null;
      Object.assign(row, update.$set);
      return row;
    },
    findOneAndDelete: async (filter) => {
      const row = match(filter);
      if (!row) return null;
      store[name].splice(store[name].indexOf(row), 1);
      return row;
    },
    create: async (doc) => {
      const row = { _id: `${name}-${Date.now()}-${store[name].length}`, status: 'Open', ...doc };
      store[name].push(row);
      return row;
    },
  };
};

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
const otherHospital = { _id: 's2', id: 's2', role: 'hospital_admin', hospitalId: 'h2' };

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
      const r = await as(staff).post(path).send(body);
      expect(r.status).toBe(201);
    }
  });

  test('expiring credentials watch', async () => {
    const r = await as(staff).get('/credentials/expiring?days=60');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.expiring)).toBe(true);
  });

  test('get-by-id returns the row; an anonymous caller is 401', async () => {
    const c = await as(staff).post('/incidents').send({ type: 'NearMiss', description: 'Wrong tray' });
    const g = await as(staff).get(`/incidents/${c.body.id}`);
    expect(g.status).toBe(200);
    expect(g.body.type).toBe('NearMiss');
    const anon = await as(null).get(`/incidents/${c.body.id}`);
    expect(anon.status).toBe(401);
  });

  test('regulatory deletes are status-voids, never hard deletes', async () => {
    const mlc = await as(staff).post('/mlc').send({ mlcNo: 'MLC-VOID', injuryType: 'Burn' });
    const adr = await as(staff).post('/adr').send({ drug: 'Amoxicillin', reaction: 'Urticaria' });
    const bmw = await as(staff).post('/bmw').send({ date: '2026-10-10', redKg: 3 });
    const inc = await as(staff).post('/incidents').send({ type: 'Sentinel', severity: 'Critical', description: ' retained' });
    const cred = await as(staff).post('/credentials').send({ staffId: '64b0000000000000000000f3', type: 'BLS' });

    expect((await as(staff).delete(`/mlc/${mlc.body.id}`)).body.status).toBe('Closed');
    expect((await as(staff).delete(`/adr/${adr.body.id}`)).body.status).toBe('Closed');
    const bmwDel = await as(staff).delete(`/bmw/${bmw.body.id}`);
    expect(bmwDel.body.status).toBe('Void');
    const incDel = await as(staff).delete(`/incidents/${inc.body.id}`);
    expect(incDel.body.status).toBe('Closed');
    expect(store.incidents.find((r) => r._id === inc.body.id).closedAt).toBeTruthy();
    expect((await as(staff).delete(`/credentials/${cred.body.id}`)).body.status).toBe('Revoked');

    expect(store.mlc.find((r) => r._id === mlc.body.id)).toBeTruthy();
    expect(store.adr.find((r) => r._id === adr.body.id)).toBeTruthy();
    const bmwRow = store.bmw.find((r) => r._id === bmw.body.id);
    expect(bmwRow.status).toBe('Void');
    expect(bmwRow.voidedAt).toBeTruthy();
    expect(store.incidents.find((r) => r._id === inc.body.id)).toBeTruthy();
  });

  test('visitor pass delete is a hard delete', async () => {
    const c = await as(staff).post('/visitor-passes').send({ visitorName: 'Ravi', phone: '9822222222' });
    const d = await as(staff).delete(`/visitor-passes/${c.body.id}`);
    expect(d.status).toBe(200);
    expect(d.body.deleted).toBe(true);
    expect(store['visitor-passes'].find((r) => r._id === c.body.id)).toBeUndefined();
  });

  test('another hospital gets 404 on read and delete', async () => {
    const inc = await as(staff).post('/incidents').send({ type: 'Fall', description: 'h1 only' });
    const g = await as(otherHospital).get(`/incidents/${inc.body.id}`);
    expect(g.status).toBe(404);
    const d = await as(otherHospital).delete(`/incidents/${inc.body.id}`);
    expect(d.status).toBe(404);
    expect(store.incidents.find((r) => r._id === inc.body.id)).toBeTruthy();
  });
});
