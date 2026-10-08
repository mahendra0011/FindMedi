/**
 * 7.md:39 CME tracker — self-reported credits scoped to the caller's own
 * Doctor profiles, with totals derived at read.
 *
 * What it pins:
 *  - 401 anonymously;
 *  - reads derive creditsTotal + byYear (never stored), validate the year;
 *  - writes require the doctorId to be an OWNED profile (foreign 404, no
 *    row), strict ranges, audit;
 *  - deletes are ownership-scoped (foreign 404, no audit row);
 *  - a caller with no linked Doctor rows sees empty, writes nothing.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const DOCTOR_USER = { _id: 'doc-user-1', id: 'doc-user-1', role: 'doctor' };

const calls = {};
const data = {};
const auditLog = jestApi.fn();

const chainable = (rows) => {
  const chain = {
    select: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: () => chain,
    then: (res, rej) => Promise.resolve(rows).then(res, rej),
  };
  return chain;
};

jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: { find: (filter) => { calls.doctorFind = filter; return chainable(data.profiles ?? []); } },
}));
jestApi.unstable_mockModule('../../src/models/CMECredit.js', () => ({
  default: {
    find: (filter) => { calls.creditFind = filter; return chainable(data.credits ?? []); },
    create: (doc) => { calls.creditCreate = doc; return query({ _id: 'cme1', ...doc }); },
    findOneAndDelete: (filter) => { calls.creditDelete = filter; return query(data.deletedRow ?? null); },
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('doctorCme', {});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
  data.profiles = [{ _id: 'doc-profile-1' }];
});

describe('GET / — own credits with derived totals', () => {
  it('401s anonymously, empties callers with no profiles', async () => {
    expect((await as().get('/')).status).toBe(401);

    data.profiles = [];
    const res = await as(DOCTOR_USER).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, creditsTotal: 0, byYear: {}, credits: [] });
    expect(calls.creditFind).toBeUndefined();
  });

  it('derives totals and validates the year', async () => {
    data.credits = [
      { _id: 'a', doctorId: 'doc-profile-1', title: 'Cardio update', organizer: 'IMA', credits: 4, date: '2099-02-01', certificateUrl: 'https://cdn/cert.pdf' },
      { _id: 'b', doctorId: 'doc-profile-1', title: 'Ethics', credits: 2, date: '2098-05-01' },
    ];
    const res = await as(DOCTOR_USER).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(calls.doctorFind).toEqual({ user_id: 'doc-user-1' });
    expect(calls.creditFind).toMatchObject({ doctorId: { $in: ['doc-profile-1'] } });
    expect(res.body).toMatchObject({ total: 2, creditsTotal: 6, byYear: { 2099: 4, 2098: 2 } });
    expect(res.body.credits[0]).toEqual({
      id: 'a', doctorId: 'doc-profile-1', title: 'Cardio update', organizer: 'IMA',
      credits: 4, date: '2099-02-01', certificateUrl: 'https://cdn/cert.pdf',
    });

    const filtered = await as(DOCTOR_USER).get('/?year=2099');
    expect(calls.creditFind.date).toEqual({ $gte: '2099-01-01', $lte: '2099-12-31' });
    expect((await as(DOCTOR_USER).get('/?year=99')).status).toBe(400);
  });
});

describe('POST / + DELETE /:id — owned writes', () => {
  it('files credits onto owned profiles and audits', async () => {
    const res = await as(DOCTOR_USER).post('/').send({
      doctorId: '507f1f77bcf86cd7994390d1', title: 'Cardio update', credits: 4, date: '2099-02-01',
    });
    // profile id must be one the caller owns — the hex above is not
    // doc-profile-1, so this is the foreign case:
    expect(res.status).toBe(404);
    expect(calls.creditCreate).toBeUndefined();

    data.profiles = [{ _id: '507f1f77bcf86cd7994390d1' }];
    const ok = await as(DOCTOR_USER).post('/').send({
      doctorId: '507f1f77bcf86cd7994390d1', title: 'Cardio update', credits: 4, date: '2099-02-01',
    });
    expect(ok.status).toBe(201);
    expect(calls.creditCreate).toMatchObject({ doctorUserId: 'doc-user-1', title: 'Cardio update', credits: 4 });
    expect(auditLog).toHaveBeenCalledWith('cme_credit_created', 'doc-user-1', expect.objectContaining({ creditId: 'cme1' }));

    expect((await as(DOCTOR_USER).post('/').send({ doctorId: '507f1f77bcf86cd7994390d1', title: 'X', credits: 400, date: '2099-02-01' })).status).toBe(400);
  });

  it('deletes only owned rows with an audit row', async () => {
    data.deletedRow = { _id: 'c1' };
    expect((await as(DOCTOR_USER).delete('/507f1f77bcf86cd7994390e1')).status).toBe(200);
    expect(calls.creditDelete).toMatchObject({ _id: '507f1f77bcf86cd7994390e1' });
    expect(auditLog).toHaveBeenCalledWith('cme_credit_deleted', 'doc-user-1', expect.objectContaining({ creditId: 'c1' }));

    data.deletedRow = null;
    expect((await as(DOCTOR_USER).delete('/507f1f77bcf86cd7994390e1')).status).toBe(404);
    expect((await as(DOCTOR_USER).delete('/nope')).status).toBe(404);
  });
});
