/**
 * 7.md:3.1 dental module — charts (odontogram snapshots), treatment plans
 * (staged, costed), lab-work tracker (forward-only), sterilisation log,
 * patient read-own.
 *
 * What it pins:
 *  - 401 anonymously (authorizeObject 401s without a session; protect gates
 *    the list reads);
 *  - writes prove provider ownership (foreign providerId is 404, never 403)
 *    and reference a real patient (else 404);
 *  - charts are snapshots with consented images; plans derive estimateTotal
 *    at read; lab-work moves sent→received→fitted with server-stamped times
 *    (skips and reopens are 409); sterilisation writes are compliance rows;
 *  - dentist-side lists are ownership-scoped (no cross-provider dump) and
 *    require an explicit patientId (400 without);
 *  - strict per-field validation (bad FDI, unknown condition, negative cost);
 *  - /mine is session+profile scoped with an allowlisted DTO (no writer ids);
 *  - writes audit with details.patientId so the patient sees them in their
 *    access log.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const OWNER = { _id: 'owner-1', id: 'owner-1', role: 'dentist' };
const STRANGER = { _id: 'stranger-1', id: 'stranger-1', role: 'dentist' };
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
jestApi.unstable_mockModule('../../src/models/DentalChart.js', () => ({
  default: {
    create: (doc) => { calls.chartCreate = doc; return query({ _id: 'chart1', ...doc }); },
    find: (filter) => { calls.chartFind = filter; return chainable(data.charts ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/DentalTreatmentPlan.js', () => ({
  default: {
    create: (doc) => { calls.planCreate = doc; return query({ _id: 'plan1', ...doc }); },
    find: (filter) => { calls.planFind = filter; return chainable(data.plans ?? []); },
    findById: (id) => { calls.planFindById = id; return query(data.planRow ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/models/DentalLabWork.js', () => ({
  default: {
    create: (doc) => { calls.labCreate = doc; return query({ _id: 'lab1', status: 'sent', ...doc }); },
    find: (filter) => { calls.labFind = filter; return chainable(data.labWorks ?? []); },
    findById: (id) => { calls.labFindById = id; return query(data.labRow ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/models/SterilisationLog.js', () => ({
  default: {
    create: (doc) => { calls.steriCreate = doc; return query({ _id: 'st1', ...doc }); },
    find: (filter) => { calls.steriFind = filter; return chainable(data.steriLogs ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (filter) => { calls.familyLookup = filter; return query(data.familyRow ?? null); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

// User goes through mountApp's models map (harness precedence): requirePatient
// needs a configurable findById.
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

const { as } = await mountApp('dental', {
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

const chartBody = () => ({
  patientId: PATIENT_ID, providerId: PROVIDER_ID,
  teeth: [{ fdi: '16', condition: 'caries', notes: 'deep' }, { fdi: '11', condition: 'healthy' }],
});

describe('charts', () => {
  it('401s anonymously', async () => {
    expect((await as().post('/charts').send(chartBody())).status).toBe(401);
  });

  it('creates owned snapshots with consented images and audits with patientId', async () => {
    const res = await as(OWNER).post('/charts').send({
      ...chartBody(), images: ['https://cdn/x.png'], photoConsent: { granted: true },
    });
    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.chartCreate).toMatchObject({
      patientId: PATIENT_ID, providerId: PROVIDER_ID, recordedBy: 'owner-1',
    });
    expect(calls.chartCreate.photoConsent.granted).toBe(true);
    expect(calls.chartCreate.photoConsent.grantedAt).toBeDefined();
    expect(auditLog).toHaveBeenCalledWith(
      'dental_chart_created', 'owner-1',
      expect.objectContaining({ patientId: PATIENT_ID, chartId: 'chart1' }),
    );
  });

  it('404s foreign providers and missing patients, 400s bad teeth', async () => {
    data.provider = { _id: PROVIDER_ID, ownerUserId: 'someone-else', status: 'live' };
    expect((await as(OWNER).post('/charts').send(chartBody())).status).toBe(404);
    expect(calls.chartCreate).toBeUndefined();

    data.provider = { _id: PROVIDER_ID, ownerUserId: 'owner-1', status: 'live' };
    globalThis.__patientUser = null;
    expect((await as(OWNER).post('/charts').send(chartBody())).status).toBe(404);

    globalThis.__patientUser = { _id: PATIENT_ID };
    expect((await as(OWNER).post('/charts').send({ ...chartBody(), teeth: [{ fdi: '99', condition: 'caries' }] })).status).toBe(400);
    expect((await as(OWNER).post('/charts').send({ ...chartBody(), teeth: [{ fdi: '16', condition: 'ghost' }] })).status).toBe(400);
    expect((await as(OWNER).get('/charts')).status).toBe(400);
  });

  it('lists ownership-scoped charts for an explicit patient', async () => {
    data.charts = [{ _id: 'c1', patientId: PATIENT_ID, teeth: [] }];
    const res = await as(OWNER).get(`/charts?patientId=${PATIENT_ID}`);
    expect(res.status).toBe(200);
    // Ownership scoping is proven by the filter (provider rows limited to my
    // listings); the mock store does not enforce filters itself.
    expect(calls.chartFind).toMatchObject({ patientId: PATIENT_ID });
    expect(calls.chartFind.providerId).toEqual({ $in: [PROVIDER_ID] });
  });
});

describe('treatment plans', () => {
  const planBody = () => ({
    patientId: PATIENT_ID, providerId: PROVIDER_ID, title: 'Full mouth rehab',
    stages: [
      { name: 'RCT 16', teeth: ['16'], costAmount: 8000 },
      { name: 'Crown 16', teeth: ['16'], costAmount: 12000, status: 'planned' },
    ],
  });

  it('creates staged plans and derives the estimate at read', async () => {
    const created = await as(OWNER).post('/plans').send(planBody());
    expect(created.status).toBe(201);
    expect(calls.planCreate.stages).toHaveLength(2);

    data.plans = [{ _id: 'p1', title: 'Full mouth rehab', stages: [{ name: 'RCT 16', costAmount: 8000 }, { name: 'Crown 16', costAmount: 12000 }], status: 'draft' }];
    const listed = await as(OWNER).get(`/plans?patientId=${PATIENT_ID}`);
    expect(listed.body.plans[0].estimateTotal).toBe(20000);
    expect(auditLog).toHaveBeenCalledWith('dental_plan_created', 'owner-1', expect.objectContaining({ patientId: PATIENT_ID }));
  });

  it('moves status forward only, stamping nothing client-controlled', async () => {
    const save = jestApi.fn(async () => {});
    data.planRow = { _id: 'p1', status: 'draft', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    const res = await as(OWNER).patch('/plans/507f1f77bcf86cd7994390c1/status').send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'active' });
    expect(save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('dental_plan_status', 'owner-1', expect.objectContaining({ status: 'active' }));

    data.planRow = { _id: 'p1', status: 'completed', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    const reopened = await as(OWNER).patch('/plans/507f1f77bcf86cd7994390c1/status').send({ status: 'active' });
    expect(reopened.status).toBe(409);
    expect(reopened.body.code).toBe('INVALID_TRANSITION');
  });

  it('rejects negative costs and stranger-owned plans', async () => {
    expect((await as(OWNER).post('/plans').send({ patientId: PATIENT_ID, providerId: PROVIDER_ID, stages: [{ name: 'X', costAmount: -5 }] })).status).toBe(400);
    data.provider = { _id: PROVIDER_ID, ownerUserId: 'someone-else', status: 'live' };
    const save = jestApi.fn(async () => {});
    data.planRow = { _id: 'p1', status: 'draft', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    expect((await as(STRANGER).patch('/plans/507f1f77bcf86cd7994390c1/status').send({ status: 'active' })).status).toBe(404);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('lab works', () => {
  it('tracks sent→received→fitted with server timestamps', async () => {
    const created = await as(OWNER).post('/lab-works').send({
      patientId: PATIENT_ID, providerId: PROVIDER_ID, workType: 'crown', teeth: ['16'], labName: 'City Dental Lab',
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('sent');

    const save = jestApi.fn(async () => {});
    data.labRow = { _id: 'l1', status: 'sent', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    const received = await as(OWNER).patch('/lab-works/507f1f77bcf86cd7994390c2/status').send({ status: 'received' });
    expect(received.status).toBe(200);
    expect(data.labRow.receivedAt).toBeDefined();
    expect(data.labRow.fittedAt ?? null).toBeNull();

    data.labRow = { _id: 'l1', status: 'fitted', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    expect((await as(OWNER).patch('/lab-works/507f1f77bcf86cd7994390c2/status').send({ status: 'received' })).status).toBe(409);

    data.labWorks = [{ _id: 'l1', workType: 'crown', status: 'received' }];
    const filtered = await as(OWNER).get(`/lab-works?patientId=${PATIENT_ID}&status=received`);
    expect(filtered.body.total).toBe(1);
    expect((await as(OWNER).get(`/lab-works?patientId=${PATIENT_ID}&status=polished`)).status).toBe(400);
  });
});

describe('sterilisation log', () => {
  it('logs cycles provider-scoped and filters by date', async () => {
    const created = await as(OWNER).post('/sterilisation').send({
      providerId: PROVIDER_ID, method: 'autoclave', temperatureC: 134, durationMin: 18,
      indicator: 'pass', machineId: 'AUTO-1', date: '2099-02-01',
    });
    expect(created.status).toBe(201);
    expect(auditLog).toHaveBeenCalledWith(
      'sterilisation_logged', 'owner-1', expect.objectContaining({ indicator: 'pass' }),
    );

    data.steriLogs = [{ _id: 's1', method: 'autoclave', indicator: 'pass' }];
    const listed = await as(OWNER).get(`/sterilisation?providerId=${PROVIDER_ID}&from=2099-01-01&to=2099-12-31`);
    expect(listed.body.total).toBe(1);
    expect(calls.steriFind).toMatchObject({ providerId: PROVIDER_ID, date: { $gte: '2099-01-01', $lte: '2099-12-31' } });

    expect((await as(OWNER).get('/sterilisation?providerId=507f1f77bcf86cd799439099')).status).toBe(404);
    expect((await as(OWNER).post('/sterilisation').send({ providerId: PROVIDER_ID, method: 'microwave', indicator: 'pass', date: '2099-02-01' })).status).toBe(400);
  });
});

describe('GET /mine — patient read-own', () => {
  it('serves allowlisted groups scoped to the session, 404s foreigners', async () => {
    data.charts = [{ _id: 'c1', providerId: PROVIDER_ID, teeth: [{ fdi: '16' }], images: [], recordedAt: new Date('2099-01-01'), recordedBy: 'owner-1' }];
    data.plans = [{ _id: 'p1', providerId: PROVIDER_ID, title: 'T', stages: [{ name: 'X', costAmount: 500 }], status: 'active' }];
    data.labWorks = [{ _id: 'l1', providerId: PROVIDER_ID, workType: 'crown', teeth: ['16'], status: 'sent' }];
    const res = await as(PATIENT).get('/mine');
    expect(res.status).toBe(200);
    expect(res.body.plans[0].estimateTotal).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('owner-1');
    expect(calls.chartFind).toMatchObject({ patientId: 'pat-1', familyMemberId: null });

    data.familyRow = null;
    expect((await as(PATIENT).get('/mine?personId=507f1f77bcf86cd799439090')).status).toBe(404);
  });
});
