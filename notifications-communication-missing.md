# Notifications & Communication — Missing Features & Capabilities

## [NOTIF-MISSING-01] Automated Outbound IVR Dial-Out for Critical Emergency & Appointment Reminders
- **Description**: While WhatsApp and SMS providers are connected, FindMedi has no Interactive Voice Response (IVR) automated voice call service (e.g. via Exotel / Twilio / Knowlarity API) to call patients for critical medical alerts or elderly appointment confirmations.
- **Current vs Expected Behavior**:
  - *Current*: Only text SMS and WhatsApp messages can be sent. Elderly patients with low smartphone literacy or poor eyesight frequently miss text reminders.
  - *Expected*: Automated bilingual IVR voice call engine:
    1. Automated call 2 hours prior to scheduled dialysis or chemotherapy: "Namaste, this is FindMedi reminding you of your 4 PM dialysis appointment at Apollo Hospital. Press 1 to confirm, Press 2 to reschedule."
    2. Emergency SOS escalation call to registered doctor when an ICU bed alarm or critical panic button is triggered.
- **Flow**: High-risk appointment reminders, emergency escalation.
- **Root Cause / Logic**: Voice telephony integration was deferred in initial releases.
- **Affected Files**: `backend/src/services/ivrProvider.js`, `backend/src/services/notificationService.js`, `backend/src/config/marketingSeo.js`
- **UI/Frontend Impact**: Booking settings allow patient toggle: "Receive voice call reminder for this appointment".
- **Security/Data Risk**: **Medium**. Missed critical clinical appointments (chemotherapy/dialysis) leading to health deterioration.
- **Suggested Fix / Implementation Plan**:
  1. Create `backend/src/services/ivrProvider.js` with Exotel/Twilio voice call API integration.
  2. Add webhook callback for DTMF keypress processing (1 = confirmed, 2 = requested reschedule).
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement `ivrProvider.js`.
  - [ ] Add IVR webhook handler for patient response capture.

---

## [NOTIF-MISSING-02] Granular Purpose-Wise Consent & Communication Opt-Out (DPDP Section 6)
- **Description**: India's DPDP Act 2023 Section 6 requires that consent for notifications must be granular, purpose-specific, and revocable. FindMedi currently combines transactional alerts with promotional announcements without an easy one-click opt-out per channel.
- **Current vs Expected Behavior**:
  - *Current*: Turning off notifications in settings can accidentally suppress critical medical reminders, or patients receive marketing offers without explicit opt-in.
  - *Expected*: Granular preference matrix:
    - Critical Health Alerts (Prescriptions, Vitals, SOS) -> Mandatory, unblockable
    - Appointment Reminders -> Configurable (SMS / WhatsApp / Call / Push)
    - Chronic Refill Reminders -> Granular opt-in toggle
    - Marketing & Loyalty Offers -> Strict opt-in (disabled by default)
- **Flow**: Patient managing privacy and notification preferences in user profile.
- **Root Cause / Logic**: Single notification preference toggle without purpose-wise separation.
- **Affected Files**: `backend/src/models/NotificationPreference.js`, `backend/src/services/notificationPreferences.js`, `frontend/src/pages/patient/Settings.tsx`
- **UI/Frontend Impact**: Settings screen displays separate toggles for each communication purpose.
- **Security/Data Risk**: **High**. Regulatory penalties under DPDP Act for sending unsolicited commercial marketing over health notification channels.
- **Suggested Fix / Implementation Plan**:
  1. Update `NotificationPreference.js` schema with discrete purpose keys.
  2. Enforce preference checks in `notificationDelivery.js` before dispatch.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Update notification preference schema.
  - [ ] Wire granular consent checks in notification delivery pipeline.
