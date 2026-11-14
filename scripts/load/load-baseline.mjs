#!/usr/bin/env node
/**
 * File 18:229 - load / spike / soak baseline runner.
 *
 * `scripts/load/k6-smoke.js` describes the shape of the load but requires a k6
 * binary, which is a host-level dependency nobody has on the machines this repo
 * is tested on. A baseline that cannot be re-run is not evidence, so this runner
 * implements the SAME stage plan with nothing but `node`:
 *
 *   ramp  : 20 virtual users for 30s
 *   sustain: 50 VUs for 60s
 *   spike  : 100 VUs for 30s
 *   soak   : 25 VUs for 120s (sustained, detects leaks/queue growth)
 *
 * It hits the two endpoints the smoke script uses and records p50/p95/p99
 * latency, error rate and throughput per phase into
 * `docs/ops/load-baselines/<ISO timestamp>.json`. Exit code is non-zero when
 * the thresholds in THRESHOLDS are breached, so it works as a gate.
 *
 * Usage:
 *   node scripts/load/load-baseline.mjs                     # full run
 *   BASE_URL=http://localhost:5001 node scripts/load/load-baseline.mjs
 *   node scripts/load/load-baseline.mjs --quick             # CI smoke (~30s)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'ops', 'load-baselines');

const BASE = process.env.BASE_URL || 'http://localhost:5001';
const QUICK = process.argv.includes('--quick');

const STAGES = QUICK
  ? [
      { name: 'ramp', durationMs: 10_000, vus: 10 },
      { name: 'spike', durationMs: 10_000, vus: 50 },
      { name: 'soak', durationMs: 10_000, vus: 20 },
    ]
  : [
      { name: 'ramp', durationMs: 30_000, vus: 20 },
      { name: 'sustain', durationMs: 60_000, vus: 50 },
      { name: 'spike', durationMs: 30_000, vus: 100 },
      { name: 'soak', durationMs: 120_000, vus: 25 },
    ];

// file 18:229 thresholds, identical to the k6 smoke defaults.
const THRESHOLDS = { p95Ms: 500, errorRate: 0.01 };

const ENDPOINTS = [
  '/api/health',
  '/api/categories/specialties?tree=1',
];

/**
 * The API rate-limits PER CLIENT IP (express-rate-limit on `req.ip`, and
 * `trust proxy` = 1 so the last X-Forwarded-For entry wins). One load runner
 * process is one IP, so a naive runner measures the throttle, not the server -
 * every phase came back ~95% 429 the first time this ran.
 *
 * Real users arrive from thousands of addresses. The runner models that by
 * rotating a synthetic client address per request, which leaves the production
 * limiter config untouched (the alternative - raising `max` for the test -
 * would mean the baseline no longer describes the shipped system).
 */
let clientSeq = 0;
const clientIp = () => {
  clientSeq += 1;
  return `10.${(clientSeq >> 16) & 0xff}.${(clientSeq >> 8) & 0xff}.${clientSeq & 0xff}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pct = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

async function runOne(url) {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      headers: { 'x-forwarded-for': clientIp() },
      signal: AbortSignal.timeout(10_000),
    });
    const durationMs = performance.now() - started;
    return { ok: res.ok, status: res.status, durationMs };
  } catch (error) {
    return { ok: false, status: 0, durationMs: performance.now() - started, error: error.message };
  }
}

async function runStage(stage) {
  const deadline = Date.now() + stage.durationMs;
  const latencies = [];
  let errors = 0;
  let requests = 0;

  const worker = async () => {
    while (Date.now() < deadline) {
      for (const endpoint of ENDPOINTS) {
        const result = await runOne(`${BASE}${endpoint}`);
        requests += 1;
        latencies.push(result.durationMs);
        if (!result.ok) errors += 1;
        if (Date.now() >= deadline) break;
      }
      // Think time, matching scripts/load/k6-smoke.js (`sleep(1)`): without it
      // the baseline measures the kernel loopback, not user traffic.
      await sleep(250);
    }
  };

  await Promise.all(Array.from({ length: stage.vus }, worker));

  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    name: stage.name,
    vus: stage.vus,
    durationMs: stage.durationMs,
    requests,
    errors,
    errorRate: requests === 0 ? 1 : errors / requests,
    throughputRps: requests / (stage.durationMs / 1000),
    p50Ms: Number(pct(sorted, 50).toFixed(1)),
    p95Ms: Number(pct(sorted, 95).toFixed(1)),
    p99Ms: Number(pct(sorted, 99).toFixed(1)),
  };
}

function printStage(stage) {
  console.log(
    `  ${stage.name.padEnd(8)} vus=${String(stage.vus).padStart(3)} ` +
    `req=${String(stage.requests).padStart(6)} ` +
    `rps=${stage.throughputRps.toFixed(1).padStart(7)} ` +
    `p50=${String(stage.p50Ms).padStart(6)}ms ` +
    `p95=${String(stage.p95Ms).padStart(6)}ms ` +
    `p99=${String(stage.p99Ms).padStart(6)}ms ` +
    `err=${(stage.errorRate * 100).toFixed(2)}%`
  );
}

async function main() {
  console.log(`Load baseline against ${BASE}${QUICK ? ' (quick)' : ''}`);
  const health = await runOne(`${BASE}/api/health`);
  if (!health.ok) {
    console.error(`\nPre-flight failed: GET /api/health -> ${health.status || health.error}`);
    console.error('Start the backend first (node backend/src/index.js) and retry.');
    process.exit(2);
  }

  const stages = [];
  for (const stage of STAGES) {
    console.log(`\nstage ${stage.name}: ${stage.vus} VUs for ${stage.durationMs / 1000}s`);
    const result = await runStage(stage);
    printStage(result);
    stages.push(result);
  }

  const failures = [];
  for (const stage of stages) {
    if (stage.p95Ms > THRESHOLDS.p95Ms) failures.push(`${stage.name}: p95 ${stage.p95Ms}ms > ${THRESHOLDS.p95Ms}ms`);
    if (stage.errorRate > THRESHOLDS.errorRate) failures.push(`${stage.name}: error rate ${(stage.errorRate * 100).toFixed(2)}% > ${(THRESHOLDS.errorRate * 100).toFixed(0)}%`);
  }

  const baseline = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE,
    mode: QUICK ? 'quick' : 'full',
    thresholds: THRESHOLDS,
    stages,
    passed: failures.length === 0,
    failures,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${baseline.capturedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`);
  fs.writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);

  console.log(`\nbaseline written: ${path.relative(ROOT, file)}`);
  if (failures.length > 0) {
    console.error('\nFAILED thresholds:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('PASSED all thresholds');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
