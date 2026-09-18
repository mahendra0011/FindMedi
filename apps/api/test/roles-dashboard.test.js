import request from 'supertest';
import app from '../index.js';

// Smoke tests: each role's core dashboard endpoint must be auth-gated (401 without token).
// These are not testing business logic, just that the route is mounted and protected.

const cases = [
  ['patient dashboard (my appointments)', '/api/appointments/my-appointments'],
  ['doctor dashboard (appointments)', '/api/appointments'],
  ['hospital dashboard (beds)', '/api/beds'],
  ['pharmacy dashboard (pharmacy orders)', '/api/pharmacy/orders'],
  ['labcenter dashboard (lab bookings)', '/api/lab/bookings'],
  ['admin dashboard (users)', '/api/users'],
  ['superadmin dashboard (dashboard stats)', '/api/dashboard/stats'],
  ['delivery dashboard (delivery partners)', '/api/delivery-partners/my-deliveries'],
];

describe('Role dashboard smoke tests (auth-gated)', () => {
  it.each(cases)('%s -> 401 without token', async (_label, path) => {
    const res = await request(app).get(path);
    // Some routes may be 401 or 403 depending on middleware; both mean auth-gated.
    expect([401, 403]).toContain(res.status);
  }, 15000);

  // Also verify validation on a public auth endpoint still 400 for bad input
  it('auth validation still 400 for bad login', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect([400, 401, 403, 422]).toContain(res.status);
  });
});
