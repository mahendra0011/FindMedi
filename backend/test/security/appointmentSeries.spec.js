/**
 * APPT-M-02 - recurring-series routes, audit rows and wiring pins.
 *
 * Service logic (occurrence math, capacity claims, rollback, bulk-cancel side
 * effects) is covered in appointmentSeriesService.spec.js; this file owns
 * everything visible from OUTSIDE the service:
 *
 *   - ROUTES: /api/appointments/series (POST create, GET /mine, DELETE /:id
 *     cancel-all) - all protect-only + self-scoped, hence `// authz: self` on
 *     every definition (3 rows asserted below). Occurrence-level cancel and
 *     reschedule need NO new surface: each occurrence is a normal Appointment
 *     and the existing PUT/DELETE /api/appointments/:id already manage them.
 *   - VALIDATION: slot coordinates and pattern fields are strict at the route
 *     (the route is the validator, same as waitlist).
 *   - ERROR MAPPING: service status/code pairs pass through; anything else is
 *     a 500 with a body that leaks no internals.
 *   - MOUNT ORDER: the router is mounted BEFORE /api/appointments, because
 *     appointments' `GET /:id` would otherwise swallow '/series/...'.
 *   - HARNESS CONSTRAINT: the route must not import middleware/rateLimit.js
 *     (the mock registry has a fixed limiter export list).
 *   - NOTIFICATIONS: doctor + patient each get one row per series event; the
 *     doctor->user resolution shares routes/appointments.js's pattern.
 */
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mountApp } from '../helpers/appHarness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', '..', 'src');

const serviceMock = {
  createSeries: jest.fn(),
  listSeries: jest.fn(),
  cancelSeries: jest.fn(),
  sendSeriesError: jest.fn(),
  SERIES_COUNT_MIN: 2,
  SERIES_COUNT_MAX: 12,
};
const auditStub = { create: jest.fn(async (doc) => ({ _id: '64b0000000000000000000f1', ...doc })) };
const doctorStub = { findById: jest.fn(), find: jest.fn(), findOne: jest.fn(), findByIdAndUpdate: jest.fn() };
const notificationStub = { create: jest.fn(async (doc) => ({ _id: '64b0000000000000000000n1', ...doc })) };
const userStub = { findOne: jest.fn(), findById: jest.fn() };

let as;
beforeAll(async () => {
  ({ as } = await mountApp('appointmentSeries', {
    // The route imports NAMED exports, so the factory must expose them
    // alongside `default` (ESM named-import resolution).
    '../../src/services/appointmentSeriesService.js': () => ({ ...serviceMock, default: serviceMock }),
    '../../src/models/AuditLog.js': () => ({ default: auditStub }),
    '../../src/models/Doctor.js': () => ({ default: doctorStub }),
    '../../src/models/Notification.js': () => ({ default: notificationStub }),
    '../../src/models/User.js': () => ({ default: userStub }),
  }));
});

beforeEach(() => {
  jest.resetAllMocks();
  // Default: errors with a status pass through; the real sendSeriesError is
  // mocked out, so the route's mapping behaviour is asserted directly below.
  serviceMock.sendSeriesError.mockImplementation((res, err) => {
    if (err.status) return res.status(err.status).json({ message: err.message, code: err.code });
    return res.status(500).json({ message: 'Request failed' });
  });
  // createNotification resolves the doctor->user mapping first; a null doctor
  // keeps the raw id and skips the User lookup, exactly like production for a
  // notification whose target is already a user id.
  doctorStub.findById.mockResolvedValue(null);
  notificationStub.create.mockResolvedValue({ _id: 'n1' });
  // resetAllMocks clears this implementation; without it auditLog reads
  // `entry._id` off undefined and the error is (harmlessly) logged as noise.
  auditStub.create.mockImplementation(async (doc) => ({ _id: '64b0000000000000000000f1', ...doc }));
});

const PATIENT = { _id: '64b0000000000000000000p1', role: 'patient', name: 'Ravi' };
const GOOD_ID = '64b0000000000000000000e1';
const SERIES = {
  _id: GOOD_ID,
  doctorId: '64b0000000000000000000d1',
  doctor: 'Dr Asha',
  patientName: 'Ravi',
  frequency: 'weekly',
  count: 3,
  startDate: '2026-10-05',
  time: '10:00',
  status: 'active',
};
const GOOD_BODY = {
  doctorId: SERIES.doctorId,
  date: '2026-10-05',
  time: '10:00',
  frequency: 'weekly',
  count: 3,
  feesPerOccurrence: 500,
};

describe('POST / (create series)', () => {
  it('is 401 without a session', async () => {
    const r = await as().post('/').send(GOOD_BODY);
    expect(r.status).toBe(401);
    expect(serviceMock.createSeries).not.toHaveBeenCalled();
  });

  it.each([
    ['missing doctorId', { ...GOOD_BODY, doctorId: undefined }],
    ['doctorId not an ObjectId', { ...GOOD_BODY, doctorId: 'nope' }],
    ['date not YYYY-MM-DD', { ...GOOD_BODY, date: '05-10-2026' }],
    ['time not HH:MM', { ...GOOD_BODY, time: '25:9' }],
    ['frequency not an enum value', { ...GOOD_BODY, frequency: 'yearly' }],
    ['count below the floor', { ...GOOD_BODY, count: 1 }],
    ['count above the ceiling', { ...GOOD_BODY, count: 13 }],
    ['count not an integer', { ...GOOD_BODY, count: 2.5 }],
    ['negative fee', { ...GOOD_BODY, feesPerOccurrence: -1 }],
  ])('rejects %s with 400', async (_label, body) => {
    const r = await as(PATIENT).post('/').send(body);
    expect(r.status).toBe(400);
    expect(serviceMock.createSeries).not.toHaveBeenCalled();
    expect(auditStub.create).not.toHaveBeenCalled();
  });

  it('creates the series, audits, and notifies both sides exactly once', async () => {
    const appointments = [{ _id: 'a0' }, { _id: 'a1' }, { _id: 'a2' }];
    serviceMock.createSeries.mockResolvedValue({ series: SERIES, appointments });

    const r = await as(PATIENT).post('/').send(GOOD_BODY);

    expect(r.status).toBe(201);
    expect(r.body.series).toEqual(SERIES);
    expect(r.body.appointments).toHaveLength(3);
    expect(serviceMock.createSeries).toHaveBeenCalledWith(expect.objectContaining({
      patientId: PATIENT._id,
      patientName: 'Ravi',
      doctorId: SERIES.doctorId,
      date: '2026-10-05',
      time: '10:00',
      frequency: 'weekly',
      count: 3,
      feesPerOccurrence: 500,
    }));

    expect(auditStub.create).toHaveBeenCalledTimes(1);
    const row = auditStub.create.mock.calls[0][0];
    expect(row.action).toBe('create_appointment_series');
    expect(row.details.count).toBe(3);

    // one doctor row + one patient row, no per-occurrence spam
    expect(notificationStub.create).toHaveBeenCalledTimes(2);
    const targets = notificationStub.create.mock.calls.map((c) => c[0].userId);
    expect(targets).toContain(PATIENT._id);
    expect(targets).toContain(SERIES.doctorId);
  });

  it('passes a service 409 straight through (slot full / already booked)', async () => {
    const err = new Error('The slot on 2026-10-12 at 10:00 is full. The series was not booked.');
    err.status = 409;
    err.code = 'SLOT_FULL';
    serviceMock.createSeries.mockRejectedValue(err);

    const r = await as(PATIENT).post('/').send(GOOD_BODY);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('SLOT_FULL');
    expect(auditStub.create).not.toHaveBeenCalled();
    expect(notificationStub.create).not.toHaveBeenCalled();
  });

  it('maps an unknown service failure to a body that leaks no internals', async () => {
    serviceMock.createSeries.mockRejectedValue(new Error('MongoServerError: collection kys.find failed'));

    const r = await as(PATIENT).post('/').send(GOOD_BODY);
    expect(r.status).toBe(500);
    expect(r.body.message).toBe('Request failed');
    expect(JSON.stringify(r.body)).not.toContain('MongoServerError');
  });
});

describe('GET /mine', () => {
  it('is 401 without a session', async () => {
    const r = await as().get('/mine');
    expect(r.status).toBe(401);
    expect(serviceMock.listSeries).not.toHaveBeenCalled();
  });

  it('lists only the caller series', async () => {
    serviceMock.listSeries.mockResolvedValue([{ ...SERIES, occurrences: [] }]);

    const r = await as(PATIENT).get('/mine');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(serviceMock.listSeries).toHaveBeenCalledWith(PATIENT._id);
  });
});

describe('DELETE /:id (cancel whole series)', () => {
  it('is 401 without a session', async () => {
    const r = await as().delete(`/${GOOD_ID}`);
    expect(r.status).toBe(401);
    expect(serviceMock.cancelSeries).not.toHaveBeenCalled();
  });

  it('rejects a non-ObjectId id with 400', async () => {
    const r = await as(PATIENT).delete('/nope');
    expect(r.status).toBe(400);
    expect(serviceMock.cancelSeries).not.toHaveBeenCalled();
  });

  it('404s when the series belongs to someone else (service-scoped lookup)', async () => {
    const err = new Error('Series not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    serviceMock.cancelSeries.mockRejectedValue(err);

    const r = await as(PATIENT).delete(`/${GOOD_ID}`);
    expect(r.status).toBe(404);
    expect(serviceMock.cancelSeries).toHaveBeenCalledWith({ seriesId: GOOD_ID, patientId: PATIENT._id });
    expect(auditStub.create).not.toHaveBeenCalled();
  });

  it('cancels, audits the count, and notifies the doctor once', async () => {
    serviceMock.cancelSeries.mockResolvedValue({ series: SERIES, cancelledCount: 2 });

    const r = await as(PATIENT).delete(`/${GOOD_ID}`);
    expect(r.status).toBe(200);
    expect(r.body.cancelledCount).toBe(2);

    const row = auditStub.create.mock.calls[0][0];
    expect(row.action).toBe('cancel_appointment_series');
    expect(row.details.cancelledCount).toBe(2);

    // doctor notification only - the patient asked for this cancel
    expect(notificationStub.create).toHaveBeenCalledTimes(1);
    expect(notificationStub.create.mock.calls[0][0].userId).toBe(SERIES.doctorId);
  });

  it('skips the doctor notification when nothing was actually cancelled', async () => {
    serviceMock.cancelSeries.mockResolvedValue({ series: { ...SERIES, status: 'cancelled' }, cancelledCount: 0 });

    const r = await as(PATIENT).delete(`/${GOOD_ID}`);
    expect(r.status).toBe(200);
    expect(notificationStub.create).not.toHaveBeenCalled();
    // still audited: who asked to cancel matters even when the work was a no-op
    expect(auditStub.create.mock.calls[0][0].details.cancelledCount).toBe(0);
  });
});

describe('wiring + inventory pins', () => {
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

  it('mounts the series router BEFORE /api/appointments (the GET /:id swallow)', () => {
    const src = read('index.js');
    const seriesMount = src.indexOf("app.use('/api/appointments/series', appointmentSeriesRoutes)");
    const appointmentsMount = src.indexOf("app.use('/api/appointments', appointmentRoutes)");
    expect(seriesMount).toBeGreaterThan(-1);
    expect(appointmentsMount).toBeGreaterThan(seriesMount);
    expect(src).toContain("import appointmentSeriesRoutes from './routes/appointmentSeries.js'");
  });

  it('children carry seriesId + seriesIndex on the Appointment schema (otherwise mongoose strips them)', () => {
    const src = read(path.join('models', 'Appointment.js'));
    expect(src).toContain('seriesId: { type: mongoose.Schema.Types.ObjectId');
    expect(src).toContain('seriesIndex: { type: Number }');
    expect(src).toMatch(/seriesId:.*index: true/s);
  });

  it('offers children the same 15-minute checkout hold as a single booking', () => {
    const src = read(path.join('services', 'appointmentSeriesService.js'));
    expect(src).toContain('export const SERIES_CHECKOUT_HOLD_MS = 15 * 60 * 1000');
    expect(src).toContain('checkoutExpiresAt: new Date(Date.now() + SERIES_CHECKOUT_HOLD_MS)');
    // capacity is the atomic reservation, not check-then-write
    expect(src).toContain('reserveSlotSeat');
    expect(src).toContain('releaseAll(reservedKeys)');
  });

  it('bulk cancel applies the per-row transition side effects the route would have', () => {
    const src = read(path.join('services', 'appointmentSeriesService.js'));
    expect(src).toContain('releaseSlotSeat({ doctorId: appt.doctorId, date: appt.date, time: appt.time })');
    expect(src).toContain('void onSlotFreed({ doctorId: appt.doctorId, date: appt.date, time: appt.time })');
  });

  it('occurrence math clamps monthly dates (the Jan 31 -> Feb 28 defect)', () => {
    const src = read(path.join('services', 'appointmentSeriesService.js'));
    expect(src).toContain('const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()');
    expect(src).toContain('Math.min(d, lastDay)');
  });

  it('the route never imports rateLimit.js (harness mock-registry constraint)', () => {
    expect(read(path.join('routes', 'appointmentSeries.js'))).not.toMatch(/from\s+['"][^'"]*rateLimit/);
  });

  it('all three routes are classified self-scoped (authz manifest)', async () => {
    const { buildInventory } = await import('../../scripts/lib/authzClassify.mjs');
    const rows = buildInventory(path.resolve(SRC, 'routes')).filter((r) => r.file === 'appointmentSeries.js');
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.tag).toBe('self');
  });
});
