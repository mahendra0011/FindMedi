// Load: public read endpoints (health + hospital directory) par ramp load.
// Usage: k6 run k6/public-read-load.js -e BASE_URL=http://localhost:5001/api
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health`, { timeout: '10s' });
  check(health, { 'health 200': (r) => r.status === 200 });

  const hospitals = http.get(`${BASE_URL}/hospitals`, { timeout: '10s' });
  check(hospitals, {
    'hospitals 200': (r) => r.status === 200,
    'hospitals JSON': (r) => (r.headers['Content-Type'] || '').includes('json'),
  });

  sleep(0.5);
}
