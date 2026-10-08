/**
 * 7.md:3.17 fertility — cycle tracker with ART consent and audited outcome
 * reporting.
 *
 * What it pins (same guard contract as dental/eye/dialysis):
 *  - 401 anonymously; explicit protect on writes;
 *  - provider ownership on writes (foreign 404), real-patient references;
 *  - ART consent travels per-cycle (grantedAt defaulted server-side);
 *  - status moves active→completed/cancelled only (409 otherwise);
 *  - outcome records once on an active cycle, completes it atomically,
 *    stamps server-side, audits WITHOUT the result value; a second outcome
 *    is 409, never an edit;
 *  - /mine allowlisted with personId scope.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const OWNER = { _id: 'owner-1', id: 'owner-1', role: 'fertility_admin' };
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
jestApi.unstable_mockModule('../../src/models/FertilityCycle.js', () => ({
  default: {
    create: (doc) => { calls.cycleCreate = doc; return query({ _id: 'cy1', ...doc }); },
    find: (filter) => { calls.cycleFind = filter; return chainable(data.cycles ?? []); },
    findById: (id) => { calls.cycleFindById = id; return query(data.cycleRow ?? null); },
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

const { as } = await mountApp('fertility', {
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

const cycleBody = () => ({
  patientId: PATIENT_ID, providerId: PROVIDER_ID, cycleNo: 2, cycleType: 'ivf',
  procedures: [{ name: 'Egg retrieval', date: '2099-03-01' }],
  artConsent: { granted: true },
});

describe('cycles', () => {
  it('401s anonymously, creates owned cycles with ART consent, audits', async () => {
    expect((await as().post('/cycles').send(cycleBody())).status).toBe(401);

    const res = await as(OWNER).post('/cycles').send(cycleBody());
    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.cycleCreate).toMatchObject({
      patientId: PATIENT_ID, providerId: PROVIDER_ID, recordedBy: 'owner-1',
      cycleNo: 2, cycleType: 'ivf',
    });
    expect(calls.cycleCreate.artConsent.granted).toBe(true);
    expect(calls.cycleCreate.artConsent.grantedAt).toBeDefined();
    expect(auditLog).toHaveBeenCalledWith(
      'fertility_cycle_created', 'owner-1', expect.objectContaining({ patientId: PATIENT_ID }),
    );
  });

  it('404s foreign providers and missing patients, 400s bad cycles', async () => {
    data.provider = { _id: PROVIDER_ID, ownerUserId: 'someone-else', status: 'live' };
    expect((await as(OWNER).post('/cycles').send(cycleBody())).status).toBe(404);
    expect(calls.cycleCreate).toBeUndefined();

    data.provider = { _id: PROVIDER_ID, ownerUserId: 'owner-1', status: 'live' };
    globalThis.__patientUser = null;
    expect((await as(OWNER).post('/cycles').send(cycleBody())).status).toBe(404);

    globalThis.__patientUser = { _id: PATIENT_ID };
    expect((await as(OWNER).post('/cycles').send({ ...cycleBody(), cycleNo: 0 })).status).toBe(400);
    expect((await as(OWNER).post('/cycles').send({ ...cycleBody(), cycleType: 'acupuncture' })).status).toBe(400);
    expect((await as(OWNER).get('/cycles')).status).toBe(400);
  });

  it('lists ownership-scoped cycles with status filters', async () => {
    data.cycles = [{ _id: 'c1', cycleNo: 2, status: 'active' }];
    const res = await as(OWNER).get(`/cycles?patientId=${PATIENT_ID}&status=active`);
    expect(res.status).toBe(200);
    expect(calls.cycleFind).toMatchObject({ patientId: PATIENT_ID, status: 'active' });
    expect(calls.cycleFind.providerId).toEqual({ $in: [PROVIDER_ID] });
    expect((await as(OWNER).get(`/cycles?patientId=${PATIENT_ID}&status=archived`)).status).toBe(400);
  });

  it('moves status forward only', async () => {
    const save = jestApi.fn(async () => {});
    data.cycleRow = { _id: 'c1', status: 'active', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    const res = await as(OWNER).patch('/cycles/507f1f77bcf86cd7994390c5/status').send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('fertility_cycle_status', 'owner-1', expect.objectContaining({ status: 'cancelled' }));

    data.cycleRow = { _id: 'c1', status: 'completed', patientId: PATIENT_ID, providerId: PROVIDER_ID, save };
    expect((await as(OWNER).patch('/cycles/507f1f77bcf86cd7994390c5/status').send({ status: 'active' })).status).toBe(409);
  });
});

describe('outcome reporting', () => {
  it('records once on an active cycle, completes it, audits without the value', async () => {
    const save = jestApi.fn(async () => {});
    data.cycleRow = { _id: 'c1', status: 'active', patientId: PATIENT_ID, providerId: PROVIDER_ID, outcome: {}, save };
    const res = await as(OWNER).patch('/cycles/507f1f77bcf86cd7994390c5/outcome').send({ result: 'positive' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'completed' });
    expect(res.body.outcome.result).toBe('positive');
    expect(res.body.outcome.recordedAt).toBeDefined();
    expect(data.cycleRow.status).toBe('completed');
    expect(auditLog).toHaveBeenCalledWith('fertility_outcome_recorded', 'owner-1', expect.objectContaining({ cycleId: 'c1' }));
    expect(JSON.stringify(auditLog.mock.calls)).not.toContain('positive');

    data.cycleRow = { _id: 'c1', status: 'completed', patientId: PATIENT_ID, providerId: PROVIDER_ID, outcome: { result: 'positive', recordedAt: new Date() }, save };
    const second = await as(OWNER).patch('/cycles/507f1f77bcf86cd7994390c5/outcome').send({ result: 'negative' });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('OUTCOME_RECORDED');
  });

  it('refuses outcomes on non-active cycles and bad results', async () => {
    const save = jestApi.fn(async () => {});
    data.cycleRow = { _id: 'c1', status: 'cancelled', patientId: PATIENT_ID, providerId: PROVIDER_ID, outcome: {}, save };
    expect((await as(OWNER).patch('/cycles/507f1f77bcf86cd7994390c5/outcome').send({ result: 'positive' })).status).toBe(409);
    expect((await as(OWNER).patch('/cycles/507f1f77bcf86cd7994390c5/outcome').send({ result: 'twins' })).status).toBe(400);
  });
});

describe('GET /mine', () => {
  it('serves allowlisted cycles scoped to the session', async () => {
    data.cycles = [{
      _id: 'c1', providerId: PROVIDER_ID, cycleNo: 2, cycleType: 'ivf', status: 'completed',
      procedures: [{ name: 'Egg retrieval' }], outcome: { result: 'positive', recordedAt: new Date('2099-04-01') },
      recordedBy: 'owner-1', artConsent: { granted: true },
    }];
    const res = await as(PATIENT).get('/mine');
    expect(res.status).toBe(200);
    expect(res.body.cycles[0]).toMatchObject({ id: 'c1', cycleNo: 2, status: 'completed' });
    expect(res.body.cycles[0].outcome).toMatchObject({ result: 'positive' });
    expect(JSON.stringify(res.body)).not.toContain('owner-1');
    expect(calls.cycleFind).toMatchObject({ patientId: 'pat-1', familyMemberId: null });

    data.familyRow = null;
    expect((await as(PATIENT).get('/mine?personId=507f1f77bcf86cd799439090')).status).toBe(404);
  });
});
