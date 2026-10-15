# Chat & Realtime — Missing Features & Capabilities

## [CHAT-MISSING-01] Ephemeral Disappearing Messages for Tele-Consultation Prescriptions & Vitals
- **Description**: Messages sent in the doctor-patient chat channel remain in MongoDB indefinitely unless manually deleted. Medical advice, symptom photos, and lab results shared in casual chat should support configurable ephemeral retention (e.g. 7 days / 30 days auto-purge) with export to the formal medical record (EHR) if deemed clinically relevant.
- **Current vs Expected Behavior**:
  - *Current*: Chat history accumulates forever, creating an unmanaged shadow PHI data store outside the formal EHR chart.
  - *Expected*: 
    1. Ephemeral message TTL configurable per consultation room.
    2. "Promote to EHR" button allowing doctor to transfer relevant clinical notes into formal encounter history before chat auto-purges.
- **Flow**: Telemedicine chat follow-up and image exchange.
- **Root Cause / Logic**: Chat was built as permanent messaging rather than clinical ephemeral exchange.
- **Affected Files**: `backend/src/models/ChatMessage.js`, `backend/src/routes/chat.js`
- **UI/Frontend Impact**: Chat header displays "Messages in this consultation auto-archive after 30 days".
- **Security/Data Risk**: **Medium**. Long-term data accumulation of unstructured photos and symptoms violates data minimization principles.
- **Suggested Fix / Implementation Plan**:
  1. Add `expiresAt` field to `ChatMessage.js` with MongoDB TTL index.
  2. Implement `POST /api/chat/messages/:id/promote-to-ehr`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add TTL index on ChatMessage.
  - [ ] Implement EHR promotion action.

---

## [CHAT-MISSING-02] Socket Reconnection Backoff & Queue Resync Protocol
- **Description**: In poor connectivity environments (rural clinics, 3G ambulance transit), when the WebSocket drops and reconnects, client UI does not perform a deterministic delta-sync of missed messages using a monotonic sequence counter (`sinceMessageId` or `lastEventSequence`), resulting in dropped messages or duplicates.
- **Current vs Expected Behavior**:
  - *Current*: Reconnection triggers a complete refetch of the entire message history or misses messages sent while the socket was disconnected.
  - *Expected*: Client emits `chat:resync` with `lastKnownSeq`; server responds with missed messages from Redis event buffer before resuming live streaming.
- **Flow**: Mobile doctor or patient traveling through network dead zones during a consultation.
- **Root Cause / Logic**: Socket service relied on basic Socket.io auto-reconnect without a transactional message sequence buffer.
- **Affected Files**: `backend/src/services/socketService.js`, `frontend/src/lib/socket.ts`
- **UI/Frontend Impact**: Chat messages arrive out of order or require manual page reload.
- **Security/Data Risk**: **Low**. Medical instruction delivery failure during tele-consultation.
- **Suggested Fix / Implementation Plan**:
  1. Maintain Redis Stream or sorted set of recent room events keyed by sequence number.
  2. Implement `resync` handshake on socket reconnect.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add sequence numbers to chat events.
  - [ ] Implement client-side replay buffer in `frontend/src/lib/socket.ts`.
