/**
 * 6.md 140 dashboard additions — the remaining self-scoped reads from the
 * patient API list:
 *
 *   GET  /api/patient/events             my registrations + event join
 *   GET  /api/patient/insurance/policies my policies, expiry derived at read
 *   POST /api/patient/insurance/policies add my own policy (strict schema)
 *
 * What it pins:
 *  - 401 anonymously on all three;
 *  - events: the query is session-scoped (userId never appears in the URL),
 *    a bogus ?status= is ignored rather than 500ing into the enum, the
 *    projection drops the checkInCode (venue credential) and the event join
 *    excludes outcomeReport; pagination shape matches the other list routes;
 *  - policies: patientId/status/expiry are NOT client-shaped — a body that
 *    tries to set them is a strict-400; create echoes session ownership; GET
 *    lists only the session's rows and reports derived active/expired.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

let regRows = [];
let lastRegFilter = null;
let lastRegSelect = null;
let lastRegPopulate = null;
let regTotal = 0;
let policyRows = [];
let lastPolicyFilter = null;
const create = jestApi.fn(async (doc) => ({ ...doc }));
let lastCreateDoc = null;

jestApi.unstable_mockModule('../../src/models/EventRegistration.js', () => ({
  default: {
    find: (filter) => {
      lastRegFilter = filter;
      const q = query(regRows);
      q.select = (fields) => { lastRegSelect = fields; return q; };
      q.populate = (path, fields) => { lastRegPopulate = { path, fields }; return q; };
      return q;
    },
    countDocuments: (filter) => { lastRegFilter = filter; return query(regTotal); },
  },
}));
jestApi.unstable_mockModule('../../src/models/InsurancePolicy.js', () => ({
  default: {
    find: (filter) => { lastPolicyFilter = filter; return query(policyRows); },
    create: (doc) => { lastCreateDoc = doc; return create(doc); },
  },
}));

const { as: asEvents } = await mountApp('patientEvents', {});
const { as: asPolicies } = await mountApp('patientInsurancePolicies', {});

beforeEach(() => {
  regRows = [];
  lastRegFilter = null;
  lastRegSelect = null;
  lastRegPopulate = null;
  regTotal = 0;
  policyRows = [];
  lastPolicyFilter = null;
  lastCreateDoc = null;
  create.mockClear();
});

describe('GET /api/patient/events — my registrations', () => {
  it('401s anonymously', async () => {
    const res = await asEvents().get('/');
    expect(res.status).toBe(401);
  });

  it('lists only the session account, dropping the check-in code', async () => {
    regRows = [{ _id: 'r1', userId: 'pat-1', eventId: { _id: 'e1', title: 'Yoga' }, status: 'REGISTERED' }];
    regTotal = 1;
    const res = await asEvents(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(lastRegFilter).toEqual({ userId: 'pat-1' });
    expect(lastRegSelect).toBe('-checkInCode -__v');
    expect(lastRegPopulate).toEqual({ path: 'eventId', fields: '-outcomeReport -__v' });
    expect(res.body).toMatchObject({ total: 1, page: 1, pages: 1, limit: 20 });
    expect(res.body.registrations[0].eventId.title).toBe('Yoga');
  });

  it('applies a known status filter and ignores a bogus one', async () => {
    await asEvents(PATIENT).get('/?status=CANCELLED');
    expect(lastRegFilter.status).toBe('CANCELLED');

    await asEvents(PATIENT).get('/?status=DROP%20TABLE');
    expect(lastRegFilter.status).toBeUndefined();
  });
});

describe('patient insurance policies', () => {
  it('401s anonymously on both routes', async () => {
    expect((await asPolicies().get('/')).status).toBe(401);
    expect((await asPolicies().post('/').send({ insurer: 'X', policyNumber: '1' })).status).toBe(401);
  });

  it('creates my own policy with session ownership and derives status', async () => {
    const res = await asPolicies(PATIENT).post('/').send({
      insurer: 'Star Health',
      tpa: 'Medi Assist',
      policyNumber: 'SH-1',
      memberIds: ['pat-1'],
      scheme: null,
      validFrom: '2026-01-01',
      validTo: '2027-01-01',
    });
    expect(res.status).toBe(201);
    expect(lastCreateDoc.patientId).toBe('pat-1');
    expect(lastCreateDoc.insurer).toBe('Star Health');
    expect(res.body.status).toBe('active');
  });

  it('rejects a client-supplied patientId, status or expiry verdict (strict)', async () => {
    const res = await asPolicies(PATIENT).post('/').send({
      insurer: 'Star Health',
      policyNumber: 'SH-1',
      validFrom: '2026-01-01',
      validTo: '2027-01-01',
      patientId: 'someone-else',
      status: 'active',
    });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('400s a validity window that ends before it starts', async () => {
    const res = await asPolicies(PATIENT).post('/').send({
      insurer: 'Star Health',
      policyNumber: 'SH-1',
      validFrom: '2027-01-01',
      validTo: '2026-01-01',
    });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('lists only my rows with expiry derived at read', async () => {
    policyRows = [
      { _id: 'p1', patientId: 'pat-1', validTo: new Date(Date.now() + 86400000) },
      { _id: 'p2', patientId: 'pat-1', validTo: new Date(Date.now() - 86400000) },
    ];
    const res = await asPolicies(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(lastPolicyFilter).toEqual({ patientId: 'pat-1' });
    const byId = Object.fromEntries(res.body.policies.map((p) => [p._id, p.status]));
    expect(byId.p1).toBe('active');
    expect(byId.p2).toBe('expired');
  });
});
