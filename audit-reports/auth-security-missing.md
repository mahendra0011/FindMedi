# Auth & Security — Missing Features

Scope: absent or unimplemented capabilities (as opposed to defects) in authentication, session management, MFA, and security operations.
Companion file: `auth-security-bugs.md` (16 findings).

---

## [MISS-001] No session management: users cannot see or revoke active sessions
- **Description**: `models/RefreshToken.js` stores only `userId`, `tokenKey`, `tokenHash`, `expiresAt` — no device name, no user agent, no IP, no last-used timestamp, no session id. There is no endpoint to list sessions, revoke a single session, or "sign out of all devices". A user who believes their account is compromised has exactly one tool: change the password — and even then nothing invalidates existing refresh tokens (the model has no `tokenVersion` and there is no revocation path).
- **Why it matters**: This is the *first* control a user reaches for on a health app after a device is lost or a password is phished. Its absence means "logged in elsewhere" is unanswerable and irreversible from the product.
- **Expected**: `GET /api/auth/sessions` → list with device, IP, last active; `DELETE /api/auth/sessions/:id`; `POST /api/auth/logout-all`. A password change must revoke all other sessions.
- **Suggested implementation**: Add `deviceLabel`, `userAgent`, `ip`, `lastUsedAt`, `revokedAt` and a `familyId` to `RefreshToken`; add the three endpoints; include a `tokenVersion` on `User` bumped on password/2FA change, checked in `protect`. Surface a "Security & devices" page in frontend settings.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Extend `RefreshToken` with session metadata
  - [ ] `GET`/`DELETE /api/auth/sessions`, `POST /api/auth/logout-all`
  - [ ] `tokenVersion` on `User`, verified in `protect`
  - [ ] Revoke all other sessions on password change and 2FA disable
  - [ ] Frontend "Security & devices" screen

---

## [MISS-002] No refresh-token rotation or reuse detection
- **Description**: A grep for `rotate`, `jti`, `tokenFamily` and reuse-detection logic across the backend returns nothing in the auth path. `openapi.js` L221 documents an operation named *"Rotate refresh token"*, so the API surface advertises a capability the implementation does not have. Rotation without reuse detection is also incomplete: the security value comes precisely from detecting a replayed old token.
- **Why it matters**: A stolen refresh token is valid until natural expiry with no way to detect the theft. Long-lived tokens in a healthcare context extend the window for silent account access.
- **Expected**: On every refresh, issue a new token and invalidate the presented one; if a previously-used token is presented again, revoke the entire family and raise a security event.
- **Suggested implementation**: Add `familyId`, `replacedBy`, `usedAt` to the model; implement rotation-and-detect in the refresh handler; emit `auditLog('refresh_token_reuse_detected', ...)` and force a full logout.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement rotation on every refresh
  - [ ] Family-based reuse detection + full-family revocation
  - [ ] Align `openapi.js` with reality
  - [ ] Test: replay an old refresh token → all sessions revoked

---

## [MISS-003] No account-level lockout or progressive throttling on failed logins
- **Description**: A grep for `loginAttempts`, `failedAttempts`, `lockUntil` and `accountLocked` across the entire backend returns **zero** matches. There is no per-account failure counter, no exponential backoff, no temporary lock and no CAPTCHA escalation. Protection is IP-based only — and that layer is itself broken (`AUTH-004`, `AUTH-005`).
- **Why it matters**: Distributed credential stuffing (one attempt per IP across a proxy pool) is unmitigated, and a targeted attacker can make unlimited guesses against a known patient's email.
- **Expected**: Per-account counters with exponential backoff, a temporary lock after N failures, notification to the account owner, and lockout state in the audit trail.
- **Suggested implementation**: `loginAttempts`/`lockedUntil` on `User`, incremented on failure and reset on success; a backoff helper; a security email on lockout; CAPTCHA after 3 failures.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add `loginAttempts`, `lockedUntil`, `lastFailedLoginAt` to `User`
  - [ ] Enforce lockout on both the password and OTP login paths
  - [ ] Exponential backoff + CAPTCHA escalation
  - [ ] Notify on lockout and on new-device sign-in
  - [ ] Tests for counter reset and lock expiry

---

## [MISS-004] No password strength policy, no breach check, no history
- **Description**: Password validation is limited to a zod minimum length. There is no complexity/entropy requirement, no check against breached-password corpora (k-anonymity, e.g. HIBP), no password history to prevent immediate reuse, and no forced rotation for privileged roles. Combined with the predictable-password generation issues in `AUTH-010`, weak credentials are neither prevented nor detected.
- **Why it matters**: The weakest credential defines the system's security, and health records raise the impact of a single guess.
- **Expected**: A minimum entropy/passphrase policy, a breach check at set/change time, history of the last N hashes, stricter rules for `admin`/`doctor`.
- **Suggested implementation**: A shared `validatePasswordStrength()` in `utils/` used by register/reset/change, with the breach API behind a timeout and a documented fail-open/closed choice; keep the last 5 bcrypt hashes in `passwordHistory`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Shared strength validator (length + entropy + common-pattern blocklist)
  - [ ] Breached-password check at set/change time
  - [ ] `passwordHistory` with reuse prevention
  - [ ] Stricter policy for privileged roles
  - [ ] User-facing strength meter in the frontend

<!-- END -->
