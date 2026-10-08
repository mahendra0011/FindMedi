/**
 * A4 (rolesmd 6.md §2.15 privacy centre "data export/delete - DPDP rights",
 * 10.md §4.4 for the admin half in adminDsr.spec) - the patient-facing
 * data-subject request surface.
 *
 * What this pins:
 *  - authentication: every route 401s anonymously (the DPDP right is for
 *    ACCOUNTS, but still requires one);
 *  - the statutory clock is DATA: dueAt is computed once as now + 30 days and
 *    stored, so an extension later has a date to argue against;
 *  - one OPEN request per (account, type): duplicate -> 409, but a fulfilled
 *    (terminal) request does not block the right from being exercised again;
 *  - ownership: a foreign or malformed id answers 404;
 *  - the strict schema: `status` is server-owned.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const DAY = 24 * 60 * 60 * 1000;
const ROW_ID = '7200000000000000000000a1';
const FOREIGN_ID = '7200000000000000000000d4';
const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const auditLog = jestApi.fn();
const create = jestApi.fn();

let listRows = [];
let currentRow = null;
let lastFilter = null;
let lastFindOneFilter = null;

jestApi.unstable_mockModule('../../src/models/DataSubjectRequest.js', () => ({
  default: {
    find: (filter) => { lastFilter = filter; return query(listRows); },
    findOne: (filter) => { lastFindOneFilter = filter; return query(currentRow); },
    create: (...args) => create(...args),
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('dsr', {});

const makeRow = (over = {}) => ({
  _id: ROW_ID,
  userId: 'pat-1',
  type: 'access',
  status: 'submitted',
  requestedAt: new Date(),
  dueAt: new Date(Date.now() + 10 * DAY),
  details: '',
  ...over,
});

beforeEach(() => {
  listRows = [];
  currentRow = null;
  lastFilter = null;
  lastFindOneFilter = null;
  create.mockReset();
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('authentication', () => {
  it('refuses anonymous callers on every route', async () => {
    expect((await as().post('/').send({ type: 'access' })).status).toBe(401);
    expect((await as().get('/')).status).toBe(401);
    expect((await as().get(`/${ROW_ID}`)).status).toBe(401);
    expect(lastFilter).toBeNull();
    expect(lastFindOneFilter).toBeNull();
  });
});

describe('POST /dsr', () => {
  beforeEach(() => {
    create.mockImplementation(async (body) => ({ _id: ROW_ID, ...body }));
  });

  it('creates a submitted request with a stored 30-day deadline', async () => {
    const before = Date.now();
    const res = await as(PATIENT).post('/').send({ type: 'access', details: 'my records' });
    expect(res.status).toBe(201);

    const [body] = create.mock.calls[0];
    expect(body).toEqual(expect.objectContaining({
      userId: 'pat-1',
      type: 'access',
      status: 'submitted',
      details: 'my records',
    }));
    // dueAt = creation + 30 days, stored as data (not re-derived per read).
    const dueMs = new Date(body.dueAt).getTime();
    expect(Math.abs(dueMs - (before + 30 * DAY))).toBeLessThan(5000);
    expect(res.body.overdue).toBe(false);
    expect(res.body.id).toBe(ROW_ID);
    expect(auditLog).toHaveBeenCalledWith('dsr_submitted', 'pat-1', expect.any(Object));
  });

  it('409s a duplicate OPEN request for the same right', async () => {
    currentRow = makeRow({ status: 'in_review' });
    const res = await as(PATIENT).post('/').send({ type: 'access' });
    expect(res.status).toBe(409);
    expect(lastFindOneFilter).toEqual({
      userId: 'pat-1',
      type: 'access',
      status: { $in: ['submitted', 'in_review', 'verified'] },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('opens a different right alongside an existing one', async () => {
    currentRow = null; // findOne filters on type, so the mock resolves null
    const res = await as(PATIENT).post('/').send({ type: 'correction', details: 'fix dob' });
    expect(res.status).toBe(201);
    expect(lastFindOneFilter).toEqual(expect.objectContaining({ type: 'correction' }));
  });

  it('400s a client-supplied `status` (strict schema)', async () => {
    const res = await as(PATIENT).post('/').send({ type: 'access', status: 'fulfilled' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('400s an invented type', async () => {
    const res = await as(PATIENT).post('/').send({ type: 'erasure' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('GET /dsr', () => {
  it('lists only the session’s own requests, flagging overdue ones', async () => {
    listRows = [
      makeRow({ status: 'submitted', dueAt: new Date(Date.now() - 2 * DAY) }),
      makeRow({ _id: '7200000000000000000000b2', status: 'fulfilled', dueAt: new Date(Date.now() - 2 * DAY) }),
    ];
    const res = await as(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(lastFilter).toEqual({ userId: 'pat-1' });
    // Open + past due -> overdue; terminal + past due -> NOT overdue (the
    // clock stopped when the request was handled).
    expect(res.body.requests[0].overdue).toBe(true);
    expect(res.body.requests[1].overdue).toBe(false);
    expect(res.body.requests[0].id).toBe(ROW_ID);
  });

  it('honours the type and status filters', async () => {
    await as(PATIENT).get('/?type=export&status=verified');
    expect(lastFilter).toEqual({ userId: 'pat-1', type: 'export', status: 'verified' });
  });
});

describe('GET /dsr/:id', () => {
  it('returns the caller’s own request', async () => {
    currentRow = makeRow();
    const res = await as(PATIENT).get(`/${ROW_ID}`);
    expect(res.status).toBe(200);
    expect(lastFindOneFilter).toEqual({ _id: ROW_ID, userId: 'pat-1' });
  });

  it('404s a foreign id rather than confirming it exists', async () => {
    currentRow = null;
    const res = await as(PATIENT).get(`/${FOREIGN_ID}`);
    expect(res.status).toBe(404);
  });

  it('404s a malformed id instead of a CastError 500', async () => {
    const res = await as(PATIENT).get('/nope');
    expect(res.status).toBe(404);
    expect(lastFindOneFilter).toBeNull();
  });
});
