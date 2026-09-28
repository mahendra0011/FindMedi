// Booking + payment path smoke: login (CSRF) → read the authed booking,
// billing and payment lists → exercise the routing endpoint the navigation
// screen uses.
//
// READ-ONLY on purpose: a load test must never create bookings or payments
// against real data. Writes are covered by the Playwright E2E suite against
// mocked APIs; this script proves the live contract, auth and rate limiting.
//
// Low iterations because authLimiter allows 10 req/min/IP (same reason as
// login-smoke.js).
//
// Usage:
//   k6 run k6/booking-payment-smoke.js -e BASE_URL=http://localhost:5001/api \
//     -e LOGIN_EMAIL=you@example.com -e LOGIN_PASSWORD=secret
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');
const EMAIL = __ENV.LOGIN_EMAIL || '';
const PASSWORD = __ENV.LOGIN_PASSWORD || '';

export const options = {
  vus: 1,
  iterations: 3,
  thresholds: {
    checks: ['rate>0.9'],
  },
};

function getCsrfToken() {
  const res = http.get(`${BASE_URL}/auth/csrf-token`, { timeout: '10s' });
  if (res.status !== 200) return null;
  try {
    return res.json('csrfToken');
  } catch {
    return null;
  }
}

export default function () {
  if (!EMAIL || !PASSWORD) {
    console.warn('LOGIN_EMAIL / LOGIN_PASSWORD missing — booking/payment smoke skipped.');
    return;
  }

  const csrfToken = getCsrfToken();
  check({ csrfToken }, { 'csrf token issued': (t) => !!t });
  if (!csrfToken) return;

  const login = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: `csrf-token=${csrfToken}`,
      },
      timeout: '10s',
    },
  );
  const token = (() => {
    try {
      return login.json('token');
    } catch {
      return null;
    }
  })();
  check(login, {
    'login not 5xx': (r) => r.status < 500,
    'access token issued': () => !!token,
  });
  if (!token) return;

  const auth = {
    headers: { Authorization: `Bearer ${token}` },
    timeout: '10s',
  };

  // Booking list (appointments) — the endpoint booking dashboards read.
  const appointments = http.get(`${BASE_URL}/appointments?limit=5`, auth);
  check(appointments, {
    'booking list not 5xx': (r) => r.status < 500,
    'booking list 200': (r) => r.status === 200,
  });

  // Billing list (invoices feeding the payment screen).
  const billing = http.get(`${BASE_URL}/billing?limit=5`, auth);
  check(billing, { 'billing list not 5xx': (r) => r.status < 500 });

  // Payment history.
  const payments = http.get(`${BASE_URL}/payments?limit=5`, auth);
  check(payments, {
    'payment list not 5xx': (r) => r.status < 500,
    'payment list 200': (r) => r.status === 200,
  });

  // Routing front door used by guided navigation (public, falls back to a
  // straight line when Valhalla is down — must still answer 200).
  const routing = http.post(
    `${BASE_URL}/routing/navigation`,
    JSON.stringify({ origin: [79.9864, 23.1815], destination: [79.9901, 23.1901] }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '10s' },
  );
  check(routing, {
    'routing navigation 200': (r) => r.status === 200,
    'routing payload has shape/source': (r) => {
      try {
        const body = r.json();
        return 'shape' in body && 'source' in body;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
