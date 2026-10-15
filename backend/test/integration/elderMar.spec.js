/**
 * Elder-care MAR core (File 12 inventory gap): resident roster, med-chart
 * rows and given/missed administrations with a per-day idempotency rule.
 *
 * What it pins:
 *  - auth + tenant scoping (hospitalId from the session, never the body);
 *  - administrations only against ACTIVE charted medications (409
 *    MED_NOT_CHARTED otherwise);
 *  - one log per medication per day — a retried POST replays 409 instead of
 *    double-logging a dose (DOSE_ALREADY_LOGGED);
 *  - due list = charted minus logged-today.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const STAFF = { _id: 'nurse-1', id: 'nurse-1', role: 'nurse', hospitalId: 'h1' };
const RES_ID = '7500000000000000000000e1';

const auditLog = jestApi.fn();
let residentRow = null;
let lastUpdate = null;

jestApi.unstable_mockModule('../../src/models/ElderResident.js', () => ({
  default: {
    create: async (doc) => ({ _id: RES_ID, ...doc }),
    find: (filter) => query([]),
    findOne: (filter) => {
      if (filter?._id && residentRow && String(residentRow._id) === String(filter._id)) {
        return query({ ...residentRow, hospitalId: filter.hospitalId || residentRow.hospitalId });
      }
      return query(residentRow);
    },
    findById: () => query(residentRow),
    findOneAndUpdate: async (filter, update) => {
      if (!residentRow || String(residentRow._id) !== String(filter._id)) return null;
      if (update.$push?.medications) {
        residentRow = {
          ...residentRow,
          medications: [...(residentRow.medications || []), update.$push.medications],
        };
      }
      return residentRow;
    },
    updateOne: async (filter, update) => {
      lastUpdate = { filter, update };
      return { modifiedCount: 1 };
    },
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('eldercare', {});

const makeRow = (over = {}) => ({
  _id: RES_ID,
  hospitalId: 'h1',
  name: 'Ram Lal',
  status: 'active',
  medications: [{ medicationId: 'med-1', name: 'Metformin', dose: '500mg', times: ['08:00', '20:00'], active: true }],
  administrations: [],
  ...over,
});

beforeEach(() => {
  residentRow = null;
  lastUpdate = null;
  auditLog.mockReset();
});

describe('eldercare MAR', () => {
  it('401s anonymously', async () => {
    expect((await as().get('/residents')).status).toBe(401);
  });

  it('creates a resident tenant-scoped with active status', async () => {
    const res = await as(STAFF).post('/residents').send({ name: 'Ram Lal', age: 72, room: 'A-4' });
    expect(res.status).toBe(201);
    expect(res.body.resident).toMatchObject({ name: 'Ram Lal', hospitalId: 'h1', status: 'active' });
    expect(auditLog).toHaveBeenCalledWith('elder_resident_created', 'nurse-1', expect.objectContaining({}));
  });

  it('adds a medication to the active chart', async () => {
    residentRow = makeRow({ medications: [] });
    const res = await as(STAFF).post(`/residents/${RES_ID}/medications`).send({
      medicationId: 'med-2', name: 'Amlodipine', dose: '5mg', times: ['09:00'],
    });
    expect(res.status).toBe(201);
  });

  it('logs a given dose and replays a same-day duplicate as 409', async () => {
    residentRow = makeRow();
    const first = await as(STAFF).post(`/residents/${RES_ID}/administrations`).send({
      medicationId: 'med-1', scheduledFor: new Date().toISOString(), status: 'given',
    });
    expect(first.status).toBe(201);
    expect(lastUpdate.update.$push.administrations.$slice).toBe(-500);

    residentRow = makeRow({
      administrations: [{ medicationId: 'med-1', scheduledFor: new Date(), status: 'given' }],
    });
    const dupe = await as(STAFF).post(`/residents/${RES_ID}/administrations`).send({
      medicationId: 'med-1', scheduledFor: new Date().toISOString(), status: 'given',
    });
    expect(dupe.status).toBe(409);
    expect(dupe.body.code).toBe('DOSE_ALREADY_LOGGED');
  });

  it('409s a dose for medication not on the active chart', async () => {
    residentRow = makeRow({ medications: [] });
    const res = await as(STAFF).post(`/residents/${RES_ID}/administrations`).send({
      medicationId: 'med-9', scheduledFor: new Date().toISOString(), status: 'given',
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MED_NOT_CHARTED');
  });

  it('due list excludes logged-today medications', async () => {
    residentRow = makeRow({
      medications: [
        { medicationId: 'med-1', name: 'Metformin', dose: '500mg', times: ['08:00'], active: true },
        { medicationId: 'med-2', name: 'Amlodipine', dose: '5mg', times: ['09:00'], active: true },
      ],
      administrations: [{ medicationId: 'med-1', scheduledFor: new Date(), status: 'given' }],
    });
    const res = await as(STAFF).get(`/residents/${RES_ID}/due`);
    expect(res.status).toBe(200);
    expect(res.body.due.map((d) => d.medicationId)).toEqual(['med-2']);
  });
});
