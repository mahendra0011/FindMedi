// Search & catalog load: public discovery endpoints (hospitals search,
// doctor directory, medicine search near a point).
//
// These are the audit's "search" load targets — all public reads, so this
// script needs no credentials and is safe to run against any environment.
//
// Usage:
//   k6 run k6/search-load.js -e BASE_URL=http://localhost:5001/api
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export const options = {
  stages: [
    { duration: '30s', target: 15 },
    { duration: '1m', target: 15 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200', 'p(99)<2500'],
  },
};

export default function () {
  // Hospital directory search (public).
  const hospitals = http.get(`${BASE_URL}/hospitals?search=jabalpur&limit=20`, { timeout: '10s' });
  check(hospitals, {
    'hospitals search 200': (r) => r.status === 200,
    'hospitals search JSON': (r) => (r.headers['Content-Type'] || '').includes('json'),
  });

  // Doctor directory (public list).
  const doctors = http.get(`${BASE_URL}/doctors?limit=20`, { timeout: '10s' });
  check(doctors, { 'doctors list 2xx/4xx-not-5xx': (r) => r.status < 500 });

  // Medicine search around Jabalpur city centre (public H3 discovery).
  const meds = http.get(
    `${BASE_URL}/pharmacy/search-medicine?q=paracetamol&lat=23.1815&lng=79.9864&radiusKm=5`,
    { timeout: '10s' },
  );
  check(meds, { 'medicine search 2xx/4xx-not-5xx': (r) => r.status < 500 });

  // Test catalog (public).
  const tests = http.get(`${BASE_URL}/tests?limit=20`, { timeout: '10s' });
  check(tests, { 'tests list 2xx/4xx-not-5xx': (r) => r.status < 500 });

  sleep(0.5);
}
