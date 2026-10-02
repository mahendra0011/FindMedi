/**
 * HTTP-level authorization tests (TEST-M-01).
 *
 * These are the first backend tests that make a real request through a real
 * Express router. Every other suite can stay green while a ROUTE forgets to call
 * its guard — `idor.spec.js` proves the guard denies, and a text assertion
 * proves the guard text exists, but neither proves the route is wired to it.
 * This does.
 *
 * `supertest` has been in devDependencies the whole time with no test using it.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const booking = {
  _id: 'b1',
  bookingNumber: 'AB-1',
  patientId: 'patA',
  assistantId: 'asstA',
  hospitalId: 'h1',
  status: 'requested',
};

const profileFindOne = jest.fn();
const bookingFindById = jest.fn();

jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({
  default: { findOne: profileFindOne },
}));
jest.unstable_mockModule('../../src/models/AssistantBooking.js', () => ({
  default: { findById: bookingFindById },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: () => query(null), find: () => query([]) },
}));

const { as } = await mountApp('assistantBookings', {});

beforeEach(() => {
  profileFindOne.mockReset().mockReturnValue(query(null));
  bookingFindById.mockReset().mockReturnValue(query(booking));
});

describe('HTTP - GET /:id is reachable only by a party to the booking', () => {
  it('200 for the owning patient', async () => {
    const r = await as({ _id: 'patA', role: 'patient' }).get('/b1');
    expect(r.status).toBe(200);
  });

  it('404 for a DIFFERENT patient — not 403', async () => {
    // 404 specifically: a 403 confirms the id exists, which turns this endpoint
    // into an oracle for harvesting live booking ids.
    const r = await as({ _id: 'patB', role: 'patient' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('404 for an unrelated rider', async () => {
    const r = await as({ _id: 'riderX', role: 'delivery_boy' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('200 for the assigned assistant', async () => {
    const r = await as({ _id: 'asstA', role: 'assistant' }).get('/b1');
    expect(r.status).toBe(200);
  });

  it('404 for a different assistant', async () => {
    const r = await as({ _id: 'asstB', role: 'assistant' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('200 for staff inside the booking hospital', async () => {
    const r = await as({ _id: 'adm1', role: 'hospital_admin', hospitalId: 'h1' }).get('/b1');
    expect(r.status).toBe(200);
  });

  it('404 for staff in another hospital', async () => {
    const r = await as({ _id: 'adm2', role: 'hospital_admin', hospitalId: 'h2' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('401 with no session at all', async () => {
    const r = await as().get('/b1');
    expect(r.status).toBe(401);
  });

  it('does not leak the patient record to a denied caller', async () => {
    // The status code alone is not the assertion that matters — a route could
    // 404 and still have serialized the row first.
    const r = await as({ _id: 'patB', role: 'patient' }).get('/b1');
    expect(JSON.stringify(r.body)).not.toMatch(/patA|asstA/);
  });

  it('the denial happens BEFORE the record is serialized', async () => {
    // Same check from the other side: the guard must run before the handler
    // builds a response body, not after.
    const denied = await as({ _id: 'patB', role: 'patient' }).get('/b1');
    const allowed = await as({ _id: 'patA', role: 'patient' }).get('/b1');
    expect(Object.keys(denied.body).length).toBeLessThan(Object.keys(allowed.body).length);
  });

  it('the receipt route is guarded on the same path as the detail route', async () => {
    // GET /:id/receipt had NO ownership check at all and generates a PDF
    // carrying the patient's name, phone, email and the fee breakdown — a
    // financial document that is also harder to revoke than a row read.
    const denied = await as({ _id: 'patB', role: 'patient' }).get('/b1/receipt');
    expect(denied.status).toBe(404);
    // And it must not have produced a PDF for a caller who does not own it.
    expect(denied.headers['content-type']).not.toMatch(/pdf/);
  });

  it('the broadcast-fallback route is guarded too', async () => {
    // This one REWRITES the booking and fans it out to every available
    // assistant, so an unguarded caller could strip an assistant off a job.
    const r = await as({ _id: 'patB', role: 'patient' }).post('/b1/broadcast-fallback');
    expect(r.status).toBe(404);
  });

  it('404 for an unknown booking id, so ids are not enumerable', async () => {
    bookingFindById.mockReturnValue(query(null));
    const r = await as({ _id: 'patA', role: 'patient' }).get('/does-not-exist');
    expect(r.status).toBe(404);
  });
});

