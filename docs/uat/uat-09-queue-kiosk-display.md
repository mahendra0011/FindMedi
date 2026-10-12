# UAT Flow 09: Self-Service Kiosk, OPD Token Generation & Queue Display TV

## Objective
Verify patient self-check-in on touch kiosk, thermal slip printing with QR code, real-time WebSocket queue announcements, and queue aging analytics.

## Preconditions
- User roles: `receptionist`, `opd_coordinator`, `hospital_admin`.
- Kiosk mode terminal configured with auto-reset idle timer.
- Public display screen connected on local subnet.

---

## Test Steps

| Step | Page / URL | Actor | Action | Expected Result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | `/kiosk` | Patient (Self) | Tap "Self Check-In" on touch screen. Enter registered mobile number or scan Health ID QR. | Patient profile found; active appointments listed with attending doctor names. | [ ] |
| 2 | `/kiosk` | Patient (Self) | Select appointment with Dr. Gupta (Cardiology) and tap "Confirm Arrival". | Thermal token slip printed (e.g. `CARD-12`); contains token number and waiting zone. | [ ] |
| 3 | `/display/queue` | Patient / Public | View waiting area TV monitor. | Real-time display updates immediately; shows token `CARD-12` in queue. | [ ] |
| 4 | `/opd-token` | Receptionist | Call next token `CARD-12` into Consultation Room 3. | Display plays acoustic chime; flashing banner directs `CARD-12` to Room 3. | [ ] |
| 5 | `/hospital/queue-aging`| OPD Coordinator| Review OPD waiting time metrics across all outpatient departments. | Dashboard graphs median wait time (Target < 20 min) and highlights bottleneck clinics. | [ ] |

---

## Sign-Off

- **Tester Name:** ___________________________
- **Department Head:** ___________________________
- **Date:** _______________
- **Status:** [ ] ACCEPTED  /  [ ] REJECTED
