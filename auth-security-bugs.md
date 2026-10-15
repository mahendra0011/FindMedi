# Auth & Security — Bugs

## [SEC-BUG-01] Error Message Leak Exposing Internal DB Driver & Stack Details (1000+ Instances)
- **Description**: Catch blocks across authentication, user management, and authorization routes return raw `err.message` in 500 error responses instead of an opaque error ID and sanitized message.
- **Current vs Expected Behavior**:
  - *Current*: `return res.status(500).json({ message: err.message });` dumps MongoDB connection strings, schema validation errors, duplicate key values, and internal collection names to the caller.
  - *Expected*: Generic response `res.status(500).json({ message: 'Internal server error', correlationId: req.id });` while logging detailed traces only to pino internal sink.
- **Flow**: User login, password reset, 2FA validation, token refresh, and profile fetch.
- **Root Cause / Logic**: Missing widespread adoption of `sendServerError(res, err, fallback)` middleware helper; developers copy-pasted bare `res.status(500).json({ message: err.message })`.
- **Affected Files**: `backend/src/routes/auth.js`, `backend/src/routes/users.js`, `backend/src/routes/recon.js`, `backend/src/routes/adminSecurity.js`, `backend/src/routes/apiKeyAuth.js`
- **UI/Frontend Impact**: Error toasts display cryptic technical details (e.g. `MongoServerError: E11000 duplicate key error collection: findmedi.users index: email_1 dup key...`).
- **Security/Data Risk**: **High**. Information disclosure. Attackers can map internal schema fields, detect whether an email/phone exists via duplicate key error messages (user enumeration), and discover database cluster topography.
- **Steps to Reproduce**:
  1. Send a malformed ObjectId or duplicate key to `POST /api/auth/register` or `POST /api/recon/accounts`.
  2. Inspect the JSON response body.
  3. Observe raw Mongo error string returned.
- **Suggested Fix / Implementation Plan**:
  1. Enforce `sendServerError` utility across all catch blocks.
  2. Add Express global error handler fallback in `backend/src/middleware/errorHandler.js` that scrubs `err.message` in production (`NODE_ENV === 'production'`).
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Update `auth.js` catch blocks to use `sendServerError`.
  - [ ] Add pre-commit AST lint rule prohibiting `res.status(500).json({ message: err.message })`.
  - [ ] Verify scrubbed responses in staging.

---

## [SEC-BUG-02] Token and Session Secret Storage in Plaintext Browser LocalStorage
- **Description**: The frontend web application stores both access JWT tokens and refresh tokens in `window.localStorage` under keys `token` and `refreshToken`.
- **Current vs Expected Behavior**:
  - *Current*: `localStorage.setItem('token', data.token)` and `localStorage.setItem('refreshToken', data.refreshToken)`.
  - *Expected*: Access token kept exclusively in memory (React State / Redux / Zustand), and refresh token stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie.
- **Flow**: User login, auto-login, silent refresh.
- **Root Cause / Logic**: Rapid MVP client implementation relied on localStorage for persistent sessions without considering XSS session hijacking.
- **Affected Files**: `frontend/src/context/AuthContext.tsx`, `frontend/src/lib/api.ts`, `frontend/src/mind/context/MindAuthContext.tsx`
- **UI/Frontend Impact**: No direct UI change, but prevents token theft if any XSS occurs.
- **Security/Data Risk**: **High**. Complete Account Takeover (ATO). Any Cross-Site Scripting vulnerability (including CDN script compromise or supply-chain malicious package) can execute `localStorage.getItem('token')` and transmit credentials to an attacker-controlled server.
- **Steps to Reproduce**:
  1. Open DevTools in browser on `https://findmedi.online/`.
  2. Run `console.log(localStorage.getItem('token'))`.
  3. Observe the bearer token printed in cleartext.
- **Suggested Fix / Implementation Plan**:
  1. Issue refresh tokens with `res.cookie('refreshToken', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth/refresh' })`.
  2. Store access token strictly in React memory variable.
  3. Clear tokens and React Query cache on logout.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Refactor `backend/src/routes/auth.js` `/login` and `/refresh` to use `httpOnly` cookie.
  - [ ] Remove `localStorage.getItem('token')` in `frontend/src/lib/api.ts`.
  - [ ] Clear query cache on logout (`queryClient.clear()`).

---

## [SEC-BUG-03] CSPRNG Violation Using `Math.random` in OTP & Token Generator Fallbacks
- **Description**: `Math.random()` is used to generate random session IDs, simulation identifiers, and OTP fallbacks.
- **Current vs Expected Behavior**:
  - *Current*: `Math.random().toString(36).slice(2, 8)` in `smsProvider.js`, `whatsappProvider.js`, and mock token generators.
  - *Expected*: Standard cryptographically secure pseudorandom number generators (`node:crypto` `crypto.randomInt` or `crypto.randomBytes`).
- **Flow**: SMS and WhatsApp notification delivery, mock OTP verification.
- **Root Cause / Logic**: Use of standard JavaScript `Math.random()` which is PRNG (not cryptographically secure) and can be predicted if PRNG state is known.
- **Affected Files**: `backend/src/services/smsProvider.js:20`, `backend/src/services/whatsappProvider.js:20`, `backend/src/routes/auth.js:142`
- **UI/Frontend Impact**: None directly.
- **Security/Data Risk**: **Medium**. Predictable token/ID generation allows an attacker with partial knowledge of the pseudo-random generator state to anticipate message IDs or session simulation tokens.
- **Steps to Reproduce**:
  1. Trigger 10 simulated SMS sends.
  2. Inspect message ID suffixes generated with `Math.random().toString(36)`.
- **Suggested Fix / Implementation Plan**:
  1. Replace all occurrences of `Math.random()` with `crypto.randomBytes(8).toString('hex')` or `crypto.randomInt(100000, 999999)`.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Audit all files using `git grep Math.random`.
  - [ ] Replace `Math.random` in `smsProvider.js` and `whatsappProvider.js`.
  - [ ] Add ESLint rule `no-restricted-properties` banning `Math.random`.

---

## [SEC-BUG-04] Insufficient Tenant Isolation in Staff Verification Queries
- **Description**: Several hospital staff and doctor retrieval queries query by `_id` without filtering by `hospitalId` or verifying that the requester's tenant matches the requested record's tenant.
- **Current vs Expected Behavior**:
  - *Current*: Staff lookup endpoints query `User.findById(req.params.id)` and return doctor/staff info without validating `user.hospitalId === req.user.hospitalId`.
  - *Expected*: All staff queries must enforce tenant scoping: `User.findOne({ _id: req.params.id, hospitalId: req.user.hospitalId })`.
- **Flow**: Hospital Admin viewing doctor/staff profiles and scheduling shifts.
- **Root Cause / Logic**: Assuming staff IDs are private and cannot be forged across hospitals.
- **Affected Files**: `backend/src/routes/doctors.js`, `backend/src/routes/staff.js`, `backend/src/routes/adminSecurity.js`
- **UI/Frontend Impact**: Hospital staff from Hospital A can see profile, contact, and internal schedules of staff from Hospital B.
- **Security/Data Risk**: **High**. Cross-tenant data leak and horizontal privilege escalation.
- **Steps to Reproduce**:
  1. Log in as Hospital Admin of Hospital 1.
  2. Request `GET /api/doctors/:doctorIdOfHospital2`.
  3. Endpoint returns Doctor from Hospital 2 without 403/404 error.
- **Suggested Fix / Implementation Plan**:
  1. Attach `tenantScope` middleware to `doctors.js` and `staff.js` routes.
  2. Enforce `hospitalId: req.user.hospitalId` for non-superadmin actors.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add tenant assertions in `doctors.js`.
  - [ ] Add cross-tenant test asserting 404 on mismatched tenant queries.
