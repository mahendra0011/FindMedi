/**
 * 6.md §2.9 women's health (opt-in): cycle tracker, pregnancy weeks/visits,
 * postpartum — private by default, separate consent.
 *
 * What it pins:
 *  - 401 anonymously;
 *  - consent state reads without consent (so the UI can show the opt-in),
 *    but every log read/write is 403 CONSENT_REQUIRED until POST /consent;
 *  - consent is per person-profile (self or a managed family member — the
 *    managing account's guardian consent), idempotent, audited;
 *  - logs are session+profile scoped with kind/date filters, allowlisted
 *    rows, a computed predictedNextPeriod, no-store, audited reads;
 *  - strict per-kind details: unknown kinds, bad dates and off-schema
 *    details (e.g. a smuggled `ssn` key or out-of-range week) are 400s;
 *  - DELETE /consent revokes by purging profile AND logs (audited with the
 *    purge count), after which reads are 403 again;
 *  - a foreign personId is 404 with zero reads and no audit row.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const calls = {};
const data = {};
const auditLog = jestApi.fn();

const chainable = (rows) => {
  const chain = {
    sort: (arg) => { calls.sortArg = arg; return chain; },
    limit: (arg) => { calls.limitArg = arg; return chain; },
    lean: () => chain,
    then: (res, rej) => Promise.resolve(rows).then(res, rej),
  };
  return chain;
};

jestApi.unstable_mockModule('../../src/models/WomensHealthProfile.js', () => ({
  default: {
    findOne: (filter) => { calls.profileFind = filter; return query(data.profile ?? null); },
    findOneAndUpdate: (filter, update, opts) => {
      calls.profileUpsert = { filter, update, opts };
      return query({ consentedAt: new Date('2099-01-01T00:00:00.000Z'), cycleLengthDays: update?.$set?.cycleLengthDays ?? 28 });
    },
    findOneAndDelete: (filter) => { calls.profileDelete = filter; return query(data.profile ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/models/WomensHealthLog.js', () => ({
  default: {
    find: (filter) => { calls.logsFind = filter; return chainable(data.logs ?? []); },
    findOne: (filter) => { calls.logFindOne = filter; return query(data.lastPeriod ?? null); },
    create: (doc) => { calls.logCreate = doc; return query({ _id: 'log1', ...doc }); },
    findOneAndDelete: (filter) => { calls.logDelete = filter; return query(data.deleteRow ?? null); },
    deleteMany: (filter) => { calls.logsDeleteMany = filter; return query({ deletedCount: data.purged ?? 0 }); },
  },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (filter) => { calls.familyLookup = filter; return query(data.familyRow ?? null); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('patientWomensHealth', {});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
});

const consented = (cycle = 28) => {
  data.profile = { consentedAt: new Date('2099-01-01T00:00:00.000Z'), cycleLengthDays: cycle };
};

describe('consent', () => {
  it('401s anonymously', async () => {
    expect((await as().get('/consent')).status).toBe(401);
  });

  it('reports unconsented state without requiring consent', async () => {
    const res = await as(PATIENT).get('/consent');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ consented: false, consentedAt: null, category: 'womens_health' });
    expect(calls.profileFind).toEqual({ userId: 'pat-1', familyMemberId: null });
  });

  it('blocks log reads and writes until opt-in', async () => {
    expect((await as(PATIENT).get('/')).status).toBe(403);
    expect((await as(PATIENT).get('/')).body).toEqual({ message: 'WomensHealth consent required', code: 'CONSENT_REQUIRED' });
    expect((await as(PATIENT).post('/logs').send({ kind: 'period', date: '2099-02-01' })).status).toBe(403);
    expect(calls.logsFind).toBeUndefined();
    expect(calls.logCreate).toBeUndefined();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('grants consent idempotently and audits it', async () => {
    const res = await as(PATIENT).post('/consent').send({});
    expect(res.status).toBe(201);
    expect(res.body.consented).toBe(true);
    expect(calls.profileUpsert.filter).toEqual({ userId: 'pat-1', familyMemberId: null });
    expect(calls.profileUpsert.opts).toMatchObject({ upsert: true });
    expect(auditLog).toHaveBeenCalledWith(
      'womens_health_consented', 'pat-1',
      expect.objectContaining({ personId: 'pat-1', personKind: 'self' }),
    );
  });

  it('revokes by purging profile and logs, then reads are 403 again', async () => {
    consented();
    data.purged = 4;
    const res = await as(PATIENT).delete('/consent');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ consented: false, logsPurged: 4 });
    expect(calls.logsDeleteMany).toEqual({ userId: 'pat-1', familyMemberId: null });
    expect(calls.profileDelete).toEqual({ userId: 'pat-1', familyMemberId: null });
    expect(auditLog).toHaveBeenCalledWith(
      'womens_health_consent_revoked', 'pat-1',
      expect.objectContaining({ logsPurged: 4 }),
    );
    // consent row gone -> gate closes
    data.profile = null;
    expect((await as(PATIENT).get('/')).status).toBe(403);
  });
});

describe('logs', () => {
  it('lists scoped logs with filters, prediction and audited reads', async () => {
    consented(30);
    data.logs = [
      { _id: 'l1', kind: 'period', date: '2099-02-01', details: { flow: 'medium' }, userId: 'pat-1' },
      { _id: 'l2', kind: 'symptom', date: '2099-02-10', details: { tags: ['cramps'] }, userId: 'pat-1' },
    ];
    data.lastPeriod = { _id: 'l1', kind: 'period', date: '2099-02-01' };
    const res = await as(PATIENT).get('/?kind=period&from=2099-01-01&to=2099-12-31&limit=10');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.logsFind).toEqual({
      userId: 'pat-1', familyMemberId: null, kind: 'period',
      date: { $gte: '2099-01-01', $lte: '2099-12-31' },
    });
    expect(res.body.predictedNextPeriod).toBe('2099-03-03'); // Feb 1 + 30 days
    expect(res.body.logs[0]).toEqual({ id: 'l1', kind: 'period', date: '2099-02-01', details: { flow: 'medium' } });
    expect(res.body.profile).toEqual({ consentedAt: expect.any(String), cycleLengthDays: 30 });
    expect(auditLog).toHaveBeenCalledWith(
      'womens_health_viewed', 'pat-1',
      expect.objectContaining({ personId: 'pat-1', count: 2 }),
    );
  });

  it('rejects off-schema writes with 400s', async () => {
    consented();
    expect((await as(PATIENT).post('/logs').send({ kind: 'ultrasound', date: '2099-02-01' })).status).toBe(400);
    expect((await as(PATIENT).post('/logs').send({ kind: 'period', date: '02-01-2099' })).status).toBe(400);
    expect((await as(PATIENT).post('/logs').send({ kind: 'pregnancy', date: '2099-02-01', details: { week: 99 } })).status).toBe(400);
    expect((await as(PATIENT).post('/logs').send({ kind: 'period', date: '2099-02-01', details: { flow: 'medium', ssn: 'x' } })).status).toBe(400);
    expect((await as(PATIENT).get('/?kind=nope')).status).toBe(400);
    expect((await as(PATIENT).get('/?from=2099-12-31&to=2099-01-01')).status).toBe(400);
    expect(calls.logCreate).toBeUndefined();
  });

  it('creates scoped logs and updates the cycle length', async () => {
    consented();
    const res = await as(PATIENT).post('/logs').send({ kind: 'symptom', date: '2099-02-10', details: { tags: ['cramps'], severity: 3 } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'log1', kind: 'symptom' });
    expect(calls.logCreate).toMatchObject({ userId: 'pat-1', familyMemberId: null, kind: 'symptom' });

    const put = await as(PATIENT).put('/profile').send({ cycleLengthDays: 32 });
    expect(put.status).toBe(200);
    expect(calls.profileUpsert.update).toEqual({ $set: { cycleLengthDays: 32 } });
    expect((await as(PATIENT).put('/profile').send({ cycleLengthDays: 9 })).status).toBe(400);
  });

  it('deletes only own scoped logs and audits the deletion', async () => {
    consented();
    data.deleteRow = { _id: 'l9' };
    const res = await as(PATIENT).delete('/logs/l9');
    expect(res.status).toBe(200);
    expect(calls.logDelete).toEqual({ _id: 'l9', userId: 'pat-1', familyMemberId: null });
    expect(auditLog).toHaveBeenCalledWith(
      'womens_health_log_deleted', 'pat-1', expect.objectContaining({ logId: 'l9' }),
    );

    data.deleteRow = null;
    expect((await as(PATIENT).delete('/logs/foreign')).status).toBe(404);
  });
});

describe('family profiles', () => {
  it('consents and scopes logs to a managed member', async () => {
    data.familyRow = { _id: 'fm1', name: 'Meera', relation: 'Daughter' };
    const res = await as(PATIENT).post('/consent?personId=507f1f77bcf86cd799439050').send({});
    expect(res.status).toBe(201);
    expect(calls.profileUpsert.filter).toEqual({ userId: 'pat-1', familyMemberId: '507f1f77bcf86cd799439050' });
    expect(calls.familyLookup).toMatchObject({
      _id: '507f1f77bcf86cd799439050',
      isActive: true,
      $or: [{ patientId: 'pat-1' }, { dependentOf: 'pat-1' }],
    });
    expect(auditLog).toHaveBeenCalledWith(
      'womens_health_consented', 'pat-1',
      expect.objectContaining({ personId: '507f1f77bcf86cd799439050', personKind: 'family' }),
    );
  });

  it('404s a foreign personId with zero reads and no audit row', async () => {
    data.familyRow = null;
    const res = await as(PATIENT).get('/?personId=507f1f77bcf86cd799439060');
    expect(res.status).toBe(404);
    expect(calls.profileFind).toBeUndefined();
    expect(auditLog).not.toHaveBeenCalled();
  });
});
