# MediCore Codebase — Comprehensive Security & Code Audit Report

**Date:** 2024-07-24  
**Repository:** mediCore (https://github.com/mahendra0011/mediCore.git)  
**Scope:** Backend services, routes, models, middleware, frontend modules, build system, dependency graph, security architecture  
**Excluded per request:** live chat, real payment gateway, demo accounts, separate login pages  

---

## Executive Summary
The codebase is a large hospital-management platform (~76,700 lines total, ~224 React frontend files, ~135 backend files). The scan surfaced **one critical security exposure** (committed secrets), **one blocking build failure** (missing `react-is`), **one dependency conflict** blocking fresh installs, plus a wide set of smaller structural, security, and UX issues. User feedback was cross-checked against current code; several claimed issues were found to be **already fixed or incorrectly characterized** in the live code.

---

## 🔴 CRITICAL (fix immediately before any deployment / sharing)

1. **Production secrets committed in Git history (SECRET LEAK)**
   - Severity: CRITICAL
   - A prior commit included a real `server/.env` containing MongoDB Atlas URI (with credentials), `JWT_SECRET`, Cloudinary API key/secret, and a Gmail SMTP app password. A later commit deleted the file from the tree but did not rewrite history; the file remains recoverable from git history. The repo is public, so these credentials must be treated as compromised.
   - **Remediation:**
     - Rotate all exposed credentials (MongoDB password, JWT_SECRET, Cloudinary key/secret, Gmail app password).
     - Scrub the file from history with `git filter-repo` or BFG Repo-Cleaner, then force-push.
     - Confirm `.env` is in `.gitignore`.

2. **Production build broken (missing `react-is`)**
   - Severity: CRITICAL
   - `recharts` imports `react-is`, but it is not declared in `package.json` and is not installed. With Vite 8/Rolldown this is a hard build failure, not a warning. Verified by build scan.
   - **Remediation:** Add `react-is` as an explicit client dependency (or upgrade `recharts`).

3. **Fresh install fails due to dependency conflict**
   - Severity: CRITICAL
   - `@vitejs/plugin-react-swc@3.11.0` supports Vite `^4-^7` only; the lockfile pins Vite `^8.1.5`. Vanilla `npm install` in the client ends in `ERESOLVE` without `--legacy-peer-deps`.
   - **Remediation:** Upgrade `@vitejs/plugin-react-swc` to a Vite 8-compatible version.

4. **CI pipeline fails before running tests/build**
   - Severity: CRITICAL
   - The documented CI workflow cannot complete because the client install fails on the peer-dependency mismatch (#3 above). Server-side test job is also blocked by environment resolution issues. Verified by simulating CI install steps locally.
   - **Remediation:** Fix #3 first; then add an actual `npm run build` step so CI catches build regressions.

---

## 🟠 HIGH (fix soon)

5. **Doctor bulk-registration flows use weak randomness and may not deliver credentials**
   - Severity: HIGH
   - Bulk-import / "Join Platform" registration creates users with temporary passwords generated via `Math.random()`. The code path does not reliably send an email with the temp password or an invite link, leaving those doctors unable to log in.
   - **Remediation:**
     - Use `crypto.randomInt` / `crypto.randomBytes` for any security-sensitive random values.
     - Always send a "set password" or verification email on bulk registration.

6. **Email service silently falls back to simulation mode**
   - Severity: HIGH
   - If `BREVO_API_KEY` is missing and simulation mode is enabled, `sendEmail` returns `{ success: true, simulated: true }`. In production, transactional emails (OTP, prescriptions, lab reports, discharge summaries) may silently not send while upstream code treats the call as successful.
   - **Remediation:** Ensure production does not enable simulation mode; add delivery-failure alerting/health checks.

7. **JWT secrets have unsafe fallback defaults**
   - Severity: HIGH
   - `tokenService.js` falls back to `'access-secret-change-me'` and `'refresh-secret-change-me'`. If env vars are missing, tokens can be forged.
   - **Remediation:** Fail fast at startup if secrets are unset; remove fallback defaults.

8. **Dead imports / dead-end links**
   - Severity: MEDIUM-HIGH
   - `server/index.js` does **not** currently import the `Report` model. Some UI files contain placeholder social-icon links (`href="#"`), which are dead ends.
   - **Remediation:** Remove dead imports/links.

---

## 🟡 MEDIUM

9. **ESLint: 2 errors + ~47 warnings**
   - Severity: MEDIUM
   - Errors: unused `token` param in `AuthContext.jsx`, empty `catch` in `authSlice.js` swallowing logout errors. Warnings: many missing `useEffect`/`useMemo` deps.
   - **Remediation:** Fix errors; enable strict hooks linting and address dependency arrays.

10. **Bundle size: large chunks without code-splitting**
    - Severity: MEDIUM
    - Multiple chunks exceed 500KB–1MB+. Routes/views do not appear to use dynamic imports for heavy maps/charts.
    - **Remediation:** Implement route-based code splitting and dynamic imports for heavy features.

11. **Analytics data source unverified**
    - Severity: MEDIUM
    - `LabReportsAnalytics.jsx` and `PharmacyAnalytics.jsx` contain data-generation functions; it is unverified whether charts consume live backend data or mocked data.
    - **Remediation:** Wire explicitly to backend endpoints and make data-source explicit.

12. **`sendEmail` swallows errors and returns objects**
    - Severity: MEDIUM
    - This degrades observability: critical transactional emails may fail without surfacing to callers.
    - **Remediation:** Re-throw after logging for critical email flows, or ensure callers check `success`.

13. **CORS defaults are permissive in development, but production origin enforcement is weak if env vars are missing**
    - Severity: MEDIUM
    - In `server/index.js`, production CORS falls back to an empty allowlist and only logs an error. Socket.IO also defaults to `localhost`.
    - **Remediation:** Fail startup if `CLIENT_URL`/`CORS_ORIGIN` is unset in production.

14. **No global input validation middleware**
    - Severity: MEDIUM
    - Rely on Mongoose schema validation only. No express-validator/Zod/Joi at the route layer for type/length/business-rule prechecks.
    - **Remediation:** Add validation middleware for critical inputs.

15. **Hard-coded hospital metadata in PDF service**
    - Severity: LOW-MEDIUM
    - `pdfService.js` contains static hospital name/address/phone/email. Multi-tenant deployments need tenant config.
    - **Remediation:** Load hospital metadata from settings/config.

16. **Unnecessary `node-fetch` in PDF service**
    - Severity: LOW
    - Node 18+ has global `fetch`. Removing `node-fetch` reduces dependency surface.
    - **Remediation:** Replace `node-fetch` with global `fetch`.

17. **Missing rate limiting on some auth-adjacent endpoints**
    - Severity: MEDIUM
    - OTP routes are rate-limited, but login/password-reset paths should also have explicit throttling.
    - **Remediation:** Add/confirm rate limiting on login and password reset routes.

---

## 🟢 LOW / CODE QUALITY

18. **Frontend: widespread `console.error` usage**
    - Severity: LOW
    - 131 matches across JSX pages. Many are inside `catch` blocks with no user-facing fallback beyond toast or silent swallow.
    - **Remediation:** Centralize error handling/logging; avoid noisy console output in production.

19. **Frontend: potential dead-end links**
    - Severity: LOW
    - Social-icon links using `href="#"` were claimed in feedback; current codebase shows no active `href="#"` matches, suggesting they were cleaned up or were in files no longer present.
    - **Remediation:** None needed if already resolved; continue linting for placeholder links.

20. **General code hygiene**
    - Severity: LOW
    - Dead routes/fields, large unmaintained modules, inconsistent error responses.
    - **Remediation:** Periodic usage audit + cleanup sprints.

---

## Verified: Claims From Feedback That Do NOT Reflect Current Code

| Claim | Current code state |
|-------|-------------------|
| `GET /api/beds` and `/api/beds/stats` are unauthenticated | **False.** `server/routes/beds.js` applies `protect` + `scopeToHospital` to both routes (lines 8 and 24). |
| IPD clinical routes (`vitals`, `mar`, `io`, `nursing-notes`, `wound-care`) lack role checks | **False.** All five routes use `protect, clinicalStaffOnly` (lines 190, 203, 216, 229, 255 in `server/routes/ipd.js`). |
| `Report` model is dead-imported in `server/index.js` | **False.** `server/index.js` does not import `Report`. |
| `helmet`, `express-mongo-sanitize`, etc. are in root `package.json`, blocking server start | **False.** These packages are correctly declared in `server/package.json`. `server/index.js` imports them successfully. |
| `node-fetch` is required in `pdfService.js` for signature image download | **True** (listed above as #16), but Node 18+ global `fetch` makes it unnecessary. |

---

## STRUCTURAL SCAN SUMMARY (Backend)

- **Backend files reviewed:** services (8 files), routes (~50 files), middleware (`auth.js`, CSRF, error handler), models, config, utils.
- **Good practices observed:**
  - JWT + refresh token architecture (`tokenService.js`).
  - TOTP 2FA + backup codes (`twoFactorService.js`).
  - Email notifications for key clinical events (`notificationService.js` + templates).
  - Socket.IO initialized on the HTTP server (`socketService.js`).
  - Global security middleware in `server/index.js` (helmet, mongo sanitization, XSS sanitization, rate limiting, CSRF).
  - Comprehensive role-check middleware (`adminOnly`, `clinicalStaffOnly`, `superadminOnly`, `scopeToHospital`, `canAccessRecord`, `canAccessPatient`).
- **Observed weaknesses:**
  - Secrets in git history (critical).
  - Build breakage due to missing dependency.
  - Client dependency lock incompatible with Vite 8.
  - CI workflow blocked before tests/build.
  - Email simulation-mode risk.
  - Weak fallback secrets.
  - No global route-layer validation.
  - Frontend error logging is noisy.

---

## REMAINING WORK (frontend + feature-level audits)
- Billing, Inventory, IPD, OPD, Pharmacy, Lab, Radiology, Blood Bank, Staff, Insurance, Reports, Settings, SuperAdmin dashboards.
- Role-specific pages for broken CRUD flows, missing UI states, authorization edge cases, form validation, and analytics/data-source verification.
- Excluded areas (chat, real payment gateway, demo accounts, separate login pages) remain un-reviewed as requested.

If you want, I can now create targeted patches for items #2, #3, #4, #6, and #7.