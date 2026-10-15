# Notifications & Communication — Bugs

## [NOTIF-BUG-01] Missing DLT Template Registration Parameters in Msg91 SMS Dispatch
- **Description**: In `backend/src/services/smsProvider.js`, transactional SMS payloads sent to Msg91 flow API lack TRAI-mandated DLT (Distributed Ledger Technology) Entity ID, Sender Header ID, and Template ID parameters.
- **Current vs Expected Behavior**:
  - *Current*: Sends raw message string without mapping to pre-registered Indian telecom DLT templates.
  - *Expected*: Telecom Regulatory Authority of India (TRAI) TCCCPR-2018 regulations mandate that all SMS sent to Indian numbers (+91) must include:
    - Registered Principal Entity ID (PE ID)
    - Registered Header / Sender ID (`FNDMED`)
    - Approved DLT Template ID (e.g. `11071618293041...`)
    Any SMS sent without matching an approved DLT template is dropped by Indian telecom operators (Airtel, Jio, Vi, BSNL) at the gateway.
- **Flow**: OTP delivery, appointment confirmation SMS, doctor cancellation alerts.
- **Root Cause / Logic**: SMS service used generic SMS payload format without India-specific regulatory DLT headers.
- **Affected Files**: `backend/src/services/smsProvider.js:30-48`, `backend/src/config/marketingSeo.js`
- **UI/Frontend Impact**: Patients report "OTP not received" on Indian telecom networks.
- **Security/Data Risk**: **High**. Operational failure of 2FA login, password reset, and critical medical alerts.
- **Steps to Reproduce**:
  1. Trigger SMS send with real Msg91 credentials to an Indian mobile number.
  2. Telecom provider returns `REJECTED_DLT_TEMPLATE_MISMATCH` or drops silently.
- **Suggested Fix / Implementation Plan**:
  1. Map notification categories (`otp`, `booking_confirmed`, `prescription_ready`, `sos_alert`) to approved DLT template IDs in `backend/src/config/dltTemplates.js`.
  2. Pass `DLT_TE_ID` and registered template ID in `smsProvider.js` payload.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Create `backend/src/config/dltTemplates.js`.
  - [ ] Update `smsProvider.js` to send DLT template parameters.

---

## [NOTIF-BUG-02] Silent Notification Delivery Failure Logging Without Circuit Breaker
- **Description**: In `backend/src/services/notificationDelivery.js`, if external SMS or WhatsApp providers return 5xx errors or network timeouts, failures are logged via `console.error` or basic catch blocks without a circuit breaker or Dead Letter Queue (DLQ) retry mechanism.
- **Current vs Expected Behavior**:
  - *Current*: When Msg91 or Brevo is down, notifications are silently dropped, and subsequent requests continue to hit the failing third-party API, exhausting Node.js HTTP sockets.
  - *Expected*: Failed critical notifications (e.g. prescription dispatch, OTP) must persist to a MongoDB `NotificationOutbox` or Kafka DLQ with exponential backoff retry (1m, 5m, 15m), and circuit breaker (e.g. Opossum) must trip after 5 consecutive provider timeouts.
- **Flow**: High-volume notification delivery.
- **Root Cause / Logic**: Fire-and-forget notification delivery implementation.
- **Affected Files**: `backend/src/services/notificationDelivery.js`, `backend/src/services/notificationOutbox.js`
- **UI/Frontend Impact**: Critical medical alerts not delivered to patients.
- **Security/Data Risk**: **Medium**. Communication loss during urgent diagnostic result callbacks or emergency alerts.
- **Steps to Reproduce**:
  1. Set invalid `MSG91_AUTH_KEY` to simulate provider outage.
  2. Send 50 notifications.
  3. All 50 notifications are lost permanently with no retry queue.
- **Suggested Fix / Implementation Plan**:
  1. Ensure all notifications are persisted to `NotificationOutbox` with status `PENDING` before delivery attempt.
  2. Use background poller `outboxPollerService.js` to retry failed attempts up to 3 times.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Enforce transactional outbox on notification delivery.
  - [ ] Implement circuit breaker on external SMS/Email HTTP calls.
