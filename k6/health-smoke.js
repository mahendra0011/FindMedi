// Smoke: /api/health endpoint ek VU par chala kar basic availability check.
// Usage: k6 run k6/health-smoke.js -e BASE_URL=http://localhost:5001/api
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export const options = {
  vus: 1,
  iterations: 5,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`, { timeout: '10s' });
  check(res, {
    'health status is 200': (r) => r.status === 200,
    'health body non-empty': (r) => r.body && r.body.length > 0,
  });
  sleep(0.3);
}
