// Load Test: OPD Queue token call-next & status updates under clinician concurrency.
// Target: p95 < 500ms, 0% 5xx errors.
// Usage: k6 run k6/queue-load.js -e BASE_URL=http://localhost:5001/api -e AUTH_TOKEN=<jwt>
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    queue_ramp: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  };

  // Step 1: Query active queue status for department
  const listRes = http.get(`${BASE_URL}/tokens?department=General+Medicine`, { headers, timeout: '10s' });
  check(listRes, {
    'queue list status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  // Step 2: Next token call simulation
  const nextRes = http.post(
    `${BASE_URL}/tokens/call-next`,
    JSON.stringify({ counter: 'Room-102', department: 'General Medicine' }),
    { headers, timeout: '10s' }
  );
  check(nextRes, {
    'call-next status is acceptable': (r) => [200, 400, 401, 404].includes(r.status),
  });

  sleep(1);
}
