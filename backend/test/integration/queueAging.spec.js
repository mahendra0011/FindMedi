/**
 * Checklist item 11: queue aging — SLA-based priority escalation in call-next,
 * the aging report endpoint, and Redis ZSET maintenance (fail-soft; Redis
 * down must never break the queue). Real HTTP through the real router;
 * Queue/QueueTicket are scripted in-memory.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const MIN = 60000;
const now = Date.now();
const queueRow = {
  _id: 'q1', hospitalId: 'h1', type: 'OPD', name: 'OPD Counter 1', prefix: 'A',
  active: true, slaMinutes: 30, seq: 3, save: async () => {},
};

const tickets = [
  // Aged Walkin (40 min > 30 min SLA) — should be escalated ahead of the
  // fresh Appointment ticket.
  { _id: 'tA', queueId: 'q1', hospitalId: 'h1', number: 1, display: 'A-001', priority: 'Walkin', status: 'Waiting', arrivedAt: new Date(now - 40 * MIN), save: async () => {} },
  // Fresh Appointment.
  { _id: 'tB', queueId: 'q1', hospitalId: 'h1', number: 2, display: 'A-002', priority: 'Appointment', status: 'Waiting', arrivedAt: new Date(now - 5 * MIN), save: async () => {} },
  // Fresh Walkin — last.
  { _id: 'tC', queueId: 'q1', hospitalId: 'h1', number: 3, display: 'A-003', priority: 'Walkin', status: 'Waiting', arrivedAt: new Date(now - 2 * MIN), save: async () => {} },
];

const armMatches = (t, arm) => {
  if (arm.priority !== t.priority) return false;
  if (arm.arrivedAt?.$lte && !(new Date(t.arrivedAt) <= arm.arrivedAt.$lte)) return false;
  if (arm.arrivedAt?.$gt && !(new Date(t.arrivedAt) > arm.arrivedAt.$gt)) return false;
  return true;
};

const ticketStub = () => ({
  default: {
    create: async (d) => ({ _id: 'new', arrivedAt: new Date(), ...d }),
    findOneAndUpdate: async (filter, update) => {
      const found = tickets
        .filter((t) => t.status === filter.status && String(t.queueId) === String(filter.queueId)
          && (filter.$or || []).some((arm) => armMatches(t, arm)))
        .sort((a, b) => new Date(a.arrivedAt) - new Date(b.arrivedAt))[0];
      if (!found) return null;
      Object.assign(found, update.$set);
      return found;
    },
    find: (filter) => query(tickets.filter((t) => t.status === filter.status)),
    findOne: async (filter) => tickets.find((t) => String(t._id) === String(filter._id)) || null,
    countDocuments: async () => 0,
  },
});

const { as } = await mountApp('queues', {
  '../../src/models/Queue.js': () => ({
    default: { findById: async () => queueRow, find: () => query([queueRow]) },
    PRIORITY_WEIGHT: { Emergency: 0, Critical: 1, Senior: 2, Appointment: 3, Walkin: 4 },
  }),
  '../../src/models/QueueTicket.js': ticketStub,
  '../../src/models/PatientMovement.js': () => ({ default: { create: async (d) => d, find: () => query([]) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
  '../../src/config/redis.js': () => ({ isRedisReady: () => false, redisClient: {} }),
});

const staff = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };

describe('L11 queue aging', () => {
  test('aging endpoint reports wait minutes and SLA breaches (Redis down = fail-soft)', async () => {
    const r = await as(staff).get('/q1/aging');
    expect(r.status).toBe(200);
    expect(r.body.waiting).toBe(3);
    expect(r.body.oldestWaitMinutes).toBeGreaterThanOrEqual(40);
    expect(r.body.breached).toBe(1); // only the 40-minute Walkin is past 30 min
    expect(r.body.redis).toEqual({ used: false, drift: false });
    expect(r.body.items[0].display).toBe('A-001'); // arrival order
  });

  test('call-next escalates the aged Walkin ahead of the fresh Appointment', async () => {
    const r = await as(staff).post('/q1/call-next').send({ counterId: 'C1' });
    expect(r.status).toBe(200);
    expect(r.body.display).toBe('A-001'); // aged Walkin acts one class up
    const called = tickets.find((t) => t._id === 'tA');
    expect(called.status).toBe('Called');
    expect(called.boosted).toBe(true); // escalation is recorded, not silent
  });

  test('next call is the fresh Appointment, then the fresh Walkin', async () => {
    const second = await as(staff).post('/q1/call-next').send({ counterId: 'C1' });
    expect(second.body.display).toBe('A-002');
    const third = await as(staff).post('/q1/call-next').send({ counterId: 'C2' });
    expect(third.body.display).toBe('A-003');
    const empty = await as(staff).post('/q1/call-next').send({ counterId: 'C2' });
    expect(empty.status).toBe(404);
  });

  test('aging is tenant-scoped and closed to unauthenticated callers', async () => {
    expect((await as({ _id: 'n2', id: 'n2', role: 'nurse', hospitalId: 'h2' }).get('/q1/aging')).status).toBe(403);
    expect((await as().get('/q1/aging')).status).toBe(401);
  });
});