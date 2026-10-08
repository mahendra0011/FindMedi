/**
 * A4 (rolesmd 6.md §2.7 + route table /patient/meals, 5.md:108 FLOW-D) -
 * the patient meal subscription: pause / resume / skip / cancel.
 *
 * What this pins:
 *  - ownership: provider and plan must resolve for THIS subscription (a
 *    foreign planId is 404, a non-meal plan is 400), and every :id is scoped
 *    to the session;
 *  - the transition table from lib/flowStates: terminal rows are immutable,
 *    and pause/resume pin their SOURCE state (canTransition treats
 *    `from === to` as a no-op, which would silently overwrite a window);
 *  - the pause window math: pausedDays accrues WHOLE days actually elapsed,
 *    clamped to the agreed window, never beyond it;
 *  - skip-days are bounded data: 30/request (schema), 90 total (route);
 *  - the strict schema: `userId`/`status` are server-owned on create.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const DAY = 24 * 60 * 60 * 1000;
const ROW_ID = '7400000000000000000000a1';
const PROV_ID = '7400000000000000000000b2';
const PLAN_ID = '7400000000000000000000c3';
const FOREIGN_ID = '7400000000000000000000d4';
const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const auditLog = jestApi.fn();
const create = jestApi.fn();
const providerFindById = jestApi.fn();
const planFindOne = jestApi.fn();

let listRows = [];
let currentRow = null;
let lastFilter = null;
let lastPlanFilter = null;

jestApi.unstable_mockModule('../../src/models/MealSubscription.js', () => ({
  default: {
    find: (filter) => { lastFilter = filter; return query(listRows); },
    findOne: (filter) => { lastFilter = filter; return query(currentRow); },
    create: (...args) => create(...args),
  },
}));
jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: { findById: (...args) => providerFindById(...args) },
}));
jestApi.unstable_mockModule('../../src/models/Plan.js', () => ({
  default: { findOne: (filter) => { lastPlanFilter = filter; return planFindOne(filter); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('mealSubscriptions', {});

const makeRow = (status = 'active', over = {}) => ({
  _id: ROW_ID,
  userId: 'pat-1',
  providerId: PROV_ID,
  planId: null,
  dietType: 'veg',
  allergies: [],
  status,
  startAt: new Date(Date.now() - 30 * DAY),
  endAt: null,
  pause: { from: null, to: null, reason: '', pausedDays: 0 },
  skippedDates: [],
  save: jestApi.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  listRows = [];
  currentRow = null;
  lastFilter = null;
  lastPlanFilter = null;
  create.mockReset();
  providerFindById.mockReset().mockImplementation(() => query({ _id: PROV_ID }));
  planFindOne.mockReset().mockImplementation(() => query(null));
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('GET /meals', () => {
  it('refuses anonymous callers', async () => {
    expect((await as().get('/')).status).toBe(401);
    expect(lastFilter).toBeNull();
  });

  it('scopes the list to the session and honours a status filter', async () => {
    await as(PATIENT).get('/?status=paused');
    expect(lastFilter).toEqual({ userId: 'pat-1', status: 'paused' });
  });
});

describe('POST /meals', () => {
  beforeEach(() => {
    create.mockImplementation(async (body) => ({ _id: ROW_ID, ...body }));
  });

  const validBody = {
    providerId: PROV_ID,
    dietType: 'veg',
    startAt: new Date(Date.now() + DAY).toISOString(),
  };

  it('404s an unknown provider', async () => {
    providerFindById.mockImplementation(() => query(null));
    const res = await as(PATIENT).post('/').send(validBody);
    expect(res.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it('404s a planId that is not this provider’s plan', async () => {
    planFindOne.mockImplementation(() => query(null));
    const res = await as(PATIENT).post('/').send({ ...validBody, planId: PLAN_ID });
    expect(res.status).toBe(404);
    expect(lastPlanFilter).toEqual({ _id: PLAN_ID, providerId: PROV_ID });
    expect(create).not.toHaveBeenCalled();
  });

  it('400s a plan that belongs to the provider but is not a meal plan', async () => {
    planFindOne.mockImplementation(() => query({ _id: PLAN_ID, providerId: PROV_ID, type: 'gym' }));
    const res = await as(PATIENT).post('/').send({ ...validBody, planId: PLAN_ID });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('creates an ACTIVE subscription owned by the session', async () => {
    planFindOne.mockImplementation(() => query({ _id: PLAN_ID, providerId: PROV_ID, type: 'meal' }));
    const res = await as(PATIENT).post('/').send({ ...validBody, planId: PLAN_ID });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'pat-1',
      providerId: PROV_ID,
      planId: PLAN_ID,
      status: 'active',
    }));
    expect(auditLog).toHaveBeenCalledWith('meal_subscription_created', 'pat-1', expect.any(Object));
  });

  it('400s client-owned status/userId keys (strict schema)', async () => {
    const res = await as(PATIENT).post('/').send({ ...validBody, status: 'completed', userId: 'other' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('400s an endAt that is not after startAt', async () => {
    const res = await as(PATIENT).post('/').send({
      ...validBody,
      endAt: new Date(Date.now() - 10 * DAY).toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/endAt/);
  });

  it('400s duplicate weekly menu days', async () => {
    const res = await as(PATIENT).post('/').send({
      ...validBody,
      weeklyMenu: [{ day: 'mon', items: ['khichdi'] }, { day: 'mon', items: ['dal'] }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unique/);
  });
});

describe('GET /meals/:id', () => {
  it('returns the caller’s own subscription', async () => {
    currentRow = makeRow();
    const res = await as(PATIENT).get(`/${ROW_ID}`);
    expect(res.status).toBe(200);
    expect(lastFilter).toEqual({ _id: ROW_ID, userId: 'pat-1' });
  });

  it('404s a foreign id and a malformed id', async () => {
    currentRow = null;
    expect((await as(PATIENT).get(`/${FOREIGN_ID}`)).status).toBe(404);
    expect((await as(PATIENT).get('/nope')).status).toBe(404);
  });
});

describe('POST /meals/:id/pause', () => {
  it('pauses an active subscription with its window', async () => {
    currentRow = makeRow('active');
    const from = new Date(Date.now() + 2 * DAY).toISOString();
    const to = new Date(Date.now() + 9 * DAY).toISOString();
    const res = await as(PATIENT).post(`/${ROW_ID}/pause`).send({ from, to, reason: 'travelling' });
    expect(res.status).toBe(200);
    expect(currentRow.status).toBe('paused');
    expect(new Date(currentRow.pause.from).getTime()).toBe(new Date(from).getTime());
    expect(currentRow.pause.reason).toBe('travelling');
    expect(currentRow.pause.pausedDays).toBe(0);
    expect(auditLog).toHaveBeenCalledWith('meal_subscription_paused', 'pat-1', expect.any(Object));
  });

  it('409s pausing an already paused row (the window must not be overwritten)', async () => {
    currentRow = makeRow('paused');
    const res = await as(PATIENT).post(`/${ROW_ID}/pause`).send({
      from: new Date(Date.now() + DAY).toISOString(),
      to: new Date(Date.now() + 2 * DAY).toISOString(),
    });
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('409s pausing a cancelled subscription', async () => {
    currentRow = makeRow('cancelled');
    const res = await as(PATIENT).post(`/${ROW_ID}/pause`).send({
      from: new Date(Date.now() + DAY).toISOString(),
      to: new Date(Date.now() + 2 * DAY).toISOString(),
    });
    expect(res.status).toBe(409);
  });

  it('400s a window whose end precedes its start', async () => {
    currentRow = makeRow('active');
    const res = await as(PATIENT).post(`/${ROW_ID}/pause`).send({
      from: new Date(Date.now() + 9 * DAY).toISOString(),
      to: new Date(Date.now() + 2 * DAY).toISOString(),
    });
    expect(res.status).toBe(400);
    expect(currentRow.save).not.toHaveBeenCalled();
  });
});

describe('POST /meals/:id/resume', () => {
  it('accrues whole days actually elapsed, clamped to the window', async () => {
    // Opened 5.5 days ago, closes in the future: elapsed = now - from.
    const from = new Date(Date.now() - 5 * DAY - 12 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 3 * DAY);
    currentRow = makeRow('paused', {
      pause: { from, to, reason: 'travelling', pausedDays: 2 },
    });
    const res = await as(PATIENT).post(`/${ROW_ID}/resume`);
    expect(res.status).toBe(200);
    expect(currentRow.status).toBe('active');
    // floor(5.5) = 5 added to the 2 already banked.
    expect(currentRow.pause.pausedDays).toBe(7);
    expect(auditLog).toHaveBeenCalledWith('meal_subscription_resumed', 'pat-1', expect.objectContaining({
      pausedDaysAdded: 5,
    }));
  });

  it('clamps a window that was never job-closed to its own `to`', async () => {
    // from 10 days ago, `to` 2 days ago: no job closed it, but the member
    // agreed to a 5-day window - charge 5, not 10.
    const from = new Date(Date.now() - 10 * DAY);
    const to = new Date(Date.now() - 5 * DAY);
    currentRow = makeRow('paused', { pause: { from, to, reason: '', pausedDays: 0 } });
    const res = await as(PATIENT).post(`/${ROW_ID}/resume`);
    expect(res.status).toBe(200);
    expect(currentRow.pause.pausedDays).toBe(5);
  });

  it('409s resuming a row that is not paused', async () => {
    currentRow = makeRow('active');
    const res = await as(PATIENT).post(`/${ROW_ID}/resume`);
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });
});

describe('POST /meals/:id/skip', () => {
  const iso = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

  it('appends only dates not already skipped', async () => {
    currentRow = makeRow('active', { skippedDates: [new Date(iso(3))] });
    const res = await as(PATIENT).post(`/${ROW_ID}/skip`).send({ dates: [iso(3), iso(4)] });
    expect(res.status).toBe(200);
    expect(currentRow.skippedDates).toHaveLength(2);
    expect(currentRow.save).toHaveBeenCalled();
  });

  it('400s more than 30 dates in one request (schema cap)', async () => {
    currentRow = makeRow('active');
    const dates = Array.from({ length: 31 }, (_, i) => iso(i + 1));
    const res = await as(PATIENT).post(`/${ROW_ID}/skip`).send({ dates });
    expect(res.status).toBe(400);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('400s a running total past the 90-day bound', async () => {
    const existing = Array.from({ length: 88 }, (_, i) => new Date(Date.now() + (i + 1) * DAY));
    currentRow = makeRow('active', { skippedDates: existing });
    // 88 + 5 fresh = 93 > 90; one of the five already exists (88 -> 92).
    const dates = [existing[0].toISOString(), ...Array.from({ length: 4 }, (_, i) => new Date(Date.now() + (i + 200) * DAY).toISOString())];
    const res = await as(PATIENT).post(`/${ROW_ID}/skip`).send({ dates });
    expect(res.status).toBe(400);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('409s skipping on a cancelled subscription', async () => {
    currentRow = makeRow('cancelled');
    const res = await as(PATIENT).post(`/${ROW_ID}/skip`).send({ dates: [iso(1)] });
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });
});

describe('DELETE /meals/:id (cancel-in-place)', () => {
  it('cancels an active subscription without removing the row', async () => {
    currentRow = makeRow('active');
    const res = await as(PATIENT).delete(`/${ROW_ID}`);
    expect(res.status).toBe(200);
    expect(currentRow.status).toBe('cancelled');
    expect(currentRow.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('meal_subscription_cancelled', 'pat-1', expect.any(Object));
  });

  it('cancels a paused subscription too (the table allows it)', async () => {
    currentRow = makeRow('paused');
    const res = await as(PATIENT).delete(`/${ROW_ID}`);
    expect(res.status).toBe(200);
    expect(currentRow.status).toBe('cancelled');
  });

  it('409s an already terminal row', async () => {
    currentRow = makeRow('cancelled');
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
