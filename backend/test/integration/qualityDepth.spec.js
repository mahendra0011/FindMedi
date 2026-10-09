/**
 * File 22 P2-30: chapter seed idempotency, assessment scoring, CAPA close
 * gate, MTP consent gate.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const chapters = [];
const assessments = [];
const capas = [];
const mtps = [];

const { as } = await mountApp('quality', {
  '../../src/models/NabhChapter.js': () => ({
    NABH_SEED: [
      { code: 'ACC' }, { code: 'COP' }, { code: 'MOM' }, { code: 'PRE' },
      { code: 'HIC' }, { code: 'FMS' }, { code: 'HRM' }, { code: 'IMS' },
    ],
    default: {
      find: () => query(chapters),
      findOne: (f) => query(chapters.find((c) => c.code === f.code) || null),
      findOneAndUpdate: async (filter, update, opts) => {
        let row = chapters.find((c) => c.code === filter.code);
        if (!row && opts?.upsert) {
          row = { _id: 'ch1', code: filter.code, ...(update.$setOnInsert || update.$set || {}) };
          chapters.push(row);
        }
        return row;
      },
    },
  }),
  '../../src/models/NabhAssessment.js': () => ({
    default: {
      find: () => query(assessments),
      findOne: (f) => query(assessments.find((a) => String(a._id) === String(f._id)) || null),
      create: async (d) => { const r = { _id: 'as1', ...d }; assessments.push(r); return r; },
    },
  }),
  '../../src/models/Capa.js': () => ({
    default: {
      find: () => query(capas),
      create: async (d) => { const r = { _id: 'cp1', status: 'Open', ...d }; capas.push(r); return r; },
      findOneAndUpdate: async (filter, update) => {
        const r = capas.find((c) => String(c._id) === String(filter._id));
        if (!r) return null;
        Object.assign(r, update.$set);
        return r;
      },
    },
  }),
  '../../src/models/PcpndtFormF.js': () => ({ default: { find: () => query([]), create: async (d) => ({ _id: 'pc1', ...d }) } }),
  '../../src/models/MtpRegister.js': () => ({
    default: {
      find: () => query(mtps),
      create: async (d) => { const r = { _id: 'm1', ...d }; mtps.push(r); return r; },
    },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const mgr = { _id: 'm1', id: 'm1', role: 'hospital_admin', hospitalId: 'h1' };

describe('P2-30 quality', () => {
  test('chapter seed creates the 8 chapters', async () => {
    const NABH_SEED_LEN = 8;
    const r = await as(mgr).post('/chapters/seed').send({});
    expect(r.status).toBe(201);
    expect(chapters.length).toBe(NABH_SEED_LEN);
  });

  test('assessment derives scorePct (na excluded)', async () => {
    chapters.push({ _id: 'ch1', code: 'ACC', objectives: [] });
    const r = await as(mgr).post('/assessments').send({
      chapter: 'ACC',
      scores: { 'ACC.1': 'compliant', 'ACC.4': 'partial', 'ACC.9': 'na' },
    });
    expect(r.status).toBe(201);
    expect(r.body.scorePct).toBe(75);
  });

  test('CAPA close requires effectiveness review', async () => {
    const c = await as(mgr).post('/capa').send({ finding: 'Fridge log gaps' });
    expect(c.status).toBe(201);
    const noEff = await as(mgr).patch(`/capa/${c.body.id}`).send({ status: 'Closed' });
    expect(noEff.status).toBe(400);
    const ok = await as(mgr).patch(`/capa/${c.body.id}`).send({ status: 'Closed', effectiveness: 'Logs complete 4 weeks' });
    expect(ok.status).toBe(200);
  });

  test('MTP requires consent', async () => {
    const no = await as(mgr).post('/mtp').send({ patientName: 'X', gestationalAgeWeeks: 8 });
    expect(no.status).toBe(422);
    const yes = await as(mgr).post('/mtp').send({ patientName: 'X', gestationalAgeWeeks: 8, consentTaken: true });
    expect(yes.status).toBe(201);
  });
});
