# Frontend / UI-UX — Bugs

Scope: `frontend/src/api/{axios,api,security}.js`, `frontend/src/features/auth/authSlice.js`, `frontend/src/**` consumers of tokens and uploads.
Related backend findings: AUTH-018 (token storage), INFRA-004 (body-size mismatch), `AUTHZ-002` (inconsistent 403 payloads).

---

## [FE-001] The JWT is persisted in `localStorage` in multiple independent places
- **Description**: `localStorage.setItem` is used for token/session persistence in at least a dozen frontend modules — `api/axios.js` (5 sites), `AIChatPage.tsx` (5), `chatPrefs.js` (4), `UserDashboard.tsx` (3), `AIChatAssistant.tsx` (2), `PreferredPharmacyContext.tsx` (2), `PublicNavbar.tsx` (2), plus `TechnicianDetail.tsx`, `BookAssistant.tsx`, `cartSlice.js`, `PharmacyBusinessDashboard.tsx` and `Cart.tsx`. Because each module writes its own keys, no single owner exists for the session lifecycle, so clearing a session is a distributed responsibility.
- **Current vs Expected**: Current = the access token is readable by any script on the page, with no central revocation or cleanup path. Expected = refresh token in an `httpOnly; Secure; SameSite` cookie, access token in memory only, and one session module as the sole writer of persisted state.
- **Flow**: Every authenticated request; any XSS — including one delivered through user-generated content rendered in these same components — escalates to full account takeover (AUTH-018).
- **Root Cause / Logic**: `localStorage` was the path of least resistance for a SPA, and each feature area added its own keys rather than depending on a shared auth module.
- **Affected Files**: `frontend/src/api/axios.js`, `frontend/src/api/api.js`, `frontend/src/features/auth/authSlice.js`, and the components listed above
- **UI/Frontend Impact**: Cross-tab logout and "remember me" behaviour are inconsistent, and stale keys survive logout in modules that do not know about them.
- **Security/Data Risk**: **High.** Unrevocable bearer tokens exfiltratable by any script, on accounts holding medical data. It also blocks a strict CSP — the main mitigation for the exfiltration route itself.
- **Steps to Reproduce**: Log in, open DevTools → Application → Local Storage, read the token, then replay it from `curl`.
- **Suggested Fix / Implementation Plan**: Centralise session state in one module; move the refresh token to an `httpOnly` cookie (requires MISS-001/MISS-002); keep the access token in memory; purge legacy `localStorage` keys on boot; add a boot-time assertion that no token-shaped value remains in `localStorage`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Single session module owning all persisted auth state
  - [ ] Access token in memory; refresh token in an `httpOnly` cookie
  - [ ] Purge legacy keys on start; assert none remain
  - [ ] Update every component that reads keys directly
  - [ ] Cross-tab logout/refresh handling

---

## [FE-002] Two parallel HTTP clients duplicate the auth and CSRF interceptor logic
- **Description**: `frontend/src/api/axios.js` and `frontend/src/api/api.js` each implement their own instance, each read the `csrf-token` cookie via `getCookie(...)` and set the `X-CSRF-Token` header, and each attach the Bearer token (`axios.js` L47–L63; `api.js` L53–L80). A comment in `frontend/src/features/map/mapSlice.js` records the consequence: code that used `bare fetch` bypassed the configured base URL *and* the CSRF header, which is why it was migrated to `apiClient`.
- **Current vs Expected**: Current = two clients with drifting behaviour, so a change (new header, retry policy, error shape) must be made twice, and any missed call site silently sends an unauthenticated or CSRF-less request. Expected = one client module with a documented interceptor chain that all feature code consumes.
- **Flow**: Every request from every feature; the `mapSlice.js` comment proves this failure mode has already occurred once.
- **Root Cause / Logic**: A second instance was created rather than extending the first, and some modules kept using `fetch` directly.
- **Affected Files**: `frontend/src/api/axios.js`, `frontend/src/api/api.js`, `frontend/src/features/map/mapSlice.js` (as evidence), every file importing either
- **UI/Frontend Impact**: Silent 401/403s in the affected features with no user-visible explanation.
- **Security/Data Risk**: **Medium–High.** Requests that miss the CSRF header are precisely the requests that currently pass anyway (`AUTH-017`), so consolidating the client is a **precondition** for trusting the CSRF fix: otherwise a corrected server will start breaking whichever features still use the second client or bare `fetch`.
- **Steps to Reproduce**: `grep -rn "fetch(" frontend/src` and cross-check each call site for base-URL and header handling; compare the two interceptor chains side by side.
- **Suggested Fix / Implementation Plan**: Delete the duplicate client, re-export a single instance, migrate all direct `fetch` call sites (the `mapSlice.js` comment shows the intended pattern), and add an ESLint rule banning bare `fetch`/`axios` imports outside `api/`. Land this **before** the CSRF server fix so both changes are tested together.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Single HTTP client instance
  - [ ] Migrate all direct `fetch` call sites
  - [ ] Lint rule banning bare `fetch`/`axios` outside `api/`
  - [ ] Shared error/retry handling per status class
  - [ ] Re-test the SPA against the corrected CSRF middleware

<!-- END -->
