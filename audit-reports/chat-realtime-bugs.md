# Chat / Realtime — Bugs

Scope: `backend/src/services/socketService.js` (594 lines), `backend/src/routes/chat.js` (1,484 lines), Socket.IO wiring, presence/read-receipt models.
Companion file: `chat-realtime-missing.md`.

---

## [CHAT-001] CRITICAL — Socket.IO has no authentication: any anonymous client can join any user's room
- **Description**: Nothing in `socketService.js` verifies a JWT. A grep of the file for `jwt`, `verify` and `token` returns **no** verification code at all — only `socket.userId` assignments. Identity is taken from the client's own payload:
  ```js
  const userId = typeof payload === 'object' ? payload?.userId : payload;
  if (userId) { socket.userId = String(userId); socket.join(`user:${userId}`); ... }
  ```
  The socket then receives everything addressed to `user:<that id>`; `notifyUser`, `notifyUsers` and `emitChatNotification` all target those room names.
- **Current vs Expected**: Current = an unauthenticated client opens a socket, sends `{ userId: '<victim id>' }`, and starts receiving that user's notifications and realtime events. Expected = the handshake is authenticated from the `auth` payload/cookie before any room join, `socket.userId` comes from the verified token only, and room membership is re-checked server-side.
- **Root Cause / Logic**: Authorisation was never modelled for the socket transport; the HTTP `protect` middleware has no equivalent on the realtime channel, which was built as internal pub/sub and then exposed directly.
- **Affected Files**: `backend/src/services/socketService.js` (L300–L320 join, L38–L90 rider events, L403–L433 chat read/presence, L510–L540 emitters), `backend/src/index.js` (Socket.IO server construction/CORS)
- **UI/Frontend Impact**: None visible — the attack is external.
- **Security/Data Risk**: **Critical.** Unauthenticated subscription to another user's realtime channel, which on this platform carries notifications containing PHI (record created, lab result ready, appointment details) plus chat content, dispatch offers and ride/rider locations. No legitimate account is needed.
- **Steps to Reproduce**: `io('https://<host>', { auth: {} })`, then emit the join event used at L304 with `{ userId: '<victim ObjectId>' }` and observe that user's `notification`/chat events.
- **Suggested Fix / Implementation Plan**: Add a Socket.IO middleware (`io.use(...)`) verifying the access token with the same blocked/`isVerified` checks as `protect`, attaching `socket.userId`/`socket.userRole` from the decoded token. Delete every client-supplied identity fallback (`payload.userId`, `riderId`, `assistantId`, `lawyerId`, `from`). Validate room joins against real membership. Restrict socket CORS to the same exact-origin allowlist as HTTP (and fix that allowlist — AUTH-001/AUTH-017). Add tests asserting an unauthenticated or wrong-user socket cannot join another user's room.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `io.use()` token middleware reusing the HTTP auth logic
  - [ ] Remove all client-supplied identity fallbacks
  - [ ] Authorise room joins against real membership; exact-origin socket CORS
  - [ ] Tests: unauthenticated join, cross-user join, spoofed ids

---

## [CHAT-002] Client-supplied actor ids allow impersonation and state forgery (`from`, `riderId`, `userId`)
- **Description**: Several events take the acting identity from the payload and use it as the *identity* of the operation: `senderId || socket.userId` for messages (L131, L188); `from = payload.from || socket.userId` (L457–458); `const id = riderId || socket.userId` for location and online/offline updates (L40, L66, L84); `chat:read`/`chat:delivered` write `deliveredTo`/`readBy` for the **payload** `userId` (L395–L424); `chat:presence` sets presence for the payload `userId` (L429–433).
- **Current vs Expected**: Current = a client can (a) send a chat message that appears to come from another user, (b) forge another rider's GPS position, (c) mark other users' messages as read/delivered and (d) flip another user's presence. Expected = the actor is always the authenticated socket identity; payload ids are only ever *targets*, and targets are authorised.
- **Flow**: Chat between patient/doctor/lawyer; rider tracking during a live ride.
- **Root Cause / Logic**: `|| socket.userId` fallbacks meant as conveniences became the authoritative source whenever a client supplies a value — which an attacker always will.
- **Affected Files**: `backend/src/services/socketService.js` (L38–L54, L64–L86, L103–L119, L131, L152–L188, L395–L433, L457–L458)
- **UI/Frontend Impact**: Indirect but real — forged read/delivery receipts make the UI state incorrect and untrustworthy.
- **Security/Data Risk**: **Critical.** Message impersonation in a healthcare context (a message appearing to come from a doctor), plus forged location for live dispatch (`RideTracking.create`, L54), which is a physical-safety issue in the ambulance/rider flows.
- **Steps to Reproduce**: With an authenticated rider socket, emit `rider_location_update` with another rider's `riderId` and arbitrary lat/lng; observe the forged `RideTracking` row in the tracking UI.
- **Suggested Fix / Implementation Plan**: After adding socket authentication (CHAT-001), remove the id fallbacks and assert `payload.senderId/from/riderId/userId` either matches `socket.userId` or is an authorised target; reject otherwise. Require delivery/read receipts to be performed by the recipient only, after verifying conversation membership.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Remove actor-id fallbacks from all socket events
  - [ ] Authorise payload ids used as targets
  - [ ] Delivery/read receipts restricted to the recipient
  - [ ] Location updates bound to the authenticated rider
  - [ ] Tests for each impersonation path

## [CHAT-003] 39 conversation endpoints with no role guard and no conversation-membership check
- **Description**: `routes/chat.js` registers **39 routes** and uses **zero** authorisation helpers (per the `AUTHZ-001` sweep) — `protect` is the only gate. Every one of those endpoints identifies its target by `conversationId`/`messageId`/`userId` from the request, and no shared membership middleware is registered in the file, so the authorisation decision (if any) must be re-implemented inside all 39 handlers.
- **Current vs Expected**: Current = any authenticated account — a delivery partner, a rider, a self-registered patient — can address another pair's conversation by id and act on it: read messages, post into it, mutate flags. Expected = every conversation-scoped handler resolves membership server-side (`participants.includes(req.user.id)`) before touching the document, via one shared guard.
- **Flow**: Patient↔doctor, patient↔lawyer and support conversations, including any clinical content users choose to share in chat.
- **Root Cause / Logic**: Authorisation for conversation resources lives in per-handler conditionals rather than a middleware, at a scale (39 handlers) where omissions are statistically certain. This is the same defect shape as REC-001/002/007.
- **Affected Files**: `backend/src/routes/chat.js` (all 39 registrations), `models/Conversation.js` / message model (`participants`, `sender`)
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **High.** Reading private conversations — including clinical details users naturally share in chat — from any account. Also allows injecting messages into another pair's thread, which in a doctor↔patient thread is an integrity and impersonation risk that compounds CHAT-002.
- **Steps to Reproduce**: With any authenticated token, `GET /api/chat/conversations/<id>/messages` for a conversation the caller is not part of, enumerating ObjectIds.
- **Suggested Fix / Implementation Plan**: Add `requireConversationMember` middleware resolving membership from the conversation document, and attach it to every conversation/message route. Return 404 (not 403) for non-members to avoid confirming existence. Add an automated test that iterates the route table with a foreign conversation id and asserts 404 for each. Audit the specific handlers that already do the check, and extract that logic into the shared guard rather than duplicating it.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] `requireConversationMember` middleware
  - [ ] Attach to all 39 conversation/message routes
  - [ ] 404 (not 403) for non-members
  - [ ] Table-driven test across every route with a foreign id
  - [ ] Remove duplicated inline membership logic

---

## [CHAT-004] A single 1,484-line route file holds 39 endpoints, and the one correct regex-escape helper is trapped inside it
- **Description**: `routes/chat.js` is 1,484 lines long and mixes the message API, presence, privacy settings, link-safety heuristics and notification helpers. It also contains the **only** correct implementation of user-input regex escaping in the repository (`const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` at L144, used at L301, L369 and L1435), while the other
  **56 files** that build `new RegExp(...)` do not escape at all (REC-006).
- **Current vs Expected**: Current = a reviewer cannot meaningfully audit this module, so the authorisation gaps above survive review; and the one good utility is inaccessible, guaranteeing the 56 other files stay broken. Expected = the module split along its seams (messages, presence, privacy, safety) with `escapeRegex` promoted to `utils/`.
- **Flow**: Every future change to messaging, and every search endpoint elsewhere in the platform.
- **Root Cause / Logic**: Feature accretion in a single file; utilities were added where first needed instead of where they belong.
- **Affected Files**: `backend/src/routes/chat.js` (L144 the helper; whole file for structure), `backend/src/utils/` (target for the helper)
- **UI/Frontend Impact**: None, but slow iteration on messaging features.
- **Security/Data Risk**: **Medium.** Not exploitable by itself; it is the reason the security problems in this module and the regex-injection class in REC-006 were not caught in review — a maintainability finding with a direct security consequence.
- **Steps to Reproduce**: N/A (structural).
- **Suggested Fix / Implementation Plan**: Move `escapeRegex` (and the link-safety heuristics) into `utils/` first — that is the highest-value, lowest-risk extraction. Then split the route file into `chat/messages.js`, `chat/presence.js`, `chat/privacy.js` behind one router, add per-module tests, and wire them through the new `requireConversationMember` guard.
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Promote `escapeRegex` to `utils/` and use it platform-wide (REC-006)
  - [ ] Split `chat.js` into focused sub-routers
  - [ ] Move link-safety heuristics to a service
  - [ ] Add tests per sub-router
  - [ ] Add a file-length warning to lint config

## [CHAT-005] App-lock PIN � unlimited guesses, no lockout (chat.js L649-684)`r`n- **Description**: `POST /privacy/app-lock/pin` + `/verify` me `bcrypt.compare` hota hai par **koi attempt-counter, lockout, ya rate-limit nahi** (sirf global limiters). 4-digit PIN = 10,000 combinations; valid session wala attacker offline nahi, online brute-force kar sakta hai � har galat guess sirf ek aur request hai.`r`n- **Risk**: **High.** App-lock privacy control bypass � attacker victim ke unlocked session/device se saari chats khol sakta hai.`r`n- **Fix**: per-user attempt counter (Redis) + exponential backoff, 5 fails par 15-min lock + audit-log; PIN ko device-key se bind karo (sirf server-hash par bharosa nahi).`r`n`r`n---`r`n`r`n## [CHAT-006] Support-ticket reply sirf superadmin kar sakta hai � user apne ticket me jawab nahi de sakta (supportTickets.js L70)`r`n- **Description**: `POST /:id/messages` par `superadminOnly` hai. Matlab patient/staff apne khud ke ticket-thread me reply hi nahi kar sakta � two-way support flow toota hua hai. Ulta, `PUT /:id/status` + `/:id/assign` bhi `superadminOnly` hain (hospital_admin apne tenant ke ticket bhi manage nahi kar sakta), aur status-update me `req.body.status` bina enum-check ke seedha DB me jata hai.`r`n- **Risk**: **Medium.** DoS-by-design (support unusable), plus free-text status se reporting/workflow corrupt ho sakta hai.`r`n- **Fix**: messages-route par owner-check (`ticket.raisedBy === caller`) + staff-role allow; status ko enum (`Open/In Progress/Resolved/Closed`) se validate karo; assignment me `assignedTo` ka user-exists + tenant check.`r`n`r`n---`r`n`r`n<!-- END -->
