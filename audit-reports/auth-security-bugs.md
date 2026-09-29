# Auth & Security — Bugs

Scope: `backend/src/middleware/{auth,csrf,rateLimit,idempotency,errorHandler,audit}.js`,
`backend/src/routes/{auth,twoFactor,users,tokens}.js`, `backend/src/services/{otpService,twoFactorService,tokenService,napiOtpService}.js`,
`backend/src/models/{User,OTP,RefreshToken,Token}.js`, `backend/src/index.js`, `backend/.env`.

Method: full read of every file above + regex sweeps across all 274 `backend/src` files.

---

## [AUTH-001] CORS origin allow-list can be satisfied by an attacker-owned suffix domain
- **Description**: The production CORS `origin` callback accepts a request when the *requesting* origin merely **ends with** an allowed bare hostname. `normalized.endsWith(a.replace(/^https?:\/\//, ''))` means any domain that ends in `findmedi.online` passes — e.g. `https://evil-findmedi.online` or `https://attacker-findmedi.online`, both of which are registrable and controllable by an attacker. Combined with `credentials: true`, the browser will attach the session cookie and **hand the attacker the response body**.
- **Current vs Expected**: Current = `https://evil-findmedi.online` is treated as a trusted origin. Expected = exact-origin match only (or an explicit subdomain allow-list checked with a parsed `URL().hostname` and a `===` / `.endsWith('.' + host)` comparison).
- **Flow**: Any authenticated browser journey. Attacker lures a logged-in patient/doctor to `https://evil-findmedi.online`; page JS calls `fetch('https://findmedi-main.onrender.com/api/patient/...', {credentials:'include'})` and reads the response → full account/PHI disclosure without any credential theft.
- **Root Cause / Logic**: Suffix comparison used as an origin match. `index.js` ~line 266.
- **Affected Files**: `backend/src/index.js` (origin callback, ~L253–L267)
- **UI/Frontend Impact**: None directly; it is a server-side trust decision.
- **Security/Data Risk**: **Critical.** Full read access to the victim's API as the victim, including medical records, chats and payment history. Turns every endpoint into a cross-origin readable endpoint.
- **Steps to Reproduce**: 1) Register `evil-findmedi.online`. 2) Serve a page that fetches `GET /api/auth/me` with `credentials:'include'`. 3) Log in to FindMedi as any user, then open the attacker page. 4) Response body (user profile) is readable in the attacker page.
- **Suggested Fix / Implementation Plan**: Replace the `endsWith` branch with a parsed, exact match set. Normalise with `new URL(origin).origin` and compare against the allow-list with `Set.has`. If sub-domain wildcards are genuinely needed, compare on `hostname === h || hostname.endsWith('.' + h)`. Add a unit test asserting `https://evil-findmedi.online` is rejected.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Parse origins with `new URL()` and compare `origin` exactly against the allow-list
  - [ ] Remove the `endsWith` branch (or restrict to `'.' + host` suffix on `hostname`)
  - [ ] Remove `http://localhost:5173` / `:3000` / `:5001` from the production defaults
  - [ ] Add regression test for suffix-domain rejection
  - [ ] Apply the identical fix to the Socket.IO CORS callback (`socketService.js` L273)

---

## [AUTH-002] CSRF origin check bypassable via `startsWith`, and the CSRF token is never actually enforced
- **Description**: Two independent defects in `csrfProtection`. (1) The allow-list is matched with `source.startsWith(allowed)`, so the Origin `https://findmedi.online.evil.com` passes — `evil.com` is attacker-owned and can serve `findmedi.online.evil.com` as a sub-domain. (2) When an allowed `Origin`/`Referer` is present, the function **falls through to `next()` at the end of the function without ever validating the double-submit token**, so the `x-csrf-token`/`csrf-token` pair is dead code and the entire CSRF defence reduces to the bypassable string check.
- **Current vs Expected**: Current = "has a permitted-looking Origin" is sufficient; a stolen/anonymous token works. Expected = Origin must match exactly **and** `csrf-token` cookie must equal `x-csrf-token` header; mismatch must be rejected.
- **Flow**: Ambient-authority attack. A logged-in user visits the attacker page; the page issues a cross-site `POST /api/...` form/fetch. The browser sends `Origin: https://findmedi.online.evil.com` and (in production, `SameSite=None`) the session cookie → the middleware returns `next()` → the state change executes as the victim.
- **Root Cause / Logic**: `csrf.js` L34 `source.startsWith(allowed)`; L46–L53 the final unconditional `next()`.
- **Affected Files**: `backend/src/middleware/csrf.js` (L12–L54), mounted at `index.js` (`app.use('/api', csrfProtection)`)
- **UI/Frontend Impact**: None visible; silent server-side trust.
- **Security/Data Risk**: **Critical.** Enables state-changing actions as any logged-in user: cancel/complete bookings, trigger refunds, change profile/password, block users (admin session), submit SOS. Directly patient-affecting.
- **Steps to Reproduce**: 1) Serve a page on `https://findmedi.online.evil.com` with `<form method=POST action="https://findmedi-main.onrender.com/api/appointments/...">`. 2) Victim (logged in) loads it. 3) Request carries `Origin: https://findmedi.online.evil.com` → passes `startsWith` → mutates state without any CSRF token.
- **Suggested Fix / Implementation Plan**: Parse the Origin/Referer with `new URL()` and compare `origin === allowed` exactly. Delete the duplicate dead-token branch. Require a valid token for every non-safe method regardless of Origin, and return 403 when the token is absent/mismatched — do not fall through. Prefer `SameSite=Lax` + same-site frontend/proxy so cookies are never sent cross-site.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Exact-match Origin/Referer against a parsed allow-list (reuse one shared helper with CORS)
  - [ ] Fail closed when the CSRF token is missing/mismatched (remove the final fall-through `next()`)
  - [ ] Remove the `req.path === '/upload'` exemption (see AUTH-003)
  - [ ] Add tests: suffix-origin rejected, missing token rejected, mismatched token rejected
  - [ ] Re-evaluate `sameSite: 'none'` in production (`csrf.js` `getCookieOptions` L3–L10) — it is what makes these CSRF paths reachable

---

## [AUTH-003] CSRF protection explicitly disabled for the authenticated upload endpoint
- **Description**: `csrfProtection` early-returns for `req.path === '/upload'`. Because the middleware is mounted at `/api`, a request to `POST /api/upload` presents `req.path === '/upload'` and therefore **skips CSRF entirely**. This is the authenticated, record-creating upload route.
- **Current vs Expected**: Current = no CSRF check on `POST /api/upload`. Expected = multipart POSTs get the same Origin+token validation as JSON POSTs.
- **Flow**: Attacker page auto-submits a `multipart/form-data` POST to `/api/upload` while the victim is logged in. The multipart form can carry `purpose`/`recordType` fields, so the attacker chooses what gets filed.
- **Root Cause / Logic**: Blanket path exemption rather than "multipart needs different parsing, not no protection".
- **Affected Files**: `backend/src/middleware/csrf.js` (L17–L19); `backend/src/routes/upload.js` (`POST /`, L91) which creates a `Record` (L219) and a `Notification` (L243)
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **High.** Forces files into a victim's medical record folder ("Uploaded `<attacker-controlled name>`", `diagnosis` text is attacker-controlled), and pollutes the victim's notification feed. Medical-record integrity violation.
- **Steps to Reproduce**: 1) Log in as a patient. 2) From an attacker page, POST a multipart form to `/api/upload` with a file and `recordType=labs`. 3) A new `Record` appears on the victim's account with no user intent.
- **Suggested Fix / Implementation Plan**: Remove the `/upload` exemption; allow the Origin check to cover it. If a specific partner integration needs an exemption, key it on a verified API key, not on the path.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Delete the `/upload` early-return
  - [ ] Verify multipart requests carry a usable `Origin` (browsers do) and add a test
  - [ ] Consider per-route opt-in exemptions with an explicit allow-list instead of path matching

---

## [AUTH-004] `trust proxy` is never set — every user behind the proxy shares one rate-limit bucket
- **Description**: `app.set('trust proxy', ...)` appears nowhere in the codebase (verified by grep across all 274 files). In production the app runs behind Render/nginx, so `req.ip` resolves to the **proxy's** address for every request. express-rate-limit's default `keyGenerator` uses `req.ip`, and the GRL limiter builds `ip:${req.ip}` (`rateLimit.js` L33). Consequence: the whole platform shares a single counter per limiter.
- **Current vs Expected**: Current = `authLimiter` allows **10 requests per 15 minutes for the entire user base**; `otpLimiter` allows 3 per 10 minutes globally; `apiLimiter` 100/min globally. Expected = per-real-client IP via `X-Forwarded-For`, which nginx already sets (`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`).
- **Flow**: Any login journey. Ten login attempts anywhere in the world lock out login for everybody for 15 minutes — trivially triggered by an attacker (`POST /api/auth/login` x10) → **platform-wide authentication outage**.
- **Root Cause / Logic**: Missing `app.set('trust proxy', n)` and/or a `keyGenerator` that reads the forwarded chain.
- **Affected Files**: `backend/src/index.js` (no `trust proxy`; limiters at L134–L180), `backend/src/middleware/rateLimit.js` (L33), `infra/nginx/nginx.conf` (sets XFF but Node ignores it)
- **UI/Frontend Impact**: Users see "Too many requests, please try again later." with no cause, and cannot log in at all.
- **Security/Data Risk**: **High.** Primary impact is availability — on an emergency-health platform nobody can log in to raise an SOS. It also poisons every audit trail: `req.ip` stored in `AuditLog` (`audit.js` L19) is the proxy IP, so **no security event can be attributed to a real actor**, defeating forensic/compliance requirements.
- **Steps to Reproduce**: Run behind any reverse proxy, fire 10 `POST /api/auth/login` requests, then try to log in as a different user from a different network → 429.
- **Suggested Fix / Implementation Plan**: `app.set('trust proxy', 1)` (or the exact hop count on Render) so Express parses XFF; confirm `req.ip` is the client. Keep the GRL limiter keyed on resolved `req.ip`. Add a boot-time assertion that `req.ip` is not a proxy address in production.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `app.set('trust proxy', 1)` (or explicitly documented hop count)
  - [ ] Verify `req.ip` and `req.ips` in a staging smoke test
  - [ ] Confirm audit-log IPs now record real client addresses
  - [ ] Re-tune limiter values once keys are per-client
  - [ ] Do not trust XFF blindly if the backend is directly reachable (spoofable) — restrict ingress to the edge

---

## [AUTH-005] Requests without the `/api` prefix bypass every global rate limiter
- **Description**: The route-normalisation middleware rewrites `req.url` to add `/api` when a known prefix is present. It is registered **after** all the `app.use('/api/...', limiter)` registrations, so a request to `/auth/login` never matches the path-scoped limiters, and is then rewritten to `/api/auth/login` and routed normally.
- **Current vs Expected**: Current = `POST /auth/login` is unthrottled by `apiLimiter`, `authLimiter`, `otpLimiter`, `forgotPasswordLimiter`, `otpVerifyLimiter`, `resetPasswordLimiter` and `tokenRefreshLimiter`. Expected = identical limits regardless of the prefix form.
- **Flow**: Password/OTP brute force. Attacker posts to `/auth/login` and additionally sets `"isEmergency": true` (AUTH-006) to disable the route-level GRL limiter as well → **fully unthrottled credential stuffing**.
- **Root Cause / Logic**: Ordering bug — a URL-rewriting middleware placed after the path-scoped limiters. `index.js` L172–L180 vs the normalisation block at ~L265–L290.
- **Affected Files**: `backend/src/index.js` (limiter mounts ~L172–L180; normalisation block ~L265–L290)
- **UI/Frontend Impact**: None (the frontend always calls `/api`), which is why this is easy to miss.
- **Security/Data Risk**: **Critical.** Removes the primary brute-force control on authentication for every role including `superadmin`.
- **Steps to Reproduce**: 1) Send 500 `POST /auth/login` attempts → no 429. 2) Send the same to `POST /api/auth/login` → 429 after 10. Confirms the bypass.
- **Suggested Fix / Implementation Plan**: Move the normalisation middleware **above** all `app.use('/api/...')` limiters, or delete it and fix callers. Preferred: remove the rewrite — it creates a second, unprotected URL space for every route and doubles the path surface to maintain.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Remove the route-normalisation middleware, or hoist it above the limiter mounts
  - [ ] If kept, add a test that `/auth/login` and `/api/auth/login` behave identically
  - [ ] Audit other path-scoped middleware registered before the rewrite (static `/uploads`, CSRF) for the same skip
  - [ ] Merge the three overlapping limiter systems (app-level `express-rate-limit` + GRL Redis + nginx) into one documented chain

---

## [AUTH-006] `isEmergency: true` in any request body disables the route-level rate limiter
- **Description**: `createGrlRateLimiter` defaults `isEmergencyExempt = true`, and the bypass condition includes `req.body?.isEmergency === true` — a value the **client** controls. Every pre-configured limiter (`authLimiter`, `bookingLimiter`, `paymentLimiter`, `generalLimiter`, `totpLimiter`) is built with that default and never overrides it.
- **Current vs Expected**: Current = `POST /api/twoFactor/validate {"isEmergency":true}` or `POST /api/auth/login {"isEmergency":true}` skips the GRL limiter. `totpLimiter`'s own comment (L102–L105) states it "IS the brute-force defence" for a 1e6-key space — it is not, because the attacker can switch it off. Expected = the exemption applies only to genuinely life-safety SOS **routes**, never to a body field, and never to auth/OTP/payment limiters.
- **Flow**: 2FA/TOTP and OTP brute force; payment flooding. Note the limiter runs *before* `validate()` on these routes (`router.post('/login', authLimiter, validate(loginSchema), ...)`), so the raw body still carries the flag when the limiter reads it.
- **Root Cause / Logic**: Trusting client input as an authorization signal inside a security control. `rateLimit.js` L20–L30.
- **Affected Files**: `backend/src/middleware/rateLimit.js` (L17, L21–L30, L78–L110); appliers in `auth.js` (L307, L661, L727, L776, L922, L1041, L1114, L1148, L1193, L1228, L1261, L1502, L1518), `twoFactor.js` (L26, L54, L92, L124, L164), `payments.js` (L47, L70, L85), `transactions.js` (L152, L192), `billing.js` (L97), `healthId.js` (L69, L98), `insurance.js` (L20, L81, L98, L122, L139), `demoPayment.js` (L378, L406, L422, L440)
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **High.** Weakens the 2FA/TOTP brute-force ceiling by ~10x wherever a global limiter still applies, and removes it entirely wherever none does.
- **Steps to Reproduce**: 1) POST `/api/twoFactor/validate` with a wrong code 100 times in one minute → far more accepted attempts than the 10/min `totpLimiter` intends. 2) Repeat without `isEmergency` → 429 much sooner.
- **Suggested Fix / Implementation Plan**: Set `isEmergencyExempt: false` explicitly on `authLimiter`, `totpLimiter`, `paymentLimiter`, `generalLimiter`. For SOS limiters, exempt by **route mount** and never by body. If an emergency flag must be honoured, derive it server-side from the created emergency record.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `isEmergencyExempt: false` on auth/OTP/TOTP/payment/general limiters
  - [ ] Delete the `req.body?.isEmergency === true` branch entirely
  - [ ] Replace the URL-substring check with an explicit route mount for SOS paths
  - [ ] Test: `isEmergency` in the body no longer changes limiter behaviour
  - [ ] Confirm 2FA/ABHA brute-force ceilings are enforced end-to-end

---

## [AUTH-007] Sliding-window limiter admits bursts far above `max` (check-then-act outside the atomic block)
- **Description**: The four commands are pipelined with `multi()` (correct — `zRemRangeByScore`, `zCard`, `zAdd`, `pExpire` execute atomically), but the **admission decision is made in Node after `exec()` returns**. N concurrent requests all read the same pre-increment `zCard` and all pass the `currentCount >= max` test, so effective admission is unbounded during a burst.
- **Current vs Expected**: Current = `authLimiter` (max 10/min) admits an arbitrary number of simultaneous requests — a 500-request parallel burst passes together. Expected = exactly `max` admissions per window.
- **Flow**: Brute-force tooling and any automated abuse; parallel requests are the normal shape of an attack.
- **Root Cause / Logic**: The increment is atomic but the *decision* is not. `rateLimit.js` L44–L67.
- **Affected Files**: `backend/src/middleware/rateLimit.js` (L44–L69)
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **Medium–High.** Nullifies the limiter's guarantee against the exact traffic pattern credential-stuffing tools use, and can also over-admit legitimate bursts.
- **Steps to Reproduce**: Fire 200 concurrent `POST /api/...` requests; observe all succeed despite `max: 10` per 60s window.
- **Suggested Fix / Implementation Plan**: Make it a single atomic decision — a Lua script that prunes, counts and conditionally adds, returning the post-state; or compare against the count returned *after* `zAdd` and roll back when over. Alternatively use a token bucket (`INCR` + `EXPIRE`) where check and increment are one atomic op.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Move the admit/deny decision into one atomic Redis `EVAL`
  - [ ] Return the true remaining count in `X-RateLimit-Remaining` from that same op
  - [ ] Add a concurrency test asserting exactly `max` requests pass
  - [ ] Document fail-open behaviour and gate it per-path (auth must fail closed, or degrade to a local in-memory limiter)

---

## [AUTH-008] Live production secrets in a local `.env`; weak superadmin password; unrotated encryption key
- **Description**: `backend/.env` is correctly untracked (`git ls-files --error-unmatch backend/.env` fails) but holds **real production credentials**: the Atlas connection string including the account password, `JWT_SECRET`, `CLOUDINARY_URL` (contains the Cloudinary API secret), `BREVO_API_KEY`, `GOOGLE_CLIENT_SECRET` (`GOCSPX-…`), `GEMINI_API_KEY`, and `ADMIN_PASSWORD=admin@123`. `NODE_ENV=development` sits alongside production URLs in `CLIENT_URL`.
- **Current vs Expected**: Current = one developer machine holds keys to the production database, media account, mail account, Google OAuth client and paid LLM quota, plus a guessable superadmin password. Expected = secrets only in the platform secret store, injected at runtime via the `SECRETS_FILE` mechanism that already exists (`index.js` L21–L37); `.env` holds placeholders only.
- **Flow**: Not a request-flow defect but a credential-hygiene failure that turns any laptop compromise, backup leak, screen-share or shared-folder incident into full PHI disclosure.
- **Root Cause / Logic**: Local dev convenience file populated with production values.
- **Affected Files**: `backend/.env` (L7 MONGO_URI, L15–L16 MIND_NOTES_KEY_*, L24 JWT_SECRET, L28 ADMIN_PASSWORD, L32 CLOUDINARY_URL, L35 BREVO_API_KEY, L40 GOOGLE_CLIENT_SECRET, L44 GEMINI_API_KEY)
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **Critical.** Live, unrotated credentials to the system of record for all medical data. `JWT_SECRET` alone permits forging a token for any `userId`/role. `MIND_NOTES_KEY_V1` is a raw 64-hex value (not a KDF output) and `MIND_NOTES_KEY_CURRENT=v1` shows no rotation has ever been exercised, so notes encrypted with it have no re-key path.
- **Steps to Reproduce**: `git log --all -- backend/.env` confirms it was never committed, so the exposure surface is the filesystem/backups rather than the repo. Verify the Atlas value still authenticates.
- **Suggested Fix / Implementation Plan**: Rotate every credential (Atlas password, JWT_SECRET, Cloudinary secret, Brevo key, Google client secret, Gemini key). Move them to the host secret store and load via `SECRETS_FILE`. Replace `ADMIN_PASSWORD` with a generated 32-char value and force rotation on first login. Add a pre-commit secret scanner and a CI gate that fails if `.env` contains non-placeholder values.
- **Priority**: High (rotation is urgent)
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Rotate the Atlas DB password and verify the old one is revoked
  - [ ] Rotate `JWT_SECRET` (invalidates all sessions — coordinate the deploy)
  - [ ] Rotate Cloudinary / Brevo / Google client secret / Gemini keys
  - [ ] Replace `ADMIN_PASSWORD`; enforce first-login rotation
  - [ ] Move secrets to `SECRETS_FILE`; strip values from `.env`
  - [ ] Add gitleaks/trufflehog to pre-commit and CI
  - [ ] Plan and test `MIND_NOTES_KEY` rotation (the `CURRENT`/`V1` pair exists but only "v1" is referenced)

---

## [AUTH-009] OTPs are generated with `Math.random()` (not cryptographically secure)
- **Description**: `generateOTP()` returns `Math.floor(100000 + Math.random() * 900000)`. V8's `Math.random()` is xorshift128+ — not a CSPRNG, and its internal state is recoverable from observed outputs. The same pattern appears in the native-flagged `napiOtpService` and in `utils/otp.js` (which also derives a *secret* this way).
- **Current vs Expected**: Current = OTP space is only nominally 1e6; effective entropy is far lower and predictable by an attacker who can sample outputs. Expected = `crypto.randomInt(100000, 1000000)` (or `randomBytes` with rejection sampling), matching the hashing layer, which already correctly uses bcrypt/Rust-SHA256 (`OTP.hashOTP`, `OTP.compareOTP`).
- **Flow**: Email verification, login OTP, and **password reset** (`resetPasswordSchema` requires an `otp`, so predicting it yields a full account takeover).
- **Root Cause / Logic**: Non-CSPRNG used for a security token. `otpService.js` L23–L25; `napiOtpService.js` L198; `utils/otp.js` L5, L15.
- **Affected Files**: `backend/src/services/otpService.js` (L24), `backend/src/services/napiOtpService.js` (L198), `backend/src/utils/otp.js` (L5, L15); consumed by `auth.js` (`/verify-otp` L661, `/forgot-password` L1114, `/reset-password` L1148, `/resend-otp` L727)
- **UI/Frontend Impact**: None; users cannot perceive the weakness.
- **Security/Data Risk**: **Critical.** Account takeover via password-reset OTP prediction. The otherwise-good hardening (hashed OTP, 10-min expiry, lockout counters, single-use invalidation of sibling OTPs at `otpService.js` L248–L256) is undermined at the source because the plaintext is guessable before it is ever hashed.
- **Steps to Reproduce**: Collect a series of issued OTPs for your own account, recover the xorshift128+ state, predict the next value for a victim's reset request, then `POST /api/auth/reset-password` with the predicted code.
- **Suggested Fix / Implementation Plan**: Replace all three generators with `crypto.randomInt(100000, 1000000)`; for `utils/otp.js`'s secret generation use `crypto.randomBytes` with rejection sampling over the alphabet (avoid modulo bias). Add a lint rule / test that fails when `Math.random()` appears in `services/otpService.js`, `napiOtpService.js`, `utils/otp.js`, or any file matching `*otp*`/`*token*`/`*secret*`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `crypto.randomInt` in `otpService.js` and `napiOtpService.js`
  - [ ] `crypto.randomBytes` + rejection sampling in `utils/otp.js`
  - [ ] Add a regression test asserting the generator is not `Math.random`-derived (e.g. statistical + code-level guard)
  - [ ] Grep-audit the remaining `Math.random()` uses listed in AUTH-010 and triage each by security relevance
  - [ ] Consider requiring re-authentication (password) before issuing a password-reset OTP

---

## [AUTH-010] Staff/admin temporary passwords and business identifiers generated with `Math.random()`
- **Description**: `Math.random().toString(36).slice(-10)` is used to mint **staff, doctor, hospital, facility and ambulance-driver passwords** (`facilities.js` L204, `doctors.js` L299, `hospitals.js` L116, `platform.js` L264, `demoPayment.js` L46, `ambulanceLoginService.js` L16 which also appends a fixed `A1!`). The same generator produces user-visible identifiers: booking numbers (`AssistantBooking.js` L16, `LawyerBooking.js` L15, `RideBooking.js`), payment refs (`DemoPayment.js` L62), ABHA/health-ID values (`healthId.js` L114, L117), loyalty/referral codes (`loyaltyService.js` L231, `referralService.js` L11), queue/OPD numbers (`config/redis.js` L264, L275) and local upload filenames (`routes/upload.js` L26).
- **Current vs Expected**: Current = credentials and identifiers whose entropy is bounded by a non-CSPRNG and, for the ID cases, only ~900k distinct values. Expected = `crypto.randomBytes`-backed passwords and UUIDv4/CSPRNG identifiers.
- **Flow**: Onboarding (an admin creates a doctor/pharmacy/ambulance account → temp password is emailed) and first login. Identifier guessing drives IDOR enumeration of bookings, receipts and queue numbers.
- **Root Cause / Logic**: Convenience helper reused for security-relevant values. Note `middleware/upload.js` L55 already uses `uuidv4()` correctly — the two upload paths disagree, which is itself the bug.
- **Affected Files**: `routes/facilities.js` (L204), `routes/doctors.js` (L299), `routes/hospitals.js` (L116), `routes/platform.js` (L264), `routes/demoPayment.js` (L46, L86, L141, L218, L296), `services/ambulanceLoginService.js` (L16), `models/DemoPayment.js` (L62), `models/AssistantBooking.js` (L16), `models/LawyerBooking.js` (L15), `models/RideBooking.js`, `models/EmergencyDoctorRequest.js` (L11), `routes/emergencyDoctor.js` (L53), `routes/healthId.js` (L114, L117), `services/loyaltyService.js` (L231), `services/referralService.js` (L11), `routes/upload.js` (L26), `config/redis.js` (L264, L275)
- **UI/Frontend Impact**: Users receive weak, predictable temporary passwords; referral codes are guessable (self-referral farming); OPD/queue numbers can collide.
- **Security/Data Risk**: **High.** Predictable temp passwords for privileged accounts (doctor / hospital_admin / ambulance) are effectively a backdoor if the email is intercepted or the pattern leaks. Predictable booking/payment identifiers enable enumeration of other users' receipts and bookings. ABHA identifiers must be unique and non-guessable — a 10-digit `Math.random` value risks collision and cross-provider PHI linkage.
- **Steps to Reproduce**: Create staff accounts repeatedly from the same process; observe the shared pattern and, over time, collisions in the 900k-valued `DEMO-TXN-*` / `ASB-*` / `LWB-*` spaces (birthday bound ≈ 1.1k records for a 50% collision).
- **Suggested Fix / Implementation Plan**: One shared `utils/secureRandom.js` exporting `securePassword()`, `secureCode(alphabet, len)` (rejection sampling) and `secureId()`. Use `randomUUID()` / `crypto.randomBytes` everywhere. `DemoPayment.transactionRef`, `AssistantBooking.bookingNumber` and `LawyerBooking.bookingNumber` are `unique: true` over a 900k space — replace with a CSPRNG value plus a uniqueness retry, or derive uniqueness from `_id`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add `utils/secureRandom.js`
  - [ ] Swap temp-password generation in all 6 call sites
  - [ ] Swap booking/payment/ABHA/referral/queue identifier generation
  - [ ] Force password change on first login for every generated temp password
  - [ ] Collision analysis for the `unique: true` + 900k-space fields
  - [ ] Add a CI grep guard for `Math.random()` in security-relevant paths

---

## [AUTH-011] `twoFactorSecret`, Drive OAuth tokens, bank details and ID-document URLs are selected by default
- **Description**: `User.password` is correctly `select: false`, but `twoFactorSecret` (L53), `twoFactorTempSecret` (L55), `twoFactorBackupCodes` (L54), `driveTokens` (L58), `docs.*` Aadhaar/PAN/licence URLs (L88–L96) and `bankDetails` (L97–L102) are all selected by default. Any handler that returns a hydrated `User` ships them. The codebase avoids this only in the few places that project explicitly (`adminSecurity.js` L20/L62, `twoFactor.js` L166).
- **Current vs Expected**: Current = the TOTP seed and Google refresh tokens travel in ordinary API payloads. Expected = `select: false` on every secret/credential/PII-document field, with positive projection only where legitimately required.
- **Flow**: Any journey that echoes a user document. A leaked TOTP seed lets an attacker generate valid codes indefinitely, making 2FA decorative.
- **Root Cause / Logic**: Default-on selection for sensitive paths. `middleware/auth.js` L29 and L249 use `.select('-password')` only, and L89 assigns the full document to `req.authUser`, so the secrets are in memory on **every authenticated request**.
- **Affected Files**: `models/User.js` (L52–L58, L88–L102); `middleware/auth.js` (L29, L89, L249); `routes/users.js` (L54, L74, L86, L102)
- **UI/Frontend Impact**: None visible — secrets are silently sent to the browser.
- **Security/Data Risk**: **Critical.** (1) TOTP seed = permanent 2FA bypass. (2) `driveTokens` = refresh tokens for the user's **personal Google Drive**, where `routes/drive.js` stores personal medical files → full Drive takeover. (3) `bankDetails` and Aadhaar/PAN URLs are regulator-sensitive PII.
- **Steps to Reproduce**: `POST /api/auth/login`, then `GET /api/auth/me`; inspect the JSON for `twoFactorSecret` / `driveTokens`.
- **Suggested Fix / Implementation Plan**: Add `select: false` to all listed paths plus `healthIdCard.qrToken`. Use `.select('+twoFactorSecret')` in `twoFactor.js` and `.select('+driveTokens')` in `driveService.js` only. Introduce `User.toPublicJSON()` and use it for every user-returning handler instead of ad-hoc projections.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `select: false` on all secret/credential/PII-document paths
  - [ ] Positive selects in the legitimate consumers only
  - [ ] Add and adopt `User.toPublicJSON()`
  - [ ] Test asserting `/api/auth/me` contains no secret fields
  - [ ] Consider field-level encryption at rest for `driveTokens` / `bankDetails`

---

## [AUTH-012] No token-revocation mechanism: sessions survive password change/reset
- **Description**: `User` has no `passwordChangedAt`, no `tokenVersion`/`sessionVersion`, and JWTs are verified with no state check (`middleware/auth.js` L20). `protect` also does not compare the token's issue time against the user's last password change. `optionalProtect` (L233–L255) skips the `status`/`isVerified`/approval checks entirely and returns the raw document.
- **Current vs Expected**: Current = after a password reset (a security incident response), every previously issued access token and 7-day refresh token continues to work. Expected = a password change/reset invalidates all outstanding sessions, and `optionalProtect` applies the same account-state gates as `protect`.
- **Flow**: Account-recovery and incident response. A user who detects compromise and resets the password still leaves the attacker logged in.
- **Root Cause / Logic**: Stateless JWT with no revocation list and no version counter.
- **Affected Files**: `models/User.js`, `middleware/auth.js` (L8–L91, L233–L255), `services/tokenService.js`, `models/RefreshToken.js`, `routes/auth.js` (`/reset-password` L1148, `/logout` L1502, `/refresh` L1518)
- **UI/Frontend Impact**: "Reset password" gives a false sense of security; the UI reports success while the attacker's session persists.
- **Security/Data Risk**: **High.** No way to evict a compromised session short of rotating `JWT_SECRET` (which logs out every user on the platform). Directly relevant to medical-data breach containment and to any audit/incident-response obligation.
- **Steps to Reproduce**: Log in on client A; reset the password from client B; client A's token still authorises `GET /api/patients/...`.
- **Suggested Fix / Implementation Plan**: Add `passwordChangedAt` and a `tokenVersion` to `User`; embed `tv` in both access and refresh tokens; reject in `protect`/`refresh` when `tv` mismatches or `iat < passwordChangedAt`. Bump `tokenVersion` in `/reset-password`, `/change-password`, `/logout-all` and on admin block. Revoke stored refresh tokens (`RefreshToken`) on the same events. Make `optionalProtect` reuse the same state checks as `protect` (or delete it if unused).
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add `passwordChangedAt` + `tokenVersion` to `User`
  - [ ] Enforce both in `protect` and in the refresh path
  - [ ] Bump on password change/reset, logout-all, and admin block
  - [ ] Delete/repair `optionalProtect`
  - [ ] Add a test: old token rejected after password reset
  - [ ] Add "sign out of all devices" to the UI (see `auth-security-missing.md`)

---

## [AUTH-013] A second, unreferenced validation module shadows identically-named schemas
- **Description**: Two Zod validation modules exist: `middleware/validate.js` (186 lines) and `utils/validate.js` (1075 lines). Regex sweep of all 94 route files: **57 files import from `../utils/validate.js`, and 0 files import from `../middleware/validate.js`.** The dead module exports the *same* schema names as the live one (`loginSchema`, `registerSchema`, `createAppointmentSchema`, `createDoctorSchema`, `createPatientSchema`, `createBillSchema`, `createPaymentSchema`, `createMedicineSchema`, `createTestSchema`, `registerHospitalSchema`, `changePasswordSchema`, `resetPasswordSchema`, `forgotPasswordSchema`, `createUserSchema`, `updateProfileSchema`) — with **different rules**.
- **Current vs Expected**: Current = a developer hardening `middleware/validate.js` changes nothing at runtime, and audits that read it get a false picture of the enforced contract (its `loginSchema` at L34–L40, for example, is not the one applied to `POST /api/auth/login`). Expected = one validation module, one source of truth.
- **Flow**: Every write endpoint. Silent divergence between documented and enforced validation.
- **Root Cause / Logic**: Duplicated module left behind; identical export names make the mistake invisible at call sites (which use an identical `validate(...)` signature).
- **Affected Files**: dead: `backend/src/middleware/validate.js` (all 186 lines). Live: `backend/src/utils/validate.js`. Representative importers: `routes/auth.js`, `routes/users.js` (L7), `routes/billing.js` (L7-era import), `routes/payments.js`, `routes/transactions.js`, `routes/appointments.js`, `routes/doctors.js`, `routes/patients.js`, `routes/pharmacy.js`, `routes/lab.js`
- **UI/Frontend Impact**: Frontend validation hints derived from the wrong schema will disagree with the API (e.g. password policy), producing confusing 400s.
- **Security/Data Risk**: **Medium–High.** Real risk is a false negative in review/audit: a rule believed to be enforced (e.g. `createUserSchema`'s `role` enum at `middleware/validate.js` L93) is not the rule in force. Also 186 lines of unmaintained, unexecuted parsing code.
- **Steps to Reproduce**: Change a rule in `middleware/validate.js`, call the corresponding endpoint, observe no behavioural change. Or `grep -rn "middleware/validate" backend/src` → zero hits.
- **Suggested Fix / Implementation Plan**: Delete `middleware/validate.js`. If any rule in it is stricter than the live version, port that rule into `utils/validate.js` first. Then add a CI check that every `routes/*.js` imports `validate` from exactly one path.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Diff the two modules schema-by-schema and port any stricter live-missing rule
  - [ ] Delete `middleware/validate.js`
  - [ ] Add a CI guard against a second `validate.js` export surface
  - [ ] Document the single validation contract in `docs/`

---

## [AUTH-014] Duplicate/conflicting index declarations (`unique: true` + `index: true`)
- **Description**: Fields declare both `unique: true` and `index: true`, which asks Mongoose for two indexes on the same path. `User.email` (L7), `User.uhid` (L16), `User.referral.code` (L125), `User.healthIdCard.qrToken` (L144) and `Payment.transaction_id` (`Payment.js` L20, plus a second compound unique index at L22) are affected. `User` also declares `createdAt` explicitly (L157) *while* `{ timestamps: true }` (L158) manages it.
- **Current vs Expected**: Current = Mongoose emits `DuplicateSchemaIndex` warnings/errors, index creation costs are duplicated, and `syncIndexes()` on boot (`index.js` L726–L729) can drop and recreate indexes non-deterministically. Expected = declare the constraint once.
- **Flow**: Application boot and first write after a deployment; also any `syncIndexes()` run.
- **Root Cause / Logic**: Redundant option combination; `unique: true` already creates an index, so `index: true` adds a second one.
- **Affected Files**: `models/User.js` (L7, L16, L125, L144, L157–L158), `models/Payment.js` (L20, L22)
- **UI/Frontend Impact**: None directly; risk of boot-time index churn and transient duplicate-key behaviour.
- **Security/Data Risk**: **Low–Medium.** The unique constraints that *do* matter for integrity (one account per email, one payment per reference) exist, so this is hygiene — but index churn on a live medical database is an availability risk.
- **Steps to Reproduce**: Start the server with `--trace-warnings`; observe `DuplicateSchemaIndex` warnings. Inspect `db.users.getIndexes()` for both a `unique` and a non-unique index on `email`.
- **Suggested Fix / Implementation Plan**: Drop the redundant `index: true` where `unique: true` is present. Remove the explicit `createdAt` field definition (keep `timestamps: true` and add `.index({ createdAt: -1 })` only if a query needs it). Replace the boot-time `syncIndexes()` calls with a reviewed migration.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Remove redundant `index: true` next to `unique: true` in `User` and `Payment`
  - [ ] Remove the duplicate `createdAt` declaration
  - [ ] Move `syncIndexes()` out of the connection handler into a migration script
  - [ ] Add a lint/test that fails on `DuplicateSchemaIndex`
  - [ ] Verify the `referenceId` partial-unique index actually blocks double-charging (see `payments-billing-ledger-bugs.md`)

---

## [AUTH-015] Two independent sources of truth for whether 2FA is enabled
- **Description**: `User.twoFactorEnabled` (L52) is the field the TOTP flows actually enforce (`twoFactor.js` L30, L98, L130, L166). `User.settings.twoFactorEnabled` (L78) is a *separate* boolean (default `false`) that nothing in the backend ever enforces. Identical names, different objects.
- **Current vs Expected**: Current = if the UI (or any profile-update handler) writes `settings.twoFactorEnabled = true`, the user is told 2FA is on while login never challenges them. Expected = one authoritative flag, or a derived getter that cannot diverge.
- **Flow**: Patient/doctor security settings journey. The user enables "2FA" in Settings, believes their account is protected, and it is not.
- **Root Cause / Logic**: A `settings` object stored as `type: Object` (L60) accepts arbitrary keys with no schema, plus a duplicated top-level field.
- **Affected Files**: `models/User.js` (L52, L60–L82), `routes/twoFactor.js` (L30, L98, L130, L166), `routes/adminSecurity.js` (L88)
- **UI/Frontend Impact**: **Yes — this is a user-visible false state.** A security toggle that reports "enabled" without enforcing anything is a serious trust defect in a health app.
- **Security/Data Risk**: **High.** Users are actively misled about their account protection while the app handles PHI. Also, `settings` being an unvalidated `Object` allows arbitrary blobs to be written into the user document (storage abuse, potential stored-XSS payloads if the frontend ever renders settings values as HTML).
- **Steps to Reproduce**: `PATCH` a profile update setting `settings.twoFactorEnabled: true` (or toggle it in the UI), then log out and back in with a password — no TOTP is requested.
- **Suggested Fix / Implementation Plan**: Remove `settings.twoFactorEnabled`; drive the UI toggle from the real flag via `GET /api/twoFactor/status`. Replace `settings: Object` with an explicit sub-schema so unknown keys are rejected. Add a check in `adminSecurity.js` and the profile-update path that 2FA state can only change through `/api/twoFactor/*`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Delete `settings.twoFactorEnabled`; migrate any `true` values
  - [ ] Point the frontend toggle at `/api/twoFactor/*` only
  - [ ] Convert `settings` to a strict sub-schema
  - [ ] Test: toggling 2FA in the UI actually gates the next login
  - [ ] Audit other duplicated `settings.*` keys that shadow real fields (e.g. `theme`, `language`, notification prefs) against server behaviour

---

## [AUTH-016] Security-relevant logging is swallowed: audit writes and production errors are silent
- **Description**: Two gaps. (1) `auditLog` catches every failure and only `console.error`s it (`audit.js` L43–L45); the OpenSearch mirror is fire-and-forget with an empty `.catch(() => {})` (L42). (2) In `errorHandler`, operational errors are **not logged at all in production** — the guard is `if (NODE_ENV !== 'production' || !err.isOperational)` (L74), so a 500 that is correctly wrapped as `AppError` produces no log line. Both use `console.*` instead of the configured Pino logger (`config/logger.js`), so nothing reaches structured log aggregation.
- **Current vs Expected**: Current = an audit-entry write failure is invisible, and unexpected-but-operational 500s vanish in production. Expected = every audit write failure is logged at error level and alerted; every 5xx is logged with request id, route, actor and code.
- **Flow**: Admin actions (block user, delete user, disable 2FA, settle claims, refunds) and any 5xx during a medical or payment operation.
- **Root Cause / Logic**: Defensive catch blocks written for availability, without a success/failure signal; plus a log-level predicate that treats "operational" as "not worth logging".
- **Affected Files**: `backend/src/middleware/audit.js` (L13–L45), `backend/src/middleware/errorHandler.js` (L27–L89, L74), `backend/src/config/logger.js`
- **UI/Frontend Impact**: None directly; but support/engineering cannot diagnose the errors users report.
- **Security/Data Risk**: **High (compliance).** A healthcare platform cannot attribute or prove access to medical records if audit writes can fail silently. Combined with AUTH-004 (proxy IPs in `details.ip`), the resulting trail is both incomplete and misattributed. The error handler also includes `stack` whenever `NODE_ENV !== 'production'` (L85) — a staging deployment with `NODE_ENV=staging` leaks stack traces to clients.
- **Steps to Reproduce**: Point `MONGO_URI` at a read-only replica or drop `auditlogs` permissions; perform an admin block; observe the action succeed with no audit record and no alert. Separately, throw an `AppError` in production and observe no log output.
- **Suggested Fix / Implementation Plan**: Log audit failures through Pino at `error` with the action and actor; make the OpenSearch mirror's failure log too. Invert the error-handler predicate so all 5xx are logged in production. Route `console.error` calls in middleware/services to the shared logger. Gate `stack` strictly on `NODE_ENV === 'development'`. Add a metric/counter for audit-write failures.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Pino-log every `auditLog` failure with action + actor
  - [ ] Log all 5xx in production (fix the `isOperational` predicate)
  - [ ] Replace `console.*` in middleware/services with `logger`
  - [ ] Return `stack` only in `development`
  - [ ] Add request-id correlation to error responses and logs
  - [ ] Add an alert when audit-write failure rate > 0
  - [ ] Add a retention/TTL policy for `AuditLog` (retention is currently undefined)

## [AUTH-017] CRITICAL — `csrfProtection` fails open: the double-submit token is only checked for clients that cannot be CSRF'd
- **Description**: The tail of `middleware/csrf.js` reads, in order:
  ```js
  if (tokenFromCookie && tokenFromHeader && tokenFromCookie === tokenFromHeader) return next();  // (A) happy path
  if (!origin && !referer) { ...re-tests the same condition... return res.status(403).json({ message: 'CSRF validation failed: missing token' }); }  // (B)
  next();                                                                                       // (C) fallthrough
  ```
  Statement **(C)** is reached whenever an `Origin` *or* `Referer` header is present **and** the token check at (A) failed — i.e. exactly the browser case. The 403 path at (B) is only reachable when **both** `Origin` and `Referer` are absent, which is the signature of a non-browser client (curl, a script, a server-side call) — the one client class CSRF cannot affect.
- **Current vs Expected**: Current = **the CSRF token is never enforced for browsers.** Protection rests entirely on the `Origin` allowlist check above it, which is itself bypassable because it uses `source.startsWith(allowed)` (see AUTH-001): a request from an attacker-controlled origin such as `https://findmedi.online.evil.com` starts with the allowed string `https://findmedi.online` and passes. Expected = a failed or absent token check must `return 403`, unconditionally, for every state-changing request.
- **Flow**: Because the CSRF/auth cookies are issued with `sameSite: 'none'` in production (same file, `getCookieOptions`), cross-site requests carry credentials, so the allowlist is load-bearing — and it can be spoofed as described. A cross-origin `fetch` from `https://findmedi.online.evil.com` therefore reaches state-changing endpoints authenticated as the victim.
- **Root Cause / Logic**: A missing `return`/`else` — the final `next()` was intended as the "already validated upstream" path but is reached by every request that has an Origin header. Branch (B) duplicates the condition already evaluated at (A), so it is unreachable-by-design and gives a false impression of a token requirement.
- **Affected Files**: `backend/src/middleware/csrf.js` (L12–L54), `backend/src/index.js` (L295–L296 — `GET /api/auth/csrf-token` and `/auth/csrf-token` are the only issuers), `frontend/src/api/axios.js` (L61–L63), `frontend/src/api/api.js` (L79–L80)
- **UI/Frontend Impact**: None visible — the frontend *does* fetch the `csrf-token` cookie and send `X-CSRF-Token` (verified in `axios.js` L61–63 and `api.js` L79–80), so the client-side half of double-submit is correctly implemented and simply not enforced server-side.
- **Security/Data Risk**: **Critical.** A complete, verified bypass of CSRF protection on all state-changing endpoints — including payments, prescription creation and admin actions — for a logged-in victim. The `req.path === '/upload'` exemption at L12–L15 also needs checking: the router is mounted at `/api/upload`, so `req.path === '/upload'` may be a no-op or may exempt an unintended route.
- **Steps to Reproduce**: 1) Log in, obtain the session cookie. 2) From an origin whose hostname starts with an allowlisted origin, issue a POST **without** the `X-CSRF-Token` header. 3) The request succeeds instead of 403. In non-production the allowlist is not enforced at all, so any origin works.
- **Suggested Fix / Implementation Plan**: Restructure to deny by default: validate `Origin`/`Referer` against an **exact-match** allowlist (parse `new URL(source).origin` and compare equality, never `startsWith`); then require `tokenFromCookie === tokenFromHeader` with a constant-time compare and `return 403` on any mismatch. Delete branch (B) entirely. Remove or correct the `/upload` early return. Bind the CSRF token to the session/user and rotate it on login. Add tests asserting 403 for: no token, mismatched token, `evil`-prefixed origin, and a missing Origin header.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Replace the trailing `next()` fallthrough with `return 403`
  - [ ] Exact-origin match (no `startsWith`) — share the allowlist parser with the CORS config
  - [ ] Constant-time token comparison
  - [ ] Remove the unreachable duplicate branch (B)
  - [ ] Fix or remove the `/upload` exemption
  - [ ] Rotate the CSRF token on login and bind it to the session
  - [ ] Tests for all four 403 cases

## [AUTH-018] Access tokens live in `localStorage`, so any XSS is an unrevocable account takeover
- **Description**: The frontend stores the JWT in `localStorage` (`frontend/src/api/axios.js` alone has 5 `localStorage.setItem` sites, with further direct storage in `AIChatPage.tsx`, `chatPrefs.js`, `UserDashboard.tsx`, `AIChatAssistant.tsx`, `PreferredPharmacyContext.tsx`, `PublicNavbar.tsx` and others) and attaches it as a `Bearer` header, while the backend *also* accepts the same token from a cookie (`protect` reads `req.cookies?.token` **first**, `middleware/auth.js` L10–L17). Two credentials with different exposure profiles are therefore in play: a cookie (sent automatically, CSRF-relevant) and a `localStorage` value (readable by any script on the page).
- **Current vs Expected**: Current = any script injected into the app can exfiltrate a long-lived bearer token. Tokens are self-contained JWTs with no server-side revocation list and there is no "sign out of all devices" (MISS-001), so an attacker keeps access until natural expiry even after the victim changes their password. Expected = refresh tokens in `httpOnly; Secure; SameSite` cookies with rotation, short-lived access tokens held in memory, and a real revocation path.
- **Flow**: Any XSS through user-generated content (chat messages, record `data`/`attachments` per REC-010, uploaded SVG, profile fields) escalates directly to persistent account takeover of a health-record-bearing account.
- **Root Cause / Logic**: Token storage chosen for client simplicity, with the dual cookie/Bearer acceptance in `protect` never consolidated into one strategy.
- **Affected Files**: `frontend/src/api/axios.js` (L47–L63), `frontend/src/api/api.js`, `frontend/src/features/auth/authSlice.js`, `backend/src/middleware/auth.js` (`protect`, L9–L23)
- **UI/Frontend Impact**: None directly, but it constrains the ability to adopt a CSP that forbids inline scripts — and a strict CSP is the main mitigation against exactly this exfiltration.
- **Security/Data Risk**: **High.** Full account takeover from a single XSS, not revocable by the user, on accounts holding medical data. The compensating control (a tight CSP) is weakened by the app's inline-script needs and by the absence of a CSP report endpoint (`MISS-010`).
- **Steps to Reproduce**: Inject any script into a rendered user-content field, read `localStorage`, then replay the token from another host.
- **Suggested Fix / Implementation Plan**: Move to `httpOnly; Secure; SameSite=Lax` cookies for the refresh token, keep the access token in memory only, and enable refresh-token rotation with reuse detection (MISS-002). Add a `tokenVersion`/`sessionId` claim validated in `protect` so tokens can be revoked (MISS-001). Migrate off `localStorage`, clear legacy keys on load, and ship a strict CSP with nonces.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Stop persisting tokens in `localStorage`; keep access tokens in memory
  - [ ] Refresh token in an `httpOnly; Secure; SameSite` cookie with rotation
  - [ ] `tokenVersion`/`sessionId` claim validated in `protect`
  - [ ] Strict CSP with nonces + a report endpoint
  - [ ] Purge legacy `localStorage` keys on app start
  - [ ] Reference note: `protect` otherwise performs real per-request work (blocked-status check, `isVerified`, doctor-approval check, 503 on DB failure) — a genuine strength worth preserving

## [AUTH-019] OTP + TOTP secrets `Math.random` se � predictable, seed-recoverable (utils/otp.js L1-18, napiOtpService.js L194-198)`r`n- **Description**: Login/verify OTP (`generateOTP`) aur TOTP `generateSecret` dono `Math.random()` se bante hain � CSPRNG nahi. `Math.random` V8 xorshift128+ hai: kuch outputs dekhkar internal state reconstruct ho sakta hai, aur ek hi millisecond me bane OTPs same seed-window share karte hain. `napiOtpService.generateOtp` ke upar comment me 'crypto randomness' likha hai par code me `Math.random` hai � comment-code mismatch audit ko bhi gumrah karta hai. Sirf login-OTP (`services/otpService.js`) `crypto.randomInt` use karta hai.`r`n- **Risk**: **High.** OTP prediction/account-takeover; user-enrolled TOTP secret brute-forceable (32-char alphabet, 20 chars, par weak PRNG).`r`n- **Fix**: sab jagah `crypto.randomInt`/`crypto.randomBytes` (base32 ke liye bytes?alphabet map); `utils/otp.js` aur `napiOtpService` ka generator ek `cryptoOtp()` helper me merge karo; comment-code mismatch par lint/test lagao.`r`n`r`n---`r`n`r`n## [AUTH-020] CORS origin-check me `endsWith` � `trusted.evil.com` bypass + localhost permanent allowlist (index.js corsOptions)`r`n- **Description**: `allowed.some(a => normalized.endsWith(a.replace(/^https?:\/\//,''')))` me host-part suffix match hota hai: attacker `https://findmedi.online.evil.com` register karke allowlist pass kar lega (string `...online.evil.com` ka suffix `findmedi.online` hai). Dusra, `defaultOrigins` me `http://localhost:5001/5173/3000` hamesha allowed hain � production me ye dev-backdoor hain. `!origin` requests blindly allow hain (curl/script ke liye theek, par yehi gap `csrfProtection` ke sath milkar browser-less CSRF ko cover nahi karta � AUTH-017 dekho).`r`n- **Risk**: **High.** Cross-origin credentialed requests + cookie `SameSite=None` (E1) = CSRF/session-riding ka rasta.`r`n- **Fix**: exact host match (`new URL(origin).hostname === allowlist-host`), localhost sirf `NODE_ENV !== production` me, `!origin` ko sirf safe-method/readonly par allow karo.`r`n`r`n---`r`n`r`n## [AUTH-021] ClamAV fail-open + `validateFileContent` unknown-type allow � malware path practically open (middleware/upload.js L87-151)`r`n- **Description**: `CLAMAV_HOST` unset ho to scan silently skip (`clean:true, skipped:true`); pehli scanner error ke baad `_clamavFailed=true` hamesha ke liye scan band kar deta hai. `validateFileContent` me jiska magic-signature map me entry nahi, wo `return true` (allow) � matlab allowlist me naya MIME add karte hi content-check bypass ho jata hai. `image/svg+xml` to list me hai hi nahi (L12-14 me), phir bhi upload.js/drive.js ke apne ad-hoc `fileFilter` sets alag hain � 3 jagah 3 allowlists, koi single source of truth nahi.`r`n- **Risk**: **High.** Stored-XSS/malware seeding medical-record attachments me; fail-open ka matlab scanner-down = protection-down.`r`n- **Fix**: scanner-missing/error par upload ko quarantine-queue me dalo (reject nahi to kam-se-kam downloadable nahi); unknown-type default-deny; teeno allowlists ko ek `FILE_UPLOAD_POLICY` config me merge karo; SVG ko text-sanitize karke hi allow karo ya block.`r`n`r`n---`r`n`r`n## [AUTH-022] Global body-sanitizer `sanitize-html` sab strings se HTML strip karta hai � data-corruption + bansiloval hissab se XSS-cover ka bhram (index.js L97-127)`r`n- **Description**: `sanitizeValue()` har request ke `body` + `query` par chalta hai aur sab strings se **saare tags/attributes strip** kar deta hai � including legitimate medical rich-text (`<b>`, dosage tables, discharge summaries), addresses me `<...>` literals, aur lab `notes`. Ye XSS-fix nahi, data-mangler hai: stored values silently badal jate hain, aur team ko lagta hai output-encoding ki zaroorat nahi (jo galat hai � context-aware escaping (HTML/JS/URL) ab bhi chahiye). Sath me `express.json({limit:'1mb'})` vs multer 25MB vs nginx 1MB � teeno limits alag, to badi JSON clinical payloads edge par kat sakti hain.`r`n- **Risk**: **Medium.** Silent clinical-data corruption; false sense of XSS-safety.`r`n- **Fix**: global strip hatao; validation zod me rakho; output-encoding ko template/PDF layer me (context-aware) enforce karo; teeno body-limits ko ek documented matrix me lao.`r`n`r`n---`r`n`r`n## [AUTH-023] Route-normalization middleware edge rate-limit + CSRF-scope ko bypass karta hai; `trust proxy` kahin set nahi (index.js L267-296 + D4 grep)`r`n- **Description**: Jo request `/api` prefix ke bina aaye (`/auth/login`, `/upload`...) wo server ke andar `/api/...` me rewrite ho jati hai. Matlab nginx ke `location /api/auth/` wala strict `5r/m` limiter bypass ho jata hai (request edge par `/auth/...` dikhti hai), aur CSRF/allowlist logic jo path par based hai wo bhi galat path dekh sakta hai. Dusra, poore repo me `trust proxy` set hi nahi � `req.ip` hamesha proxy-IP dega, to IP-based rate-limit/audit-IP galat honge (ye INFRA-003 ko confirm karta hai, code-evidence ke sath).`r`n- **Risk**: **High.** Edge throttle bypass + forensic IP loss � brute-force aur audit-trail dono par asar.`r`n- **Fix**: normalization ko sirf explicit allowlist prefixes par lagao ya hatao; nginx me bhi same locations mirror karo; `app.set('trust proxy', 1)` + `X-Forwarded-For` validation lagao; boot par effective `req.ip` ka self-test log karo.`r`n`r`n---`r`n`r`n## [AUTH-024] GRL fail-open + `trust proxy` absent = rate-limit attacker ke haath me (middleware/rateLimit.js L49-77 + index.js)`r`n- **Description**: Redis down/error par `logger.warn(... Passing through)` karke request aage badh jata hai � matlab Redis ko girakar saare in-app throttles off kiye ja sakte hain. `authLimiter` values bhi inconsistent hain (10/15/30/120 per-min alag-alag naam par), aur `api/auth` nginx-limiter se already mismatch hai. `trust proxy` absent hone se `binary_remote_addr`/GRL keys sab proxy-IP par collapse hote hain � shared throttle, targeted DoS (ek IP-pipe se poora hospital lock).`r`n- **Risk**: **High.** Availability + brute-force surface; Redis single-point-of-failure for all throttling.`r`n- **Fix**: auth/OTP/payment paths par fail-closed (Redis-down = 503 + alert); limiter values ko ek matrix-doc me lao; `trust proxy` fix ke baad real-IP keying verify karo; Redis health ko readiness-probe me dalo.`r`n`r`n---`r`n`r`n## [AUTH-025] `optionalProtect` silent `req.user=null` se public/private confusion + setup-token 48h window (middleware/auth.js L233-260, doctors.js L300, hospitals.js L302)`r`n- **Description**: `optionalProtect` token invalid/expired hone par 401 ki jagah `req.user=null` karke `next()` kar deta hai � handler ko decide karna padta hai ki caller anonymous tha ya expired-session wala; galti se ek branch me `null` user ko limited-data samajhkar zyada data de diya to auth-bypass. Dusra, `doctor_setup`/`ambulance_setup` tokens 48h valid hain aur single-purpose scope (`setup-only`) enforce nahi hota � agar ye token leak ho to 2 din tak onboarding-link se account-takeover/persistence ka rasta.`r`n- **Risk**: **Medium-High.** Auth-confusion bugs + long-lived bootstrap token ka misuse.`r`n- **Fix**: `optionalProtect` ko sirf explicitly-public routes par lagao + `req.authState = 'none'|'expired'|'valid'` set karo taaki handler farq kar sake; setup-tokens ko one-time-use + 2-4h expiry + purpose-claim (`aud: 'setup'`) ke sath enforce karo.`r`n`r`n---`r`n`r`n## [AUTH-026] Cookie flags theek, par JWT `jti` absent � refresh reuse-detect asambhav; `tokenHash` plaintext-save risk (routes/auth.js L135-160)`r`n- **Description**: Cookies `httpOnly+secure(prod)+SameSite` sahi hain � ye strength hai. Lekin access/refresh JWT me `jti` (unique token-id) claim nahi, isliye reuse/replay detect karne ka koi handle nahi (M102/MISS-002 ka root-cause). Dusra, `tokenHash: refreshToken` field-name suggest karta hai hash, par comment kehta hai 'will be hashed by pre-save hook' � agar hook kabhi skip/bypass ho (`insertMany`, direct update, ya hook-registration miss) to refresh-token plaintext DB me padega, aur DB-leak = session-forge.`r`n- **Risk**: **High.** Session-theft ka silent replay + credential-store me plaintext secret ka catastrophic leak-surface.`r`n- **Fix**: `jti: randomUUID()` har token me + server-side `usedJti`/family-record; `tokenHash` ko route-level par hi hash karke save karo (hook par bharosa nahi); DB me kabhi raw refresh-token assert karne wala CI-test lagao.`r`n`r`n---`r`n`r`n## [AUTH-027] Hospital/doctor list cache me admin-view poison + unauth data leak (doctors.js L78-88, hospitals.js L20-58)`r`n- **Description**: `cacheKey = doctors_list_${JSON.stringify(req.query)}` me caller-identity/role shamil nahi. `includeAll=true` wala admin-view bhi isi key-space me cache hota hai: pehle admin ne `includeAll` dekha to uska full-list (unapproved doctors sahit) cache me gaya; phir anonymous user same-query mare to `X-Cache: HIT` ke sath wahi full-list mil sakti hai � agar query-string byte-identical hui. Ulta bhi: public-view cache hone ke baad admin ko stale filtered-list. `setCache(...,300)` 5-min window deta hai. Hospitals-list me bhi same pattern (`status` sirf superadmin-token par filter hota hai, par cache-key me role nahi).`r`n- **Risk**: **High.** Unapproved-doctor/PII exposure + admin-decision stale-data par.`r`n- **Fix**: cache-key me `role+userId+hospitalId` hash shamil karo; admin-only views ko kabhi shared-cache me mat rakho (private/no-store ya per-user key); `includeAll` responses par `Cache-Control: private` lagao.`r`n`r`n---`r`n`r`n## [AUTH-028] Drive OAuth `state` unsigned hai � attacker apna Drive victim ke account se link kara sakta hai (drive.js L49-95)`r`n- **Description**: `/auth-url` me `state = base64({userId})` � sign nahi hota. `/callback` me state se `userId` nikal kar usi account me `driveTokens` save hote hain, aur fallback me cookie-JWT se bhi userId nikalta hai. Attacker flow: apne browser se victim-userId wala state banao (userId guess/enumerate karke) ? apne Google se OAuth complete karo ? victim ke account me attacker ka Drive linked; ya victim ko crafted `/auth-url`-link par click karao (CSRF, kyunki GET hai) ? victim ka Drive attacker-flow se jud jata hai. Callback par koi `protect`/nonce/PKCE-binding nahi.`r`n- **Risk**: **High.** Cloud-storage link-swap se PHI exfiltration/man-in-the-middle (reports attacker-Drive me jayenge).`r`n- **Fix**: `state` ko HMAC-sign karo (`userId+nonce+exp`), callback me verify + one-time-use; callback ko session-bound banao (login-state required); Drive-link ko re-auth/step-up ke sath confirm karwao.`r`n`r`n---`r`n`r`n## [AUTH-029] `/uploads` static guard me extension-bypass + fake-header auth � medical files public (index.js L297-306)`r`n- **Description**: Guard sirf `req.cookies?.token` ya `Authorization` header ki **presence** dekhta hai � signature verify nahi hota (`protect` yahan chalta hi nahi), to `Authorization: Bearer garbage` bhejkar bhi gate khul jata hai. Dusra, regex sirf `.(pdf|dcm|dicom|jpg|jpeg|png|gif)` match karta hai � `.webp/.svg/.txt/.doc/.xls`, query-string (`file.pdf?x=1`), uppercase trick ya double-extension (`report.pdf.exe`/`file.jpg.php`) alag behave kar sakte hain; `express.static` niche dotfiles/fallback-routing par bhi serve kar sakta hai. Local-fallback uploads (`saveFileLocally`) isi public path par likhe jate hain.`r`n- **Risk**: **High.** Medical-document disclosure + path/extension-confusion se XSS/malware delivery.`r`n- **Fix**: static se pehle real `protect` + record-ownership check (fileId?patientId) lagao; allowlist ko content-type + exact-path match par lao; `dotfiles:'deny'`, `index:false`, `fallthrough:false` set karo; signed short-lived URLs do.`r`n`r`n---`r`n`r`n## [AUTH-030] Mass-assignment sweep: 9 `findByIdAndUpdate(id, req.body)` + 20 `Object.assign(doc, req.body)` sites � role/hospital/owner sab client ke haath me (sweep result)`r`n- **Description**: Poore `backend/src` me `findByIdAndUpdate(req.params.id, req.body)` 9 files me hai (`beds`, `categories`, `cities`, `departments`, `featuredListings`, `licenses`, `loyalty-reward`, `platformCoupons`, `records`), aur `Object.assign(doc, req.body)` 20 sites par (`billing`, `insurance`, `lab` x3, `pharmacy` x5, `patients`, `patient`, `triage`, `ipd`, `inventory` x2, `payments`, `deliveryPartners`). Route-level `validate()` hone ke baad bhi extra keys (role/hospitalId/owner/status/price) pass ho sakte hain jahan schema `.passthrough()` hai ya field allowlist nahi hai. Ye REC-004 ka codebase-wide roop hai.`r`n- **Risk**: **High (systemic).** Privilege-escalation, tenant-hopping, price/status tampering � ek pattern, darjanon endpoints.`r`n- **Fix**: `.strict()` schemas + explicit allowlist-assign (`pick(req.body, [...])`); CI me `findByIdAndUpdate(*, req.body` + `Object.assign(*req.body` par fail; sensitive fields (`role`, `hospitalId`, `owner`, `status`, `price`) ko immutable-guard me dalo.`r`n`r`n---`r`n`r`n## [AUTH-031] Temp-password + booking/transaction IDs `Math.random` se � guessable credentials/refs (auth.js L1281, clinics/doctors/hospitals/platform/facilities + DemoPayment/RideBooking/LawyerBooking defaults)`r`n- **Description**: Google-signup + clinic/doctor/hospital/facility/admin create-flows me `Math.random().toString(36).slice(-10)` se temporary password banta hai (~50-bit effective entropy se bhi kam, timestamp-correlated). `DEMO-TXN/RID/LWB/ASB/DOC-SOS` IDs bhi `Math.random` se � 6-digit numeric space me collision + enumeration aasan; `demoPayment.js` me ek hi pattern 4 jagah hardcode hai (helper nahi). `lab.js:399` ka 4-digit delivery-OTP bhi isi PRNG se.`r`n- **Risk**: **High.** Temp-password guess/reset-abuse; transaction/booking-ref prediction se fraud-audit confusion aur IDOR-amplification.`r`n- **Fix**: temp-passwords `crypto.randomBytes` (12+ chars, alphanumeric+symbol) + first-login-force-reset; saare refs ke liye ek `secureId(prefix)` helper (crypto + timestamp + uniqueness-check); delivery-OTP ko server-secret HMAC + expiry ke sath bandho.`r`n`r`n---`r`n`r`n## [AUTH-032] Demo-seed passwords (`password`) + hardcoded secrets-sweep me 10 hits � seed/config ka prod-leak surface (demoSeedService.js L45-1072)`r`n- **Description**: `demoSeedService.js` me 10 jagah `password: 'password'` hardcode hai (doctors/ambulance/staff/patients). Agar seed-script kabhi prod/staging DB par chal gaya (ya dump leak hua) to saare seeded accounts ek known password se khul jayenge. Bachi secret-sweep me test-files ke bahar koi prod credential nahi mila � ye positive hai, par seed-path ko guard karna baki hai.`r`n- **Risk**: **Medium-High.** Known-password fleet + seed-rerun se real-data overwrite ka khatra.`r`n- **Fix**: seed sirf `NODE_ENV !== 'production'` + explicit `--allow-prod`-jaisa flag + `SEED_DEMO_PASSWORD` env se random password; seed ko idempotent + `isSeeded` marker ke sath banao; CI me `password: 'password'` par fail karo.`r`n`r`n---`r`n`r`n## [APPENDIX-A] Micro-fixes checklist (choti cheejein, ek-ek line me)`r`n- `console.*` sirf 44 sites (envValidator 8, featureFlags/upload/billing 4-4) � production me silent-fail kam, par `console.warn` (upload.js, drive.js) + `console.error` (drive callback, otpService x2) ko `logger` me badlo; `errorHandler.js` + `audit.js` ke console-calls bhi migrate karo.`r`n- `eval(`/`new Function`/`child_process` ka koi real use nahi mila (sirf Redis-lua `eval`, `.exec` regex-call, Cloudinary-URL `.exec`) � ye attack-surface **absent** hai (positive).`r`n- `TODO/FIXME/HACK` codebase me practically zero hain (sirf 1 unrelated `autoDownload` hit) � matlab known-debt markers ke bina silent shortcuts hain; `// NOTE` convention ko debt-register me badlo.`r`n- Hardcoded `password: 'password'` sirf seed me (10 hits) � prod-config me koi plaintext credential nahi mila (positive, AUTH-032 me guard-baki).`r`n- `res.cookie` flags sahi (`httpOnly+secure(prod)+SameSite`) � AUTH-026 dekho; kami sirf `jti`/reuse-handle ki hai.`r`n- Access-token 15m + refresh 7d sahi proportion me hain; setup-tokens 48h bahut lambe hain (AUTH-025).`r`n- Duplicate `app.use((req,res,next)=>` mount nahi mila (sirf 1 instance) � mount-duplication ka ?? khatm.`r`n- `/api/video` sirf `POST /token` + `GET /status` (dono `protect`) � LiveKit-join ka asli scope-check abhi verify-baki; video-room auth ko next pass me read karo.`r`n`r`n<!-- END -->
