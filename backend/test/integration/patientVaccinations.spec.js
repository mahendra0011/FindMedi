/**
 * A4 (rolesmd 6.md §2.5 page /patient/vaccinations, 10.md §4.3 GET
 * /api/patient/vaccinations) - the patient immunisation schedule.
 *
 * Seeded HTTP through mountApp('vaccinations'). What this pins:
 *  - ownership: a foreign or malformed id answers 404 (never an empty 200
 *    that confirms existence, never a 500 CastError), and a familyMemberId
 *    outside the session's own family is a 404 before any create;
 *  - the strict schema: `status` is server-owned and unknown keys 400;
 *  - derive-at-read: overdue/due/upcoming and nextDueAt are recomputed from
 *    the clock on every read - nothing stale is ever stored;
 *  - completion: when every dose carries givenAt the SERVER flips the row to
 *    completed; the body has no path to it.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const DAY = 24 * 60 * 60 * 1000;
const past = (days) => new Date(Date.now() - days * DAY);
const future = (days) => new Date(Date.now() + days * DAY);

const ROW_ID = '7100000000000000000000a1';
const FAM_ID = '7100000000000000000000b2';
const REC_ID = '7100000000000000000000c3';
const FOREIGN_ID = '7100000000000000000000d4';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const auditLog = jestApi.fn();
const create = jestApi.fn();
const familyFindOne = jestApi.fn();
const recordFindById = jestApi.fn();

let listRows = [];
let currentRow = null;
let lastFilter = null;
let lastFindOneFilter = null;

jestApi.unstable_mockModule('../../src/models/VaccinationSchedule.js', () => ({
  default: {
    find: (filter) => { lastFilter = filter; return query(listRows); },
    findOne: (filter) => { lastFindOneFilter = filter; return query(currentRow); },
    create: (...args) => create(...args),
  },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (...args) => familyFindOne(...args) },
}));
jestApi.unstable_mockModule('../../src/models/Record.js', () => ({
  default: { findById: (...args) => recordFindById(...args) },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('vaccinations', {});

const makeRow = (over = {}) => ({
  _id: ROW_ID,
  userId: 'pat-1',
  familyMemberId: null,
  vaccineName: 'DPT',
  scheduleType: 'child_uip',
  status: 'scheduled',
  completedAt: null,
  source: 'uip',
  doses: [
    { number: 1, dueAt: past(40), givenAt: past(38), recordId: null, centre: '', batchNo: '' },
    { number: 2, dueAt: past(5), givenAt: null, recordId: null, centre: '', batchNo: '' },
    { number: 3, dueAt: future(10), givenAt: null, recordId: null, centre: '', batchNo: '' },
  ],
  save: jestApi.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  listRows = [];
  currentRow = null;
  lastFilter = null;
  lastFindOneFilter = null;
  create.mockReset();
  familyFindOne.mockReset();
  recordFindById.mockReset();
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('GET /vaccinations', () => {
  it('refuses anonymous callers without querying', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
    expect(lastFilter).toBeNull();
  });

  it('scopes the list to the session and derives state at read time', async () => {
    listRows = [makeRow()];
    const res = await as(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(lastFilter).toEqual({ userId: 'pat-1' });
    const [schedule] = res.body.schedules;
    // given / overdue / due - recomputed, not stored.
    expect(schedule.doses.map((dose) => dose.state)).toEqual(['given', 'overdue', 'due']);
    expect(schedule.overdueCount).toBe(1);
    // The earliest NOT-yet-given due date drives "what is due next".
    expect(new Date(schedule.nextDueAt).getTime()).toBe(new Date(schedule.doses[1].dueAt).getTime());
  });

  it('honours the status filter', async () => {
    await as(PATIENT).get('/?status=scheduled');
    expect(lastFilter).toEqual({ userId: 'pat-1', status: 'scheduled' });
  });

  it('rejects a malformed familyMemberId instead of a CastError 500', async () => {
    const res = await as(PATIENT).get('/?familyMemberId=nope');
    expect(res.status).toBe(400);
  });
});

describe('POST /vaccinations', () => {
  beforeEach(() => {
    create.mockImplementation(async (body) => ({ _id: ROW_ID, ...body, save: jestApi.fn() }));
  });

  it('creates a schedule owned by the session, with derived read state', async () => {
    const res = await as(PATIENT).post('/').send({
      vaccineName: 'MMR',
      scheduleType: 'child_uip',
      doses: [{ number: 1, dueAt: future(60) }],
    });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'pat-1',
      vaccineName: 'MMR',
    }));
    expect(res.body.doses[0].state).toBe('upcoming');
    expect(auditLog).toHaveBeenCalledWith('vaccination_schedule_created', 'pat-1', expect.any(Object));
  });

  it('404s a familyMemberId that does not belong to this account', async () => {
    familyFindOne.mockResolvedValue(null);
    const res = await as(PATIENT).post('/').send({
      vaccineName: 'OPV',
      familyMemberId: FAM_ID,
      doses: [{ number: 1, dueAt: future(20) }],
    });
    expect(res.status).toBe(404);
    expect(familyFindOne).toHaveBeenCalledWith({ _id: FAM_ID, patientId: 'pat-1' });
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts a familyMemberId that does belong to this account', async () => {
    familyFindOne.mockResolvedValue({ _id: FAM_ID });
    const res = await as(PATIENT).post('/').send({
      vaccineName: 'OPV',
      familyMemberId: FAM_ID,
      doses: [{ number: 1, dueAt: future(20) }],
    });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ familyMemberId: FAM_ID }));
  });

  it('400s a client-supplied `status` (strict schema: server-owned field)', async () => {
    const res = await as(PATIENT).post('/').send({
      vaccineName: 'MMR',
      status: 'completed',
      doses: [{ number: 1, dueAt: future(10) }],
    });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('400s duplicate dose numbers, which would make check-off ambiguous', async () => {
    const res = await as(PATIENT).post('/').send({
      vaccineName: 'MMR',
      doses: [{ number: 1, dueAt: future(10) }, { number: 1, dueAt: future(40) }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unique/);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('GET /vaccinations/:id', () => {
  it('returns the caller’s own schedule with derived state', async () => {
    currentRow = makeRow();
    const res = await as(PATIENT).get(`/${ROW_ID}`);
    expect(res.status).toBe(200);
    expect(lastFindOneFilter).toEqual({ _id: ROW_ID, userId: 'pat-1' });
    expect(res.body.overdueCount).toBe(1);
  });

  it('404s a foreign id rather than confirming it exists', async () => {
    currentRow = null;
    const res = await as(PATIENT).get(`/${FOREIGN_ID}`);
    expect(res.status).toBe(404);
    expect(lastFindOneFilter).toEqual({ _id: FOREIGN_ID, userId: 'pat-1' });
  });

  it('404s a malformed id instead of surfacing a CastError', async () => {
    const res = await as(PATIENT).get('/not-an-id');
    expect(res.status).toBe(404);
    expect(lastFindOneFilter).toBeNull();
  });
});

describe('POST /vaccinations/:id/doses/:number/given', () => {
  it('records a dose and completes the schedule when every dose is given', async () => {
    // Last open dose of a two-dose schedule: checking it off completes the row.
    currentRow = makeRow({
      doses: [
        { number: 1, dueAt: past(40), givenAt: past(38), recordId: null, centre: '', batchNo: '' },
        { number: 2, dueAt: past(5), givenAt: null, recordId: null, centre: '', batchNo: '' },
      ],
    });
    const res = await as(PATIENT).post(`/${ROW_ID}/doses/2/given`)
      .send({ centre: 'City Clinic', batchNo: 'B7' });
    expect(res.status).toBe(200);
    expect(currentRow.doses[1].givenAt).toBeInstanceOf(Date);
    expect(currentRow.doses[1].centre).toBe('City Clinic');
    expect(currentRow.status).toBe('completed');
    expect(currentRow.completedAt).toBeInstanceOf(Date);
    expect(currentRow.save).toHaveBeenCalled();
    expect(res.body.status).toBe('completed');
    expect(auditLog).toHaveBeenCalledWith('vaccination_dose_recorded', 'pat-1', expect.any(Object));
  });

  it('does not complete a schedule whose last dose is still open', async () => {
    currentRow = makeRow();
    const res = await as(PATIENT).post(`/${ROW_ID}/doses/3/given`).send({});
    expect(res.status).toBe(200);
    expect(currentRow.status).toBe('scheduled');
    expect(res.body.overdueCount).toBe(1);
  });

  it('404s a foreign schedule', async () => {
    currentRow = null;
    const res = await as(PATIENT).post(`/${FOREIGN_ID}/doses/1/given`).send({});
    expect(res.status).toBe(404);
  });

  it('404s a dose number the schedule does not have', async () => {
    currentRow = makeRow();
    const res = await as(PATIENT).post(`/${ROW_ID}/doses/9/given`).send({});
    expect(res.status).toBe(404);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('409s a dose that is already given', async () => {
    currentRow = makeRow();
    const res = await as(PATIENT).post(`/${ROW_ID}/doses/1/given`).send({});
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('409s any check-off on a cancelled schedule', async () => {
    currentRow = makeRow({ status: 'cancelled' });
    const res = await as(PATIENT).post(`/${ROW_ID}/doses/2/given`).send({});
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('accepts a certificate record that belongs to this account', async () => {
    currentRow = makeRow();
    recordFindById.mockImplementation(() => query({ _id: REC_ID, patientId: 'pat-1' }));
    const res = await as(PATIENT).post(`/${ROW_ID}/doses/2/given`).send({ recordId: REC_ID });
    expect(res.status).toBe(200);
    expect(currentRow.doses[1].recordId).toBe(REC_ID);
  });

  it('404s a certificate record belonging to someone else', async () => {
    currentRow = makeRow();
    recordFindById.mockImplementation(() => query({ _id: REC_ID, patientId: 'someone-else' }));
    const res = await as(PATIENT).post(`/${ROW_ID}/doses/2/given`).send({ recordId: REC_ID });
    expect(res.status).toBe(404);
    expect(currentRow.save).not.toHaveBeenCalled();
  });
});

describe('DELETE /vaccinations/:id (cancel-in-place)', () => {
  it('cancels a scheduled row without removing the history', async () => {
    currentRow = makeRow();
    const res = await as(PATIENT).delete(`/${ROW_ID}`);
    expect(res.status).toBe(200);
    expect(currentRow.status).toBe('cancelled');
    expect(currentRow.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('vaccination_schedule_cancelled', 'pat-1', expect.any(Object));
  });

  it('409s cancelling a completed schedule', async () => {
    currentRow = makeRow({ status: 'completed' });
    const res = await as(PATIENT).delete(`/${ROW_ID}`);
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('404s a foreign id', async () => {
    currentRow = null;
    const res = await as(PATIENT).delete(`/${FOREIGN_ID}`);
    expect(res.status).toBe(404);
  });
});
