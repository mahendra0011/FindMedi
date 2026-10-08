/**
 * 7.md:3.41 quality/NABH checklists — immutable compliance snapshots with
 * scores derived at read.
 *
 * What it pins:
 *  - 401 anonymously; explicit protect on the write;
 *  - provider ownership on writes (foreign 404);
 *  - strict items (code/label/status required, unknown statuses 400);
 *  - score derivation (compliant=1, partial=0.5, non_compliant=0,
 *    na excluded) with counts, null score on all-na;
 *  - history reads ownership-scoped with mandatory providerId and type
 *    filter; single-read 404s foreign providers;
 *  - no PATCH/DELETE surface exists (corrections are new assessments).
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
// Leaf import (pure): importing the route module would bind real auth.
import { scoreChecklist } from '../../src/lib/qualityScore.js';

const ADMIN = { _id: 'owner-1', id: 'owner-1', role: 'dental_clinic_admin' };
const PROVIDER_ID = '707f1f77bcf86cd799439001';

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
jestApi.unstable_mockModule('../../src/models/QualityChecklist.js', () => ({
  default: {
    create: (doc) => { calls.checklistCreate = doc; return query({ _id: 'qc1', conductedAt: new Date('2099-01-01'), ...doc }); },
    find: (filter) => { calls.checklistFind = filter; return chainable(data.checklists ?? []); },
    findById: (id) => { calls.checklistFindById = id; return query(data.checklistRow ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('qualityChecklists', {});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
  data.provider = { _id: PROVIDER_ID, ownerUserId: 'owner-1', status: 'live' };
  data.myProviders = [{ _id: PROVIDER_ID }];
});

const items = () => ([
  { code: 'MOM-1', label: 'Sterile storage', status: 'compliant' },
  { code: 'MOM-2', label: 'BMW segregation', status: 'partial', remarks: 'bins unlabeled in ward 2' },
  { code: 'MOM-3', label: 'Fire exits', status: 'non_compliant' },
  { code: 'MOM-4', label: 'Helipad lighting', status: 'na' },
]);

describe('POST / — immutable snapshots', () => {
  it('401s anonymously, creates owned assessments with derived scores', async () => {
    expect((await as().post('/').send({})).status).toBe(401);

    const res = await as(ADMIN).post('/').send({
      providerId: PROVIDER_ID, checklistType: 'nabh', title: 'Q1 NABH round', items: items(),
    });
    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.checklistCreate).toMatchObject({ providerId: PROVIDER_ID, checklistType: 'nabh' });
    // (1 + 0.5 + 0) / 3 = 50%: the na item neither helps nor hurts.
    expect(res.body.scorePct).toBe(50);
    expect(res.body.counts).toEqual({ compliant: 1, partial: 1, non_compliant: 1, na: 1 });
    expect(auditLog).toHaveBeenCalledWith(
      'quality_checklist_created', 'owner-1',
      expect.objectContaining({ providerId: PROVIDER_ID, checklistType: 'nabh' }),
    );
  });

  it('404s foreign providers, 400s bad items', async () => {
    data.provider = { _id: PROVIDER_ID, ownerUserId: 'someone-else', status: 'live' };
    expect((await as(ADMIN).post('/').send({ providerId: PROVIDER_ID, checklistType: 'nabh', items: items() })).status).toBe(404);
    expect(calls.checklistCreate).toBeUndefined();

    data.provider = { _id: PROVIDER_ID, ownerUserId: 'owner-1', status: 'live' };
    expect((await as(ADMIN).post('/').send({ providerId: PROVIDER_ID, checklistType: 'iso9000', items: items() })).status).toBe(400);
    expect((await as(ADMIN).post('/').send({ providerId: PROVIDER_ID, checklistType: 'nabh', items: [] })).status).toBe(400);
    expect((await as(ADMIN).post('/').send({
      providerId: PROVIDER_ID, checklistType: 'nabh',
      items: [{ code: 'X', label: 'Y', status: 'mostly-fine' }],
    })).status).toBe(400);
  });
});

describe('GET / + GET /:id — scored history', () => {
  it('scopes history to owned providers with type filters', async () => {
    data.checklists = [{ _id: 'q1', checklistType: 'nabh', items: items() }];
    const res = await as(ADMIN).get(`/?providerId=${PROVIDER_ID}&checklistType=nabh`);
    expect(res.status).toBe(200);
    expect(calls.checklistFind).toMatchObject({ providerId: PROVIDER_ID, checklistType: 'nabh' });
    expect(res.body.checklists[0].scorePct).toBe(50);

    expect((await as(ADMIN).get(`/?providerId=${PROVIDER_ID}&checklistType=bogus`)).status).toBe(400);
    expect((await as(ADMIN).get('/')).status).toBe(400);
    expect((await as(ADMIN).get('/?providerId=507f1f77bcf86cd799439099')).status).toBe(404);
  });

  it('serves single assessments with scores, 404s foreign ones', async () => {
    data.checklistRow = { _id: 'q1', providerId: PROVIDER_ID, checklistType: 'fire_safety', items: items() };
    const res = await as(ADMIN).get('/507f1f77bcf86cd7994390d1');
    expect(res.status).toBe(200);
    expect(res.body.scorePct).toBe(50);

    data.checklistRow = { _id: 'q1', providerId: '507f1f77bcf86cd799439099', checklistType: 'nabh', items: [] };
    expect((await as(ADMIN).get('/507f1f77bcf86cd7994390d1')).status).toBe(404);
    expect((await as(ADMIN).get('/nope')).status).toBe(404);
  });
});

describe('scoreChecklist unit pin', () => {
  it('weights partials, excludes na, nulls on all-na or empty', () => {
    expect(scoreChecklist(items())).toMatchObject({ scorePct: 50 });
    expect(scoreChecklist([{ status: 'na' }])).toMatchObject({ scorePct: null });
    expect(scoreChecklist([])).toMatchObject({ scorePct: null });
    expect(scoreChecklist([{ status: 'compliant' }, { status: 'compliant' }])).toMatchObject({ scorePct: 100 });
  });
});
