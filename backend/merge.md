# FindMedi × MindSupport — Merge Plan (15 Phases)

> NOTE: `backend/merge.md` was empty (0 bytes). This plan was reconstructed from the
> actual codebase (main app `backend/src`, standalone app `backend/mindsupport/src`,
> `frontend/src`, `docs/mindsupport-legacy`) and is being executed phase-by-phase.

## 1. Starting position (inventory)

| Area | FindMedi (main) | MindSupport (standalone) |
|---|---|---|
| Backend entry | `backend/src/index.js` (PORT 5001, DB `findmedi` via `MONGO_URI`) | `backend/mindsupport/server.js` → `src/app.js` (MIND_PORT 8089, DB `mindsupport` via `MONGODB_URI`) |
| Backend routes | ~90 routers under `/api/*` (`src/routes/`) | 15 route groups (~80 endpoints) under `/api/*` (`mindsupport/src/routes/`) |
| Models | ~90 Mongoose models (`src/models/`) | 23 models in ONE file (`mindsupport/src/models/index.js`) |
| Auth | JWT (`jsonwebtoken`, `protect` middleware, FindMedi `User`) | **Disabled** — `authRequired`/`requireRoles` are open pass-throughs (comment: "part of FindMedi platform") |
| Realtime | `src/services/socketService.js` (rides, delivery, chat, presence, Redis adapter) | `mindsupport/src/realtime/socket.js` (`user:<id>` / `role:<role>` rooms, open auth) |
| Services | cloudinary, email, ride/socket/demoSeed… | `cloudinaryService.js`, `emailService.js` (duplicated logic) |
| Frontend | `frontend/src` — `MentalHealth.tsx` = **hospital referrals** (MH cases, MSE, plans) | `docs/mindsupport-legacy` = full counselling-platform UI (not yet in `frontend/src`) |
| Scripts | `npm run dev --prefix backend` (5001) + `frontend` (5173) | `npm run dev:mind --prefix backend` (8089) — two servers, two DBs, two ports |

## 2. Collision analysis (why a naive mount breaks)

**Mongoose model-name collisions** (same global connection, different schemas → `OverwriteModelError`):
`Appointment`, `Notification`, `Payment`, `Prescription`, `Review`, `User`
→ Fix: rename ALL 23 MindSupport models to `Mind*` with `mind_*` collections (Phase 3).

**Route-path collisions** (both apps serve `/api/appointments`, `/api/reviews`, `/api/notifications`, `/api/analytics`, `/api/upload`…):
→ Fix: mount MindSupport under `/api/mindsupport/*` namespace (Phase 5).
Existing hospital endpoint `GET /api/mentalhealth/*` is **preserved untouched** (Phase 7).

**Env-var mismatch**: main uses `MONGO_URI` / `PORT`; mind uses `MONGODB_URI` / `MIND_PORT` / `CLIENT_ORIGIN`.
→ Fix: `MIND_MONGODB_URI` override, default = main `MONGO_URI` single DB (Phase 2).

**DB readiness**: mind `asyncRoute` returns 503 unless ITS `connectDatabase()` ran.
→ Fix: `isDatabaseReady()` also honours `mongoose.connection.readyState === 1` (Phase 3).

## 3. Target architecture

```
Browser (5173)
   │  /api/*               → FindMedi routers (unchanged)
   │  /api/mindsupport/*   → MindSupport sub-app (same Express process, same MongoDB,
   │                          Mind* models → mind_* collections, FindMedi-JWT-aware guards)
   │  /api/mentalhealth/*  → hospital referrals (unchanged)
   ▼
Single backend :5001 (single MongoDB `findmedi`)
Single frontend :5173 (+ new /mindsupport counselling page)
Standalone :8089 kept as fallback until merge verified, then retired.
```

## 4. Endpoint namespace map (sample)

| Standalone (8089) | Merged (5001) |
|---|---|
| `GET /api/counsellors` | `GET /api/mindsupport/counsellors` |
| `GET /api/appointments/my` | `GET /api/mindsupport/appointments/my` |
| `POST /api/packages/purchase` | `POST /api/mindsupport/packages/purchase` |
| `GET /api/peer/posts` | `GET /api/mindsupport/peer/posts` |
| `GET /api/wellness/mood` | `GET /api/mindsupport/wellness/mood` |
| `GET /api/user/dashboard` | `GET /api/mindsupport/user/dashboard` |
| `GET /api/admin/dashboard` | `GET /api/mindsupport/admin/dashboard` |
| `POST /api/upload/image` | `POST /api/mindsupport/upload/image` |
| (all other `/api/*` in `mindsupport/src/routes`) | (same path under `/api/mindsupport/*`) |

## 5. The 15 phases

- [x] Phase 1 — Inventory + this `merge.md` (reconstructed, this file)
- [x] Phase 2 — Env unification (`MIND_MONGODB_URI`, `MIND_PORT`, docs in `.env.example`)
- [x] Phase 3 — Models: `Mind*` rename + `mind_*` collections + `isDatabaseReady` fix
- [x] Phase 4 — Auth bridge: FindMedi JWT accepted by MindSupport guards (open fallback kept)
- [x] Phase 5 — Backend mount: `src/routes/mindsupport.js` bridge + `GET /api/mindsupport/health`
- [x] Phase 6 — Realtime: export mind `io`, attach `user:`/`role:` rooms to main Socket.IO server
- [x] Phase 7 — Preserve `/api/mentalhealth` (hospital) — no behaviour change, regression-tested
- [x] Phase 8 — Frontend API client `frontend/src/mind/lib/api.js` → merged backend (+auth/CSRF)
- [x] Phase 9 — Frontend `/mind/*` routes (pre-existing, verified; hospital page untouched)
- [x] Phase 10 — Upload/Cloudinary/Email shared env (same `CLOUDINARY_URL`/`BREVO_*` names)
- [x] Phase 11 — Security parity (inner CORS mirrors `CLIENT_URL`; main helmet/sanitize/CSRF apply)
- [x] Phase 12 — Scripts: default `npm run dev` = single backend + frontend (`dev:legacy` kept)
- [x] Phase 13 — Tests: `test/mindsupport-merge.test.js` (4 tests, green)
- [x] Phase 14 — Docs (`docs/architecture.md` merge section, this file)
- [x] Phase 15 — Final verify: `npm test --prefix backend`, `frontend` typecheck/build

## 6. Verification

```powershell
npm test --prefix d:\projects\Findmedi\backend
npm run typecheck --prefix d:\projects\Findmedi\frontend
npm run build --prefix d:\projects\Findmedi\frontend
```

`GET /api/mindsupport/health` must return `{ status:'ok', service:'mindsupport', db, user }`.
`GET /api/mentalhealth/referrals` (hospital flow) must keep working with auth.
