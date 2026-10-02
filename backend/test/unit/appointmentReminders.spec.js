/**
 * NOTIF-M-03: appointment reminder scheduler (T-24h / T-2h).
 *
 * The finding was that `sendAppointmentReminder` existed but was never called
 * from anywhere — the function was dead and no appointment ever produced a
 * reminder. So this suite pins three things:
 *
 *   1. TIMEZONE — appointment `date`/`time` are IST wall-clock strings and the
 *      instant must be reconstructed by subtracting the IST offset, not by
 *      letting `new Date()` read the wall clock in the host's zone. A host in
 *      UTC would otherwise shift every reminder by 5.5 hours.
 *   2. STATE MACHINE — due/stale/past windows, atomic-claim deferral, lease
 *      expiry, bounded backoff, terminal suppression. State lives on the
 *      document, so these transitions are what "durable" actually means.
 *   3. WIRING — the scheduler is started from index.js and the email helper is
 *      reachable from it. Dead code was the original bug; a green job that
 *      nobody schedules would be the same bug wearing a test.
 *
 * The Appointment collection is an in-memory fake that honours ONLY the query
 * shapes the job uses (find window, the $or claim, the guarded status writes).
 * An unsupported operator throws, so a query-shape change fails loudly instead
 * of passing against a mock that ignores filters.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'node:fs';

// ── in-memory Appointment collection ─────────────────────────────────────────

const apptStore = [];

const getPath = (o, p) => p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
const setPath = (o, p, val) => {
  const ks = p.split('.');
  let cur = o;
  for (const k of ks.slice(0, -1)) {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[ks[ks.length - 1]] = val;
};
// Mongo treats a missing field as null for equality/$ne/$nin purposes.
const norm = (v) => (v === undefined ? null : v);

const matchesCond = (val, cond) => {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case '$exists': return (val !== undefined) === arg;
        case '$in': return arg.includes(norm(val));
        case '$nin': return !arg.includes(norm(val));
        case '$ne': return norm(val) !== norm(arg);
        case '$lte': return norm(val) !== null && val <= arg;
        case '$lt': return norm(val) !== null && val < arg;
        case '$gte': return norm(val) !== null && val >= arg;
        case '$gt': return norm(val) !== null && val > arg;
        default: throw new Error(`appointment fake: unsupported operator ${op}`);
      }
    });
  }
  return norm(val) === norm(cond);
};

const matchesFilter = (doc, filter) =>
  Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((clause) => matchesFilter(doc, clause));
    if (key === '$and') return cond.every((clause) => matchesFilter(doc, clause));
    return matchesCond(getPath(doc, key), cond);
  });

const applyUpdate = (doc, update) => {
  for (const [k, v] of Object.entries(update.$set || {})) setPath(doc, k, v);
  for (const [k, v] of Object.entries(update.$inc || {})) setPath(doc, k, (getPath(doc, k) || 0) + v);
};

const queryChain = (docs) => {
  const q = {
    select: () => q, lean: () => q, sort: () => q, limit: () => q, skip: () => q,
    then: (resolve, reject) => Promise.resolve(docs).then(resolve, reject),
  };
  return q;
};

const appointmentModel = {
  find: (filter) => queryChain(apptStore.filter((d) => matchesFilter(d, filter))),
  findOneAndUpdate: async (filter, update) => {
    const doc = apptStore.find((d) => matchesFilter(d, filter));
    if (!doc) return null;
    applyUpdate(doc, update);
    return doc;
  },
  updateOne: async (filter, update) => {
    const doc = apptStore.find((d) => matchesFilter(d, filter));
    if (!doc) return { modifiedCount: 0 };
    applyUpdate(doc, update);
    return { modifiedCount: 1 };
  },
};

// ── module mocks ─────────────────────────────────────────────────────────────

const createNotification = jest.fn();
const sendAppointmentReminder = jest.fn();
const userFindById = jest.fn();

jest.unstable_mockModule('../../src/models/Appointment.js', () => ({ default: appointmentModel }));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: userFindById },
}));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: {},
  createNotification,
  sendAppointmentReminder,
}));

const job = await import('../../src/jobs/appointmentReminder.job.js');
const { LEASE_MS, MAX_ATTEMPTS, appointmentInstant, runAppointmentRemindersOnce } = job;

// ── fixtures ─────────────────────────────────────────────────────────────────

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;
// Fixed clock: 2026-10-01 12:00 UTC = 17:30 IST. Nothing in the suite reads
// wall time, so a host in any zone produces identical results.
const NOW = new Date('2026-10-01T12:00:00Z');

/** Instant -> the IST wall-clock strings the booking routes would have stored. */
const istStrings = (instant) => {
  const shifted = new Date(instant.getTime() + 5.5 * HOUR);
  return { date: shifted.toISOString().slice(0, 10), time: shifted.toISOString().slice(11, 16) };
};

const slotAhead = (ms) => istStrings(new Date(NOW.getTime() + ms));

const seed = (overrides = {}) => {
  const when = slotAhead(overrides.aheadMs ?? 20 * HOUR);
  const doc = {
    _id: 'appt1',
    patient: 'Asha Patient',
    patientId: 'user1',
    doctor: 'Dr. Ravi',
    date: when.date,
    time: when.time,
    status: 'Pending',
    ...overrides,
  };
  delete doc.aheadMs;
  apptStore.push(doc);
  return doc;
};

const state = (key) => apptStore[0]?.reminderState?.[key];
const lastCall = (mock) => mock.mock.calls.at(-1)?.[0];

beforeEach(() => {
  apptStore.length = 0;
  createNotification.mockReset().mockResolvedValue({ notification: { _id: 'n1' }, reason: null });
  sendAppointmentReminder.mockReset().mockResolvedValue({ success: true, messageId: 'm1' });
  userFindById.mockReset().mockReturnValue(queryChain({ _id: 'user1', name: 'Asha Patient', email: 'asha@example.test' }));
});

// ── 1. timezone ──────────────────────────────────────────────────────────────

describe('NOTIF-M-03 timezone: IST wall clock -> UTC instant', () => {
  it('reads 10:30 IST as 05:00 UTC, not as the host zone', () => {
    expect(appointmentInstant('2026-10-05', '10:30').toISOString()).toBe('2026-10-05T05:00:00.000Z');
  });

  it('crosses midnight correctly (00:15 IST is the previous UTC day)', () => {
    expect(appointmentInstant('2026-01-01', '00:15').toISOString()).toBe('2025-12-31T18:45:00.000Z');
  });

  it('rejects non-calendar dates and impossible times instead of rolling them over', () => {
    expect(appointmentInstant('2026-02-31', '10:00')).toBeNull();
    expect(appointmentInstant('2026-13-01', '10:00')).toBeNull();
    expect(appointmentInstant('2026-10-01', '25:00')).toBeNull();
    expect(appointmentInstant('2026-10-01', '10:60')).toBeNull();
    expect(appointmentInstant('5 Oct 2026', '10:30')).toBeNull();
    expect(appointmentInstant('2026-10-01', '10:30 AM')).toBeNull();
    expect(appointmentInstant(null, undefined)).toBeNull();
  });
});

// ── 2. scheduling windows ────────────────────────────────────────────────────

describe('NOTIF-M-03 scheduling windows', () => {
  it('does not send anything before the first milestone is due', async () => {
    seed({ aheadMs: 30 * HOUR });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ due: 0, sent: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('sends T-24h when due and leaves T-2 pending', async () => {
    seed({ aheadMs: 20 * HOUR });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ due: 1, sent: 1 });
    expect(state('t24').status).toBe('sent');
    expect(state('t24').sentAt).toEqual(NOW);
    expect(state('t2')).toBeUndefined();
    expect(state('t24').attempts).toBe(1);
  });

  it('sends T-2h when due; a T-24h that was never sent is skipped as stale, not sent late', async () => {
    // The process was down for the whole 24h window: a "24h reminder" arriving
    // 45 minutes before the slot is worse than no reminder.
    seed({ aheadMs: 45 * MIN });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ sent: 1, skipped: 1 });
    expect(state('t24').status).toBe('skipped');
    expect(state('t24').lastReason).toBe('window-passed');
    expect(state('t2').status).toBe('sent');
  });

  it('skips a slot that has already started', async () => {
    seed({ aheadMs: -10 * MIN });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ due: 0, skipped: 2 });
    expect(state('t24').status).toBe('skipped');
    expect(state('t24').lastReason).toBe('appointment-started');
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('ignores cancelled/completed appointments and rows with no patient account', async () => {
    seed({ aheadMs: 20 * HOUR, status: 'Cancelled' });
    seed({ _id: 'appt2', aheadMs: 20 * HOUR, patientId: null });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats.scanned).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('keys the notification so a duplicate row can never be created', async () => {
    seed({ aheadMs: 20 * HOUR });
    await runAppointmentRemindersOnce(NOW);
    const arg = lastCall(createNotification);
    expect(arg.dedupKey).toBe('appointment-reminder:appt1:t24');
    expect(arg.type).toBe('appointment');
    expect(arg.userId).toBe('user1');
    expect(arg.message).toContain('Dr. Ravi');
    expect(arg.message).not.toMatch(/asha/i); // no patient identity in the copy
  });
});

// ── 3. durability: claims, leases, idempotency ───────────────────────────────

describe('NOTIF-M-03 durable claim/lease state machine', () => {
  it('a second run does not re-send a milestone that is already sent', async () => {
    seed({ aheadMs: 20 * HOUR });
    await runAppointmentRemindersOnce(NOW);
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats.due).toBe(0);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  it('defers to a fresh `sending` lease (a concurrent run owns the claim)', async () => {
    seed({
      aheadMs: 20 * HOUR,
      reminderState: { t24: { status: 'sending', claimedAt: new Date(NOW.getTime() - MIN), attempts: 1 } },
    });
    const stats = await runAppointmentRemindersOnce(NOW);
    // the fresh lease is skipped before the claim is even attempted
    expect(stats).toMatchObject({ due: 0, deferred: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('reclaims a stale lease from a crashed run', async () => {
    seed({
      aheadMs: 20 * HOUR,
      reminderState: { t24: { status: 'sending', claimedAt: new Date(NOW.getTime() - LEASE_MS - MIN), attempts: 1 } },
    });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ due: 1, sent: 1 });
    expect(state('t24').status).toBe('sent');
    expect(state('t24').attempts).toBe(2); // the crashed attempt still counts
  });

  it('parks a milestone after MAX_ATTEMPTS instead of retrying forever', async () => {
    seed({
      aheadMs: 20 * HOUR,
      reminderState: {
        t24: { status: 'failed', attempts: MAX_ATTEMPTS, nextAttemptAt: new Date(NOW.getTime() - HOUR) },
      },
    });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ due: 0, failed: 0 });
    expect(createNotification).not.toHaveBeenCalled();
    expect(state('t24').attempts).toBe(MAX_ATTEMPTS);
  });

  it('the due-window date filter is computed from IST, not the host zone', async () => {
    // NOW is 17:30 IST on 2026-10-01; a slot 20h ahead is on 2026-10-02 IST.
    seed({ aheadMs: 20 * HOUR });
    expect(apptStore[0].date).toBe('2026-10-02');
    await runAppointmentRemindersOnce(NOW);
    expect(state('t24').status).toBe('sent');
  });
});

// ── 4. failure, backoff, suppression ─────────────────────────────────────────

describe('NOTIF-M-03 retry/backoff and suppression', () => {
  it('a transient suppression (quiet hours) records failed + jittered backoff, then retries', async () => {
    seed({ aheadMs: 20 * HOUR });
    createNotification.mockResolvedValueOnce({ notification: null, reason: 'quiet-hours' });

    let stats = await runAppointmentRemindersOnce(NOW);
    expect(stats.failed).toBe(1);
    expect(state('t24').status).toBe('failed');
    expect(state('t24').lastReason).toBe('quiet-hours');
    expect(state('t24').attempts).toBe(1);
    // backoffMs(1) = 60s ± 20% jitter
    const delay = state('t24').nextAttemptAt - NOW;
    expect(delay).toBeGreaterThanOrEqual(48_000);
    expect(delay).toBeLessThanOrEqual(72_000);

    // before nextAttemptAt: due, but the claim is refused by the backoff gate
    stats = await runAppointmentRemindersOnce(new Date(NOW.getTime() + 30_000));
    expect(stats).toMatchObject({ due: 1, deferred: 1 });
    expect(createNotification).toHaveBeenCalledTimes(1);

    // after backoff: retried and, this time, delivered
    stats = await runAppointmentRemindersOnce(new Date(NOW.getTime() + delay + 1000));
    expect(stats.sent).toBe(1);
    expect(state('t24').status).toBe('sent');
    expect(state('t24').attempts).toBe(2);
    expect(createNotification).toHaveBeenCalledTimes(2);
  });

  it('a user preference (type muted) is terminal — recorded once, never retried', async () => {
    seed({ aheadMs: 20 * HOUR });
    createNotification.mockResolvedValueOnce({ notification: null, reason: 'type-muted' });

    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ skipped: 1, failed: 0 });
    expect(state('t24').status).toBe('skipped');
    expect(state('t24').lastReason).toBe('type-muted');

    await runAppointmentRemindersOnce(new Date(NOW.getTime() + 2 * HOUR));
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  it('email rides on the in-app outcome and carries the slot details', async () => {
    seed({ aheadMs: 20 * HOUR });
    await runAppointmentRemindersOnce(NOW);
    expect(sendAppointmentReminder).toHaveBeenCalledTimes(1);
    const arg = lastCall(sendAppointmentReminder);
    expect(arg.patient).toEqual({ name: 'Asha Patient', email: 'asha@example.test' });
    expect(arg.doctor).toBe('Dr. Ravi');
    expect(arg.date).toBe(apptStore[0].date);
    expect(arg.time).toBe(apptStore[0].time);
  });

  it('does NOT route around a suppressed in-app notification via email', async () => {
    seed({ aheadMs: 20 * HOUR });
    createNotification.mockResolvedValueOnce({ notification: null, reason: 'type-muted' });
    await runAppointmentRemindersOnce(NOW);
    expect(sendAppointmentReminder).not.toHaveBeenCalled();
  });

  it('an email failure cannot fail a milestone whose in-app row was written', async () => {
    seed({ aheadMs: 20 * HOUR });
    sendAppointmentReminder.mockResolvedValueOnce({ success: false, error: 'SMTP down' });
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats).toMatchObject({ sent: 1, failed: 0 });
    expect(state('t24').status).toBe('sent');
  });

  it('no email address on the account still delivers in-app', async () => {
    seed({ aheadMs: 20 * HOUR });
    userFindById.mockReturnValue(queryChain(null));
    const stats = await runAppointmentRemindersOnce(NOW);
    expect(stats.sent).toBe(1);
    expect(sendAppointmentReminder).not.toHaveBeenCalled();
  });
});

// ── 5. wiring: dead code was the original bug ────────────────────────────────

describe('NOTIF-M-03 wiring', () => {
  const indexSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');
  const jobSrc = fs.readFileSync(new URL('../../src/jobs/appointmentReminder.job.js', import.meta.url), 'utf8');
  const svcSrc = fs.readFileSync(new URL('../../src/services/notificationService.js', import.meta.url), 'utf8');

  it('index.js actually starts the scheduler', () => {
    expect(indexSrc).toContain('startAppointmentReminders');
    expect(indexSrc).toContain('appointmentReminder.job.js');
  });

  it('the once-dead email helper is reachable from the job', () => {
    expect(jobSrc).toContain('sendAppointmentReminder');
    expect(svcSrc).toContain('export const sendAppointmentReminder');
  });

  it('the reminder state is persisted on the Appointment document', () => {
    const modelSrc = fs.readFileSync(new URL('../../src/models/Appointment.js', import.meta.url), 'utf8');
    expect(modelSrc).toMatch(/reminderState:\s*\{/);
    expect(modelSrc).toContain('reminderMilestoneSchema');
  });
});
