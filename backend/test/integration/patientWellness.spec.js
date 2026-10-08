/**
 * 6.md §2.10 fitness (opt-in: steps/workouts/class attendance) + §2.11
 * nutrition (meal log, water, grocery list), with computed streaks.
 *
 * What it pins:
 *  - 401 anonymously;
 *  - fitness is gated (403 CONSENT_REQUIRED on logs/streaks/reads without
 *    the per-profile opt-in) while nutrition stays open;
 *  - the kind vocabulary is global and the domain derives from it (a fitness
 *    kind can never ride the open nutrition path), strict per-kind details;
 *  - consent is idempotent + audited; revoke purges fitness logs only;
 *  - streaks compute from distinct log dates (current with one-day grace,
 *    longest run, active days) — seeded relative to the real today so the
 *    test is deterministic without clock mocks;
 *  - family profile scoping + foreign 404s with zero reads.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
// Leaf import (pure, no middleware): importing the ROUTE module here would
// bind the real auth middleware before the harness mocks it and 401
// everything. Same rule as utils/searchDto.js and the lib/* vocabularies.
import { computeStreaks } from '../../src/lib/wellnessStreaks.js';
import { getISTDateString } from '../../src/utils/dateUtils.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const calls = {};
const data = {};
const auditLog = jestApi.fn();

const chainable = (rows) => {
  const chain = {
    sort: () => chain, limit: () => chain, lean: () => chain,
    then: (res, rej) => Promise.resolve(rows).then(res, rej),
  };
  return chain;
};

jestApi.unstable_mockModule('../../src/models/WellnessProfile.js', () => ({
  default: {
    findOne: (filter) => { calls.profileFind = filter; return query(data.profile ?? null); },
    findOneAndUpdate: (filter, update, opts) => {
      calls.profileUpsert = { filter, update, opts };
      return query({ fitnessConsentedAt: new Date('2099-01-01T00:00:00.000Z') });
    },
    findOneAndDelete: (filter) => { calls.profileDelete = filter; return query(data.profile ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/models/WellnessLog.js', () => ({
  default: {
    find: (filter) => { calls.logsFind = filter; return chainable(data.logs ?? []); },
    create: (doc) => { calls.logCreate = doc; return query({ _id: 'log1', ...doc }); },
    findOneAndDelete: (filter) => { calls.logDelete = filter; return query(data.deleteRow ?? null); },
    deleteMany: (filter) => { calls.logsDeleteMany = filter; return query({ deletedCount: data.purged ?? 0 }); },
    distinct: (field, filter) => { calls.distinct = { field, filter }; return query(data.distinctDates ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (filter) => { calls.familyLookup = filter; return query(data.familyRow ?? null); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('patientWellness', {});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
});

const consented = () => {
  data.profile = { fitnessConsentedAt: new Date('2099-01-01T00:00:00.000Z') };
};
const dayShift = (iso, n) => new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

describe('fitness consent gate', () => {
  it('401s anonymously', async () => {
    expect((await as().get('/consent')).status).toBe(401);
  });

  it('blocks fitness reads/writes without opt-in but leaves nutrition open', async () => {
    expect((await as(PATIENT).get('/logs')).body.code).toBe('CONSENT_REQUIRED');
    expect((await as(PATIENT).post('/logs').send({ kind: 'steps', date: '2099-02-01', details: { count: 100 } })).status).toBe(403);
    expect((await as(PATIENT).get('/streaks')).status).toBe(403);
    expect(calls.logsFind).toBeUndefined();
    // nutrition needs no consent
    data.logs = [{ _id: 'n1', kind: 'meal', date: '2099-02-01', details: { meal: 'lunch', items: ['dal'] } }];
    const res = await as(PATIENT).get('/logs?kind=meal');
    expect(res.status).toBe(200);
    expect(calls.logsFind).toMatchObject({ userId: 'pat-1', kind: 'meal' });
    expect(res.body.logs[0]).toMatchObject({ kind: 'meal', domain: 'nutrition' });
  });

  it('grants and revokes the fitness opt-in (revoke purges fitness logs only)', async () => {
    const grant = await as(PATIENT).post('/consent').send({});
    expect(grant.status).toBe(201);
    expect(calls.profileUpsert.filter).toEqual({ userId: 'pat-1', familyMemberId: null });
    expect(auditLog).toHaveBeenCalledWith('wellness_consented', 'pat-1', expect.objectContaining({ domain: 'fitness' }));

    consented();
    data.purged = 6;
    const revoke = await as(PATIENT).delete('/consent');
    expect(revoke.body).toEqual({ fitnessConsented: false, logsPurged: 6 });
    expect(calls.logsDeleteMany).toEqual({
      userId: 'pat-1', familyMemberId: null, kind: { $in: ['steps', 'workout', 'class_attendance'] },
    });
  });
});

describe('logs', () => {
  it('writes scoped logs with derived domains and strict details', async () => {
    consented();
    const steps = await as(PATIENT).post('/logs').send({ kind: 'steps', date: '2099-02-01', details: { count: 8000, source: 'wearable' } });
    expect(steps.status).toBe(201);
    expect(steps.body).toMatchObject({ kind: 'steps', domain: 'fitness' });
    expect(calls.logCreate).toMatchObject({ userId: 'pat-1', familyMemberId: null });

    const water = await as(PATIENT).post('/logs').send({ kind: 'water', date: '2099-02-01', details: { ml: 2000 } });
    expect(water.body).toMatchObject({ kind: 'water', domain: 'nutrition' });

    expect((await as(PATIENT).post('/logs').send({ kind: 'dance', date: '2099-02-01' })).status).toBe(400);
    expect((await as(PATIENT).post('/logs').send({ kind: 'meal', date: '2099-02-01', details: { meal: 'lunch', items: [] } })).status).toBe(400);
    expect((await as(PATIENT).post('/logs').send({ kind: 'steps', date: '2099-02-01', details: { count: -5 } })).status).toBe(400);
  });

  it('lists with kind/date filters, allowlisted rows, audited reads', async () => {
    consented();
    data.logs = [{ _id: 'w1', kind: 'workout', date: '2099-02-02', details: { activity: 'yoga', minutes: 30 }, userId: 'pat-1' }];
    const res = await as(PATIENT).get('/logs?kind=workout&from=2099-01-01&to=2099-12-31');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.logsFind).toEqual({
      userId: 'pat-1', familyMemberId: null, kind: 'workout',
      date: { $gte: '2099-01-01', $lte: '2099-12-31' },
    });
    expect(res.body.logs[0]).toEqual({ id: 'w1', kind: 'workout', domain: 'fitness', date: '2099-02-02', details: { activity: 'yoga', minutes: 30 } });
    expect((await as(PATIENT).get('/logs?kind=nope')).status).toBe(400);
    expect(auditLog).toHaveBeenCalledWith('wellness_viewed', 'pat-1', expect.objectContaining({ kind: 'workout', count: 1 }));
  });

  it('deletes own scoped logs with an audit row', async () => {
    consented();
    data.deleteRow = { _id: 'l9' };
    expect((await as(PATIENT).delete('/logs/l9')).status).toBe(200);
    expect(calls.logDelete).toEqual({ _id: 'l9', userId: 'pat-1', familyMemberId: null });
    expect(auditLog).toHaveBeenCalledWith('wellness_log_deleted', 'pat-1', expect.objectContaining({ logId: 'l9' }));
    data.deleteRow = null;
    expect((await as(PATIENT).delete('/logs/foreign')).status).toBe(404);
  });
});

describe('streaks', () => {
  it('computes current/longest/active from distinct dates', async () => {
    consented();
    const today = getISTDateString();
    // run: today, yesterday, day-before (current 3); older run of 5; one gap day
    data.distinctDates = [
      today, dayShift(today, -1), dayShift(today, -2),
      dayShift(today, -4), dayShift(today, -5), dayShift(today, -6), dayShift(today, -7), dayShift(today, -8),
    ];
    const res = await as(PATIENT).get('/streaks?domain=fitness');
    expect(res.status).toBe(200);
    expect(calls.distinct.filter).toEqual({
      userId: 'pat-1', familyMemberId: null, kind: { $in: ['steps', 'workout', 'class_attendance'] },
    });
    expect(res.body).toMatchObject({ domain: 'fitness', asOf: today, currentStreak: 3, longestStreak: 5, activeDays: 8 });
  });

  it('validates the domain and gates fitness streaks', async () => {
    expect((await as(PATIENT).get('/streaks?domain=sleep')).status).toBe(400);
    data.profile = null;
    data.distinctDates = [];
    const res = await as(PATIENT).get('/streaks?domain=nutrition');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ domain: 'nutrition', currentStreak: 0, longestStreak: 0, activeDays: 0 });
  });
});

describe('computeStreaks unit pin', () => {
  it('survives a single missed day, dies on two', () => {
    expect(computeStreaks(['2026-10-05', '2026-10-06', '2026-10-07'], '2026-10-07')).toMatchObject({ currentStreak: 3, longestStreak: 3 });
    expect(computeStreaks(['2026-10-05', '2026-10-06'], '2026-10-07')).toMatchObject({ currentStreak: 2, longestStreak: 2 });
    expect(computeStreaks(['2026-10-05'], '2026-10-07')).toMatchObject({ currentStreak: 0, longestStreak: 1 });
    expect(computeStreaks([], '2026-10-07')).toMatchObject({ currentStreak: 0, longestStreak: 0, activeDays: 0 });
  });
});

describe('family profiles', () => {
  it('scopes consent and logs to a managed member, 404s foreigners', async () => {
    data.familyRow = { _id: 'fm1', name: 'Aarav', relation: 'Son' };
    data.profile = null;
    expect((await as(PATIENT).post('/logs?personId=507f1f77bcf86cd799439070').send({ kind: 'meal', date: '2099-02-01', details: { meal: 'dinner', items: ['roti'] } })).status).toBe(201);
    expect(calls.logCreate).toMatchObject({ userId: 'pat-1', familyMemberId: '507f1f77bcf86cd799439070' });

    data.familyRow = null;
    const denied = await as(PATIENT).get('/logs?personId=507f1f77bcf86cd799439071');
    expect(denied.status).toBe(404);
    expect(auditLog).not.toHaveBeenCalled();
  });
});
