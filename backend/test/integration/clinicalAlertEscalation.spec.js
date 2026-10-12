import { mountApp, query } from '../helpers/appHarness.js';

const alerts = [];
const rules = [];
const firings = [];
const notifications = [];
const admins = [
  { _id: 'adm1', role: 'hospital_admin' },
  { _id: 'adm2', role: 'superadmin' },
];
let emitted = [];

const sameId = (a, b) => String(a) === String(b);

function matchField(value, cond) {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, arg]) => {
      if (op === '$lt') return value !== null && value !== undefined && value < arg;
      if (op === '$lte') return value !== null && value !== undefined && value <= arg;
      return false;
    });
  }
  if (cond === null) return value === null || value === undefined;
  return sameId(value, cond);
}

function matchDoc(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((sub) => matchDoc(doc, sub));
    return matchField(doc[key], cond);
  });
}

const dashboardAlert = {
  create: async (doc) => {
    const row = {
      _id: `al${alerts.length}`,
      escalationLevel: 0,
      escalatedAt: null,
      code: '',
      entityRef: {},
      status: 'open',
      severity: 'warning',
      createdAt: new Date(),
      ...doc,
      async save() { return this; },
    };
    alerts.push(row);
    return row;
  },
  find: (filter) => query(alerts.filter((a) => matchDoc(a, filter))),
  findOne: (filter) => query(alerts.find((a) => matchDoc(a, filter)) || null),
};

const ruleModel = {
  create: async (doc) => {
    const row = { _id: `rule${rules.length}`, ...doc };
    rules.push(row);
    return row;
  },
  find: (filter) => query(rules.filter((r) => matchDoc(r, filter))),
  findOne: (filter) => query(rules.find((r) => matchDoc(r, filter)) || null),
  updateOne: async (filter, update, opts = {}) => {
    const existing = rules.find((r) => matchDoc(r, filter));
    if (existing) {
      const before = JSON.stringify(existing);
      Object.assign(existing, update.$set || {});
      const modifiedCount = JSON.stringify(existing) !== before ? 1 : 0;
      return { acknowledged: true, matchedCount: 1, modifiedCount, upsertedCount: 0 };
    }
    if (opts.upsert) {
      const row = { _id: `rule${rules.length}`, ...filter, ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      rules.push(row);
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  },
};

const { as } = await mountApp('clinicalAlerts', {
  '../../src/services/socketService.js': () => ({
    getIO: () => ({
      to: (room) => ({
        emit: (event, payload) => { emitted.push({ room, event, payload }); },
      }),
    }),
    notifyUser: () => {},
    emitDashboardAlert: (hospitalId, alert) => {
      emitted.push({ room: `hospital:${hospitalId}`, event: 'dashboard:alert', payload: alert });
      return true;
    },
  }),
  '../../src/models/DashboardAlert.js': () => ({ default: dashboardAlert }),
  '../../src/models/Notification.js': () => ({
    default: { find: () => query([]), create: async (doc) => doc },
  }),
  '../../src/services/notificationService.js': () => ({
    createNotification: async (doc) => {
      const row = { _id: `n${notifications.length}`, read: false, ...doc };
      notifications.push(row);
      return { notification: row };
    },
  }),
  '../../src/models/User.js': () => ({
    default: {
      find: (filter) => {
        const roles = filter?.role?.$in || (filter?.role ? [filter.role] : []);
        return query(admins.filter((u) => !roles.length || roles.includes(u.role)));
      },
      findById: () => query({ _id: 'u-test', twoFactorEnabled: false }),
    },
  }),
  '../../src/models/Rule.js': () => ({ default: ruleModel }),
  '../../src/models/RuleFiring.js': () => ({
    default: {
      create: async (doc) => {
        const row = { _id: `f${firings.length}`, ...doc };
        firings.push(row);
        return row;
      },
    },
  }),
  '../../src/models/Hospital.js': () => ({ default: { find: () => query([{ _id: 'h1' }]) } }),
});

const { escalateUnackedClinicalAlerts } = await import('../../src/workers/scheduler.js');
const { seedClinicalAlertRules } = await import('../../scripts/seed-clinical-alert-rules.mjs');

const nurse = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };
const escNotes = () => notifications.filter((n) => String(n.dedupKey || '').startsWith('alert-escalation:'));

async function raiseCodeBlue(extra = {}) {
  const res = await as(nurse).post('/code-blue').send({ hospitalId: 'h1', ward: 'W1', bedId: 'B2', patientName: 'Ravi', ...extra });
  expect(res.status).toBe(201);
  return res.body;
}

describe('P0-10 clinical alert rules + unacked escalation ladder', () => {
  beforeEach(() => {
    alerts.length = 0;
    rules.length = 0;
    firings.length = 0;
    notifications.length = 0;
    emitted = [];
  });

  test('seeding code-blue/lab-panic/mtp rules is idempotent', async () => {
    const first = await seedClinicalAlertRules('h1');
    expect(first.created).toEqual(['code-blue', 'lab-panic', 'mtp', 'sofa-delta-2']);
    expect(rules).toHaveLength(4);

    const second = await seedClinicalAlertRules('h1');
    expect(second.created).toEqual([]);
    expect(rules).toHaveLength(4);
    expect(second.unchanged).toEqual(['code-blue', 'lab-panic', 'mtp', 'sofa-delta-2']);

    const lab = rules.find((r) => r.key === 'lab-panic');
    expect(lab).toMatchObject({
      dataset: 'lab_critical',
      enabled: false,
      groups: [[{ field: 'tests.isCritical', op: '=', value: true }]],
      actions: {
        type: 'alert',
        severity: 'critical',
        socket: 'dashboard:alert',
        event: 'clinical:lab_panic',
        escalation: {
          afterMinutes: 15,
          backoffMinutes: 30,
          maxLevels: 3,
          notifyRoles: ['hospital_admin', 'superadmin'],
        },
      },
    });
    for (const key of ['code-blue', 'mtp']) {
      const rule = rules.find((r) => r.key === key);
      expect(rule.actions.event).toMatch(/^clinical:/);
      expect(rule.actions.escalation.afterMinutes).toBe(15);
    }
  });

  test('a raise records its ledger firing against the seeded rule', async () => {
    await seedClinicalAlertRules('h1');
    const body = await raiseCodeBlue();
    expect(firings).toHaveLength(1);
    expect(firings[0].ruleId).toBe(rules.find((r) => r.key === 'code-blue')._id);
    expect(firings[0].status).toBe('fired');
    expect(firings[0].dedupHash).toContain('manual-');
    expect(alerts[0].code).toBe(body.alertId);
  });

  test('a critical alert unacked past 15 minutes escalates with admin notifications', async () => {
    await raiseCodeBlue();
    const row = alerts[0];
    row.createdAt = new Date(Date.now() - 16 * 60000);

    const out = await escalateUnackedClinicalAlerts();
    expect(out).toMatchObject({ escalated: 1, notified: 2 });
    expect(row.escalationLevel).toBe(1);
    expect(row.escalatedAt).toBeInstanceOf(Date);

    const esc = escNotes();
    expect(esc).toHaveLength(2);
    expect(esc.map((n) => n.userId).sort()).toEqual(['adm1', 'adm2']);
    expect(esc.every((n) => n.priority === 'critical' && n.type === 'emergency')).toBe(true);
    expect(emitted.some((e) => e.event === 'dashboard:alert' && /ESCALATED L1/.test(e.payload.message))).toBe(true);
  });

  test('a second run does not duplicate the escalation or its notifications', async () => {
    await raiseCodeBlue();
    const row = alerts[0];
    row.createdAt = new Date(Date.now() - 16 * 60000);

    const first = await escalateUnackedClinicalAlerts();
    expect(first.escalated).toBe(1);
    const notesAfterFirst = notifications.length;

    const second = await escalateUnackedClinicalAlerts();
    expect(second).toMatchObject({ escalated: 0, notified: 0 });
    expect(notifications).toHaveLength(notesAfterFirst);
    expect(row.escalationLevel).toBe(1);
    expect(alerts).toHaveLength(1);
  });

  test('an acknowledged alert does not escalate', async () => {
    const body = await raiseCodeBlue({ ward: 'W3', bedId: 'B7' });
    const row = alerts[0];
    row.createdAt = new Date(Date.now() - 16 * 60000);
    const ack = await as(nurse).post(`/${body.alertId}/ack`).send({});
    expect(ack.status).toBe(200);

    const out = await escalateUnackedClinicalAlerts();
    expect(out).toMatchObject({ escalated: 0, notified: 0 });
    expect(row.status).toBe('acked');
    expect(row.escalationLevel).toBe(0);
    expect(row.escalatedAt).toBeNull();
    expect(escNotes()).toHaveLength(0);
  });

  test('a fresh critical alert has not escalated yet', async () => {
    await raiseCodeBlue({ ward: 'W5' });
    const out = await escalateUnackedClinicalAlerts();
    expect(out).toMatchObject({ escalated: 0, notified: 0 });
    expect(alerts[0].escalationLevel).toBe(0);
    expect(alerts[0].escalatedAt).toBeNull();
  });

  test('the ladder backs off 30 minutes and caps at 3 levels', async () => {
    await raiseCodeBlue({ ward: 'W7' });
    const row = alerts[0];
    row.createdAt = new Date(Date.now() - 16 * 60000);

    for (let i = 0; i < 3; i += 1) {
      const run = await escalateUnackedClinicalAlerts();
      expect(run.escalated).toBe(1);
      row.escalatedAt = new Date(Date.now() - 31 * 60000);
    }
    expect(row.escalationLevel).toBe(3);

    const capped = await escalateUnackedClinicalAlerts();
    expect(capped).toMatchObject({ escalated: 0, notified: 0 });
    expect(row.escalationLevel).toBe(3);
    expect(escNotes()).toHaveLength(6);
  });
});
