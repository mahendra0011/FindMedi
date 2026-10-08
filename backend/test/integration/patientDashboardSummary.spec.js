/**
 * 6.md §8 `GET /patient/dashboard/summary?profileId=` — aggregated, cached
 * short, object-level authz (self or authorised family), no-store, DTO
 * allowlist, audit on record access.
 *
 * What it pins:
 *  - 401 anonymously;
 *  - self view: every count is session-scoped with `familyMemberId: null`
 *    (matches today's untagged rows AND future-proofs the family split),
 *    familyMembers counts the ACCOUNT's active roster, 60s server cache with
 *    X-Cache MISS + no-store, audit `dashboard_summary_viewed` cached:false;
 *  - profileId = own id (or 'self') resolves to the self view with no lookup;
 *  - family view: the profile row must be MANAGED by the session (patientId
 *    or dependentOf, active), counts filter `familyMemberId: <profile>`, the
 *    profile object carries id/kind/name/relation ONLY — FamilyMember's
 *    clinical fields (allergies, phone, bloodGroup) never reach the body;
 *  - unknown / malformed / foreign / inactive profileId -> 404, with NO
 *    counts, NO cache write and NO audit row (a probe must not manufacture
 *    compliance traffic);
 *  - cache HIT: body served from redis, no recount, audit still recorded
 *    with cached:true.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

let apptCount = 0;
let recordCount = 0;
let familyCount = 0;
let programCount = 0;
const countFilters = { appointment: null, record: null, family: null, program: null };
let familyLookupFilter = null;
let familyLookupRow = null;
let cachedValue = null;
const auditLog = jestApi.fn();

jestApi.unstable_mockModule('../../src/models/Appointment.js', () => ({
  default: { countDocuments: (filter) => { countFilters.appointment = filter; return query(apptCount); } },
}));
jestApi.unstable_mockModule('../../src/models/Record.js', () => ({
  default: { countDocuments: (filter) => { countFilters.record = filter; return query(recordCount); } },
}));
jestApi.unstable_mockModule('../../src/models/ChronicCarePlan.js', () => ({
  default: { countDocuments: (filter) => { countFilters.program = filter; return query(programCount); } },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: {
    findOne: (filter) => { familyLookupFilter = filter; return query(familyLookupRow); },
    countDocuments: (filter) => { countFilters.family = filter; return query(familyCount); },
  },
}));
jestApi.unstable_mockModule('../../src/config/redis.js', () => ({
  getCache: jestApi.fn(async () => cachedValue),
  setCache: jestApi.fn(async () => true),
  // audit.js (statically imported by the route) needs these two names at link
  // time even though the suite never exercises a mirror failure.
  redisClient: { isOpen: false, incr: async () => {} },
  isRedisReady: () => false,
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('patientDashboard', {});
const { getCache, setCache } = await import('../../src/config/redis.js');

beforeEach(() => {
  apptCount = 2;
  recordCount = 5;
  familyCount = 3;
  programCount = 1;
  countFilters.appointment = null;
  countFilters.record = null;
  countFilters.family = null;
  countFilters.program = null;
  familyLookupFilter = null;
  familyLookupRow = null;
  cachedValue = null;
  auditLog.mockReset();
  getCache.mockClear();
  setCache.mockClear();
});

describe('GET /summary — self view', () => {
  it('401s anonymously', async () => {
    expect((await as().get('/summary')).status).toBe(401);
  });

  it('aggregates the four axes session-scoped, cached short, audited', async () => {
    const res = await as(PATIENT).get('/summary');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.profile).toEqual({ id: 'pat-1', kind: 'self' });
    expect(res.body.counts).toEqual({
      upcomingAppointments: 2, records: 5, familyMembers: 3, activePrograms: 1,
    });

    expect(countFilters.appointment).toEqual({
      patientId: 'pat-1',
      familyMemberId: null,
      date: { $gte: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      status: { $in: ['Pending', 'Confirmed'] },
    });
    expect(countFilters.record).toEqual({ patientId: 'pat-1', familyMemberId: null });
    expect(countFilters.family).toEqual({ patientId: 'pat-1', isActive: true });
    expect(countFilters.program).toEqual({ userId: 'pat-1', familyMemberId: null, status: 'active' });
    expect(familyLookupFilter).toBeNull(); // self needs no family lookup

    expect(setCache).toHaveBeenCalledWith(
      'dashboard_summary:pat-1:pat-1',
      expect.objectContaining({ counts: expect.any(Object) }),
      60,
    );
    expect(auditLog).toHaveBeenCalledWith(
      'dashboard_summary_viewed',
      'pat-1',
      expect.objectContaining({ profileId: 'pat-1', profileKind: 'self', cached: false }),
    );
  });

  it("treats profileId as the session id or 'self' as self, without a lookup", async () => {
    await as(PATIENT).get('/summary?profileId=pat-1');
    expect(familyLookupFilter).toBeNull();

    const res = await as(PATIENT).get('/summary?profileId=self');
    expect(res.status).toBe(200);
    expect(res.body.profile.kind).toBe('self');
  });
});

describe('GET /summary — family view', () => {
  it('serves a managed member with a name-only profile DTO', async () => {
    familyLookupRow = {
      _id: 'fm1',
      name: 'Asha',
      relation: 'Spouse',
      // Clinical/contact fields the summary must NOT echo:
      allergies: 'penicillin',
      medicalNotes: 'secret note',
      phone: '+919999999999',
      bloodGroup: 'B+',
    };
    const res = await as(PATIENT).get('/summary?profileId=507f1f77bcf86cd7994390c1');
    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual({
      id: '507f1f77bcf86cd7994390c1', kind: 'family', name: 'Asha', relation: 'Spouse',
    });
    const raw = JSON.stringify(res.body);
    for (const forbidden of ['penicillin', 'secret note', '+919999999999', 'B+']) {
      expect(raw).not.toContain(forbidden);
    }

    expect(familyLookupFilter).toMatchObject({
      _id: '507f1f77bcf86cd7994390c1',
      isActive: true,
      $or: [{ patientId: 'pat-1' }, { dependentOf: 'pat-1' }],
    });
    expect(countFilters.appointment.familyMemberId).toBe('507f1f77bcf86cd7994390c1');
    expect(countFilters.record.familyMemberId).toBe('507f1f77bcf86cd7994390c1');
    expect(countFilters.program.familyMemberId).toBe('507f1f77bcf86cd7994390c1');
    // The family axis stays account-level even in a family view.
    expect(countFilters.family).toEqual({ patientId: 'pat-1', isActive: true });
    expect(auditLog).toHaveBeenCalledWith(
      'dashboard_summary_viewed',
      'pat-1',
      expect.objectContaining({ profileId: '507f1f77bcf86cd7994390c1', profileKind: 'family' }),
    );
  });

  it('404s a foreign member, writing no counts, cache or audit row', async () => {
    familyLookupRow = null;
    const res = await as(PATIENT).get('/summary?profileId=507f1f77bcf86cd7994390c2');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Profile not found' });
    expect(countFilters.appointment).toBeNull();
    expect(setCache).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('404s a malformed id before any lookup', async () => {
    const res = await as(PATIENT).get('/summary?profileId=not-an-id');
    expect(res.status).toBe(404);
    expect(familyLookupFilter).toBeNull();
  });
});

describe('GET /summary — cache', () => {
  it('serves a HIT without recounting, and still audits the read', async () => {
    const payload = { profile: { id: 'pat-1', kind: 'self' }, counts: { upcomingAppointments: 9 }, generatedAt: '2026-10-07T00:00:00.000Z' };
    cachedValue = payload;
    const res = await as(PATIENT).get('/summary');
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('HIT');
    expect(res.body).toEqual(payload);
    expect(countFilters.appointment).toBeNull();
    expect(setCache).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      'dashboard_summary_viewed',
      'pat-1',
      expect.objectContaining({ cached: true }),
    );
  });
});
