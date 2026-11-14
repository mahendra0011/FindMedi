# Load / spike / soak baselines (file 18:229)

Executed evidence for the load-test checklist item. Raw runs live next to this
file as `<ISO timestamp>.json`; each stage records requests, error rate,
throughput and p50/p95/p99 latency. Thresholds match `scripts/load/k6-smoke.js`
(p95 < 500 ms, error rate < 1%).

## How to run

```bash
# Backend must be up on :5001 (BASE_URL overrides)
node scripts/load/load-baseline.mjs            # full: 20/50/100/25 VUs
node scripts/load/load-baseline.mjs --quick    # ~30 s smoke
```

Endpoints exercised: `GET /api/health` and
`GET /api/categories/specialties?tree=1`. The runner rotates a synthetic
`X-Forwarded-For` per request so the per-IP rate limiter measures distributed
clients (without it every phase returned ~95% 429 — see the first run).

## Results (2026-11-13, local Windows dev host, backend NODE_ENV=development, MongoDB Atlas)

| Run | Mode | Stage | VUs | p95 | Err% | Verdict |
|---|---|---|---|---|---|---|
| `20-21-15` | quick | ramp/spike/soak | 10/50/20 | 52/472/83 ms | 96/94/99.8% | invalid — rate limiter, runner fixed |
| `20-25-07` | quick | ramp/spike/soak | 10/50/20 | 36/237/50 ms | 0/0/0% | **passed** |
| `20-29-22` | full | ramp | 20 | 82 ms | 0% | passed |
| | | sustain | 50 | 364 ms | 0% | passed |
| | | spike | 100 | **1103 ms** | 0% | **failed p95 < 500 ms** |
| | | soak | 25 | 327 ms | 0% | passed |

## Findings

- **Zero errors** through every valid phase — no 5xx, no throttling, no
  connection-pool exhaustion at 100 concurrent clients.
- **Safe operating envelope on this host: ~50 VUs**, where p95 stays under the
  500 ms target (364 ms sustain).
- **100-VU spike breaches the latency target** (p95 1103 ms, p50 366 ms). This is
  a capacity finding, not a functional failure: the run mixes `/api/health`
  with the uncached specialty tree, which fans out to MongoDB Atlas from a dev
  machine over the public internet. Production/staging same-region verification
  (file 18:233, 19:181) must confirm the spike target there; until then the
  documented envelope is 50 VUs per instance.
- Chaos fail-closed check executed separately: `backend/scripts/chaos/recovery-test.mjs`
  against the disposable harness stack — **7/7 checks passed** (kill Mongo+Redis,
  compose recovery, PRIMARY writable, Redis PONG, multi-doc transaction,
  Redis round-trip). Harness Mongo now persists its replica-set config on a
  named volume so restart-recovery is meaningful.

Re-run on the target environment before raising the 50-VU envelope.
