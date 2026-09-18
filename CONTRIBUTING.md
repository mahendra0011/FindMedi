# Contributing

## Dev setup

Requires `node >=20.0.0` (`engines` in root `package.json` and `backend/package.json`).
CI uses Node 20.x for backend and Node 22.x for frontend (`.github/workflows/ci.yml`).

```bash
npm run install:all   # installs backend/ + frontend/ (also runs as `postinstall`)
npm run dev           # runs backend + frontend together via `concurrently`
```

Copy env templates (never commit real values):

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

`frontend/.env.example` sets `NEXT_PUBLIC_API_URL=http://localhost:5001/api`.
`backend/.env.example` sets `PORT`, `MONGO_URI`, `JWT_SECRET`, plus optional Cloudinary/Brevo/Google keys.

## Per-app commands (exact script names)

Root (`package.json`): `postinstall`, `install:all`, `dev`, `build`, `typecheck`, `seed`, `seed:admin`, `seed:cluster`.

```bash
npm run build       # `build --prefix frontend`
npm run typecheck   # `typecheck --prefix frontend`
npm run seed        # `seed --prefix backend`
```

Frontend (`frontend/package.json`): `dev`, `build`, `start`, `lint`, `typecheck`, `type-check`, `test`, `test:watch`, `test:coverage`.

```bash
cd frontend && npm run dev
cd frontend && npm run lint
cd frontend && npm run typecheck
```

Backend (`backend/package.json`): `dev`, `start`, `seed`, `seed:all`, `test`.

```bash
cd backend && npm run dev     # watch-mode `index.js`
cd backend && npm start       # `node index.js`
cd backend && npm run seed    # `node seed-demo.mjs`
```

`backend/rust-helper/package.json` (native module): `build`, `build:release`, `test`.

## Tests

```bash
cd frontend && npm test              # `node scripts/run-vitest.js run` (vitest, `vitest.config.ts`)
cd frontend && npm run test:coverage # `run --coverage`
cd backend && npm test               # jest, `testMatch: <rootDir>/test/**/*.test.js` (`backend/test/`)
```

Existing suites: `frontend/src/**/*.test.{ts,tsx}` (e.g. `src/lib/utils.test.ts`), `backend/test/*.test.js`.
New frontend tests go under `frontend/tests/` skeleton (`unit/`, `integration/`, `e2e/`, each with `.gitkeep`); vitest `include` currently covers `src/**` only, so wire new dirs into `vitest.config.ts` before relying on them in CI.

## Branches / commits

Use short topic branches (`feat/<x>`, `fix/<x>`) and short imperative messages (e.g. `fix: refresh token retry`).

## Secrets

Never commit secrets or `.env` files. `.gitignore` already ignores `.env`, `.env.local`, `*.local`. Commit only `*.example` templates.
