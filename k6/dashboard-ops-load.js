// Load: hospital dashboard aggregated endpoints (file 09 §02 §10).
// Usage: k6 run k6/dashboard-ops-load.js -e BASE_URL=http://localhost:5001/api -e TOKEN=<hospital_admin JWT>
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');
const TOKEN = __ENV.TOKEN || '';

export const options = {
  vus: 10,
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.98'],
  },
};

const headers = { Authorization: `Bearer ${TOKEN}` };

export default function () {
  const ops = http.get(`${BASE_URL}/dashboard/operations`, { headers, timeout: '10s' });
  check(ops, {
    'operations 200': (r) => r.status === 200,
    'operations has data+errors': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b && typeof b.data === 'object' && typeof b.errors === 'object';
      } catch { return false; }
    },
  });
  const rev = http.get(`${BASE_URL}/dashboard/revenue`, { headers, timeout: '10s' });
  check(rev, {
    'revenue 200': (r) => r.status === 200,
    'revenue split present': (r) => {
      try {
        const b = JSON.parse(r.body);
        return Array.isArray(b.bySource) && Array.isArray(b.byMethod);
      } catch { return false; }
    },
  });
  sleep(1);
}
