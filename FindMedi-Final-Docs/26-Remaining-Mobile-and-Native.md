# 26 — Remaining from Docs 01–15: Mobile & Native

> **What this file is:** the four incomplete items that remain in the Mobile/Native scope of `15-Mobile-App-Strategy.md` after a codebase + test + Chrome re-verification (2026-11-15). Everything else in doc 15 is implemented and verified: PWA manifest + SW, web push (VAPID), chunked/compressed uploads, offline queue, biometric settings UI, Capacitor Android shell, FLAG_SECURE plugin + 17 route-matcher tests, attestation endpoint (fail-closed 503), force-update gate, CI/CD plan.
> **Source of truth for status:** `15-Mobile-App-Strategy.md` (restored in full) — its `[ ]` checkboxes are unchanged; nothing is hidden or deleted. See `00-Reference/FindMedi-Open-Items.md` for the complete 46-item open-items inventory across all docs.
> **Rule:** close an item only when its completion evidence is referenced in the source doc.

---

## M1 — Native SMS Retriever / OTP autofill bridge (Android)
- **Source:** `15-Mobile-App-Strategy.md:134` (`[ ]` line).
- **Current state (verified 2026-11-15):** no native SMS Retriever / OTP-autofill bridge exists in the repo. Java/`JAVA_HOME` unavailable in this environment, so even a compile could not be attempted.
- **Close when:** Kotlin implementation of SMS Retriever API in `frontend/android/`, wired to the login/signup OTP flow (auto-read SMS, zero user action), built and installed on a physical device, autofill observed working, code referenced from doc 15.

## M2 — Background-location spike for rider/ambulance apps
- **Source:** `15-Mobile-App-Strategy.md:136` (`[ ]` line).
- **Current state (verified 2026-11-15):** no native location service exists in the repo and there is no device-test evidence for background location, battery impact, doze-mode behavior, or permission flows.
- **Close when:** a spike branch exists with foreground-service location updates + offline queue behavior; device evidence (battery %/hr, doze-mode delivery, permission denial handling) is recorded; decision memo on whether rider/ambulance apps need Capacitor plugins vs native module documented.

## M3 — Android `FLAG_SECURE` — compile + physical-device verification
- **Source:** `15-Mobile-App-Strategy.md:138` (`[ ]` line).
- **Current state (verified 2026-11-15):** `SensitiveScreenPlugin.java` (native plugin) and `SensitiveScreenGuard` exist; 17 route-matcher tests pass in the suite. Gradle compile **could not run** — Java/JAVA_HOME unavailable. Screenshot-prevention on sensitive screens is unverified on real hardware.
- **Close when:** `./gradlew assembleDebug` (or release) compiles clean; APK installed on a physical device; screenshot / screen-recording attempt on a sensitive screen is blocked (recorded evidence).

## M4 — Play Integrity / App Attest (rider + field apps)
- **Source:** `15-Mobile-App-Strategy.md:139` (`[ ]` line).
- **Current state (verified 2026-11-15):** server side — `backend/src/routes/attestation.js` `POST /api/attestation/verify` exists and fails closed (`503 ATTESTATION_NOT_CONFIGURED`) until credentials are provisioned; stable verdict contract; plausible-location gates live in `riders.js` (`>250m accuracy` / `>180 km/h velocity` rejected) with tests. Native client bridge (Android Play Integrity API) and real-device verification do not exist.
- **Close when:** Play Integrity SDK wired in Android client; `PLAY_INTEGRITY_*` credentials configured for the environment; verify endpoint returns `verdict: 'ok'` on genuine device and fails closed on rooted/emulator/tampered instances; device-test evidence recorded in the doc.

## M5 — Store listings, Data Safety/Privacy labels, review demo accounts
- **Source:** `15-Mobile-App-Strategy.md:140` (`[ ]` line).
- **Current state (verified 2026-11-15):** Capacitor Android shell + biometric settings UI exist; no Play Console/App Store Connect accounts, store listings, Data Safety/privacy nutrition labels (accuracy against real data flows), review demo accounts, or staged rollout exist.
- **Close when:** accounts created; hi/en store listings submitted; Data Safety + privacy nutrition labels filled accurately (coordinate with `docs/privacy/` DPIA + privacy-policy alignments); review demo accounts provided; staged rollout or evidence of store submission recorded in the doc.

---

**Verification context (2026-11-15):** public UI/PWA surfaces verified in Chrome (home, search with live provider results, join-platform 103 types, facility detail with real services, practitioner profile, legal pages). Frontend vitest 447/447; typecheck 0 errors; backend doc-mapped suites green (450/450). Live role-gated dashboards/UIs could not be clicked through without credentials.
