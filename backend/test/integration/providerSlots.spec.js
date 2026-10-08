/**
 * 10.md §4.1 `GET /providers/:id/slots?service=&mode=&date=` — the public
 * availability surface resolved through Service.practitionerId.
 *
 * What it pins:
 *  - anonymous reads (directory surface, no auth);
 *  - 404-not-403 probing discipline for bad ids, non-live providers and
 *    foreign services; 400s for bad/past/far-future dates and unknown modes;
 *  - service scoping (only this provider's active services), mode narrowing
 *    through `modes.mode`, doctors resolved through practitionerId with
 *    `available: {$ne:false}` (missing flag reads as open);
 *  - every block honored in order: weekly off-day, full-day leave (prefix
 *    match tolerates 'YYYY-MM-DD:reason'), per-date disabled slots, redis
 *    locks, booked appointments at capacity — and ONLY free times leave
 *    the server (no counts, no capacities, no leaves);
 *  - raw lean paths (weekly_schedule/time_slots/consultation_fees — aliases
 *    do not exist on lean results);
 *  - 60s server cache with X-Cache HIT/MISS and public max-age=60.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { getISTDateString } from '../../src/utils/dateUtils.js';

const calls = {};
const data = {};

const chainable = (rows) => {
  const chain = {
    select: (arg) => { calls.selectArg = arg; return chain; },
    sort: () => chain, skip: () => chain, limit: () => chain, lean: () => chain,
    then: (res, rej) => Promise.resolve(rows).then(res, rej),
  };
  return chain;
};

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: { findById: (id) => { calls.providerFindById = id; return query(data.provider ?? null); } },
}));
jestApi.unstable_mockModule('../../src/models/Service.js', () => ({
  default: {
    findOne: (filter) => { calls.serviceFindOne = filter; return query(data.serviceRow ?? null); },
    find: (filter) => { calls.serviceFind = filter; return chainable(data.services ?? []); },
  },
}));
jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: { find: (filter) => { calls.doctorFind = filter; return chainable(data.doctors ?? []); } },
}));
jestApi.unstable_mockModule('../../src/models/Appointment.js', () => ({
  default: { find: (filter) => { calls.appointmentFind = filter; return chainable(data.appointments ?? []); } },
}));
jestApi.unstable_mockModule('../../src/config/redis.js', () => ({
  getCache: jestApi.fn(async () => data.cached ?? null),
  setCache: jestApi.fn(async () => true),
  getLockedSlotsForDoctor: jestApi.fn(async () => data.locked ?? []),
  // audit.js (via providers.js -> middleware/audit.js) needs these at link.
  redisClient: { isOpen: false, incr: async () => {} },
  isRedisReady: () => false,
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: jestApi.fn(async () => {}),
}));

const { as } = await mountApp('providers', {});
const { getCache, setCache } = await import('../../src/config/redis.js');

const PROVIDER_ID = '707f1f77bcf86cd799439001';
const shifted = (n) => {
  const t = new Date(`${getISTDateString()}T00:00:00.000Z`).getTime() + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
};
const ALL_OPEN = {
  sunday: true, monday: true, tuesday: true, wednesday: true,
  thursday: true, friday: true, saturday: true,
};

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  for (const k of Object.keys(data)) delete data[k];
  getCache.mockClear();
  setCache.mockClear();
  data.provider = { _id: PROVIDER_ID, name: 'Smile Dental', slug: 'smile-dental', status: 'live' };
});

describe('GET /:id/slots — contracts', () => {
  it('serves anonymously and 404s probes without distinguishing reasons', async () => {
    const res = await as().get(`/${PROVIDER_ID}/slots`);
    expect(res.status).toBe(200);

    expect((await as().get('/not-an-id/slots')).status).toBe(404);
    data.provider = { _id: PROVIDER_ID, status: 'draft' };
    expect((await as().get(`/${PROVIDER_ID}/slots`)).body).toEqual({ message: 'Provider not found' });
    data.provider = null;
    expect((await as().get(`/${PROVIDER_ID}/slots`)).status).toBe(404);
  });

  it('rejects bad dates and unknown modes with 400s', async () => {
    const base = `/${PROVIDER_ID}/slots`;
    expect((await as().get(`${base}?date=05-01-2099`)).status).toBe(400);
    expect((await as().get(`${base}?date=${shifted(-1)}`)).status).toBe(400);
    expect((await as().get(`${base}?date=${shifted(91)}`)).status).toBe(400);
    expect((await as().get(`${base}?mode=telepathy`)).status).toBe(400);
    expect((await as().get(`${base}?service=nope`)).status).toBe(404);
  });

  it('404s a service that is not this provider\u2019s active service', async () => {
    data.serviceRow = null;
    const res = await as().get(`/${PROVIDER_ID}/slots?service=507f1f77bcf86cd7994390a1`);
    expect(res.status).toBe(404);
    expect(calls.serviceFindOne).toMatchObject({ _id: '507f1f77bcf86cd7994390a1', isActive: true });
    expect(String(calls.serviceFindOne.providerId)).toBe(PROVIDER_ID);
    expect(calls.serviceFind).toBeUndefined();
  });
});

describe('GET /:id/slots — availability', () => {
  const seed = (date) => {
    data.services = [
      { _id: 'svc1', name: 'Cleaning', modes: [{ mode: 'in_person' }, { mode: 'video' }], practitionerId: 'doc1' },
      { _id: 'svc2', name: 'Lab test', modes: [{ mode: 'in_person' }], practitionerId: null },
    ];
    data.doctors = [{
      _id: 'doc1', name: 'Dr Bright', specialization: 'Dentistry', consultation_fees: 500,
      time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM'],
      weekly_schedule: ALL_OPEN, leaves: [], dateDisabledSlots: { [date]: ['10:00 AM'] }, maxBookingsPerSlot: 2,
    }];
    data.appointments = [{ time: '09:00 AM' }, { time: '09:00 AM' }, { time: '02:00 PM' }];
    data.locked = ['11:00 AM'];
  };

  it('merges every block and exposes only free times', async () => {
    const date = shifted(5);
    seed(date);
    const res = await as().get(`/${PROVIDER_ID}/slots?date=${date}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.headers['x-cache']).toBe('MISS');

    expect(calls.serviceFind).toMatchObject({ isActive: true });
    expect(String(calls.serviceFind.providerId)).toBe(PROVIDER_ID);
    expect(calls.doctorFind).toEqual({ _id: { $in: ['doc1'] }, available: { $ne: false } });
    expect(calls.appointmentFind).toMatchObject({ date, status: { $nin: ['Cancelled', 'Completed', 'Missed'] } });

    // 09:00 booked 2/2 (full) · 10:00 disabled · 11:00 locked · 02:00 booked
    // 1/2 (free): only the last one leaves the server.
    expect(res.body.doctors).toEqual([{
      doctorId: 'doc1', name: 'Dr Bright', specialization: 'Dentistry',
      consultationFees: 500, freeSlots: ['02:00 PM'],
    }]);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('leaves');
    expect(raw).not.toContain('maxBookingsPerSlot');
    expect(res.body.services).toEqual([
      { id: 'svc1', name: 'Cleaning', modes: ['in_person', 'video'], doctorId: 'doc1' },
      { id: 'svc2', name: 'Lab test', modes: ['in_person'], doctorId: null },
    ]);
    expect(setCache).toHaveBeenCalledWith(
      `provider_slots:${PROVIDER_ID}:${date}:-:-`, expect.objectContaining({ date }), 60,
    );
  });

  it('serves a HIT without touching the models', async () => {
    const date = shifted(5);
    const payload = { provider: { id: PROVIDER_ID }, date, doctors: [], services: [] };
    data.cached = payload;
    const res = await as().get(`/${PROVIDER_ID}/slots?date=${date}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('HIT');
    expect(res.body).toEqual(payload);
    expect(calls.serviceFind).toBeUndefined();
  });

  it('skips weekly off-days and full-day leaves', async () => {
    const date = shifted(5);
    seed(date);
    data.doctors[0].weekly_schedule = {
      sunday: false, monday: false, tuesday: false, wednesday: false,
      thursday: false, friday: false, saturday: false,
    };
    expect((await as().get(`/${PROVIDER_ID}/slots?date=${date}`)).body.doctors).toEqual([]);

    data.doctors[0].weekly_schedule = ALL_OPEN;
    data.doctors[0].leaves = [`${date}:vacation`];
    expect((await as().get(`/${PROVIDER_ID}/slots?date=${date}`)).body.doctors).toEqual([]);
  });

  it('404s before querying services when the service lookup misses', async () => {
    const date = shifted(5);
    seed(date);
    data.serviceRow = null;
    const res = await as().get(`/${PROVIDER_ID}/slots?date=${date}&service=507f1f77bcf86cd7994390a1&mode=video`);
    expect(res.status).toBe(404);
    expect(calls.serviceFindOne).toBeDefined();
    expect(calls.serviceFind).toBeUndefined();
  });

  it('applies the service and mode filters to the services query', async () => {
    const date = shifted(5);
    seed(date);
    data.serviceRow = { _id: '507f1f77bcf86cd7994390a1' };
    await as().get(`/${PROVIDER_ID}/slots?date=${date}&service=507f1f77bcf86cd7994390a1&mode=video`);
    expect(calls.serviceFind).toMatchObject({
      _id: '507f1f77bcf86cd7994390a1', 'modes.mode': 'video', isActive: true,
    });
  });
});
