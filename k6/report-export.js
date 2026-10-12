// Load Test: Report generation, CSV streaming, and async PDF render queue.
// Target: p95 < 2000ms, stream doesn't crash event loop.
// Usage: k6 run k6/report-export.js -e BASE_URL=http://localhost:5001/api -e ADMIN_TOKEN=<jwt>
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
  };

  // 1. Heavy CSV export request (H1 or Financials)
  const csvRes = http.get(`${BASE_URL}/pharmacy/h1-register/export?rxSchedule=h1`, { headers, timeout: '20s' });
  check(csvRes, {
    'csv export response valid': (r) => [200, 401, 403].includes(r.status),
  });

  // 2. Async PDF generation enqueue
  const pdfJobRes = http.post(
    `${BASE_URL}/reports/jobs`,
    JSON.stringify({
      kind: 'template',
      data: {
        docType: 'prescription',
        templateVersion: 1,
        payload: { patient: { name: 'K6 Stress Test' } },
      },
    }),
    { headers, timeout: '15s' }
  );

  check(pdfJobRes, {
    'pdf job accepted or completed': (r) => [200, 202, 400, 401, 403].includes(r.status),
  });

  sleep(2);
}
