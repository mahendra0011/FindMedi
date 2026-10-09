/**
 * File 22 P1-15: room-rent deduction math, appeal gating, PM-JAY map.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const claims = [];
const pmjay = [];

const { as } = await mountApp('tpa', {
  '../../src/models/Insurer.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/PreAuthRequest.js': () => ({ default: { aggregate: async () => [], find: () => query([]) } }),
  '../../src/models/Claim.js': () => ({
    default: {
      find: () => query(claims),
      findById: (id) => query(claims.find((c) => String(c._id) === String(id)) || null),
      aggregate: async () => [],
      create: async (doc) => {
        const row = {
          _id: `c${claims.length}`, queries: [], deductions: [], documents: [],
          ...doc, save: async function s() { return this; },
        };
        claims.push(row);
        return row;
      },
    },
  }),
  '../../src/models/PmjayPackage.js': () => ({
    default: {
      find: () => query(pmjay),
      findOneAndUpdate: async (filter, update) => {
        const row = { _id: 'pm1', code: filter.code, ...update.$set };
        pmjay.push(row);
        return row;
      },
    },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const desk = { _id: 't1', id: 't1', role: 'insurance_desk', hospitalId: 'h1' };

describe('P1-15 TPA depth', () => {
  test('insurance_desk can operate the desk', async () => {
    const r = await as(desk).get('/pipeline');
    expect(r.status).toBe(200);
  });

  test('room-rent proportionate deduction math', async () => {
    claims.push({ _id: '64b000000000000000000c01', status: 'Submitted', deductions: [], queries: [], save: async function s() { return this; } });
    const r = await as(desk).post('/claims/64b000000000000000000c01/room-rent').send({ eligiblePerDay: 3000, actualPerDay: 5000, days: 4 });
    expect(r.status).toBe(200);
    expect(r.body.deduction).toBe(8000);
  });

  test('query thread appends', async () => {
    const r = await as(desk).post('/claims/64b000000000000000000c01/query').send({ text: 'Send discharge summary' });
    expect(r.status).toBe(201);
    expect(r.body.queries).toBe(1);
  });

  test('only Rejected/Partial can be appealed; appeal spawns child', async () => {
    const bad = await as(desk).post('/claims/64b000000000000000000c01/appeal').send({ grounds: 'x' });
    expect(bad.status).toBe(409);
    claims[0].status = 'Rejected';
    const ok = await as(desk).post('/claims/64b000000000000000000c01/appeal').send({ grounds: 'Room rent wrongly capped' });
    expect(ok.status).toBe(201);
    expect(ok.body.appealOf).toBe('64b000000000000000000c01');
  });

  test('PM-JAY upsert + list', async () => {
    const c = await as(desk).post('/pmjay').send({ code: 'PMJ-001', name: 'Cataract', rate: 12000 });
    expect(c.status).toBe(201);
    const l = await as(desk).get('/pmjay?q=cataract');
    expect(l.status).toBe(200);
    expect(l.body.packages.length).toBe(1);
  });
});
