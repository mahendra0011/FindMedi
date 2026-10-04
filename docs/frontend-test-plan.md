# Frontend test plan — Phase 5 suites (TEST-B-02 + FE-M-01 + CHAT-M-01)

**Date:** 2026-10-04. **Runner:** repo uses **npm** (`frontend/package.json`
`test` → `node scripts/run-vitest.cjs run`; `test:e2e` → `playwright test`).
Audit reports were closed out and removed. (repo rule:
audit-md mat chhedo) — this file is the Phase 5 suite index instead.

## Vitest (unit/component) — 9 files / 67 tests, all passing

| File | What it locks | IDs |
|---|---|---|
| `src/lib/bookingValidation.test.js` (12) | booking slot/date/mode, other-patient phone+age, payment method+amount+UPI, consent-gate logic, SOS GPS Rule 1 | TEST-B-02 |
| `src/components/consent/ConsentGate.test.jsx` (3) | submit disabled without checkbox; uncheck re-blocks; confidential scope needs an explicit share scope | FE-M-01 |
| `src/components/emergency/SOSFlow.test.jsx` (5) | SOS button a11y name + click; mode select → continue; vehicle-type zero-selection guard; toggle; GPS-missing payload invalid | FE-M-01 |
| `src/components/a11ySpotcheck.test.jsx` (5) | role-based a11y (named button/checkbox, `role=status` reason); mobile contract (fixed bottom-left FAB, touch-size classes) | FE-M-01 |
| `src/lib/chatResume.test.js` (6) | cursor store + sync payload; lookback fallback; queued-vs-failed classification; duplicate-delivery safe (`_id` and `clientGeneratedId`) | CHAT-M-01 |
| `src/lib/csrf.test.js`, `src/lib/fileUrl.test.js`, `src/components/bookingChat.test.jsx`, `src/components/EmojiPicker.test.jsx` | pre-existing (36 tests) — untouched | — |

Shared validators under test: `src/lib/bookingValidation.js:12,29,41,53,63`.
Resume contract: `src/lib/chatResume.js:43,48,56,67,97` + `docs/chat-reconnect-contract.md`.

## Playwright (browser, mocked API) — 12 tests, all passing (`--workers=1`)

`e2e/smoke.spec.ts` + `test-utils/helpers.ts` (`mockApiBaselineFor`, `istToday`,
`mockDoctorApproveList`, `mockAdminReports`):

- patient book: slot → who-is-this-for advances (role: `patient`).
- provider accept: pending card → Confirm → `PUT /appointments/:id` (role: `doctor`).
- admin report: category select → Export PDF visible (role: `hospital_admin`).
- mobile viewport 390×844: home boots, no horizontal overflow.

## Explicit non-coverage

These browser tests use mocked APIs: they prove UI journeys, **not** server
booking/payment persistence, provider settlement, Mongo races, or the full
route matrix. Backend suites own those. See `docs/lifecycle-parity.md` for
per-vertical lifecycle exceptions.
