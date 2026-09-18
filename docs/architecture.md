# FindMedi Architecture

Three parts: `frontend/` (what the user sees), `backend/` (API + database),
`docs/` (project notes). No monorepo workspaces — plain folders.

## Frontend (`frontend/`, Next.js App Router + TypeScript)

- `src/app/(public)/` — pages without login (home, doctors, hospitals, cart).
- `src/app/(dashboard)/` — role dashboards after login: patient, doctor,
  hospital, clinic, pharmacy, labcenter, admin, superadmin, delivery.
- `src/features/<name>/{api,hooks,types}/` — business logic per feature
  (e.g. `features/appointments`, `features/doctor`, `features/bookings`).
- `src/components/<role>/` — components used by one role only.
- `src/components/shared/` — only what 2+ roles share (layout, cards,
  modals, maps, sections). Ported ReactBits effects live here.
- `src/components/ui/` — shadcn primitives (+ `sonner.tsx` for toasts).
- `src/lib/api/client.ts` — axios setup, base URL from
  `NEXT_PUBLIC_API_URL`, auth headers, token refresh.
- `src/lib/server-only/` — server-only helpers (JWT decode, cookies).
  Never import from client components.
- `src/hooks/`, `src/store/` (Redux), `src/types/`, `src/config/`.
- Tests: `vitest run` (config covers `src/**`); `frontend/tests/`
  (`unit/`, `integration/`, `e2e/`) is skeleton for future split.

## Backend (`backend/`, Express + Mongoose, ESM)

- `src/index.js` — start file, mounts all routers under `/api`.
- `src/routes/`, `src/models/`, `src/services/`, `src/middleware/`,
  `src/utils/`, `src/config/`.
- `rust-helper/` (napi-rs crate: image resize, CSV, OTP hash, invoice PDF).
  Every native call has a JS fallback behind `NATIVE_*_AVAILABLE` flags,
  so the server runs even without the compiled `.node` binary.
  Prebuilt CI binaries go to `rust-helper/prebuilt/` (git-ignored).
- Auth: JWT (`middleware/auth.js`), OTP + 2FA (`test/otp.test.js`).
- Tests: `npm test` (jest, `test/*.test.js`, 9 suites).

## CI (`.github/workflows/ci.yml`)

Jobs: `server` (npm ci + test), `build-rust` (ubuntu + windows),
`findmedi-next` (Node 22: typecheck + test + build + lint),
plus a `gitleaks` secret scan on PRs/pushes.

## Data flow

Browser (`frontend/`, `NEXT_PUBLIC_API_URL`) → `backend/` `/api/*`
→ MongoDB. Auth token (JWT) is sent as a header and refreshed
proactively (`useProactiveTokenRefresh`).
