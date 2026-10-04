# Chat reconnect/resume contract (CHAT-M-01)

**Status:** implemented client-side; server behavior documented from current
`socketService.js`. Covers: event cursor, ack, offline queue, resume, and
duplicate-delivery safety.

## Roles

| Plane | Mechanism | Source of truth |
|---|---|---|
| Identity | JWT handshake (`verifySocketAuth`) — never a client-supplied `userId` | `backend/src/services/socketService.js:451` |
| Room membership | `chat:join` → `assertRoomAccess`, else `error:room` | `backend/src/services/socketService.js:630-636` |
| Durable write | REST `POST /chat/messages` (returns the server row) | `ChatDashboard.tsx:486` |
| Notification fan-out | socket `chat:receive_message` etc. (no persistence implied) | `ChatDashboard.tsx:287-300` |
| Offline pending | device-local queue, flushed on `connect` over REST | `frontend/src/lib/chatPrefs.js:93-119`, `ChatDashboard.tsx:233-255,275-281` |
| Cursor + dedupe | per-conversation cursor + `_id`/`clientGeneratedId` merge | `frontend/src/lib/chatResume.js:43-97` |

## Reconnect sequence

1. `socket.io` reconnects (explicit `reconnection: true`, `frontend/src/lib/socket.js:50-54`).
2. `joinRoom` re-emits the join on every `connect` (server does **not** restore
   rooms): `frontend/src/lib/socket.js:86-93`.
3. `onConnect` emits `chat:presence`, `chat:sync { since }`, flushes the offline
   queue over REST, and refreshes conversations (`ChatDashboard.tsx:275-281`).
4. `since`/`afterId` come from the cursor (`chatResume.js:56` `buildSyncPayload`);
   default lookback is 60s when no cursor exists.
5. Flush results classify per item (`chatResume.js:97` `classifySendError`):
   network error → stays `queued` (retry next flush); server rejection → `failed`
   + dequeued (no silent retry of a forbidden write).
6. Incoming rows merge idempotently (`chatResume.js:67` `mergeMessages`):
   same `_id` **or** same `clientGeneratedId` → one row; REST-ack replaces the
   optimistic row in place; identical replays are dropped.

## Duplicate-delivery cases covered by test

- Socket replay of an already-rendered `_id` → dropped (`chatResume.test.js`).
- REST ack + socket echo with the same `clientGeneratedId` → single merged row,
  server `_id` wins.
- Two distinct messages with identical content → both kept (dedupe is by id,
  never by content).

## What this contract does NOT promise

- No server-side replay log / cursor-acked catch-up beyond the `chat:sync`
  emit; missed-event completeness depends on the server handler + REST refresh.
- No ordering guarantee across transports; grouping renders by `createdAt`.
- Queue is per-device (localStorage); a second device does not see it.
