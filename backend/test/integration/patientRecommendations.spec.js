/**
 * 6.md §2.11 `GET /patient/recommendations` — the discover feed behind §8's
 * cross-cutting rules (authn, object-level authz self-or-family, no-store,
 * DTO allowlist, audit on record access) and §2.11's rules (no health-data
 * ads, personalisation opt-out).
 *
 * What it pins:
 *  - 401 anonymously;
 *  - self feed: near-you events/facilities city-scoped from the DEFAULT
 *    PatientAddress, packages/trending/programs/content sections mapped
 *    through per-section allowlists (no event description, no doctor email,
 *    no article body), care-plan suggestions derived from ACTIVE plans,
 *    seasonal alerts equal to the pure IST-month lib, no-store, audit with
 *    personId/personKind/conditionsCount — and the condition NAME never
 *    enters the audit args;
 *  - no default address -> cityScoped:false and NO city key in the filters;
 *  - ?personalised=false -> ChronicCarePlan is never queried, carePlan is
 *    null (not [] — opt-out must be distinguishable from "no plan"), the
 *    flag is echoed and audited;
 *  - profileId runs the shared self-or-family helper (family profile scopes
 *    the care-plan query to familyMemberId), a foreign id is 404 with zero
 *    reads and no audit row;
 *  - pure-lib contracts: care-plan keys dedupe across conditions; seasonal
 *    months map to dengue/AQI/heatwave with an out-of-range safe empty.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { carePlanRecommendations } from '../../src/lib/carePlanRecommendations.js';
import { seasonalAlertsForMonth } from '../../src/lib/seasonalAlerts.js';
import { getISTDateString } from '../../src/utils/dateUtils.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const calls = {};
const data = {};
const auditLog = jestApi.fn();

const finder = (name) => (filter) => {
  calls[name] = filter;
  const chain = {
    sort: (arg) => { calls[`${name}:sort`] = arg; return chain; },
    limit: (arg) => { calls[`${name}:limit`] = arg; return chain; },
    lean: () => chain,
    then: (res, rej) => Promise.resolve(data[name] ?? []).then(res, rej),
  };
  return chain;
};
const model = (name, extra = {}) => ({ find: finder(name), ...extra });

jestApi.unstable_mockModule('../../src/models/Event.js', () => ({ default: model('events') }));
jestApi.unstable_mockModule('../../src/models/Facility.js', () => ({ default: model('facilities') }));
jestApi.unstable_mockModule('../../src/models/HealthPackage.js', () => ({ default: model('packages') }));
jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: model('doctors') }));
jestApi.unstable_mockModule('../../src/models/Plan.js', () => ({ default: model('programs') }));
jestApi.unstable_mockModule('../../src/models/ChronicCarePlan.js', () => ({ default: model('plans') }));
jestApi.unstable_mockModule('../../src/models/PlatformContent.js', () => ({ default: model('content') }));
jestApi.unstable_mockModule('../../src/models/PatientAddress.js', () => ({
  default: { findOne: (filter) => { calls.address = filter; return query(data.address ?? null); } },
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (filter) => { calls.familyLookup = filter; return query(data.familyRow ?? null); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('patientRecommendations', {});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
});

const seed = () => {
  data.address = { city: 'Pune' };
  data.events = [{ _id: 'ev1', title: 'Diabetes screening camp', type: 'camp', schedule: { start: new Date('2099-01-05T09:00:00.000Z') }, venue: { city: 'Pune', mode: 'venue', address: '12 Camp Road, Pune', geo: { coordinates: [73.8, 18.5] } }, description: 'long description' }];
  data.facilities = [{ _id: 'fc1', name: 'Jan Aushadhi Kendra', type: 'pharmacy', city: 'Pune', slug: 'jan-aushadhi-kendra', ownership: 'government', phone: '02012345678' }];
  data.packages = [{ _id: 'hp1', name: 'Full body check', packagePrice: 999, discount: 20 }];
  data.doctors = [{ _id: 'doc1', name: 'Dr Rao', specialization: 'Cardiology', rating: 4.8, reviews_count: 120, available: true, email: 'dr@example.com', phone: '+911111111111' }];
  data.programs = [{ _id: 'pl1', name: 'Gym 3-month', price: 3000, duration: { months: 3 }, type: 'gym', status: 'active' }];
  data.plans = [{ _id: 'ccp1', userId: 'pat-1', condition: 'Diabetes', status: 'active', planName: 'Diabetes care' }];
  data.content = [{ _id: 'c1', key: 'when-to-test-sugar', title: 'When to test sugar', publishedAt: new Date('2099-01-01'), reviewedAt: new Date('2099-01-02'), body: 'full article body' }];
};

describe('GET / — feed', () => {
  it('401s anonymously', async () => {
    expect((await as().get('/')).status).toBe(401);
  });

  it('serves the self feed city-scoped, allowlisted, care-plan aware, audited', async () => {
    seed();
    const res = await as(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.person).toEqual({ id: 'pat-1', kind: 'self' });
    expect(res.body.personalised).toBe(true);

    expect(calls.address).toEqual({ patientId: 'pat-1', isDefault: true });
    expect(calls.events).toEqual({
      type: { $in: ['camp', 'vaccination', 'blood_drive'] },
      'schedule.start': { $gte: expect.any(Date) },
      'venue.city': 'Pune',
    });
    expect(calls.facilities).toEqual({ ownership: 'government', city: 'Pune' });
    expect(calls.plans).toEqual({ userId: 'pat-1', familyMemberId: null, status: 'active' });
    expect(calls.doctors).toEqual({ available: true });
    expect(calls['doctors:sort']).toEqual({ rating: -1, reviews_count: -1 });
    expect(calls.programs).toEqual({ status: 'active' });
    expect(calls.content).toEqual({ status: 'published', reviewedAt: { $ne: null } });

    expect(res.body.nearYou).toMatchObject({ city: 'Pune', cityScoped: true });
    expect(res.body.nearYou.events[0]).not.toHaveProperty('description');
    expect(res.body.nearYou.events[0]).not.toHaveProperty('venue');
    expect(res.body.trending[0]).not.toHaveProperty('email');
    expect(res.body.content[0]).not.toHaveProperty('body');
    expect(res.body.packages[0]).toEqual({ id: 'hp1', name: 'Full body check', price: 999, discount: 20 });
    expect(res.body.programs[0]).toMatchObject({ id: 'pl1', name: 'Gym 3-month' });

    expect(res.body.carePlan.map((c) => c.key)).toEqual(['eye_check', 'foot_care', 'dietitian']);
    const currentMonth = Number(getISTDateString().slice(5, 7));
    expect(res.body.seasonal).toEqual(seasonalAlertsForMonth(currentMonth));
    expect(res.body.content[0]).toEqual(expect.objectContaining({ key: 'when-to-test-sugar', title: 'When to test sugar' }));

    expect(auditLog).toHaveBeenCalledWith(
      'recommendations_viewed',
      'pat-1',
      expect.objectContaining({ personId: 'pat-1', personKind: 'self', personalised: true, conditionsCount: 1 }),
    );
    // §9: no raw PHI in the compliance trail — condition names stay out.
    expect(JSON.stringify(auditLog.mock.calls)).not.toContain('Diabetes');
    expect(JSON.stringify(res.body)).not.toContain('dr@example.com');
    expect(JSON.stringify(res.body)).not.toContain('full article body');
  });

  it('drops the city scope when there is no default address', async () => {
    seed();
    data.address = null;
    const res = await as(PATIENT).get('/');
    expect(res.body.nearYou).toMatchObject({ city: null, cityScoped: false });
    expect(calls.events).toEqual({
      type: { $in: ['camp', 'vaccination', 'blood_drive'] },
      'schedule.start': { $gte: expect.any(Date) },
    });
    expect(calls.facilities).toEqual({ ownership: 'government' });
  });

  it('honours ?personalised=false without ever querying the care plan', async () => {
    seed();
    const res = await as(PATIENT).get('/?personalised=false');
    expect(res.status).toBe(200);
    expect(res.body.personalised).toBe(false);
    expect(res.body.carePlan).toBeNull(); // null, not [] — opt-out != "no plan"
    expect(calls.plans).toBeUndefined();
    expect(res.body.seasonal).toEqual(seasonalAlertsForMonth(Number(getISTDateString().slice(5, 7))));
    expect(auditLog).toHaveBeenCalledWith(
      'recommendations_viewed',
      'pat-1',
      expect.objectContaining({ personalised: false, conditionsCount: 0 }),
    );
  });

  it('scopes the care plan to a managed family profile', async () => {
    seed();
    data.familyRow = { _id: 'fm1', name: 'Asha', relation: 'Spouse', allergies: 'penicillin' };
    const res = await as(PATIENT).get('/?profileId=507f1f77bcf86cd799439030');
    expect(res.status).toBe(200);
    expect(res.body.person).toEqual({ id: '507f1f77bcf86cd799439030', kind: 'family', name: 'Asha', relation: 'Spouse' });
    expect(JSON.stringify(res.body)).not.toContain('penicillin');
    expect(calls.plans).toEqual({ userId: 'pat-1', familyMemberId: '507f1f77bcf86cd799439030', status: 'active' });
    expect(calls.familyLookup).toMatchObject({
      _id: '507f1f77bcf86cd799439030',
      isActive: true,
      $or: [{ patientId: 'pat-1' }, { dependentOf: 'pat-1' }],
    });
  });

  it('404s a foreign profile with zero reads and no audit row', async () => {
    seed();
    data.familyRow = null;
    const res = await as(PATIENT).get('/?profileId=507f1f77bcf86cd799439040');
    expect(res.status).toBe(404);
    expect(calls.events).toBeUndefined();
    expect(calls.address).toBeUndefined();
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe('pure vocabulary libs', () => {
  it('dedupes care-plan keys across conditions', () => {
    const merged = carePlanRecommendations(['Diabetes', 'Hypertension']);
    const keys = merged.map((c) => c.key);
    expect(keys).toContain('eye_check');
    expect(keys).toContain('bp_review');
    expect(keys.filter((k) => k === 'dietitian')).toHaveLength(1);
  });

  it('maps IST months to seasonal alerts and rejects bad months', () => {
    expect(seasonalAlertsForMonth(7)[0].key).toBe('dengue');
    expect(seasonalAlertsForMonth(12)[0].key).toBe('aqi');
    expect(seasonalAlertsForMonth(4)[0].key).toBe('heatwave');
    expect(seasonalAlertsForMonth(13)).toEqual([]);
    expect(seasonalAlertsForMonth('x')).toEqual([]);
  });
});
