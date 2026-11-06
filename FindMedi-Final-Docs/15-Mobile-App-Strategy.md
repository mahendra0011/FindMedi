# 15 — Mobile App Strategy

> **Current state (repo scan):** React 18 + Vite web app; `sw.js` service worker exists but **no `manifest.webmanifest`**; no Capacitor/React Native dependency found; `socket.io-client`, `livekit-client`, `maplibre-gl` present (all work on mobile web). Native-ish needs: push, background location (riders/ambulance), camera/doc scan, offline queue, biometric lock.
> **Reality:** India me majority users **Android, mid/low-end phones, 3G/4G, limited storage** → web-first + selective native.

---

## 1. Decision: PWA → Capacitor wrapper → native only where needed

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **PWA only** | Fastest, one codebase, no store friction, instant updates | iOS limits (push OK on iOS 16.4+ for installed PWA but limited), no reliable background location, weaker camera/file APIs, discoverability | **Start here (R1)** |
| **Capacitor (wrap existing React app)** | Reuse code, store presence, native plugins (push, camera, biometrics, geolocation, files) | WebView perf on low-end, plugin maintenance | **R2 for patient + provider apps** |
| **React Native (new UI)** | Better native feel/perf | Rewrite cost, two UIs | Only for **field apps** if Capacitor insufficient |
| **Native Android (Kotlin)** | Best perf/background reliability | Separate codebase | Only for rider/ambulance tracking if needed |

**Recommendation:** PWA now (R1) → **Capacitor** shells in R2 → evaluate RN/native for **rider/ambulance/phlebotomist** only when background location/offline reliability demands.

## 2. App portfolio (don't ship 6 apps at once)

| App | Users | Phase | Notes |
|---|---|---|---|
| **FindMedi (patient)** | Patients/family/fitness users | PWA R1, store app R2 | Bookings, records, SOS, orders |
| **FindMedi Partner (provider)** | Doctors, clinics, labs, pharmacies, gyms, yoga, nurses, vendors | PWA R1, app R2 | Calendar, bookings, earnings, chat, docs |
| **FindMedi Field (ops/field)** | Phlebotomists, nurses, riders, camp staff | R1 PWA → R2 app | Routes, OTP handover, scans, offline, SOS |
| **FindMedi Ride/Driver** | Riders, ambulance drivers | Existing roles ✅ | Background location, trip flow |
| **Ops console** | Internal | Web only | Desktop-first |
Use **role-based app experience** inside 2 apps (Patient, Partner) + Field mode inside Partner (feature-flagged) to avoid app-store sprawl.

## 3. PWA requirements (R1) — fix gaps
- `manifest.webmanifest`: name, short_name, icons (192/512 + maskable), `display: standalone`, theme/background, `start_url`, `scope`, **shortcuts** (Book, SOS, Records), screenshots.
- Service worker: precache app shell; runtime caching: static cache-first, public API stale-while-revalidate (non-personal), **personal/PHI API: network-only (no cache)**; offline fallback page showing **SOS numbers + saved appointments (non-sensitive summary)**.
- Install prompt (A2HS) after 2nd visit; iOS instructions.
- Web Push (VAPID ✅ `web-push` present) with notification preferences + discreet text.
- Camera/file upload with compression (client-side resize, WebP), chunked upload + resume.
- Background sync (Android) for queued actions (e.g., mark collected).
- Lighthouse targets: PWA ✓, Perf ≥ 80 on mid-range, A11y ≥ 90.

## 4. Native capability matrix (what needs native)

| Capability | PWA | Capacitor | Native |
|---|---|---|---|
| Push notifications | ✅ (Android), partial iOS | ✅ FCM/APNs | ✅ |
| Background location (ride/ambulance) | ❌ unreliable | ✅ (plugin + foreground service) | ✅ best |
| Camera / doc scan | ✅ basic | ✅ better | ✅ |
| Barcode/QR scanning | ✅ (BarcodeDetector/JS libs) | ✅ plugin | ✅ |
| Biometric/app lock | ❌ (WebAuthn partial) | ✅ | ✅ |
| Offline storage (encrypted) | IndexedDB (not encrypted) | ✅ secure storage | ✅ Keystore |
| Contacts/Calls | limited | ✅ | ✅ |
| Health APIs (Google Fit/Health Connect/Apple Health) | ❌ | ✅ plugins | ✅ |
| NFC (rare) | limited | plugin | ✅ |
| App-store discoverability | ❌ | ✅ | ✅ |
| In-app updates | ✅ instant | store + live updates | store |
| Play Integrity / App Attest (anti-spoof) | ❌ | ✅ plugin | ✅ |

## 5. Mobile UX rules
- **Bottom nav** (Home · Search · Bookings · Records · Me) + floating **SOS**; one-handed reach; 48px targets (elder).
- **Voice search/input**; Hindi/regional first; low-literacy iconography.
- **Low-data mode:** smaller images, no autoplay video, deferred maps.
- **Offline-first for field roles:** local queue, optimistic UI with conflict resolution, visible sync status.
- Deep links: booking, join call, order tracking, event ticket (`findmedi://…` + universal/app links).
- Gestures minimal; confirm destructive actions; undo toasts.
- **Battery:** throttle location pings; stop after trip end.
- Permissions: ask in context (not at launch), explain why; graceful denial.

## 6. Mobile security
| Area | Controls |
|---|---|
| **Auth** | httpOnly cookies don't suit native → use **short-lived access + refresh in OS secure storage (Keychain/Keystore)**; biometric re-auth for sensitive actions; device binding optional; session list ✅ |
| **Storage** | Never store PHI/tokens in plain AsyncStorage/localStorage; encrypted DB (SQLCipher) for offline field data; clear on logout; `allowBackup=false` |
| **Network** | TLS only; **certificate pinning** (optional, with rotation plan); no secrets in app bundle; API keys restricted |
| **Integrity** | **Play Integrity / App Attest** for riders/field (mock-location, root/jailbreak signals) — DEFERRED #4 ✅ in your docs |
| **Screens** | `FLAG_SECURE`/screenshot block on sensitive screens (records, mental health); hide in app-switcher |
| **Deep links** | Validate parameters; no auth tokens in URLs; verify app links |
| **Push** | No PHI in payload; "You have an update"; discreet mode; payload minimal; data fetched after auth |
| **Code** | R8/ProGuard obfuscation; dependency scanning (OSV); signing key custody; CI-built releases only |
| **Privacy** | Permission minimisation; privacy labels (Play Data Safety / App Store nutrition labels); no ad SDKs on health screens |
| **Updates** | Min supported version + force-update for critical fixes |

## 7. Field-role app specifics

### Phlebotomist / nurse / camp staff
Route list (offline-cached) · map navigation deep-link · identity OTP · barcode scan · photo capture · temperature log · offline queue → sync · SOS · earnings · training · low-end device support.

### Rider / driver / ambulance
Foreground service for location (ethical, visible notification) · trip state machine · OTP pickup/drop · cold-bag flag · panic button · earnings · fatigue/safety prompts · geofence for service area · **no location tracking outside active duty**.

### Camp check-in app
QR scan, walk-in registration (offline), station flow, volunteer roles, consent capture (e-sign), result delivery sync.

## 8. Push & notification strategy
Channels: push (primary), SMS (OTP/critical), WhatsApp (opt-in), email.
- Categories (user-controllable): bookings, reminders, orders, records, offers, safety.
- **Quiet hours**, frequency caps, grouped/summary notifications, rich actions (Join, Reschedule) where safe.
- Discreet variants for sensitive categories; localised templates.
- Delivery metrics; token hygiene (remove invalid FCM tokens).

## 9. App Store / Play Store compliance (health apps)
- **Google Play:** Health apps policy, Data Safety form, **medical-device/diagnostic claims** restrictions, sensitive permission justification (location, background location, camera), account deletion in-app + web link.
- **Apple App Store:** Health data guidelines (5.1.3), medical-app accuracy, in-app purchase rules (services vs digital goods — physical services/ medicines generally allowed external payment; **digital content/subscriptions may need IAP** — verify), account deletion in-app, privacy nutrition labels.
- **India:** DPDP consent screens; DLT for SMS; telemedicine rules.
- Provide **demo accounts** for reviewers (sandbox mode, test data).
- Avoid claiming diagnosis/treatment by AI; disclaimers visible.
*(Store policies change; check current policy docs before submission.)*

## 10. Tech approach (Capacitor path)
- Keep React app; add `@capacitor/core` + plugins: push-notifications, camera, geolocation (background via community plugin), filesystem, preferences/secure-storage, biometric, app, network, splash-screen, status-bar, barcode-scanner.
- **Live updates** (Capgo/Appflow) for JS changes within store policy.
- Build variants: `patient`, `partner`, flavors/env config; shared UI package; role-based routing.
- CI: build signed AAB/IPA via CI; versioning aligned with web; crash reporting (Sentry ✅ mobile SDK); analytics (no PHI).
- Feature flags (Unleash ✅) per app version.
- Deep links via App Links/Universal Links; QR deep links for events.

## 11. Performance targets (mid-range Android, 4G)
Cold start < 3s · TTI < 4s · JS bundle per route < 200 KB gz · memory < 250 MB · APK/AAB < 40 MB (initial) · battery < 3%/hr active tracking (ride) · offline cold start works · 60fps scrolling lists (virtualised).

## 12. Testing on mobile
Device lab: low-end Android (2–3 GB), mid, iPhone SE/recent; Android 9–15; network throttling (3G/Slow 4G/offline); TalkBack/VoiceOver; battery profiler; deep-link tests; push tests (foreground/background/killed); upgrade-path tests (old version → new); permission-denied flows; locale/RTL; accessibility font scaling 200%; interrupted uploads; dual-SIM/OTP autofill (SMS Retriever API).

## 13. Rollout plan
1. **R1:** PWA polish (manifest, offline shell, push, install prompt) — measure install/engagement.
2. **R2:** Capacitor Partner app first (providers need push/camera/offline most), then Patient app.
3. Pilot with 20–50 providers/patients via Play internal testing/TestFlight; collect crash/ANR data.
4. Staged rollout (5% → 20% → 100%); kill-switch via flags; min-version enforcement.
5. Field app hardening (background location, integrity checks) before scaling riders/ambulance.

## 14. Metrics
Install → signup → first booking conversion · push opt-in rate · push CTR · crash-free sessions (≥ 99.5%) · ANR rate · app-start time · offline-sync success · permission grant rates · uninstall rate · app rating · support tickets per 1k users.

## 15. Checklist
- [ ] `manifest.webmanifest` + SW caching rules (no PHI)
- [ ] Web push + preferences + discreet templates
- [ ] SMS Retriever / OTP autofill; camera compress/chunk upload
- [ ] Decide Capacitor vs RN for Partner/Field; spike on background location
- [ ] Secure storage + biometric + `FLAG_SECURE` on sensitive screens
- [ ] Play Integrity / App Attest for field/rider
- [ ] Store listings, Data Safety/Privacy labels, review demo accounts
- [ ] Min-version & force-update mechanism
- [ ] Mobile CI/CD + crash reporting + device-lab test plan
