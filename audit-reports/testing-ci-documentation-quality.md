# Testing / CI / Documentation / Code Quality

Scope: `.github/workflows/{ci,uptime}.yml`, `backend/test/` (18 files, Jest + Supertest), `backend/package.json`, `frontend/package.json` (Vitest + Playwright E2E), `k6/*.js`, `backend/rust-helper/tests/`, `docs/` (30+ documents).

**Correction to an early assumption in this audit**: the project **does** have tests and CI, and both are substantive. The findings below are about what that investment does *not* cover — which is precisely where the defects in the other reports live.

---

## [TEST-001] HIGH — The frontend type check is non-blocking against a baseline of ~12,784 errors
- **Description**: `ci.yml` runs the frontend type check as:
  ```yaml
  - name: Type Check (non-blocking, baseline ~12.7k errors)
    run: cd frontend && npm run typecheck
    continue-on-error: true
  ```
  with a comment stating the baseline has never been green. A permanently-failing check that cannot fail the build provides no protection: any new error is invisible against the existing noise, and the type system — the cheapest automated check available in a TypeScript codebase — is effectively disabled.
- **Current vs Expected**: Current = ~12,784 known type errors with no ratchet, behind a step that always "passes". Expected = an enforced error budget that can only decrease (the build fails if the count rises), with a plan to reach zero for the newest code while legacy files are quarantined by path.
- **Flow**: Every frontend change. Type errors are the class of defect a compiler catches for free; with the check disabled they are caught in production or not at all — and the interceptor/client problems in `frontend-ui-ux-bugs.md` (two HTTP clients, call sites missing headers, unhandled response flags) are exactly the defects a working type check surfaces.
- **Root Cause / Logic**: A codebase that grew faster than its type discipline; the baseline was recorded for signalling but never converted into a gate, and the CI comment documents acceptance of that state.
- **Affected Files**: `.github/workflows/ci.yml` (`findmedi-next` job), `frontend/package.json` (`typecheck`), `frontend/tsconfig.json`, the `frontend/src` tree
- **UI/Frontend Impact**: None directly; the impact is that frontend regressions reach users.
- **Security/Data Risk**: **Medium (indirect).** Type errors in auth/session code are how the AUTH-018/FE-001/FE-002 class stays invisible — e.g. a possibly-undefined token, or a call site passing the wrong shape to the API client.
- **Steps to Reproduce**: Run `cd frontend && npm run typecheck` and compare the error count to the stated baseline; introduce a deliberate type error and confirm CI still passes.
- **Suggested Fix / Implementation Plan**: Store the current error count in the repository, add a step that fails when the count increases, and require changed files to be error-free (diff-scoped tsc/ESLint). Then burn the count down module by module, starting with `api/` and `features/auth/`, and make those directories blocking when they reach zero.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Record the baseline in-repo and fail on any increase
  - [ ] Diff-scoped type check for changed files
  - [ ] Burn down `api/` and `features/auth/` first, then make them blocking
  - [ ] Remove `continue-on-error` behind a tracked milestone
  - [ ] Track the count over time in the CI summary

## [TEST-002] HIGH — No test exercises the real API, and no suite asserts authorisation
- **Description**: The Playwright job is explicitly "Playwright E2E (frontend, **mocked API**)", so end-to-end tests validate the frontend against recorded expectations rather than a live server. The backend suite (`backend/test/`, 18 files, Jest + Supertest) is real but thin and skewed towards happy paths: `app.test.js` (20 lines), `mindsupport-app.test.js` (24), `auth.test.js` (26), `billing.test.js` (26), `appointments.test.js` (29), `mindsupport-merge.test.js` (29), `roles-dashboard.test.js` (30), `delivery.test.js` (37), `prescriptions.test.js` (42) — against larger suites for the dispatch flows (`instant-dispatch.test.js` 189, `emergency-sos.test.js` 167, `emergency-doctor.test.js` 121, `ride-dispatch.test.js` 82) and auth-adjacent units (`otp.test.js` 67, `twofactor.test.js` 73, `secretsFile.test.js` 88, `docs.test.js` 88, `pharmacy-orders.test.js` 75). None of the 18 would catch the findings in this audit: there is no test that takes an unrelated account and asserts a 403/404 on a record, a prescription PDF, a lab order, a ride receipt, a notification, a loyalty admin route, the audit log or a conversation.
- **Current vs Expected**: Current = the most consequential invariants (who may read or alter whose data) are untested, and the E2E layer cannot catch them because the mock encodes the intended behaviour — including an authorisation model the server does not enforce. Expected = (a) an integration suite running the real middleware against ephemeral MongoDB/Redis, and (b) a table-driven cross-user authorisation matrix covering the ~324 endpoints identified in `AUTHZ-001`.
- **Flow**: The whole platform. Allow-by-default authorisation was found in records, prescriptions, lab orders, ride receipts, loyalty admin routes, conversations and the audit log — a distribution that implies every endpoint must be tested, not sampled.
- **Root Cause / Logic**: The hardest and most valuable units (dispatch flows) were tested thoroughly and CRUD surfaces were smoke-tested; authorisation was treated as a property of `protect` rather than of each route, and mocked E2E then supplied a false sense of end-to-end coverage.
- **Affected Files**: `.github/workflows/ci.yml` (`e2e` job), `backend/test/*` (all 18), `frontend/e2e/**`, `k6/*.js`
- **UI/Frontend Impact**: None directly.
- **Security/Data Risk**: **High.** Every critical finding in this audit is a *missing test* as much as a missing check. Without an authorisation matrix the `AUTHZ-001` remediation cannot be verified and will regress.
- **Steps to Reproduce**: `grep -rn "403" backend/test` — negative cases are largely absent; then put the API in a known-broken state and observe that the E2E suite still passes.
- **Suggested Fix / Implementation Plan**: Stand up an integration suite with ephemeral Mongo + Redis, mount the real app, seed two tenants and several roles, and drive a (route × role × ownership) table generated from the route inventory used by `MISS-AUTHZ-002`. Make it a blocking CI job. Where mocks remain, generate them from `backend/src/lib/openapi.js` so they cannot encode a policy the server does not implement.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Ephemeral Mongo/Redis integration harness
  - [ ] Generated (route × role × ownership) authorisation matrix
  - [ ] Seeded two-tenant/three-role fixtures
  - [ ] Blocking CI job for the matrix
  - [ ] Generate E2E mocks from OpenAPI, not hand-written fixtures
  - [ ] Add regression tests for each finding in this audit

<!-- END -->
