/**
 * A4 follow-through: the privacy centre (6.md §2.15 "hide categories from
 * recents/suggestions, who can see my records", 10.md §4.3 GET/PUT
 * /api/patient/privacy | GET /consents | GET /access-log).
 *
 * What it pins:
 *  - auth: all four routes 401 anonymously;
 *  - the read view NORMALISES the loose `settings` path: a legacy document
 *    still answers with the full four-key shape, a value outside the
 *    visibility vocabulary reports the default, and keys the privacy centre
 *    does not own (theme ...) are never echoed;
 *  - PUT is the CLOSED surface: unknown key -> 400 (strict schema), closed
 *    visibility vocabulary, bounded/deduped category list; a partial write
 *    merges into whatever settings already exist;
 *  - audit: a real change stamps `privacy_setting_changed` with WHICH keys
 *    moved; a no-op PUT (nothing presented) saves nothing and audits nothing;
 *  - consents: filter is the session account, EXPIRED is computed at read;
 *  - access log: the $or is server-built from the session id - own actions
 *    plus actions on my records - never from a request parameter.
 *
 * Ownership has no parameter to get wrong on GET/PUT /privacy: the filter is
 * always `req.user._id`, so there is no foreign id to probe (the family-id
 * 404 case lives in patientFamily.spec.js).
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const auditLog = jestApi.fn();
const save = jestApi.fn(async () => {});

let currentUser = null;
let lastAuditFilter = null;
let lastConsentFilter = null;
let auditRows = [];
let consentRows = [];

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));
jestApi.unstable_mockModule('../../src/models/AuditLog.js', () => ({
  default: {
    find: (filter) => { lastAuditFilter = filter; return query(auditRows); },
  },
}));
jestApi.unstable_mockModule('../../src/models/ConsentRecord.js', () => ({
  default: {
    find: (filter) => { lastConsentFilter = filter; return query(consentRows); },
  },
}));

const { as } = await mountApp('patient', {
  // The harness pre-registers its own User stub (step-up reads); the models
  // map runs last, so this one wins.
  '../../src/models/User.js': () => ({
    default: {
      findById: () => query(currentUser),
    },
  }),
});

const makeUser = (settings = {}) => ({ settings, save });

beforeEach(() => {
  currentUser = makeUser({ theme: 'dark' });
  lastAuditFilter = null;
  lastConsentFilter = null;
  auditRows = [];
  consentRows = [];
  auditLog.mockReset();
  save.mockClear();
});

describe('GET /privacy', () => {
  it('401s anonymously', async () => {
    const res = await as().get('/privacy');
    expect(res.status).toBe(401);
  });

  it('answers a legacy settings object with the full default shape (and does not echo unrelated keys)', async () => {
    currentUser = makeUser({ theme: 'dark', language: 'hi' });
    const res = await as(PATIENT).get('/privacy');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      hiddenCategories: [],
      profileVisibility: 'care_team',
      patientRecordSharing: false,
      dataSharing: false,
    });
  });

  it('echoes stored privacy settings', async () => {
    currentUser = makeUser({
      hiddenCategories: ['mental-health', 'sexual-health'],
      profileVisibility: 'private',
      patientRecordSharing: true,
      dataSharing: false,
    });
    const res = await as(PATIENT).get('/privacy');
    expect(res.body).toEqual({
      hiddenCategories: ['mental-health', 'sexual-health'],
      profileVisibility: 'private',
      patientRecordSharing: true,
      dataSharing: false,
    });
  });

  it('reports the default for a visibility the vocabulary cannot store', async () => {
    // The loose auth.js profile route can write ANY string into settings; the
    // privacy centre must not echo an unknown value back as if it were valid.
    currentUser = makeUser({ profileVisibility: 'everyone' });
    const res = await as(PATIENT).get('/privacy');
    expect(res.body.profileVisibility).toBe('care_team');
  });

  it('404s when the user row is gone', async () => {
    currentUser = null;
    const res = await as(PATIENT).get('/privacy');
    expect(res.status).toBe(404);
  });
});

describe('PUT /privacy', () => {
  it('401s anonymously', async () => {
    const res = await as().put('/privacy').send({ dataSharing: true });
    expect(res.status).toBe(401);
  });

  it('400s an unknown key instead of silently writing it', async () => {
    const res = await as(PATIENT).put('/privacy').send({ isAdmin: true });
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('400s a visibility outside the closed vocabulary', async () => {
    const res = await as(PATIENT).put('/privacy').send({ profileVisibility: 'public' });
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it('400s more than 50 hidden categories', async () => {
    const hiddenCategories = Array.from({ length: 51 }, (_, i) => `cat-${i}`);
    const res = await as(PATIENT).put('/privacy').send({ hiddenCategories });
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it('merges a partial write into existing settings, dedupes, saves and audits which keys moved', async () => {
    currentUser = makeUser({ theme: 'dark', profileVisibility: 'care_team', dataSharing: false });
    const res = await as(PATIENT).put('/privacy').send({
      hiddenCategories: ['diabetes', 'diabetes', 'mental-health'],
      patientRecordSharing: true,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      hiddenCategories: ['diabetes', 'mental-health'],
      profileVisibility: 'care_team',
      patientRecordSharing: true,
      dataSharing: false,
    });
    // Settings the privacy centre does not own survive the write.
    expect(currentUser.settings.theme).toBe('dark');
    expect(currentUser.settings.profileVisibility).toBe('care_team');
    expect(save).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      'privacy_setting_changed',
      'pat-1',
      expect.objectContaining({ settingKeys: ['hiddenCategories', 'patientRecordSharing'] }),
    );
  });

  it('treats an empty body as a no-op: 200, no save, no audit', async () => {
    const res = await as(PATIENT).put('/privacy').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      hiddenCategories: [],
      profileVisibility: 'care_team',
      patientRecordSharing: false,
      dataSharing: false,
    });
    expect(save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe('GET /consents', () => {
  it('401s anonymously', async () => {
    const res = await as().get('/consents');
    expect(res.status).toBe(401);
  });

  it('reads only the session account and computes EXPIRED at read time', async () => {
    consentRows = [
      { consentId: 'c1', status: 'GRANTED', expiresAt: new Date(Date.now() - 1000) },
      { consentId: 'c2', status: 'GRANTED', expiresAt: new Date(Date.now() + 60_000) },
      { consentId: 'c3', status: 'REVOKED' },
    ];
    const res = await as(PATIENT).get('/consents');
    expect(res.status).toBe(200);
    expect(lastConsentFilter).toEqual({ patientId: 'pat-1' });
    expect(res.body.map((c) => `${c.consentId}:${c.effectiveStatus}`)).toEqual([
      'c1:EXPIRED',
      'c2:GRANTED',
      'c3:REVOKED',
    ]);
  });
});

describe('GET /access-log', () => {
  it('401s anonymously', async () => {
    const res = await as().get('/access-log');
    expect(res.status).toBe(401);
  });

  it('builds the subject filter server-side (own actions + actions on my records), never from a parameter', async () => {
    auditRows = [
      { action: 'view_patient_records', userId: 'doc-9', timestamp: new Date() },
      { action: 'privacy_setting_changed', userId: 'pat-1', timestamp: new Date() },
    ];
    const res = await as(PATIENT).get('/access-log');
    expect(res.status).toBe(200);
    expect(lastAuditFilter).toEqual({
      $or: [
        { userId: 'pat-1' },
        { 'details.resourceId': 'pat-1' },
        { 'details.patientId': 'pat-1' },
      ],
    });
    expect(res.body).toHaveLength(2);
    expect(res.body[0].action).toBe('view_patient_records');
  });
});
