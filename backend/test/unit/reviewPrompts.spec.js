/**
 * 5.md §11: review-prompt scheduler (T+2h / T+1day after completion).
 *
 * Completed visits never asked for a rating, so the verified-review pipeline
 * starved. Pins, mirroring the appointment-reminder contract:
 *  - windows: t2h sends in +2h..+24h, t1d in +24h..+72h; stale is skipped;
 *  - already-reviewed visits are skipped, never asked;
 *  - idempotent: a sent milestone never re-sends; claims are atomic;
 *  - wiring: index.js starts the job and state lives on the Appointment doc
 *    (dead code was the original reminders bug — same trap here).
 *
 * In-memory Appointment/Review fakes honour ONLY the query shapes the job
 * uses; an unsupported operator throws so query drift fails loudly.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'node:fs';

const apptStore = [];
const reviewStore = [];

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
        default: throw new Error(`review-prompt fake: unsupported operator ${op}`);
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

const reviewModel = {
  findOne: (filter) => queryChain(reviewStore.find((d) => matchesFilter(d, filter)) || null),
};

const createNotification = jest.fn();

jest.unstable_mockModule('../../src/models/Appointment.js', () => ({ default: appointmentModel }));
jest.unstable_mockModule('../../src/models/Review.js', () => ({ default: reviewModel }));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: {},
  createNotification,
}));

const job = await import('../../src/jobs/reviewPrompt.job.js');
const { runReviewPromptsOnce } = job;

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-10-01T12:00:00Z');

const seed = (overrides = {}) => {
  const agoMs = overrides.agoMs ?? 3 * HOUR;
  const doc = {
    _id: `appt-${apptStore.length + 1}`,
    patient: 'Asha Patient',
    patientId: 'user1',
    doctor: 'Dr. Ravi',
    status: 'Completed',
    updatedAt: new Date(NOW.getTime() - agoMs),
    createdAt: new Date(NOW.getTime() - agoMs),
    ...overrides,
  };
  delete doc.agoMs;
  apptStore.push(doc);
  return doc;
};

const state = (key) => apptStore[0]?.reviewPrompt?.[key];

beforeEach(() => {
  apptStore.length = 0;
  reviewStore.length = 0;
  createNotification.mockReset().mockResolvedValue({ notification: { _id: 'n1' }, reason: null });
});

describe('review prompt windows', () => {
  it('sends t2h when due and leaves t1d pending', async () => {
    seed({ agoMs: 3 * HOUR });
    const stats = await runReviewPromptsOnce(NOW);
    expect(stats).toMatchObject({ due: 1, sent: 1 });
    expect(state('t2h').status).toBe('sent');
    expect(state('t1d')).toBeUndefined();
    const arg = createNotification.mock.calls[0][0];
    expect(arg.dedupKey).toBe('review-prompt:appt-1:t2h');
    expect(arg.type).toBe('review_request');
    expect(arg.userId).toBe('user1');
  });

  it('sends t1d when due; a t2h never sent is skipped as stale, not sent late', async () => {
    seed({ agoMs: 30 * HOUR });
    const stats = await runReviewPromptsOnce(NOW);
    expect(stats).toMatchObject({ sent: 1, skipped: 1 });
    expect(state('t2h').status).toBe('skipped');
    expect(state('t1d').status).toBe('sent');
  });

  it('asks nothing before the first milestone is due', async () => {
    seed({ agoMs: 30 * 60 * 1000 });
    const stats = await runReviewPromptsOnce(NOW);
    expect(stats).toMatchObject({ due: 0, sent: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('ignores non-completed visits and rows without a patient account', async () => {
    seed({ agoMs: 3 * HOUR, status: 'Confirmed' });
    seed({ _id: 'appt-2', agoMs: 3 * HOUR, patientId: null });
    const stats = await runReviewPromptsOnce(NOW);
    expect(stats.scanned).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe('review prompt idempotency', () => {
  it('skips a visit that already has a review (bookingRef link)', async () => {
    seed({ agoMs: 3 * HOUR });
    reviewStore.push({ bookingRef: 'appt-1', patientId: 'user1' });
    const stats = await runReviewPromptsOnce(NOW);
    expect(stats).toMatchObject({ sent: 0, skipped: 1 });
    expect(state('t2h').lastReason).toBe('already-reviewed');
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('never re-sends a sent milestone on the next run', async () => {
    seed({ agoMs: 3 * HOUR });
    await runReviewPromptsOnce(NOW);
    const stats = await runReviewPromptsOnce(NOW);
    // t2h sent; t1d not due yet (only 3h elapsed).
    expect(stats).toMatchObject({ due: 0, sent: 0 });
    expect(createNotification).toHaveBeenCalledTimes(1);
  });
});

describe('review prompt wiring', () => {
  const indexSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');
  const modelSrc = fs.readFileSync(new URL('../../src/models/Appointment.js', import.meta.url), 'utf8');

  it('index.js actually starts the scheduler', () => {
    expect(indexSrc).toContain('startReviewPrompts');
    expect(indexSrc).toContain('reviewPrompt.job.js');
  });

  it('the milestone state lives on the Appointment document', () => {
    expect(modelSrc).toMatch(/reviewPrompt:\s*\{/);
  });
});
