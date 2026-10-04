# Lifecycle Parity — per-vertical exceptions (DOC-M-01, INS/LAB/ED parity)

**Date:** 2026-10-04. **Scope:** appointment/booking lifecycles across verticals
that reuse the shared engines (booking, dispatch, chat) but diverge in
retention, consent, or settlement. This file records the *deliberate*
differences so a reader does not mistake them for bugs — and points each to its
enforcement point.

## Shared base

- Booking validation UX: `frontend/src/lib/bookingValidation.js:12` (`validateBookingSlot`),
  `:41` (`validatePayment`), `:63` (`validateSOSPayload`).
- Consent gate UX: `frontend/src/lib/bookingValidation.js:53` + `frontend/src/components/consent/ConsentGate.jsx`.
- Chat reconnect/resume: `docs/chat-reconnect-contract.md` + `frontend/src/lib/chatResume.js`.
- Server room ACL for every vertical: `backend/src/services/socketService.js`
  (`assertRoomAccess` call sites for ride/assistant/lawyer/emergency/chat).

## Per-vertical exceptions

| Vertical | Lifecycle | Exception vs base | Enforcement |
|---|---|---|---|
| Mental health (PSY) | referral → consent → session → crisis-ack | **Special-category**: server-owned `dataClassification`, purpose + server-timestamped consent, explicit refusals, fail-closed reads, per-read audit. No other vertical has this marker. | `backend/src/models/MentalHealth.js:94-111`; `backend/src/routes/mentalhealth.js:114-119`; `backend/src/services/mentalHealthAccess.js:93`; DPIA §4 |
| Mental health | consent revoke/expiry | Revoked/expired consent blocks *writes* (`mentalhealth.js:257-264`), record itself follows the clinical schedule (RETENTION.md). Family/insurer reads need consent scope. | Same as above + `RETENTION.md` mapping |
| Insurance (INS) | claim → attachment → settlement | Claim reads need the *Insurance Claim* purpose + attachment scope; deletion follows ledger/accounting retention (8y), not the clinical 3y minimum. | `mentalHealthAccess` scope check; `RETENTION.md` payment/ledger row |
| Lab (LAB) | order → sample → report → download | Report download is membership-gated like chat (`chatMembership.js` pattern); report PDFs are media with life-of-record + 90d (Cloudinary cleanup), not chat-queue ephemera. | `backend/src/routes/chat.js:1015` context check pattern; `RETENTION.md` media row |
| Emergency/SOS (ED) | SOS → search → assign → complete | **No-GPS → no dispatch** (Rule 1); location traces live duration-of-trip + 30d only (TTL), never a movement history. Manual modes poll accepted-candidates after the 30s window. | `frontend/src/components/emergency/SOSConfirmModal.tsx:86-90`; `EmergencyFlowController.tsx:283-294`; `RETENTION.md` trace row |
| Pharmacy | order → dispense → track | Order rooms are assignment-gated (`socketService.js:489` — only the assigned partner joins `order:<id>`); tracking history is inside the delivery doc, same trip+30d spirit as SOS traces. | `socketService.js:489-495` |
| Ride/rider | dispatch → accept → track | Simultaneous-accept race resolved server-side; loser gets `emergency_lost`-family event; stale/offline candidates excluded by H3/Mongo parity. | Dispatch service + socket handlers |
| Chat (all verticals) | send → queue → flush → ack → dedupe | Offline queue is device-local pending-sends (`chatPrefs.js:93-119`), flushed over REST (durable-write ack), socket is the *notification* plane. Same `_id`+`clientGeneratedId` merge everywhere. | `docs/chat-reconnect-contract.md` |

## Non-exceptions (frequently misread)

- The frontend validators above are **UX guards, not security boundaries**.
  Server re-validates (slot race, payment signature, room membership).
- Audit reports were closed out and removed;
  Phase 5 (repo rule: audit-md mat chhedo). The Phase 5 suite index lives in
  `docs/frontend-test-plan.md`.
