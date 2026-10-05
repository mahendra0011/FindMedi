# QA & Release Process

The test plan, finding-to-test traceability, the release checklist, and the
versioning / migration policy for this repository. Conventions and suite
Deferred items live in [`DEFERRED_TODOS.md`](../DEFERRED_TODOS.md); security-control detail lives in
[`SECURITY.md`](../SECURITY.md).

---

## 1. Test plan

**Objective:** every change ships with evidence proportionate to its blast
radius — logic gets unit tests, anything touching authz/money/PHI gets a
security suite entry, wiring gets an HTTP-level check, and static gates catch
the classes of bug a human reviewer misses.

### Layers

| Layer | Tool | Command | Proves | Does **not** prove |
|---|---|---|---|---|
| Unit / service | Jest (ESM) | `npm test` (from `backend/`) | Services, jobs, generators, middleware logic; query-shape strictness against in-memory fakes (an unsupported operator throws rather than passing silently) | Real persistence — the DB is stubbed |
| Security suites | Jest | same command (`test/security/*`) | Object-authz helpers, IDOR matrix, session/CSRF/step-up, rate limits, bot protection, sensitive-route gates | That a *present* guard is scoped to the correct field (static triage can't either — see below) |
| HTTP harness | supertest via `test/helpers/appHarness.js` | same command (`test/*.http.spec.js`, `test/integration/*`) | Route wiring: guards mount, order, status codes, headers | Handler persistence, transactions |
| Helper parity | `node:test` | `node --test test/*.test.js` (CI runs the escape-regex one) | Small pure helpers at CI parity | Anything with I/O |
| Frontend unit | Vitest | `npm test` (from `frontend/`) | Components, slices, client logic | Backend contract |
| Frontend build gate | `tsc --noEmit` | `npm run typecheck:ratchet` (from `frontend/`) | No *new* TypeScript errors (ratchet vs `tsconfig.baseline.json`, ~11,775 pre-existing) | Zero errors — it is a ratchet, not a certification |
| E2E | Playwright | `npm run test:e2e` (from `frontend/`) | Browser flows **against a mock backend** | Real frontend↔backend contract (known gap: TEST-M) |
| Static gates | CI (`.github/workflows/ci.yml`) | see §3 | See below | Runtime behaviour |

### Static gates (what CI adds beyond the suites)

Each gate is named after the finding that created it, which is also the
traceability mechanism (§2): `gitleaks`, `plaintext-aadhaar-guard`,
`mass-assignment-guard`, `unescaped-regex-guard`, `dependency-vulns`
(check-vuln-regression — a ratchet, not a zero-critical policy), `semgrep` +
`trivy` (SAST/images), `tenant-guard-regression` (fail-open guard ratchet,
authz triage 0-unguarded, manifest == committed baseline, 403 does not leak
the permission matrix, plus ~20 per-finding invariant greps: AUTHZ/PAY/INF/
CHAT/RIDE/ADM/HI/…), `authz-caller-reachability`, `permission-matrix-sanity`,
`env-doc-drift` (DOC-B-03), `infra-hardening-guard` (INF-B-*), plus the
backend `server` job (lint + full Jest) and frontend jobs (vitest + build +
typecheck ratchet + Playwright).

### Entry criteria (every change)

1. `npm run lint` clean for touched files; no new `tsc` errors (ratchet).
2. The suites covering the touched area pass locally before push.
3. No new route without an authorization decision — `npm run authz:coverage`
   reports `0 unclassified (baseline …)` and the committed manifest matches
   (CI fails the build otherwise).
4. Schema changed? Regenerate `docs/data-dictionary.md`
   (`npm run docs:dictionary`) — freshness is byte-compared in Jest.

### Exit criteria (every release)

1. Whole repository green: backend full suite + coverage floors, frontend
   unit + typecheck ratchet + build + e2e, all CI jobs green on the tag.
2. All §3 checklist items executed and the sign-off table filled.
3. No open `it.failing` increase (phase-2 goal from the overhaul plan).

### Coverage policy (honest)

`backend/package.json` carries floors (branches 5 / functions 5 / lines 15 /
statements 14). These are a **regression ratchet, not an adequacy claim** —
coverage alone never certified a control (SECURITY.md §5.2). Security-relevant
logic is unit-tested; route wiring is covered by HTTP harness + static gates;
the remaining hole is query/persistence behaviour against a real database
(TEST-M-01's second half: mongodb-memory-server + role fixtures).

### Flake policy

Suites must pass without retries. Jest runs with `--forceExit`; a *new* suite
must not introduce leaking handles beyond the pre-existing model-import ones
(a "worker process failed to exit gracefully" warning that predates your
change is tracked, not accepted as yours). A test that needs a retry gets
fixed or quarantined with an issue — never re-run-and-hope.

---

## 2. Traceability: finding → evidence

**Convention (already the practice, now written down):** when a finding is
closed, the same PR leaves three breadcrumbs:

1. **`DEFERRED_TODOS.md`** - deferred item owners and blockers.
   (196 IDs recorded so far).
2. **A CI step named after the finding** where a static guard exists
   (`- name: PAY-B-01 ─ the server must own the price` in `ci.yml`) — grep-able
   by ID.
3. **A test header citing the ID** where a behavioural test exists
   (`test/unit/payoutReconcile.spec.js` → PAY-M-03, `test/security/metrics.spec.js`
   → INF-M-02, …).

To answer "what proves finding X is fixed?":

```bash
grep -r "AUTH-B-03" backend/test backend/scripts .github/workflows
```

### Family → primary evidence (as of 2026-10-05)

| Family | Primary evidence |
|---|---|
| AUTH-B-01..19 (authn/2FA/limiter) | `test/security/{authAccountTakeover,loginLockout,loginAnomaly,stepUpAuth,forcePasswordReset,tokenPurpose,...}.spec.js` + `test/integration/sessionRevocation.http.spec.js` + `test/unit/twoFactor.spec.js` + FIXED-LOG |
| DL/DLB (data-leak batch) | same security suites (uploads gate, export caps, notification scoping) |
| AUTHZ-B-* + AUTHZ-M-01 | CI `tenant-guard-regression` step names, `authzManifest.spec.js`, `authorizeObjectMigration*.spec.js`, `check-authz-coverage.mjs` manifest |
| PAY-B-01..08 | CI steps `PAY-B-01..08` + `test/unit/{ledger,moneyRounding}.spec.js`, `test/security/paymentIdempotency.spec.js` |
| INF-B-01..09 | CI `infra-hardening-guard` steps |
| CHAT / RIDE / ADM / NOTIF / REC / HI / LAB / PHARM (bugs) | CI invariant steps + `test/security/{realtimeAcl,notificationScope,notificationConsent,notificationDelivery,...}.spec.js` |
| `-M` missing-feature items (this backlog) | their **DONE** entry names the suite + test count (e.g. PAY-M-03 → 15/15, INF-M-02 → 12/12, DOC-M-03 → 16/16, DOC-M-07 → 10/10) |

Not every closed finding has a dedicated test (config-only fixes live as CI
steps or FIXED-LOG prose). A future ratchet — `check-test-traceability.mjs`
asserting every FIXED-LOG ID appears in `test/` or `ci.yml` — is backlog-worthy
and would make this table machine-enforced; until then, the convention + grep
above is the contract.

---

## 3. Release checklist

Copy into the release issue. Every command is real and CI also runs most of
them — running them locally first just fails earlier.

### Pre-flight

- [ ] Clean tree, on the release branch; decide the semver bump (§4).
- [ ] Backend (`cd backend`): `npm ci`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:coverage` (floors must pass)
- [ ] `npm run authz:coverage` → `0 unclassified (baseline …)`; if routes
      changed, commit the regenerated manifest with the baseline bump note.
- [ ] `npm run authz:triage` → **0 unguarded**
- [ ] `npm run authz:tenant-guard`
- [ ] `npm run docs:dictionary:check` (schema changed? → `npm run docs:dictionary`
      first, review the diff, commit)
- [ ] `node scripts/check-env-docs.mjs` (every required/manifest env var in
      `.env.example` — DOC-B-03)
- [ ] `node scripts/check-vuln-regression.mjs` (no NEW critical/high advisories)
- [ ] Frontend (`cd frontend`): `npm ci`
- [ ] `npm run lint`
- [ ] `npm run typecheck:ratchet`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`

### Cut

- [ ] Update [`CHANGELOG.md`](../CHANGELOG.md): move the `Unreleased` items
      into the new version with today's ISO date; every entry that closed an
      audit finding cites its ID.
- [ ] Bump the version: `backend/package.json` `version` (canonical) **and**
      sync `frontend/package.json` `version` (it sits at `0.0.0` until the
      first release that applies this policy).
- [ ] Release includes data migrations? Run them per §5 and tick them in the
      release issue (file + when + operator).
- [ ] Tag `vX.Y.Z`, push, wait for **all** CI jobs green on the tag.
- [ ] Dispatch **`.github/workflows/deploy.yml`** with the target environment
      (it refuses un-tagged/off-main refs, re-checks the CHANGELOG skeleton,
      and blocks on the environment's required reviewers before touching
      anything; the hook + health probe run inside the approval gate).

### One-time repository settings (operator)

These live in GitHub's UI/API, not in the workflow file, so the checklist
verifies the *pipeline* and this block activates it once per repository:

- [ ] **Branch protection on `main`** (Settings → Rules → Ruleset, or `gh api`):
      required status checks with *strict* (branches up to date), contexts
      **copied from a green run's checks** (they are the job names — e.g.
      `server`, `findmedi-next (Next.js app)`, `tenant-guard-regression`,
      `dependency-vulns`, `sast-and-image-scan`), ≥1 approving review, no
      force pushes, no branch deletion. Without this, "all CI green" is
      advisory and `git push --force` is a release strategy.
- [ ] **Environments `staging` + `production`** with *Required reviewers* —
      this is what makes [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
      wait for a human. Per environment set secret `DEPLOY_WEBHOOK_URL`
      (platform deploy hook — environment secret, so the approval gate also
      gates the hook) and variable `DEPLOY_HEALTH_URL` (post-deploy probe).
      Unconfigured environments skip with `::notice` (uptime.yml pattern),
      so the workflow stays green before the target is wired.
- [ ] **Variable `UPTIME_HEALTH_URL`** — activates the scheduled
      `uptime.yml` probe (every 15 min; a failure emails the repo owner).

### Deploy

- [ ] Deploy digest-pinned images (production compose / k8s manifests — no
      floating tags, INF-B-06).
- [ ] Post-deploy smoke (5 min):
  - [ ] `GET /healthz` and `GET /readyz` both 200, and `/healthz/pipelines`
        reports fresh consumers
  - [ ] `GET /metrics` with the metrics token returns Prometheus text
  - [ ] one real authed flow (login → CSRF → a clinical read)
  - [ ] pino error rate normal for 15 minutes; no new alert firing
        (`infra/observability/alerts.yml`)
- [ ] Data migration touched money models and PG mirror is in use? Run
      `node scripts/reconcile-pg.mjs` → exit 0 (zero drift).

### Sign-off

| Role | Name | Date | Confirms |
|---|---|---|---|
| Release owner | | | checklist executed, CI green on tag |
| QA owner | | | suites + e2e green, no new flakes |
| Privacy Officer | *(required only if the release changes data processing)* | | DPIA/RETENTION/data-dictionary reviewed for the change |

### Rollback

Redeploy the previous digest (images are digest-pinned, so rollback is exact).
Data migrations are **forward-only** (§5) — a rollback that needs data
reversal uses the documented inverse if one exists, else restore from the
INF-B-04 backup procedure (RPO/RTO documented in `infra/backup/README.md`).

---

## 4. Versioning, API compatibility, changelog

**Semver, one product version.** Source of truth: root
[`CHANGELOG.md`](../CHANGELOG.md) + `backend/package.json` `version`
(currently `1.0.0`); `frontend/package.json` is synced at each release.

| Bump | When |
|---|---|
| **MAJOR** | Breaking change (below); auth/session model change; data-model change that cannot be rolled out expand-first |
| **MINOR** | Additive: new endpoints, new optional fields/params, new roles/permissions, new features |
| **PATCH** | Fixes, performance, docs, internal refactors with no API surface change |

**What counts as breaking** (non-exhaustive, and the list is the point):
removing/renaming an endpoint or response field; *narrowing* what a response
contains; changing auth/CSRF requirements; changing error codes/status for
previously-succeeding requests; tightening validation so a formerly-valid
request fails; changing pagination/sort defaults; removing an enum value.
**Not breaking:** adding an endpoint/field/optional param, loosening
validation, changing error *message text*, performance work.

**API versioning policy.** Routes carry no version prefix today (`/api/...`).
Therefore:

- Within a major, changes are **additive-only**.
- A breaking change ships either as
  **(a)** a new major exposing `/api/v2/...` alongside the old paths for a
  **deprecation window of ≥ 90 days**, with `Deprecation` + `Sunset` headers
  on the old paths and a changelog notice, or
  **(b)** — when the only consumer is our own frontend in this monorepo — an
  atomic coordinated release, which still requires the same-repo bump to be
  MAJOR and the DB change to be expand-first so rollback stays possible.
- External API consumers (hospitals integrating directly) always get (a); the
  tenant notice template in `docs/incident-response.md` §7.7 shows the
  communication pattern.

**Changelog policy.** [Keep a Changelog](https://keepachangelog.com) format:
`## [Unreleased]` always present, categories `Added / Changed / Fixed /
Security / Removed`, ISO dates, an entry per user-visible change, and **audit
finding IDs cited** when the entry closes one. Not a git log — if a reviewer
cannot tell what changed for them, rewrite the entry.

---

## 5. Migration & breaking-change policy

**One-off data migrations** live in `backend/scripts/` and are documented in
[`backend/scripts/MIGRATIONS.md`](../backend/scripts/MIGRATIONS.md) — file,
when to run, and a DANGER flag for destructive ones (`clear-appointments` is
dev/test reset only, never production). Rules:

1. **Manual, never at boot.** A named operator runs them; the release issue
   records which ones ran, when, and on which environment.
2. **Idempotent where possible** (the table says so per file); safe to re-run.
3. **Expand → migrate → contract** for anything touching live data:
   1. *Expand* — add fields/indexes compatibly (new fields optional with
      defaults; new indexes non-unique first when a backfill is needed).
   2. *Deploy* — code reads/writes both shapes.
   3. *Backfill* — run the migration script.
   4. *Contract* — remove the old shape in a **later** release, never the one
      that introduced the change.
   Precedents: appointment `Date` → IST string shipped as
   `migrate-appointment-date-to-string.mjs` + `migrate-appointment-index.mjs`
   (two steps because index shape followed data shape); the role-alias
   migration (`migrate-role-aliases.mjs`); stale-index repair
   (`fix-payment-index.mjs`).
4. **Index changes are migrations too** — drift between schema and reality has
   already bitten once (FIXED via `fix-payment-index.mjs`).
5. **Postgres mirror:** money-model dual-writes are verified read-only with
   `node scripts/reconcile-pg.mjs` (exit 0 = zero drift) after any migration
   touching Payment/Billing/Insurance/TransactionLedger/Payout/CommissionConfig.
6. **Breaking API + migration together:** the expand step lands *before* the
   API break (§4), so the previous app version can always run against the new
   schema during the deprecation window.

---

## 6. Related documents

- [`DEFERRED_TODOS.md`](../DEFERRED_TODOS.md)
  — suite conventions, inventory, roadmap, CI history
- [`CHANGELOG.md`](../CHANGELOG.md) — what shipped, when
- [`backend/scripts/MIGRATIONS.md`](../backend/scripts/MIGRATIONS.md) — the
  migration runbook table
- [`SECURITY.md`](../SECURITY.md) — controls each gate defends; §5 known gaps
  bound what testing can claim
- [`docs/incident-response.md`](incident-response.md) — if a release causes an
  incident, SEV + clocks live there
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — the gates
  themselves, named by finding ID
