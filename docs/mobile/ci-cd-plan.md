# Mobile CI/CD, crash reporting & device-lab plan (doc 15)

## CI/CD
- Build: GitHub Actions (`.github/workflows/mobile.yml`) on push to main and PRs.
- Steps: checkout -> setup Node -> npm ci -> typecheck -> lint -> unit tests -> build web -> `npx cap sync` -> Gradle assemble (Android) -> upload artifact.
- Signing: release keystore from GitHub Secrets; separate debug/release flavors.
- Distribution: internal via Firebase App Distribution; production via Play Store / App Store.

## Crash reporting
- Sentry (frontend + native) with source maps uploaded per release.
- PII scrubbing: no PHI in breadcrumbs; user id hashed.
- Alert rules: crash-free sessions < 99% -> PagerDuty.

## Device lab
- Matrix: Android 10/12/14 on low/mid/high devices; iOS 16/17.
- Network: 3G throttle + offline for PWA/offline queue tests.
- Accessibility: TalkBack/VoiceOver smoke.
- Run before each release; results stored in `docs/uat/mobile-*.md`.
