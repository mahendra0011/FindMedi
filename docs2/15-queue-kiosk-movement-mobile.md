# 15. Unified Queue Engine, Kiosk/Display Modes, Patient Movement & Bedside Mobile (NEW)

Already in files 01-12 (skip): token model basics (`Token` status), "queue display screen" one-liner in file 05 §5.1, patient transport request one-liner in file 06 §6.8, doctor/nurse mobile as roadmap bullet in file 10 phase 4.
Yahan **deep design** hai jo pehle nahi tha: multi-department queue engine with priority + ETA, kiosk, display (TV) mode, ADT movement tracking, aur offline-first nurse/doctor PWA.

Repo check: `kiosk` = 0 hits; `Token` model + `routes/tokens.js` + `OPDToken.tsx` hain (doctor OPD tokens), lab/pharmacy/radiology queues alag nahi.

---

## 15.1 Unified Queue Engine (OPD, Lab, Radiology, Pharmacy, Billing, ER)

### Logic
- **Queue** = `(hospitalId, type, resourceId)`: e.g. `OPD:doctor123`, `LAB:sample-collection`, `RAD:CT`, `PHARM:counter2`, `BILL:counter1`.
- **Ticket** = `{queueId, number (prefix+seq, resets daily), patientId?, priority, status, createdVia:'kiosk'|'reception'|'app'|'walkin'}`.
- **Priority classes** (configurable): `Emergency` > `Critical/Triage-red` > `Senior citizen (60+/80+) / Divyang / Pregnant` > `Appointment-on-time` > `Walk-in`. Order = priority weight, then scheduled time, then arrival time. **Aging rule:** every N minutes waiting, boost 1 level (prevents starvation).
- **ETA algorithm**: `ETA = Σ (avgServiceTime of tickets ahead / activeServers)`; `avgServiceTime` = rolling median of last 30 completed (per doctor/service, per hour-of-day) from `startedAt..completedAt`; show as range ("~15-20 min"), recompute on every state change, never promise exact.
- **States:** `Waiting -> Called -> InService -> Done` | `NoShow(after N recalls)` | `Skipped(recall later)` | `Transferred(to other queue)` | `Cancelled`. Recall up to 2 times then NoShow with rule to re-queue at end once.
- **Multi-step journey** (token follows patient): OPD -> Lab -> Pharmacy -> Billing; next queue ticket auto-created on order creation (links to Encounter) so patient sees "Lab: 3rd in line".
- **Concurrency:** call-next must be atomic (`findOneAndUpdate` with status filter) so two counters never call the same ticket.
- **Fairness metrics** for dashboard: avg wait, 90th percentile wait, abandonment, SLA breach.

### Data model
```js
Queue { hospitalId, type, resourceId, name, prefix, counters:[{id,name,staffId,open}], priorityRules[], slaMinutes, avgServiceSec, active }
Ticket { queueId, number, display:'A-014', patientId, encounterId, priority, status, arrivedAt, calledAt, startedAt, completedAt, recallCount, counterId, createdVia, nextQueueId }
```
### API + realtime
`POST /api/queues/:id/tickets`, `POST /api/queues/:id/call-next {counterId}`, `PUT /api/tickets/:id/{recall|skip|start|done|transfer}`, `GET /api/queues/:id/board`, public read `GET /api/display/queues?ids=` (signed display token). Socket rooms `queue:{id}`; events `ticket:called`, `queue:updated`.
### Libraries
Backend: Mongo atomic ops, Redis sorted set per queue (`ZADD score=priority*1e12+ts`) for O(log n) call-next and counts; BullMQ for no-show timers. Frontend: `@tanstack/react-query` + existing socket.io; `date-fns`.
### UI design
- **Reception/Counter console:** left = waiting list (priority stripe: red/amber/blue/grey), centre = big `CALL NEXT` button (primary, 56px), current patient card (UHID, flags, payer, pending dues), `Recall | Skip | Transfer | Done`. Keyboard shortcuts: `N` next, `R` recall, `D` done.
- **Doctor mini-queue** (side widget on doctor dashboard, file 11 R2).
### Animation
- Called ticket: card flies from list to "Now serving" slot (framer-motion shared `layoutId`, 350ms spring). List reorder uses `layout` animation (200ms). New ticket: slide-in + 1s highlight (background fade).
- **Do not** animate every ETA digit change; update on 15s tick, cross-fade 120ms.

---

## 15.2 Display (TV) Mode: `/display/queue`

### Logic
- Read-only route authenticated by **display token** (long-lived, scoped to queue IDs, revocable); no PHI: show **token number + counter/room only** (never names).
- Layout modes: single-queue, multi-queue split, **doctor-room list** (Dr, Room, Now serving, Next 3), plus rotating **announcement/health-tip strip** (Announcement model exists).
- Voice: on `ticket:called` speak "Token A-014, please proceed to Room 3" in en/hi using **Web Speech `speechSynthesis`** (voice availability differs by device/OS; ship fallback = pre-generated audio from a TTS service stored per phrase-template, or chime only). Repeat 2x with 5s gap; mute toggle.
- Resilience: auto-reconnect socket with backoff, **stale indicator** if no heartbeat 30s ("Reconnecting..."), full-refresh every 5 min, **kiosk lock** (fullscreen, hide cursor, wake-lock via `navigator.wakeLock`).
### UI design (10-foot UI)
```
+------------------------------------------------------------------------------+
|  [Logo] City Hospital                              10:42 AM   Tue 14 Oct      |
+---------------------------------------+--------------------------------------+
|  NOW SERVING                          |  DOCTOR / ROOM          NEXT         |
|   A-014   ->  ROOM 3                  |  Dr. Sharma  Rm 3     A-015 A-016    |
|  (very large, 160px+, high contrast)  |  Dr. Iyer    Rm 5     B-007 B-008    |
|                                       |  Lab Counter 2        L-021          |
+---------------------------------------+--------------------------------------+
|  ▶ Announcement ticker / health tip (marquee, hi/en)                         |
+------------------------------------------------------------------------------+
```
- Min font 32px body, 120px+ token; contrast ≥ 7:1 (AAA); colour never sole signal; dark theme default (reduces glare); safe margins for overscan.
### Animation
- Now-serving change: number **flip/slide** 500ms + 3 gentle pulses of border (then static) + chime. Ticker: CSS `translateX` linear, pause on prefers-reduced-motion. No per-second animations (burn-in/attention).

---

## 15.3 Self-service Kiosk (registration, check-in, token, payment, reports)

### Logic
- **Modes:** `Check-in` (scan appointment QR / enter mobile+OTP / UHID), `New registration` (minimal fields + consent; reception completes KYC later => status `Provisional`), `Pay bill` (UPI QR / card via POS), `Collect report` (OTP + print/QR to phone), `Token only`.
- **Security/privacy:** no data persists on device; **idle timeout 60s** with countdown overlay -> auto reset; hide previous screen on reset; OTP-gated for any PHI; mask phone (`98******12`); no autofill; restrict browser (kiosk Chrome flags / Android lockdown), device-bound `kioskToken`, remote disable.
- **Safeguards:** duplicate detection on mobile+DOB (route to reception on match), age < 18 => guardian flow, failed OTP 3x => "Please see reception" (no info leak).
- **Accessibility:** language toggle at top (en/hi + more later), text-size toggle, high-contrast, audio guidance (TTS), **wheelchair-height layout** (controls in lower 2/3 of the screen), voice-help button -> alerts staff.
- **Offline:** can issue provisional token locally and sync later (queue in IndexedDB).
### UI design
Portrait 21-24" touch. Large cards (min 96px height) with icon + label (hi/en), 3 steps max per task, persistent step indicator, `Back` + `Home` + `Help` always visible; numeric keypad on-screen for mobile/UHID; success screen shows printed token + QR + ETA; print dialog uses thermal printer agent (14.2).
### Animation
- Screen transitions: horizontal slide 220ms (direction = forward/back), icons subtle scale-on-press (`whileTap scale .97`), **attract mode** after 90s idle: gentle loop (logo + "Touch to start") using GSAP timeline at low CPU; success: check path-draw + soft chime.
- Reduce motion on low-power kiosks (detect `deviceMemory`/`hardwareConcurrency` and drop to fades).
### Libraries
`framer-motion` (installed), `react-simple-keyboard` (on-screen keyboard; optional), existing `input-otp`, `qrcode.react`, `react-hook-form`, i18n stub; kiosk shell route `/kiosk/*` isolated bundle (code-split) with its own minimal layout (no sidebar).
### Tests
Touch-only e2e (Playwright with touch emulation), idle-reset leaves no PHI in DOM/history, OTP brute-force limit, printer failure fallback ("show QR on screen").

---

## 15.4 Patient Movement (ADT) & Internal Transport

Existing: `Admission.status` Admitted/Transferred/Discharged/DOD; `Emergency` has transfer; no unified movement log.

### Logic
- **ADT event log** (append-only): `Admit | Transfer | Discharge | Leave(temporary) | Return | Expire` + **location moves** for non-bed trips: `Ward -> Radiology(CT) -> Ward`, `Ward -> OT -> PACU -> ICU`, `Ward -> Dialysis`, `Ward -> Cath lab`, `-> Another hospital (referral-out)`.
- `PatientMovement {encounterId, from:Location, to:Location, reason, requestedBy, transportMode:'walk'|'wheelchair'|'stretcher'|'bed'|'ambulance', escort:'porter'|'nurse'|'doctor', status:'Requested|Assigned|PickedUp|Delivered|Returned|Cancelled', timestamps}`.
- **Auto-requests:** CT order scheduled -> `PatientMovement` + porter `WorkTask` (13.4) 20 min before slot; return trip auto-created when scan completes.
- **Handover checklist** at each move (IV lines, O2, monitor, meds, consent, ID band scan). Patient **"Currently at"** shown in banner and bed board (bed shows `Away: CT` and is not released).
- Metrics: transport TAT, wait for porter, missed slots because patient late.
- Inter-hospital transfer: form with summary, vitals at transfer, accepting doctor/hospital, ambulance link, consent; status tracked.
### UI
Movement lane on **Bed Board** (small icon on bed tile `⟶ CT`), porter console (list of requests with from/to, urgency, big `Accept/Picked/Delivered`), timeline on patient chart.
### Animation
Bed tile "away" state: dashed border + tiny moving arrow (CSS translate loop 2s, only on tiles in motion; static for reduced motion). Porter request card slide-in + vibration.

---

## 15.5 Nurse & Doctor Mobile (PWA, offline-first, bedside)

Repo: web app (Vite/React). No service worker/PWA deps (`vite-plugin-pwa`, `workbox`, `idb`/`dexie` absent). `webPush.ts` + `web-push` exist (push ready).

### Logic
- **PWA install** (manifest, icons, standalone), **service worker**: precache shell, runtime cache (stale-while-revalidate) for masters, network-first for clinical data; **no PHI in SW cache** unless encrypted store.
- **Offline store**: IndexedDB (Dexie) encrypted with WebCrypto key derived from user PIN/session; cache **my ward patients, due meds/tasks, last 24h vitals, forms**; write queue with `clientId` + `idempotencyKey`, **background sync** + manual "Sync now", conflict policy: append-only clinical entries (vitals/MAR/notes) never overwritten, server timestamps reconciled, clock-skew guard.
- **Nurse home = task-first:** "Due now" meds (grouped by time), vitals due, orders to acknowledge, handover list, alerts; one-hand use.
- **Doctor mobile:** my patient list (ward/OPD), results inbox (critical pinned), rounds with swipe between patients, quick orders/Rx, voice dictation (Web Speech or server STT), e-sign with biometric step-up (WebAuthn).
- **Security:** short session + idle lock (PIN), remote wipe on revoke (SW + DB clear on 401), device registration, screenshot caution (`FLAG_SECURE` not available on web: mitigate with watermark of user/time on PHI screens).
### Libraries
`vite-plugin-pwa` (Workbox), `dexie`, `idb-keyval` (small), `@simplewebauthn/browser` + `@simplewebauthn/server` (biometric step-up), existing `web-push`, `livekit-client` for tele-rounds. If native needed later (BLE devices, deep scanner integration): Capacitor wrapper around the same web code.
### UI design
Bottom tab bar (Tasks | Patients | Alerts | Scan | More), large cards, **status colours with icons**, sticky "Offline — 3 changes pending" bar (amber) that turns green "Synced" 2s then hides. Patient quick-sheet via `vaul` drawer (already installed). Scan FAB in thumb zone.
### Animation
Swipe actions (give med = swipe right with confirm threshold, framer-motion `drag="x"` + spring-back), list virtualised for 100+ items, pull-to-refresh elastic (100px max), haptics for critical alerts. Respect reduced-motion; **no parallax/smooth-scroll (disable Lenis on mobile clinical screens)**.
### Tests
Airplane-mode e2e (Playwright offline), conflict replays, token expiry while offline, 24h battery/perf profile, low-end Android (2GB) smoothness (60fps lists).
