// Login flow smoke: CSRF token le kar POST /api/auth/login chalao.
// NOTE: authLimiter 10 req/min/IP allow karta hai — isliye ye smoke script hai
// (low iterations). Real scale load public-read script se maapo.
//
// Usage:
//   k6 run k6/login-smoke.js -e BASE_URL=http://localhost:5001/api \
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
  const csrfToken = getCsrfToken();
  check({ csrfToken }, { 'csrf token issued': (t) => !!t });
  if (!csrfToken) return;

  if (!EMAIL || !PASSWORD) {
    console.warn('LOGIN_EMAIL / LOGIN_PASSWORD missing — sirf CSRF endpoint exercise ho raha hai.');
    return;
  }

  const res = http.post(
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

  // 200 = valid creds; 401 = galat creds (rate-limit 429 nahi aana chahiye
  // 3 iterations par). Dono hi "server reachable + contract working" maane jate hain.
  check(res, {
    'login not 5xx': (r) => r.status < 500,
    'login 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login returns JSON message or token': (r) => {
      try {
        const body = r.json();
        return !!(body?.token || body?.message);
      } catch {
        return false;
      }
    },
  });
  sleep(1);
}
