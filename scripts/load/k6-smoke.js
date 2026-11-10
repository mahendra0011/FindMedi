import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp up
    { duration: '1m', target: 50 },    // sustain
    { duration: '30s', target: 100 }, // spike
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const r1 = http.get(`${BASE}/api/health`);
  check(r1, { 'health ok': (r) => r.status === 200 });

  const r2 = http.get(`${BASE}/api/categories/specialties?tree=1`);
  check(r2, { 'specialties ok': (r) => r.status === 200 });

  sleep(1);
}
