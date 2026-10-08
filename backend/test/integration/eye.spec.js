/**
 * 7.md:3.2 eye module — exams (acuity/refraction/prescription), optical job
 * cards (forward-only lab fitting), surgery pipeline (lead to follow-up),
 * patient read-own.
 *
 * What it pins (same guard contract as routes/dental.js):
 *  - 401 anonymously; explicit protect on every write (req.user comes only
 *    from it);
 *  - provider ownership on writes (foreign 404), real-patient references;
 *  - strict refraction ranges (sph/cyl/axis), unknown procedure/eye 400s;
 *  - forward-only transitions with server timestamps (skips and reopens
 *    409); dentist-side lists ownership-scoped with mandatory patientId;
 *  - /mine allowlisted with personId scope; writes audit with patientId.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const OWNER = { _id: 'owner-1', id: 'owner-1', role: 'optician' };
const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };
const PROVIDER_ID = '707f1f77bcf86cd799439001';
const PATIENT_ID = '507f1f77bcf86cd7994390b1';

const calls = {};
const data = {};
const auditLog = jestApi.fn();

const chainable = (rows) => {
  const chain = {
    select: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: () => chain,
    then: (res, rej) => Promise.resolve(rows).then(res, rej),
  };
  return chain;
};

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: {
    findById: (id) => { calls.providerFindById = id; return query(data.provider ?? null); },
    find: (filter) => { calls.providerFind = filter; return chainable(data.myProviders ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/EyeExam.js', () => ({
  default: {
    create: (doc) => { calls.examCreate = doc; return query({ _id: 'ex1', ...doc }); },
    find: (filter) => { calls.examFind = filter; return chainable(data.exams ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/OpticalJobCard.js', () => ({
  default: {
    create: (doc) => { calls.jobCreate = doc; return query({ _id: 'job1', status: 'booked', ...doc }); },
    find: (filter) => { calls.jobFind = filter; return chainable(data.jobs ?? []); },
    findById: (id) => { calls.jobFindById = id; return query(data.jobRow ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/models/EyeSurgeryLead.js', () => ({
  default: {
    create: (doc) => { calls.leadCreate = doc; return query({ _id: 'lead1', stage: 'lead', ...doc }); },
    find: (filter) => { calls.leadFind = filter; return chainable(data.leads ?? []); },
    findById: (id) => { calls.leadFindById = id; return query(data.leadRow ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (filter) => { calls.familyLookup = filter; return query(data.familyRow ?? null); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const USER_STUB = () => {
  const doc = { _id: 'u-1', twoFactorEnabled: false };
  return {
    default: {
      findById: () => query(globalThis.__patientUser ?? null),
      findOne: async () => null,
    },
    passwordMatchesHash: async () => ({ ok: false, legacy: false }),
  };
};

const { as } = await mountApp('eye', {
  '../../src/models/User.js': USER_STUB,
});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
  globalThis.__patientUser = { _id: PATIENT_ID };
  data.provider = { _id: PROVIDER_ID, ownerUserId: 'owner-1', status: 'live' };
  data.myProviders = [{ _id: PROVIDER_ID }];
});

describe('exams', () => {
  it('401s anonymously, creates owned exams with refraction, audits', async () => {
    expect((await as().post('/exams').send({})).status).toBe(401);

    const res = await as(OWNER).post('/exams').send({
      patientId: PATIENT_ID, providerId: PROVIDER_ID,
      od: { sph: -2.5, cyl: -0.75, axis: 180, va: '6/9' },
      os: { sph: -2.25, cyl: -0.5, axis: 175, va: '6/9' },
      diagnosis: 'Myopia', prescriptionIssued: true, prescriptionType: 'glasses',
      nextReviewDate: '2099-06-01',
    });
    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.examCreate).toMatchObject({ patientId: PATIENT_ID, providerId: PROVIDER_ID, recordedBy: 'owner-1' });
    expect(calls.examCreate.od).toMatchObject({ sph: -2.5, axis: 180 });
    expect(auditLog).toHaveBeenCalledWith('eye_exam_created', 'owner-1', expect.objectContaining({ patientId: PATIENT_ID }));
  });

  it('404s foreign providers and missing patients, 400s bad refraction', async () => {
    data.provider = { _id: PROVIDER_ID, ownerUserId: 'someone-else', status: 'live' };
    expect((await as(OWNER).post('/exams').send({ patientId: PATIENT_ID, providerId: PROVIDER_ID })).status).toBe(404);

    data.provider = { _id: PROVIDER_ID, ownerUserId: 'owner-1', status: 'live' };
    globalThis.__patientUser = null;
    expect((await as(OWNER).post('/exams').send({ patientId: PATIENT_ID, providerId: PROVIDER_ID })).status).toBe(404);

    globalThis.__patientUser = { _id: PATIENT_ID };
    const bad = { patientId: PATIENT_ID, providerId: PROVIDER_ID, od: { sph: -99 } };
    expect((await as(OWNER).post('/exams').send(bad)).status).toBe(400);
    expect((await as(OWNER).get('/exams')).status).toBe(400);
  });

  it('lists ownership-scoped exams for an explicit patient', async () => {
    data.exams = [{ _id: 'e1' }];
    const res = await as(OWNER).get(`/exams?patientId=${PATIENT_ID}`);
    expect(res.status).toBe(200);
    expect(calls.examFind).toMatchObject({ patientId: PATIENT_ID });
    expect(calls.examFind.providerId).toEqual({ $in: [PROVIDER_ID] });
  });
});

describe('job cards', () => {
  it('creates cards booked and walks them forward with server stamps', async () => {
    const created = await as(OWNER).post('/job-cards').send({
      patientId: PATIENT_ID, providerId: PROVIDER_ID, frames: 'Rayban RB5154',
      lensOd: { sph: -2.5, cyl: -0.75, axis: 180 }, priceAmount: 3500,
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('booked');

    const save = jestApi.fn(async () => {});
    data.jobRow = { _id: 'j1', status: 'booked', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    const inLab = await as(OWNER).patch('/job-cards/507f1f77bcf86cd7994390c3/status').send({ status: 'in_lab' });
    expect(inLab.status).toBe(200);
    expect(data.jobRow.inLabAt).toBeDefined();
    expect(save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('optical_job_status', 'owner-1', expect.objectContaining({ status: 'in_lab' }));

    data.jobRow = { _id: 'j1', status: 'delivered', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    const reopened = await as(OWNER).patch('/job-cards/507f1f77bcf86cd7994390c3/status').send({ status: 'in_lab' });
    expect(reopened.status).toBe(409);

    data.jobs = [{ _id: 'j1', status: 'ready' }];
    const filtered = await as(OWNER).get(`/job-cards?patientId=${PATIENT_ID}&status=ready`);
    expect(filtered.body.total).toBe(1);
    expect((await as(OWNER).get(`/job-cards?patientId=${PATIENT_ID}&status=polished`)).status).toBe(400);
  });
});

describe('surgery pipeline', () => {
  it('runs leads from lead to follow-up, never backwards', async () => {
    const created = await as(OWNER).post('/surgery-leads').send({
      patientId: PATIENT_ID, providerId: PROVIDER_ID, procedure: 'cataract', eye: 'od', notes: 'NS grade 3',
    });
    expect(created.status).toBe(201);
    expect(created.body.stage).toBe('lead');
    expect((await as(OWNER).post('/surgery-leads').send({ patientId: PATIENT_ID, providerId: PROVIDER_ID, procedure: 'laser', eye: 'od' })).status).toBe(400);

    const save = jestApi.fn(async () => {});
    const stages = ['pre_op', 'scheduled', 'completed', 'follow_up'];
    for (const [i, stage] of stages.entries()) {
      data.leadRow = { _id: 'l1', stage: i === 0 ? 'lead' : stages[i - 1], patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
      const res = await as(OWNER).patch('/surgery-leads/507f1f77bcf86cd7994390c4/stage').send({ stage });
      expect(res.status).toBe(200);
    }
    data.leadRow = { _id: 'l1', stage: 'lead', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    expect((await as(OWNER).patch('/surgery-leads/507f1f77bcf86cd7994390c4/stage').send({ stage: 'completed' })).status).toBe(409);

    data.leads = [{ _id: 'l1', stage: 'pre_op' }];
    const filtered = await as(OWNER).get(`/surgery-leads?patientId=${PATIENT_ID}&stage=pre_op`);
    expect(filtered.body.total).toBe(1);
  });
});

describe('GET /mine', () => {
  it('serves allowlisted groups scoped to the session', async () => {
    data.exams = [{ _id: 'e1', providerId: PROVIDER_ID, od: {}, os: {}, recordedBy: 'owner-1' }];
    data.jobs = [{ _id: 'j1', providerId: PROVIDER_ID, frames: 'RB', status: 'ready', priceAmount: 3500 }];
    data.leads = [{ _id: 'l1', providerId: PROVIDER_ID, procedure: 'cataract', eye: 'od', stage: 'lead' }];
    const res = await as(PATIENT).get('/mine');
    expect(res.status).toBe(200);
    expect(res.body.exams[0]).not.toHaveProperty('recordedBy');
    expect(res.body.jobCards[0]).toMatchObject({ id: 'j1', status: 'ready' });
    expect(res.body.surgeryLeads[0]).toMatchObject({ procedure: 'cataract', stage: 'lead' });
    expect(calls.examFind).toMatchObject({ patientId: 'pat-1', familyMemberId: null });

    data.familyRow = null;
    expect((await as(PATIENT).get('/mine?personId=507f1f77bcf86cd799439090')).status).toBe(404);
  });
});
