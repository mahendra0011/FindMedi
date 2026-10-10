/**
 * Clinical-alert acknowledgement (expansion-09): the string code emitted on
 * `clinical:code_blue` / `clinical:lab_panic` / `clinical:mtp`
 * (CB-… / LP-… / MTP-…) is persisted on the DashboardAlert row, so
 * POST /api/clinical-alerts/:code/ack can close the matching OPEN alert,
 * tenant-scoped to the caller's hospital.
 */
import { jest } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const alerts = [];
let emitted = [];
const io = { to: (room) => ({ emit: (event, payload) => { emitted.push({ room, event, payload }); } }) };

const sameId = (a, b) => String(a) === String(b);

const dashboardAlert = {
  create: async (doc) => {
    const row = {
      _id: `al${alerts.length}`,
      status: 'open',
      escalationLevel: 0,
      entityRef: {},
      code: '',
      ...doc,
      async save() { return this; },
    };
    alerts.push(row);
    return row;
  },
  findOne: (filter) => query(
    alerts.find((a) => Object.entries(filter).every(([k, v]) => (v && v.$in ? v.$in.includes(a[k]) : sameId(a[k], v)))) || null,
  ),
  find: (filter) => query(alerts.filter((a) => Object.entries(filter).every(([k, v]) => sameId(a[k], v)))),
};

const userFindById = jest.fn();

const { as } = await mountApp('clinicalAlerts', {
  '../../src/services/socketService.js': () => ({
    getIO: () => io,
    notifyUser: () => {},
    emitDashboardAlert: () => true,
  }),
  '../../src/models/DashboardAlert.js': () => ({ default: dashboardAlert }),
  '../../src/models/Notification.js': () => ({ default: { find: () => query([]) } }),
  '../../src/services/notificationService.js': () => ({
    createNotification: async () => ({ notification: null }),
  }),
  '../../src/models/User.js': () => ({
    default: { find: () => query([]), findById: (...a) => userFindById(...a) },
  }),
  '../../src/models/Rule.js': () => ({ default: { findOne: () => query(null) } }),
  '../../src/models/RuleFiring.js': () => ({ default: { create: async () => ({}) } }),
});

const nurse = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };
const nurseOtherHospital = { _id: 'n2', id: 'n2', role: 'nurse', hospitalId: 'h2' };
const patient = { _id: 'p1', id: 'p1', role: 'patient', hospitalId: 'h1' };

async function raiseCodeBlue() {
  const r = await as(nurse).post('/code-blue').send({ hospitalId: 'h1', ward: 'W3', bedId: 'B7', patientName: 'Ravi' });
  expect(r.status).toBe(201);
  return r.body;
}

describe('POST /api/clinical-alerts/:code/ack', () => {
  beforeEach(() => {
    alerts.length = 0;
    emitted = [];
  });

  test('raising code-blue persists its CB- code on the dashboard alert row', async () => {
    const body = await raiseCodeBlue();
    expect(body.alertId).toMatch(/^CB-[0-9A-Z]+$/);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].code).toBe(body.alertId);
    expect(alerts[0].status).toBe('open');
  });

  test('a staff caller acks the matching open alert and the ack is broadcast', async () => {
    const raised = await raiseCodeBlue();
    const r = await as(nurse).post(`/${raised.alertId}/ack`).send({ action: 'acknowledged_from_locking_modal' });
    expect(r.status).toBe(200);
    expect(r.body.alertId).toBe(raised.alertId);
    expect(r.body.alert.status).toBe('acked');
    expect(String(r.body.alert.ackedBy)).toBe('n1');
    expect(r.body.alert.ackedAt).toBeTruthy();
    expect(alerts[0].status).toBe('acked');
    expect(emitted).toContainEqual({
      room: 'hospital:h1',
      event: 'clinical:ack',
      payload: expect.objectContaining({ alertId: raised.alertId }),
    });
  });

  test('lab-panic and MTP codes ack through the same route', async () => {
    const lp = await as(nurse).post('/lab-panic').send({ doctorId: 'd1', testName: 'K', value: '7.9' });
    expect(lp.status).toBe(201);
    const lpAck = await as(nurse).post(`/${lp.body.alertId}/ack`).send({});
    expect(lpAck.status).toBe(200);
    expect(lpAck.body.alertId).toMatch(/^LP-/);

    const mtp = await as(nurse).post('/mtp').send({ hospitalId: 'h1', bloodGroup: 'O-Neg', units: 6 });
    expect(mtp.status).toBe(201);
    const mtpAck = await as(nurse).post(`/${mtp.body.alertId}/ack`).send({});
    expect(mtpAck.status).toBe(200);
    expect(mtpAck.body.alertId).toMatch(/^MTP-/);
  });

  test('an unknown code 404s and acking twice cannot re-ack', async () => {
    const missing = await as(nurse).post('/CB-NOSUCHCODE/ack').send({});
    expect(missing.status).toBe(404);

    const raised = await raiseCodeBlue();
    expect((await as(nurse).post(`/${raised.alertId}/ack`).send({})).status).toBe(200);
    expect((await as(nurse).post(`/${raised.alertId}/ack`).send({})).status).toBe(404);
  });

  test('a caller from another hospital cannot ack (404, no existence oracle)', async () => {
    const raised = await raiseCodeBlue();
    const r = await as(nurseOtherHospital).post(`/${raised.alertId}/ack`).send({});
    expect(r.status).toBe(404);
    expect(alerts[0].status).toBe('open');
    expect(emitted.filter((e) => e.event === 'clinical:ack')).toHaveLength(0);
  });

  test('malformed codes are rejected before any lookup', async () => {
    const r = await as(nurse).post('/code_blue-1234/ack').send({});
    expect(r.status).toBe(400);
    expect(alerts).toHaveLength(0);
  });

  test('the route follows the raise-route auth pattern', async () => {
    const raised = await raiseCodeBlue();
    expect((await as(null).post(`/${raised.alertId}/ack`).send({})).status).toBe(401);
    expect((await as(patient).post(`/${raised.alertId}/ack`).send({})).status).toBe(403);
    expect(alerts[0].status).toBe('open');
  });
});
