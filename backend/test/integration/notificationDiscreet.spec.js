/**
 * A4 follow-through: 6.md §2.15 / 9.md §3 discreet mode.
 *
 * The flag (NotificationPreference.discreetMode) was modelled but unreachable:
 * no reader returned it and no writer accepted it. This pins the loop:
 *  - GET /preferences exposes it (default off even with no stored row);
 *  - PUT /preferences persists it (strict boolean, $set, echoed back);
 *  - the LIST redacts for the owner of the rows - neutral wording from the
 *    model's NEUTRAL_COPY table, `discreet: true` marker, and the OWNER's
 *    preference is what counts (the scope is server-built);
 *  - `critical` rows are never redacted (a neutralised SOS preview is an SOS
 *    nobody reacts to);
 *  - the read-ack (PUT /:id/read) is a preview surface too, and answers the
 *    same way;
 *  - preference OFF or row missing -> raw copy, unchanged.
 *
 * The live-socket copy shares applyDiscreetCopy (unit-pinned in
 * discreetCopy.spec.js); socketService only emits when io exists, which is
 * never inside this harness.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

let prefRow = null;
let listRows = [];
let currentRow = null;
let lastListFilter = null;
let lastFindFilter = null;
let lastUpdate = null;
let findUpdateCalls = 0;

const save = jestApi.fn(async () => {});

jestApi.unstable_mockModule('../../src/models/NotificationPreference.js', () => ({
  default: {
    findOne: () => query(prefRow),
    findOneAndUpdate: (filter, update) => {
      lastUpdate = update;
      findUpdateCalls += 1;
      return query(prefRow ?? { userId: 'pat-1' });
    },
  },
}));
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: {
    find: (filter) => { lastListFilter = filter; return query(listRows); },
    countDocuments: async (filter) => listRows.length,
    findOne: (filter) => { lastFindFilter = filter; return query(currentRow); },
  },
}));

const { as } = await mountApp('notifications', {});

const makeRow = (over = {}) => ({
  _id: 'n-1',
  userId: 'pat-1',
  type: 'lab',
  title: 'HIV rapid test result: NON-REACTIVE',
  message: 'Dr. Sharma uploaded your report.',
  priority: 'normal',
  read: false,
  ...over,
});

beforeEach(() => {
  prefRow = null;
  listRows = [];
  currentRow = null;
  lastListFilter = null;
  lastFindFilter = null;
  lastUpdate = null;
  findUpdateCalls = 0;
  save.mockClear();
});

describe('GET /preferences - the toggle is readable', () => {
  it('401s anonymously', async () => {
    const res = await as().get('/preferences');
    expect(res.status).toBe(401);
  });

  it('answers discreetMode: false with no stored row (default)', async () => {
    const res = await as(PATIENT).get('/preferences');
    expect(res.status).toBe(200);
    expect(res.body.discreetMode).toBe(false);
    expect(res.body).toHaveProperty('channels');
    expect(res.body).toHaveProperty('quietHours');
  });

  it('returns the stored flag', async () => {
    prefRow = { userId: 'pat-1', discreetMode: true, mutedTypes: [], channels: {}, quietHours: {} };
    const res = await as(PATIENT).get('/preferences');
    expect(res.body.discreetMode).toBe(true);
  });
});

describe('PUT /preferences - the toggle is writable', () => {
  it('persists discreetMode via $set and echoes it', async () => {
    prefRow = { userId: 'pat-1', discreetMode: true, mutedTypes: [], channels: {}, quietHours: {} };
    const res = await as(PATIENT).put('/preferences').send({ discreetMode: true });
    expect(res.status).toBe(200);
    expect(res.body.discreetMode).toBe(true);
    expect(lastUpdate.$set.discreetMode).toBe(true);
    expect(lastUpdate.$setOnInsert).toEqual({ userId: 'pat-1' });
  });

  it('400s a non-boolean flag instead of coercing it', async () => {
    const res = await as(PATIENT).put('/preferences').send({ discreetMode: 'yes' });
    expect(res.status).toBe(400);
    expect(findUpdateCalls).toBe(0);
  });
});

describe('GET / - the list is redacted for a discreet user', () => {
  it('401s anonymously', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
  });

  it('swaps neutral wording in, marks the row, and leaves critical rows alone', async () => {
    prefRow = { userId: 'pat-1', discreetMode: true };
    listRows = [
      makeRow({ _id: 'n-1' }),
      makeRow({ _id: 'n-2', type: 'sos', priority: 'critical', title: 'SOS: Priya collapsed' }),
    ];
    const res = await as(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(lastListFilter).toEqual({ userId: 'pat-1' });
    const [lab, sos] = res.body.data;
    expect(lab.title).toBe('New lab update');
    expect(lab.message).toBe('A lab report update is available in FindMedi.');
    expect(lab.discreet).toBe(true);
    expect(sos.title).toBe('SOS: Priya collapsed');
    expect(sos).not.toHaveProperty('discreet');
  });

  it('returns raw copy when the flag is off', async () => {
    prefRow = { userId: 'pat-1', discreetMode: false };
    listRows = [makeRow()];
    const res = await as(PATIENT).get('/');
    expect(res.body.data[0].title).toBe('HIV rapid test result: NON-REACTIVE');
    expect(res.body.data[0]).not.toHaveProperty('discreet');
  });

  it('returns raw copy when the user has no preference row at all', async () => {
    prefRow = null;
    listRows = [makeRow()];
    const res = await as(PATIENT).get('/');
    expect(res.body.data[0].title).toBe('HIV rapid test result: NON-REACTIVE');
    expect(res.body.data[0]).not.toHaveProperty('discreet');
  });
});

describe('PUT /:id/read - the ack is a preview surface too', () => {
  it('answers the read-ack with neutral wording when the flag is on', async () => {
    prefRow = { userId: 'pat-1', discreetMode: true };
    currentRow = makeRow({ read: false, save });
    const res = await as(PATIENT).put('/n-1/read');
    expect(res.status).toBe(200);
    expect(lastFindFilter).toEqual({ _id: 'n-1', userId: 'pat-1' });
    expect(currentRow.read).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(res.body.title).toBe('New lab update');
    expect(res.body.discreet).toBe(true);
  });

  it('answers with the real copy when the flag is off', async () => {
    prefRow = { userId: 'pat-1', discreetMode: false };
    currentRow = makeRow({ read: false, save });
    const res = await as(PATIENT).put('/n-1/read');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('HIV rapid test result: NON-REACTIVE');
    expect(res.body).not.toHaveProperty('discreet');
  });

  it('404s a foreign notification id', async () => {
    prefRow = { userId: 'pat-1', discreetMode: true };
    currentRow = null;
    const res = await as(PATIENT).put('/n-404/read');
    expect(res.status).toBe(404);
  });
});
