/**
 * 7.md:39 second-opinion inbox — patient shares records + question with a
 * doctor; doctor answers/declines; the share is a minted ConsentRecord that
 * dies with the request.
 *
 * What it pins:
 *  - 401 anonymously;
 *  - create: doctor must exist AND have a login (else 409, no consent
 *    minted), every record must belong to the requesting profile (else 400),
 *    one open request per doctor (else 409); success mints a GRANTED
 *    'Second opinion' grant (30-day ceiling, visible in the consents ledger),
 *    pings the doctor with a PHI-free notification, audits with a count;
 *  - patient list/cancel are session+profile scoped; answering an already
 *    decided request is 409; cancel revokes the grant;
 *  - doctor inbox is keyed by OWNED profiles only (no parameter can address
 *    another doctor's inbox), carries patient names + record headers but
 *    never record bodies; answering stores text+timestamp, revokes the
 *    grant, notifies the patient neutrally, and keeps answer text OUT of
 *    the audit args;
 *  - foreign personIds and foreign request ids are 404 with nothing leaked.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient', name: 'Asha' };
const DOCTOR_USER = { _id: 'doc-user-1', id: 'doc-user-1', role: 'doctor' };

const calls = {};
const data = {};
const auditLog = jestApi.fn();

const chainable = (rows) => {
  const chain = {
    sort: () => chain, skip: () => chain, limit: () => chain,
    select: () => chain, lean: () => chain,
    then: (res, rej) => Promise.resolve(rows).then(res, rej),
  };
  return chain;
};

jestApi.unstable_mockModule('../../src/models/SecondOpinionRequest.js', () => ({
  default: {
    findOne: (filter) => { calls.requestFindOne = filter; return query(data.requestRow ?? null); },
    findById: (id) => { calls.requestFindById = id; return query(data.requestRow ?? null); },
    find: (filter) => { calls.requestFind = filter; return chainable(data.requestRows ?? []); },
    countDocuments: (filter) => { calls.requestCount = filter; return query(data.requestTotal ?? 0); },
    create: (doc) => { calls.requestCreate = doc; return query({ _id: 'so1', status: 'REQUESTED', ...doc }); },
  },
}));
jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: {
    findById: (id) => { calls.doctorFindById = id; return query(data.doctor ?? null); },
    find: (filter) => { calls.doctorFind = filter; return chainable(data.doctors ?? []); },
    countDocuments: (filter) => { calls.doctorCount = filter; return query(data.ownsProfile ? 1 : 0); },
  },
}));
jestApi.unstable_mockModule('../../src/models/Record.js', () => ({
  default: {
    countDocuments: (filter) => { calls.recordCount = filter; return query(data.ownedRecords ?? 0); },
    find: (filter) => { calls.recordFind = filter; return chainable(data.recordHeaders ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/ConsentRecord.js', () => ({
  default: {
    create: (doc) => { calls.consentCreate = doc; return query({ ...doc }); },
    findOneAndUpdate: (filter, update) => { calls.consentRevoke = { filter, update }; return query({}); },
  },
}));
// NOTE: no User.js mock here on purpose — the harness registers its own User
// mock (findById-only) and spec-body re-registration loses to it, so the
// route must not need User at all (the inbox shows the request-time
// patientName snapshot instead of joining).
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { create: (doc) => { calls.notification = doc; return query({ ...doc }); } },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (filter) => { calls.familyLookup = filter; return query(data.familyRow ?? null); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('secondOpinions', {});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
});

const openRequest = (over = {}) => ({
  _id: 'so9', status: 'REQUESTED', patientId: 'pat-1', familyMemberId: null,
  doctorId: 'doc-profile-1', consentId: 'SO-ABC',
  save: jestApi.fn(async () => {}),
  ...over,
});
const question = 'I was diagnosed with hypertension, is lifelong medication truly needed?';

describe('POST / — patient creates a share', () => {
  it('401s anonymously', async () => {
    expect((await as().post('/').send({})).status).toBe(401);
  });

  it('mints a grant, notifies neutrally and audits with a count', async () => {
    data.doctor = { _id: 'doc-profile-1', name: 'Dr Rao', user_id: 'doc-user-1' };
    data.ownedRecords = 2;
    data.requestRow = null;
    const res = await as(PATIENT).post('/').send({
      doctorId: '507f1f77bcf86cd7994390a1', recordIds: ['507f1f77bcf86cd7994390b1', '507f1f77bcf86cd7994390b2'], question,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'so1', status: 'REQUESTED', recordsCount: 2 });
    expect(calls.doctorFindById).toBe('507f1f77bcf86cd7994390a1');
    expect(calls.recordCount).toEqual({
      _id: { $in: ['507f1f77bcf86cd7994390b1', '507f1f77bcf86cd7994390b2'] },
      patientId: 'pat-1', familyMemberId: null,
    });
    expect(calls.consentCreate).toMatchObject({
      patientId: 'pat-1', doctorId: 'doc-user-1', purposeOfCare: 'Second opinion',
      dataTypes: ['second_opinion'], status: 'GRANTED', validityHours: 720,
    });
    expect(calls.consentCreate.consentId).toMatch(/^SO-[0-9A-F]{32}$/);
    expect(calls.requestCreate).toMatchObject({ consentId: calls.consentCreate.consentId, doctorUserId: 'doc-user-1', patientName: 'Asha' });
    // PHI-free ping: no question text, no record detail.
    expect(calls.notification).toMatchObject({ userId: 'doc-user-1', title: 'New second-opinion request' });
    expect(JSON.stringify(calls.notification)).not.toContain('hypertension');
    expect(auditLog).toHaveBeenCalledWith(
      'second_opinion_requested', 'pat-1',
      expect.objectContaining({ personId: 'pat-1', recordsCount: 2 }),
    );
  });

  it('refuses unreachable doctors, foreign records and duplicate open requests', async () => {
    data.doctor = { _id: 'doc-profile-1', name: 'Dr Rao', user_id: null };
    data.ownedRecords = 1;
    data.requestRow = null;
    const unreachable = await as(PATIENT).post('/').send({ doctorId: '507f1f77bcf86cd7994390a1', recordIds: ['507f1f77bcf86cd7994390b1'], question });
    expect(unreachable.status).toBe(409);
    expect(unreachable.body.code).toBe('DOCTOR_UNREACHABLE');
    expect(calls.consentCreate).toBeUndefined();

    data.doctor = { _id: 'doc-profile-1', user_id: 'doc-user-1' };
    data.ownedRecords = 0;
    const foreign = await as(PATIENT).post('/').send({ doctorId: '507f1f77bcf86cd7994390a1', recordIds: ['507f1f77bcf86cd7994390b9'], question });
    expect(foreign.status).toBe(400);
    expect(calls.consentCreate).toBeUndefined();

    data.ownedRecords = 1;
    data.requestRow = openRequest();
    const dup = await as(PATIENT).post('/').send({ doctorId: '507f1f77bcf86cd7994390a1', recordIds: ['507f1f77bcf86cd7994390b1'], question });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('ALREADY_REQUESTED');

    expect((await as(PATIENT).post('/').send({ doctorId: 'nope', recordIds: [], question: 'short' })).status).toBe(400);
  });

  it('scopes shares to a managed family profile', async () => {
    data.familyRow = { _id: 'fm1', name: 'Asha', relation: 'Spouse' };
    data.doctor = { _id: 'doc-profile-1', user_id: 'doc-user-1' };
    data.ownedRecords = 1;
    data.requestRow = null;
    const res = await as(PATIENT).post('/').send({
      doctorId: '507f1f77bcf86cd7994390a1', personId: '507f1f77bcf86cd799439080',
      recordIds: ['507f1f77bcf86cd7994390b1'], question,
    });
    expect(res.status).toBe(201);
    expect(calls.requestCreate).toMatchObject({ patientId: 'pat-1', familyMemberId: '507f1f77bcf86cd799439080' });
    expect(calls.recordCount.familyMemberId).toBe('507f1f77bcf86cd799439080');
  });

  it('404s a foreign personId before any lookup or audit', async () => {
    data.familyRow = null;
    const res = await as(PATIENT).post('/').send({
      doctorId: '507f1f77bcf86cd7994390a1', personId: '507f1f77bcf86cd799439081',
      recordIds: ['507f1f77bcf86cd7994390b1'], question,
    });
    expect(res.status).toBe(404);
    expect(calls.doctorFindById).toBeUndefined();
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe('GET /mine + PATCH /:id/cancel — patient reads and revokes', () => {
  it('lists scoped requests with doctor cards, paginated and audited', async () => {
    data.requestTotal = 1;
    data.requestRows = [{ _id: 'so1', doctorId: 'doc-profile-1', recordIds: ['rec1'], question, status: 'REQUESTED', answer: {}, createdAt: new Date('2099-01-01') }];
    data.doctors = [{ _id: 'doc-profile-1', name: 'Dr Rao', specialization: 'Cardiology' }];
    const res = await as(PATIENT).get('/mine?page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 2, limit: 10 });
    expect(calls.requestFind).toMatchObject({ patientId: 'pat-1', familyMemberId: null });
    expect(res.body.requests[0]).toMatchObject({
      id: 'so1', doctor: { id: 'doc-profile-1', name: 'Dr Rao' }, question, status: 'REQUESTED',
    });
    expect(res.body.requests[0].answer).toBeNull();
    expect((await as(PATIENT).get('/mine?status=bogus')).status).toBe(400);
    expect(auditLog).toHaveBeenCalledWith('second_opinion_list_viewed', 'pat-1', expect.objectContaining({ count: 1 }));
  });

  it('cancels an open request and revokes its grant', async () => {
    data.requestRow = openRequest();
    const res = await as(PATIENT).patch('/507f1f77bcf86cd7994390c9/cancel').send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'so9', status: 'CANCELLED' });
    expect(data.requestRow.save).toHaveBeenCalled();
    expect(calls.consentRevoke).toMatchObject({ filter: { consentId: 'SO-ABC', status: 'GRANTED' } });
    expect(calls.consentRevoke.update.$set).toMatchObject({ status: 'REVOKED' });
    expect(auditLog).toHaveBeenCalledWith('second_opinion_cancelled', 'pat-1', expect.objectContaining({ requestId: 'so9' }));
  });

  it('refuses to cancel decided or foreign requests', async () => {
    data.requestRow = openRequest({ status: 'ANSWERED' });
    const decided = await as(PATIENT).patch('/507f1f77bcf86cd7994390c9/cancel').send({});
    expect(decided.status).toBe(409);
    expect(calls.consentRevoke).toBeUndefined();

    data.requestRow = null;
    expect((await as(PATIENT).patch('/507f1f77bcf86cd7994390c9/cancel').send({})).status).toBe(404);
    expect((await as(PATIENT).patch('/not-an-id/cancel').send({})).status).toBe(404);
  });
});

describe('GET /inbox + answer/decline — doctor side', () => {
  it('serves only owned profiles with names, headers and an audit row', async () => {
    data.doctors = [{ _id: 'doc-profile-1' }];
    data.requestTotal = 1;
    data.requestRows = [{ _id: 'so1', patientId: 'pat-1', patientName: 'Asha', recordIds: ['rec1'], question, status: 'REQUESTED', createdAt: new Date('2099-01-01') }];
    data.recordHeaders = [{ _id: 'rec1', type: 'diagnosis', date: '2099-01-05', diagnosis: 'Viral fever' }];
    const res = await as(DOCTOR_USER).get('/inbox');
    expect(res.status).toBe(200);
    expect(calls.doctorFind).toEqual({ user_id: 'doc-user-1' });
    expect(calls.requestFind).toMatchObject({ status: 'REQUESTED' });
    expect(res.body.requests[0]).toMatchObject({
      id: 'so1',
      patient: { id: 'pat-1', name: 'Asha' },
      records: [{ id: 'rec1', type: 'diagnosis', title: 'Viral fever' }],
      question, status: 'REQUESTED',
    });
    expect(auditLog).toHaveBeenCalledWith('second_opinion_inbox_viewed', 'doc-user-1', expect.objectContaining({ count: 1 }));
  });

  it('returns an empty inbox with no profiles and 400s bad status', async () => {
    data.doctors = [];
    const res = await as(DOCTOR_USER).get('/inbox');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, page: 1, limit: 20, requests: [] });
    expect(calls.requestFind).toBeUndefined();
    expect((await as(DOCTOR_USER).get('/inbox?status=bogus')).status).toBe(400);
  });

  it('answers owned open requests, revokes the grant and notifies neutrally', async () => {
    data.requestRow = openRequest();
    data.ownsProfile = true;
    const res = await as(DOCTOR_USER).patch('/507f1f77bcf86cd7994390c9/answer').send({ answer: 'Your readings look controlled; discuss tapering with your physician.' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'so9', status: 'ANSWERED' });
    expect(calls.doctorCount).toEqual({ _id: 'doc-profile-1', user_id: 'doc-user-1' });
    expect(data.requestRow.save).toHaveBeenCalled();
    expect(calls.consentRevoke.filter).toMatchObject({ consentId: 'SO-ABC' });
    expect(calls.notification).toMatchObject({ userId: 'pat-1', title: 'Your second opinion is ready.' });
    expect(JSON.stringify(calls.notification)).not.toContain('tapering');
    expect(auditLog).toHaveBeenCalledWith('second_opinion_answered', 'doc-user-1', expect.objectContaining({ requestId: 'so9' }));
    expect(JSON.stringify(auditLog.mock.calls)).not.toContain('tapering');
  });

  it('hides foreign requests and refuses decided ones', async () => {
    data.requestRow = openRequest();
    data.ownsProfile = false;
    expect((await as(DOCTOR_USER).patch('/507f1f77bcf86cd7994390c9/answer').send({ answer: 'A proper answer with enough length.' })).status).toBe(404);
    expect(data.requestRow.save).not.toHaveBeenCalled();

    data.requestRow = null;
    expect((await as(DOCTOR_USER).patch('/507f1f77bcf86cd7994390c9/decline').send({})).status).toBe(404);

    data.requestRow = openRequest({ status: 'DECLINED' });
    data.ownsProfile = true;
    expect((await as(DOCTOR_USER).patch('/507f1f77bcf86cd7994390c9/decline').send({})).status).toBe(409);
    expect((await as(DOCTOR_USER).patch('/507f1f77bcf86cd7994390c9/answer').send({ answer: 'short' })).status).toBe(400);
  });

  it('declines an owned open request and revokes its grant', async () => {
    data.requestRow = openRequest();
    data.ownsProfile = true;
    const res = await as(DOCTOR_USER).patch('/507f1f77bcf86cd7994390c9/decline').send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'DECLINED' });
    expect(calls.consentRevoke.filter).toMatchObject({ consentId: 'SO-ABC' });
    expect(auditLog).toHaveBeenCalledWith('second_opinion_declined', 'doc-user-1', expect.objectContaining({ requestId: 'so9' }));
  });
});
