# Chat & Realtime — Bugs

## [CHAT-BUG-01] Excessive Body Size Limit Allowing 40 MB JSON Payloads on Chat Routes
- **Description**: In `backend/src/routes/chat.js` or main server middleware, the chat body parser limit is configured for up to 40 MB to accommodate embedded attachments.
- **Current vs Expected Behavior**:
  - *Current*: Clients can send a single 40 MB raw JSON string directly into the Node.js event loop, causing severe memory spikes, event loop starvation, and potential denial of service.
  - *Expected*: JSON body size capped at 1 MB globally; binary file attachments must go exclusively through multipart streaming (`multer` with ClamAV validation) to `/api/upload` or signed Cloudinary direct uploads.
- **Flow**: User sending a text message or file attachment in doctor/patient chat.
- **Root Cause / Logic**: Over-permissive body size limit configured to accommodate base64 image strings.
- **Affected Files**: `backend/src/index.js`, `backend/src/routes/chat.js`
- **UI/Frontend Impact**: None for normal text messages.
- **Security/Data Risk**: **High**. Denial of Service (DoS) and memory exhaustion. An attacker sending multiple parallel 40 MB JSON strings can crash all API worker processes.
- **Steps to Reproduce**:
  1. Send a POST request to `/api/chat/messages` with a 35 MB JSON payload.
  2. Observe high Node.js heap consumption and delayed event loop ticks.
- **Suggested Fix / Implementation Plan**:
  1. Set `express.json({ limit: '1mb' })` globally.
  2. Disallow base64 embedded files in chat messages; enforce media attachment via `attachmentUrl` pointing to validated uploads.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Enforce 1 MB JSON limit on chat routes.
  - [ ] Reject base64 file payloads in message body validator.

---

## [CHAT-BUG-02] LiveKit Video Token Expiration and Room Guessing Risk
- **Description**: In telemedicine consultation token generation, LiveKit access tokens were configured with lengthy default expiration (24 hours) and predictable room names (`room_${appointmentId}`).
- **Current vs Expected Behavior**:
  - *Current*: A 24-hour video consultation token allows participants to rejoin the video room long after the clinical encounter has ended.
  - *Expected*: Token TTL capped strictly at scheduled appointment duration + 15 minutes grace period (`ttl: '45m'`), and room name salted with an HMAC or random UUID so room names cannot be guessed from sequential appointment numbers.
- **Flow**: Tele-consultation video call between doctor and patient.
- **Root Cause / Logic**: Default LiveKit token generator parameters without encounter lifecycle binding.
- **Affected Files**: `backend/src/routes/video.js`, `backend/src/routes/telemedicine.js`
- **UI/Frontend Impact**: None during active calls; prevents stale reconnections.
- **Security/Data Risk**: **High**. Privacy leak and eavesdropping risk. If a room name is predictable and tokens don't expire quickly, previous participants or unauthorized users could tap into subsequent video calls in the same room.
- **Steps to Reproduce**:
  1. Generate a LiveKit token for an appointment.
  2. Inspect JWT payload claims; observe `exp` is 24 hours in the future.
- **Suggested Fix / Implementation Plan**:
  1. Enforce max token TTL of 60 minutes.
  2. Auto-close LiveKit room when doctor marks appointment `Completed`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Update LiveKit token generator options with short TTL.
  - [ ] Wire room deletion hook on appointment completion.
