/**
 * 6.md §2.6/§2.10 `GET /patient/timeline` — unified upcoming + records history
 * behind one session-scoped, object-authz'd route.
 *
 * What it pins:
 *  - 401 anonymously;
 *  - upcoming self view: all five sources queried session-scoped with
 *    `familyMemberId: null`, merged and sorted by instant, series occurrences
 *    and vaccination doses filtered in-route (past occurrence / already-given
 *    dose must not appear), DTO allowlist per kind, no-store, audit with
 *    segment+count;
 *  - ?type= narrows which sources are even queried (others never hit);
 *  - personId runs the SAME self-or-family helper as the summary: a managed
 *    member scopes every source's familyMemberId, a foreign one is 404 with
 *    zero reads and no audit row;
 *  - bad segment / type / date format / inverted date range are 400s (an
 *    unknown filter must not silently mean "everything" or "nothing");
 *  - history: Record filtered by normalized type + date range, paginated with
 *    countDocuments as total, rows mapped through a 5-field allowlist
 *    (no prescription body, no raw patient string), audit segment=history;
 *  - display-style record types ('Lab Report') normalize to 'lab_report'.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const calls = {};
const data = {};
const auditLog = jestApi.fn();

const finder = (name) => (filter) => {
  calls[name] = filter;
  const chain = {
    sort: (arg) => { calls[`${name}:sort`] = arg; return chain; },
    skip: (arg) => { calls[`${name}:skip`] = arg; return chain; },
    limit: (arg) => { calls[`${name}:limit`] = arg; return chain; },
    lean: () => chain,
    then: (res, rej) => Promise.resolve(data[name] ?? []).then(res, rej),
  };
  return chain;
};

const model = (name, extra = {}) => ({ find: finder(name), ...extra });

jestApi.unstable_mockModule('../../src/models/Appointment.js', () => ({ default: model('appointments') }));
jestApi.unstable_mockModule('../../src/models/LabBooking.js', () => ({ default: model('labs') }));
jestApi.unstable_mockModule('../../src/models/AppointmentSeries.js', () => ({ default: model('series') }));
jestApi.unstable_mockModule('../../src/models/Event.js', () => ({ default: model('events') }));
jestApi.unstable_mockModule('../../src/models/EventRegistration.js', () => ({ default: model('registrations') }));
jestApi.unstable_mockModule('../../src/models/VaccinationSchedule.js', () => ({ default: model('vaccinations') }));
jestApi.unstable_mockModule('../../src/models/Record.js', () => ({
  default: model('records', { countDocuments: (filter) => { calls.recordsCount = filter; return query(data.recordsCount ?? 0); } }),
}));
jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: { findOne: (filter) => { calls.familyLookup = filter; return query(data.familyRow ?? null); } },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('patientTimeline', {});

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  auditLog.mockReset();
});

const seedUpcoming = () => {
  data.appointments = [{ _id: 'a1', date: '2099-01-10', time: '10:30', status: 'Confirmed', doctor: 'Dr Rao', department: 'Cardiology', symptoms: 'chest pain' }];
  data.labs = [{ _id: 'b1', bookingDate: new Date('2099-01-11T09:00:00.000Z'), timeSlot: '09:00-09:30', status: 'Confirmed', tests: ['CBC', 'TSH'], visitType: 'Home Collection', patientPhone: '+911234567890' }];
  data.series = [{ _id: 's1', occurrenceDates: ['2000-01-01', '2099-01-12'], time: '08:00', status: 'active', doctor: 'Dr Sen', type: 'Dialysis' }];
  data.registrations = [{ _id: 'r1', eventId: 'e1', status: 'REGISTERED' }];
  data.events = [{ _id: 'e1', schedule: { start: new Date('2099-01-13T06:00:00.000Z') }, title: 'Health camp', venue: { mode: 'venue' }, capacity: 50 }];
  data.vaccinations = [{
    _id: 'v1', status: 'scheduled', vaccineName: 'Typhoid',
    doses: [
      { number: 1, dueAt: new Date('2099-01-14T00:00:00.000Z'), givenAt: null, centre: 'PHC Centre' },
      { number: 2, dueAt: new Date('2099-02-14T00:00:00.000Z'), givenAt: new Date('2099-02-14T00:00:00.000Z') },
      { number: 3, dueAt: new Date('2000-01-20T00:00:00.000Z'), givenAt: null },
    ],
  }];
};

describe('GET / — upcoming', () => {
  it('401s anonymously', async () => {
    expect((await as().get('/')).status).toBe(401);
  });

  it('merges five sources session-scoped, filters dates in-route, allowlists DTOs, audits', async () => {
    seedUpcoming();
    const res = await as(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.segment).toBe('upcoming');
    expect(res.body.person).toEqual({ id: 'pat-1', kind: 'self' });

    expect(calls.appointments).toEqual({
      patientId: 'pat-1', familyMemberId: null,
      date: { $gte: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      status: { $in: ['Pending', 'Confirmed'] },
    });
    expect(calls.labs).toMatchObject({ patientId: 'pat-1', familyMemberId: null, bookingDate: { $gte: expect.any(Date) } });
    expect(calls.series).toEqual({ patientId: 'pat-1', familyMemberId: null, status: 'active', occurrenceDates: { $gte: expect.any(String) } });
    expect(calls.registrations).toEqual({ userId: 'pat-1', familyMemberId: null, status: 'REGISTERED' });
    expect(calls.vaccinations).toMatchObject({ userId: 'pat-1', familyMemberId: null, status: 'scheduled' });
    expect(calls.familyLookup).toBeUndefined(); // self needs no lookup

    const kinds = res.body.items.map((i) => i.kind);
    expect(kinds).toEqual(['appointment', 'lab_test', 'series', 'event', 'vaccination']);
    expect(res.body.total).toBe(5);
    // series: the 2000 occurrence is dropped in-route; vaccination: the given
    // and past doses are dropped — one item each.
    expect(res.body.items.find((i) => i.kind === 'series').at).toBe('2099-01-12');
    expect(res.body.items.find((i) => i.kind === 'vaccination')).toMatchObject({ id: 'v1#1', dose: 1 });
    // Allowlists: clinical/PII fields in the raw rows must not ride along.
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('chest pain');
    expect(raw).not.toContain('+911234567890');
    expect(res.body.items.find((i) => i.kind === 'appointment')).not.toHaveProperty('symptoms');
    expect(res.body.items.find((i) => i.kind === 'lab_test')).not.toHaveProperty('patientPhone');

    expect(auditLog).toHaveBeenCalledWith(
      'patient_timeline_viewed',
      'pat-1',
      expect.objectContaining({ segment: 'upcoming', type: null, personId: 'pat-1', count: 5 }),
    );
  });

  it('queries only the sources named by ?type=', async () => {
    seedUpcoming();
    const res = await as(PATIENT).get('/?type=lab_test');
    expect(res.status).toBe(200);
    expect(calls.labs).toBeDefined();
    expect(calls.appointments).toBeUndefined();
    expect(calls.series).toBeUndefined();
    expect(calls.registrations).toBeUndefined();
    expect(calls.vaccinations).toBeUndefined();
    expect(res.body.items.every((i) => i.kind === 'lab_test')).toBe(true);
    expect(auditLog).toHaveBeenCalledWith(
      'patient_timeline_viewed', 'pat-1', expect.objectContaining({ type: 'lab_test' }),
    );
  });

  it('scopes every source to a managed family member', async () => {
    seedUpcoming();
    data.familyRow = { _id: 'fm1', name: 'Asha', relation: 'Spouse', allergies: 'penicillin' };
    const res = await as(PATIENT).get('/?personId=507f1f77bcf86cd799439010');
    expect(res.status).toBe(200);
    expect(res.body.person).toEqual({ id: '507f1f77bcf86cd799439010', kind: 'family', name: 'Asha', relation: 'Spouse' });
    expect(JSON.stringify(res.body)).not.toContain('penicillin');
    expect(calls.appointments.familyMemberId).toBe('507f1f77bcf86cd799439010');
    expect(calls.vaccinations.familyMemberId).toBe('507f1f77bcf86cd799439010');
    expect(calls.familyLookup).toMatchObject({
      _id: '507f1f77bcf86cd799439010',
      isActive: true,
      $or: [{ patientId: 'pat-1' }, { dependentOf: 'pat-1' }],
    });
  });

  it('404s a foreign person with zero reads and no audit row', async () => {
    seedUpcoming();
    data.familyRow = null;
    const res = await as(PATIENT).get('/?personId=507f1f77bcf86cd799439020');
    expect(res.status).toBe(404);
    expect(calls.appointments).toBeUndefined();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('rejects bad query contracts with 400s', async () => {
    expect((await as(PATIENT).get('/?segment=tomorrow')).status).toBe(400);
    expect((await as(PATIENT).get('/?type=boogers')).status).toBe(400);
    expect((await as(PATIENT).get('/?segment=history&dateFrom=07-10-2026')).status).toBe(400);
    expect((await as(PATIENT).get('/?segment=history&dateFrom=2026-12-31&dateTo=2026-01-01')).status).toBe(400);
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe('GET / — history', () => {
  it('filters records by person/type/date, paginates and allowlists the rows', async () => {
    data.recordsCount = 42;
    data.records = [{
      _id: 'rec1', date: '2026-01-05', type: 'diagnosis', doctor: 'Dr Rao',
      diagnosis: 'Viral fever', prescription: 'REST AND FLUIDS', patient: 'Someone Name',
      vitals: { bp: '120/80' },
    }];
    const res = await as(PATIENT).get('/?segment=history&type=diagnosis&dateFrom=2026-01-01&dateTo=2026-12-31&page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ segment: 'history', total: 42, page: 2, limit: 10 });

    expect(calls.records).toEqual({
      patientId: 'pat-1', familyMemberId: null, type: 'diagnosis',
      date: { $gte: '2026-01-01', $lte: '2026-12-31' },
    });
    expect(calls['records:sort']).toEqual({ date: -1, _id: -1 });
    expect(calls['records:skip']).toBe(10);
    expect(calls['records:limit']).toBe(10);

    expect(res.body.items[0]).toEqual({
      kind: 'record', id: 'rec1', at: '2026-01-05', type: 'diagnosis',
      title: 'Viral fever', doctor: 'Dr Rao',
    });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('REST AND FLUIDS');
    expect(raw).not.toContain('Someone Name');
    expect(raw).not.toContain('120/80');
    expect(auditLog).toHaveBeenCalledWith(
      'patient_timeline_viewed', 'pat-1', expect.objectContaining({ segment: 'history', count: 1 }),
    );
  });

  it("normalizes display-style types ('Lab Report' -> lab_report)", async () => {
    const res = await as(PATIENT).get('/?segment=history&type=Lab%20Report');
    expect(res.status).toBe(200);
    expect(calls.records.type).toBe('lab_report');
  });

  it('rejects a record type outside the vocabulary', async () => {
    expect((await as(PATIENT).get('/?segment=history&type=boogers')).status).toBe(400);
    expect(calls.recordsCount).toBeUndefined();
  });
});
