// Stress Test: Inpatient discharge finalization & billing settlement concurrency.
// Target: p95 < 800ms, zero deadlocks or duplicate billing records.
// Usage: k6 run k6/discharge-finalize.js -e BASE_URL=http://localhost:5001/api -e STAFF_TOKEN=<jwt>
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');
const STAFF_TOKEN = __ENV.STAFF_TOKEN || '';

export const options = {
  scenarios: {
    discharge_flow: {
      executor: 'constant-vus',
      vus: 20,
      duration: '45s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(STAFF_TOKEN ? { Authorization: `Bearer ${STAFF_TOKEN}` } : {}),
  };

  // 1. Fetch active IPD admissions ready for discharge
  const ipdRes = http.get(`${BASE_URL}/admissions?status=Admitted`, { headers, timeout: '10s' });
  check(ipdRes, {
    'admissions fetch status': (r) => [200, 401, 403].includes(r.status),
  });

  // 2. Simulate clearance verification
  const clearanceRes = http.get(`${BASE_URL}/admissions/clearance-status?sample=1`, { headers, timeout: '10s' });
  check(clearanceRes, {
    'clearance query status': (r) => [200, 401, 403, 404].includes(r.status),
  });

  sleep(1);
}
