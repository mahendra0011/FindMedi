/**
 * 7.md:3.16 dialysis — session records (pre/post weight, BP, UF, isolation)
 * and water-quality logs, patient read-own.
 *
 * What it pins (same guard contract as dental/eye):
 *  - 401 anonymously; explicit protect on writes;
 *  - provider ownership on writes (foreign 404), real-patient references;
 *  - clinical ranges enforced (weights, BP, UF caps, chlorine/TDS caps);
 *  - staff lists ownership-scoped with mandatory patientId/providerId and
 *    date contracts; /mine allowlisted with personId scope;
 *  - writes audit (sessions with patientId, water logs with pass flag).
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const OWNER = { _id: 'owner-1', id: 'owner-1', role: 'dialysis_admin' };
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
jestApi.unstable_mockModule('../../src/models/DialysisSession.js', () => ({
  default: {
    create: (doc) => { calls.sessionCreate = doc; return query({ _id: 'ds1', ...doc }); },
    find: (filter) => { calls.sessionFind = filter; return chainable(data.sessions ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/DialysisWaterQuality.js', () => ({
  default: {
    create: (doc) => { calls.waterCreate = doc; return query({ _id: 'wq1', ...doc }); },
    find: (filter) => { calls.waterFind = filter; return chainable(data.waterLogs ?? []); },
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

const { as } = await mountApp('dialysis', {
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

const sessionBody = () => ({
  patientId: PATIENT_ID, providerId: PROVIDER_ID, machineId: 'DIA-3',
  date: '2099-02-01', preWeightKg: 68.5, postWeightKg: 66.1,
  preSystolic: 150, preDiastolic: 90, postSystolic: 130, postDiastolic: 82,
  ufLitres: 2.4, durationMin: 240, isolation: 'none',
});

describe('sessions', () => {
  it('401s anonymously, creates owned sessions with vitals, audits', async () => {
    expect((await as().post('/sessions').send(sessionBody())).status).toBe(401);

    const res = await as(OWNER).post('/sessions').send(sessionBody());
    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.sessionCreate).toMatchObject({
      patientId: PATIENT_ID, providerId: PROVIDER_ID, recordedBy: 'owner-1',
      preWeightKg: 68.5, ufLitres: 2.4, isolation: 'none',
    });
    expect(auditLog).toHaveBeenCalledWith(
      'dialysis_session_created', 'owner-1', expect.objectContaining({ patientId: PATIENT_ID }),
    );
  });

  it('404s foreign providers and missing patients, 400s out-of-range vitals', async () => {
    data.provider = { _id: PROVIDER_ID, ownerUserId: 'someone-else', status: 'live' };
    expect((await as(OWNER).post('/sessions').send(sessionBody())).status).toBe(404);
    expect(calls.sessionCreate).toBeUndefined();

    data.provider = { _id: PROVIDER_ID, ownerUserId: 'owner-1', status: 'live' };
    globalThis.__patientUser = null;
    expect((await as(OWNER).post('/sessions').send(sessionBody())).status).toBe(404);

    globalThis.__patientUser = { _id: PATIENT_ID };
    expect((await as(OWNER).post('/sessions').send({ ...sessionBody(), ufLitres: 99 })).status).toBe(400);
    expect((await as(OWNER).post('/sessions').send({ ...sessionBody(), preSystolic: 20 })).status).toBe(400);
    expect((await as(OWNER).post('/sessions').send({ ...sessionBody(), isolation: 'quarantine' })).status).toBe(400);
    expect((await as(OWNER).get('/sessions')).status).toBe(400);
  });

  it('lists ownership-scoped sessions with date filters', async () => {
    data.sessions = [{ _id: 'd1' }];
    const res = await as(OWNER).get(`/sessions?patientId=${PATIENT_ID}&from=2099-01-01&to=2099-12-31`);
    expect(res.status).toBe(200);
    expect(calls.sessionFind).toMatchObject({
      patientId: PATIENT_ID, date: { $gte: '2099-01-01', $lte: '2099-12-31' },
    });
    expect(calls.sessionFind.providerId).toEqual({ $in: [PROVIDER_ID] });
    expect((await as(OWNER).get(`/sessions?patientId=${PATIENT_ID}&from=2099-12-31&to=2099-01-01`)).status).toBe(400);
  });
});

describe('water quality', () => {
  it('logs provider-scoped results and filters by date', async () => {
    const created = await as(OWNER).post('/water-quality').send({
      providerId: PROVIDER_ID, date: '2099-02-01',
      freeChlorinePpm: 0.05, tdsPpm: 120, bacterialCountCfuMl: 40, pass: true,
    });
    expect(created.status).toBe(201);
    expect(auditLog).toHaveBeenCalledWith(
      'dialysis_water_logged', 'owner-1', expect.objectContaining({ pass: true }),
    );

    data.waterLogs = [{ _id: 'w1', pass: true }];
    const listed = await as(OWNER).get(`/water-quality?providerId=${PROVIDER_ID}&from=2099-01-01`);
    expect(listed.body.total).toBe(1);
    expect(calls.waterFind).toMatchObject({ providerId: PROVIDER_ID, date: { $gte: '2099-01-01' } });

    expect((await as(OWNER).get('/water-quality?providerId=507f1f77bcf86cd799439099')).status).toBe(404);
    expect((await as(OWNER).post('/water-quality').send({ providerId: PROVIDER_ID, date: '2099-02-01' })).status).toBe(400);
  });
});

describe('GET /mine', () => {
  it('serves allowlisted sessions scoped to the session', async () => {
    data.sessions = [{
      _id: 'd1', providerId: PROVIDER_ID, machineId: 'DIA-3', date: '2099-02-01',
      preWeightKg: 68.5, postWeightKg: 66.1, ufLitres: 2.4, isolation: 'hbv',
      recordedBy: 'owner-1', complications: 'cramps', notes: 'n',
    }];
    const res = await as(PATIENT).get('/mine');
    expect(res.status).toBe(200);
    expect(res.body.sessions[0]).toEqual({
      id: 'd1', providerId: PROVIDER_ID, machineId: 'DIA-3', date: '2099-02-01',
      preWeightKg: 68.5, postWeightKg: 66.1, ufLitres: 2.4, isolation: 'hbv',
    });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('owner-1');
    expect(raw).not.toContain('cramps');
    expect(calls.sessionFind).toMatchObject({ patientId: 'pat-1', familyMemberId: null });

    data.familyRow = null;
    expect((await as(PATIENT).get('/mine?personId=507f1f77bcf86cd799439090')).status).toBe(404);
  });
});
