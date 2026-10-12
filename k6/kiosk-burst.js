// Stress Test: Kiosk self-checkin & token generation burst.
// Simulates 100-200 concurrent patient check-ins at morning OPD rush (08:00 - 09:00).
// Target: no 5xx errors @ 150 concurrent VUs.
// Usage: k6 run k6/kiosk-burst.js -e BASE_URL=http://localhost:5001/api
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export const options = {
  scenarios: {
    kiosk_burst: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '20s', target: 80 },
        { duration: '40s', target: 150 },
        { duration: '30s', target: 150 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // Kiosk health & department lookup
  const deptRes = http.get(`${BASE_URL}/hospitals/departments`, { headers, timeout: '8s' });
  check(deptRes, {
    'departments status 200': (r) => r.status === 200,
  });

  // Self check-in token issuance attempt
  const phone = `98200${Math.floor(10000 + Math.random() * 90000)}`;
  const tokenRes = http.post(
    `${BASE_URL}/kiosk/checkin`,
    JSON.stringify({
      phone,
      patientName: 'Kiosk Patient',
      department: 'OPD',
      source: 'kiosk-01',
    }),
    { headers, timeout: '10s' }
  );

  check(tokenRes, {
    'checkin status valid': (r) => [200, 201, 400, 404].includes(r.status),
  });

  sleep(0.5);
}
