# Staging environments — parity & provisioning

> Verified on the repository side: `scripts/staging-parity-check.mjs` (this file's sibling doc).
> **This doc does not create staging infrastructure.** It defines the parity target, how to stand it up, and how to keep it maintained.

## Layout

| Env | Compose files | Data | Vendors |
|---|---|---|---|
| Local dev | `docker-compose.dev.yml`, `docker-compose.yml` | Seeded (`seed-demo.mjs`, demo-gated) | Mocked |
| CI | `docker-compose.harness.yml` | Ephemeral | Mocked (or none) |
| **Staging** | `docker-compose.yml` + `docker-compose.prod.yml` (merged) + `.env.staging` | Synthetic/anonymised only — never prod PHI | Sandbox (Stripe/Razorpay mock, test SMS/WhatsApp, LiveKit demo room) |
| Production | same pair + `docker-compose.prod.yml` | Real | Live vendors |

## Standing up staging (DevOps, ~0.5d)

1. Provision a VM (or reuse the prod cluster's worker pool for a staging workload — **not** for customers).
2. Copy `.env.example` → `.env.staging`; fill from the secret manager (Doppler/Vault/AWS SM): `MONGO_URI`, `JWT_KEYS`, `FIELD_ENCRYPTION_KEYS`, `POSTHOG_API_KEY` (staging project), `SENTRY_DSN`, `VAPID_PUBLIC/PRIVATE_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `TWILIO_ACCOUNT_SID` (or MSG91), `BREVO_SMTP_KEY`. **No dev defaults** — `docker-compose.prod.yml`'s guard service refuses to boot otherwise.
3. `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d`
4. Run seed with `DEMO_SEED_ENABLED=true` (staging only!): `node backend/scripts/seed/seed-demo.mjs --apply`
5. Run parity check: `node scripts/staging-parity-check.mjs` (should print OK).
6. Deploy frontend preview env (staging branch) with `VITE_API_URL=https://<staging-host>`.
7. Load `/api/health` → expect 200. Load `/api/public/search?q=dentist` → expect 200 with seeded data.

## Parity rules (enforced by `staging-parity-check.mjs`)

- Every data-plane service from base is present in overlay: mongo1, postgres, redis, opensearch, minio, kafka, valhalla, clamav, nginx.
- No service publishes a host port (`ports: !reset []`).
- Overlay defines the prod guard (`findmedi-prod-guard`) that refuses `*_dev_only*` secrets at boot.
- Images are digest-pinned (`IMAGE_DIGEST_*`).
- Staging config shape == prod config shape (same env schema, same flags, same `APP_*` names).

## What parity does NOT mean

- Not identical scale (prod sized for traffic; staging sized for smoke tests).
- Not identical data (staging = synthetic; prod = real).
- Not a substitute for prod-like vendor sandboxes (Razorpay test mode is NOT the same as live).

## Post-provision verification

- `node scripts/staging-parity-check.mjs` — parity OK
- `node scripts/verify-sitemap.mjs --base https://<staging-host>` — 29/29 OK
- `node scripts/load/k6-smoke.js` against staging — record baseline
- `node scripts/chaos/recovery-test.mjs` — 7/7

## Owner

DevOps lead + platform on-call. Review quarterly with `docs/ops/monthly-metrics-review.md`.
