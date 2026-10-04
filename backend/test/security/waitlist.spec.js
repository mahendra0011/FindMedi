/**
 * APPT-M-01 - waitlist routes, audit rows, wiring and inventory pins.
 *
 * Service logic (claim/offer/expire/accept contracts) is covered in
 * waitlistService.spec.js; this file owns everything visible from OUTSIDE the
 * service:
 *
 *   - ROUTES: /api/appointments/waitlist (POST join, GET /mine, POST /:id/
 *     accept, DELETE /:id leave-or-decline) - all protect-only + self-scoped,
 *     hence `// authz: self` on every definition (4 rows asserted below).
 *   - VALIDATION: slot coordinates are strict strings (YYYY-MM-DD / HH:MM) -
 *     the model stores them as plain strings exactly like Appointment, so the
 *     route is the validator.
 *   - ERROR MAPPING: service status/code pairs pass through; anything else is
 *     a 500 with a body that leaks no internals.
 *   - WIRING: onSlotFreed must fire from EVERY slot-free path - cancel, reschedule
 *     old-slot release, delete, both billing checkout sweeps, both transactions
 *     stale sweeps. A waitlist that only learns about SOME cancellations
 *     silently starves.
 *   - MOUNT ORDER: the router is mounted BEFORE /api/appointments, because
 *     appointments' `GET /:id` would otherwise swallow '/waitlist/...'
 *     (':id = waitlist') and turn every queue list into a 400 cast error.
 *   - HARNESS CONSTRAINT: the route must not import middleware/rateLimit.js
 *     (the mock registry has a fixed limiter export list).
 */
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mountApp } from '../helpers/appHarness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', '..', 'src');

const serviceMock = {
  joinWaitlist: jest.fn(),
  listMyEntries: jest.fn(),
  acceptOffer: jest.fn(),
  leaveEntry: jest.fn(),
  sendWaitlistError: jest.fn(),
};
const auditStub = { create: jest.fn(async (doc) => ({ _id: '64b0000000000000000000f1', ...doc })) };

let as;
beforeAll(async () => {
  ({ as } = await mountApp('waitlist', {
    // The route imports NAMED exports, so the factory must expose them
    // alongside `default` (ESM named-import resolution).
    '../../src/services/waitlistService.js': () => ({ ...serviceMock, default: serviceMock }),
    '../../src/models/AuditLog.js': () => ({ default: auditStub }),
  }));
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default: errors with a status pass through; the real sendWaitlistError is
  // mocked out, so the route's mapping behaviour is asserted directly below.
  serviceMock.sendWaitlistError.mockImplementation((res, err) => {
    if (err.status) return res.status(err.status).json({ message: err.message, code: err.code });
    return res.status(500).json({ message: 'Request failed' });
  });
});

const PATIENT = { _id: '64b0000000000000000000p1', role: 'patient', name: 'Ravi' };
const GOOD_ID = '64b0000000000000000000e1';

describe('POST / (join)', () => {
  it('is 401 without a session', async () => {
    const r = await as().post('/').send({ doctorId: GOOD_ID, date: '2026-10-05', time: '10:00' });
    expect(r.status).toBe(401);
    expect(serviceMock.joinWaitlist).not.toHaveBeenCalled();
  });

  it.each([
    ['missing doctorId', {}],
    ['doctorId not an ObjectId', { doctorId: 'nope', date: '2026-10-05', time: '10:00' }],
    ['date not YYYY-MM-DD', { doctorId: GOOD_ID, date: '05-10-2026', time: '10:00' }],
    ['time not HH:MM', { doctorId: GOOD_ID, date: '2026-10-05', time: '25:9' }],
  ])('rejects %s with 400', async (_label, body) => {
    const r = await as(PATIENT).post('/').send(body);
    expect(r.status).toBe(400);
    expect(serviceMock.joinWaitlist).not.toHaveBeenCalled();
  });

  it('joins and writes an audit row scoped to the caller', async () => {
    const entry = { _id: GOOD_ID, status: 'waiting' };
    serviceMock.joinWaitlist.mockResolvedValue(entry);

    const r = await as(PATIENT).post('/').send({ doctorId: GOOD_ID, date: '2026-10-05', time: '10:00' });
    expect(r.status).toBe(201);
    expect(r.body).toEqual(entry);
    expect(serviceMock.joinWaitlist).toHaveBeenCalledWith({
      patientId: PATIENT._id,
      patientName: 'Ravi',
      doctorId: GOOD_ID,
      date: '2026-10-05',
      time: '10:00',
    });
    expect(auditStub.create).toHaveBeenCalledTimes(1);
    const row = auditStub.create.mock.calls[0][0];
    expect(row.action).toBe('waitlist_join');
    expect(row.details.doctorId).toBe(GOOD_ID);
  });

  it('passes a service 409 straight through (slot free / already waiting)', async () => {
    const err = new Error('This slot is still open - book it directly instead of waiting.');
    err.status = 409;
    err.code = 'SLOT_AVAILABLE';
    serviceMock.joinWaitlist.mockRejectedValue(err);

    const r = await as(PATIENT).post('/').send({ doctorId: GOOD_ID, date: '2026-10-05', time: '10:00' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('SLOT_AVAILABLE');
    expect(auditStub.create).not.toHaveBeenCalled();
  });
});

describe('GET /mine', () => {
  it('is 401 without a session', async () => {
    const r = await as().get('/mine');
    expect(r.status).toBe(401);
  });

  it('lists the caller\'s entries only', async () => {
    const entries = [{ _id: GOOD_ID, status: 'waiting' }];
    serviceMock.listMyEntries.mockResolvedValue(entries);

    const r = await as(PATIENT).get('/mine');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(entries);
    expect(serviceMock.listMyEntries).toHaveBeenCalledWith(PATIENT._id);
    expect(auditStub.create).not.toHaveBeenCalled(); // reads are not audited
  });
});

describe('POST /:id/accept', () => {
  it('rejects a non-ObjectId id with 400 before touching the service', async () => {
    const r = await as(PATIENT).post('/not-an-id/accept');
    expect(r.status).toBe(400);
    expect(serviceMock.acceptOffer).not.toHaveBeenCalled();
  });

  it('accepts a paid offer and audits it', async () => {
    serviceMock.acceptOffer.mockResolvedValue({
      entry: { _id: GOOD_ID, status: 'accepted' },
      appointment: { _id: 'h1', status: 'Confirmed' },
      alreadyAccepted: false,
    });

    const r = await as(PATIENT).post(`/${GOOD_ID}/accept`);
    expect(r.status).toBe(200);
    expect(r.body.entry.status).toBe('accepted');
    expect(serviceMock.acceptOffer).toHaveBeenCalledWith(GOOD_ID, PATIENT);
    expect(auditStub.create.mock.calls[0][0].action).toBe('waitlist_accept');
  });

  it('maps PAYMENT_REQUIRED so the FE knows to run checkout first', async () => {
    const err = new Error('Complete the payment for this slot to confirm your waitlist offer.');
    err.status = 409;
    err.code = 'PAYMENT_REQUIRED';
    serviceMock.acceptOffer.mockRejectedValue(err);

    const r = await as(PATIENT).post(`/${GOOD_ID}/accept`);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('PAYMENT_REQUIRED');
    expect(auditStub.create).not.toHaveBeenCalled();
  });

  it('never leaks internals on an unclassified failure', async () => {
    serviceMock.acceptOffer.mockRejectedValue(new Error('connection string mongodb://user:pass@host'));
    const r = await as(PATIENT).post(`/${GOOD_ID}/accept`);
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ message: 'Request failed' });
  });
});

describe('DELETE /:id (leave or decline)', () => {
  it('rejects a non-ObjectId id with 400', async () => {
    const r = await as(PATIENT).delete('/nope');
    expect(r.status).toBe(400);
    expect(serviceMock.leaveEntry).not.toHaveBeenCalled();
  });

  it('leaves the queue and audits with the release outcome', async () => {
    serviceMock.leaveEntry.mockResolvedValue({
      entry: { _id: GOOD_ID, status: 'cancelled' },
      released: false,
    });

    const r = await as(PATIENT).delete(`/${GOOD_ID}`);
    expect(r.status).toBe(200);
    expect(serviceMock.leaveEntry).toHaveBeenCalledWith(GOOD_ID, PATIENT);
    const row = auditStub.create.mock.calls[0][0];
    expect(row.action).toBe('waitlist_leave');
    expect(row.details.released).toBe(false);
  });

  it('declining a live offer reports released: true in the audit row', async () => {
    serviceMock.leaveEntry.mockResolvedValue({
      entry: { _id: GOOD_ID, status: 'cancelled' },
      released: true,
    });

    const r = await as(PATIENT).delete(`/${GOOD_ID}`);
    expect(r.status).toBe(200);
    expect(auditStub.create.mock.calls[0][0].details.released).toBe(true);
  });
});

describe('wiring + inventory pins', () => {
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

  it('mounts the waitlist router BEFORE /api/appointments (the GET /:id swallow)', () => {
    const src = read('index.js');
    const waitlistMount = src.indexOf("app.use('/api/appointments/waitlist', waitlistRoutes)");
    const appointmentsMount = src.indexOf("app.use('/api/appointments', appointmentRoutes)");
    expect(waitlistMount).toBeGreaterThan(-1);
    expect(appointmentsMount).toBeGreaterThan(waitlistMount);
    expect(src).toContain("import waitlistRoutes from './routes/waitlist.js'");
  });

  it('fires onSlotFreed from EVERY slot-free path (appointments x3)', () => {
    const src = read(path.join('routes', 'appointments.js'));
    expect(src).toContain("from '../services/waitlistService.js'");
    // terminal cancel/complete transition, reschedule old-slot release, delete
    expect(src.match(/onSlotFreed\(\{/g) || []).toHaveLength(3);
  });

  it('fires onSlotFreed from both billing checkout sweeps', () => {
    const src = read(path.join('routes', 'billing.js'));
    expect(src).toContain("from '../services/waitlistService.js'");
    expect(src.match(/onSlotFreed\(\{/g) || []).toHaveLength(2);
  });

  it('keeps the periodic stale-Pending sweep as the only legacy-transaction cleanup path', () => {
    const src = read(path.join('routes', 'transactions.js'));
    expect(src).toContain("from '../services/waitlistService.js'");
    expect(src.match(/onSlotFreed\(\{/g) || []).toHaveLength(1);
    expect(src).toContain('legacy replay compatibility only');
  });

  it('the offer IS a checkout-shaped hold (15 min, checkoutExpiresAt) so existing sweeps are the backstop', () => {
    const src = read(path.join('services', 'waitlistService.js'));
    expect(src).toContain('export const OFFER_HOLD_MS = 15 * 60 * 1000');
    expect(src).toContain('checkoutExpiresAt: new Date(Date.now() + OFFER_HOLD_MS)');
    // fire-and-forget safety: no buffering a cancellation request for 10s
    expect(src).toContain('WaitlistEntry.db?.readyState === 0');
    // the expiry timer must not spawn under Jest
    expect(src).toContain("process.env.NODE_ENV === 'test'");
  });

  it('one active claim per patient per slot is enforced by the database', () => {
    const src = read(path.join('models', 'WaitlistEntry.js'));
    expect(src).toMatch(/unique:\s*true,\s*partialFilterExpression:\s*\{\s*status:\s*\{\s*\$in:\s*\[\s*'waiting',\s*'offered'\s*\]/);
    expect(src).toContain("'accepted'");
  });

  it('the route never imports rateLimit.js (harness mock-registry constraint)', () => {
    expect(read(path.join('routes', 'waitlist.js'))).not.toMatch(/from\s+['"][^'"]*rateLimit/);
  });

  it('all four routes are classified self-scoped (authz manifest)', async () => {
    const { buildInventory } = await import('../../scripts/lib/authzClassify.mjs');
    const rows = buildInventory(path.resolve(SRC, 'routes')).filter((r) => r.file === 'waitlist.js');
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.tag).toBe('self');
  });
});
