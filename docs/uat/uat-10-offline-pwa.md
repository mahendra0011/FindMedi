# UAT Flow 10: Progressive Web App (PWA) Offline Operation & Sync

## Objective
Verify offline service worker caching, clinical form entry without internet connectivity, persistent IndexedDB queue, and seamless background reconciliation upon reconnection.

## Preconditions
- Device: Chrome/Edge browser on Windows tablet or desktop.
- Authenticated clinical session (`doctor` or `nurse`).
- Pre-cached offline assets and local clinical formulary.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/forms` | Nurse | Load clinical forms while online. Confirm Service Worker installs and caches bundles. | App console confirms service worker active; offline storage initialized. | [ ] |
| 2 | Browser DevTools | Tester | Disable network connection (Set browser to "Offline" mode). | Persistent yellow `Offline Mode — Local Storage Active` status banner appears. | [ ] |
| 3 | `/forms` | Nurse | Open "Inpatient Nursing Vitals Assessment" form. Fill patient observations and click Save. | Record saved to client IndexedDB store; queued sync counter increments to `1 pending`. | [ ] |
| 4 | `/forms` | Nurse | Navigate to offline draft list and verify saved vitals remain accessible. | Offline records render without network error or page crash. | [ ] |
| 5 | Browser DevTools | Tester | Re-enable network connection (Set browser back to "Online"). | `Reconnected` toast appears; queued IndexedDB entries post automatically to backend. | [ ] |
| 6 | `/nursing` | Nurse | Inspect backend patient chart on server. | Offline vitals appear in canonical timeline with accurate original capture timestamp. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
