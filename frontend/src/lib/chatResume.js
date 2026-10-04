/**
 * CHAT-M-01 — chat reconnect/resume contract (client side).
 *
 * Server contract (backend/src/services/socketService.js):
 * - identity handshake JWT se hoti hai (`verifySocketAuth`, L428) — client kabhi
 *   userId/role payload se join nahi karta.
 * - `chat:join` membership-gated hai (`assertRoomAccess`, L607-616); outsider ko
 *   `error:room` milta hai, room join nahi hota.
 * - reconnect par server rooms restore nahi karta — client `connect` par dobara
 *   `chat:join` emit karta hai (frontend/src/lib/socket.js `joinRoom`).
 *
 * Is module ka kaam: reconnect ke baad "kya miss hua" aur "kya dobara bhejna hai"
 * iska deterministic, testable hissa.
 *
 * - cursor: har conversation ka last-seen `createdAt`/message `_id`. `chat:sync`
 *   emit me `since` bhejkar missed events mange jate hain
 *   (ChatDashboard.tsx onConnect: `socket.emit('chat:sync', { since })`).
 * - ack: server durable write ka jawab REST `POST /chat/messages` se deta hai;
 *   optimistic message tabhi replace hota hai, warna `queued`/`failed` rehta hai.
 * - dedupe: `clientGeneratedId` + server `_id` dono par idempotent merge — same
 *   message socket replay + REST flush dono se aaye to ek hi render hota hai.
 */

const CURSOR_KEY = 'findmedi_chat_cursor';

function readJson(key, fallback) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
  return value;
}

/** Last-seen cursor per conversation: { messageId, at } */
export function getCursor(conversationId) {
  const all = readJson(CURSOR_KEY, {});
  return all[conversationId] || null;
}

export function setCursor(conversationId, { messageId, at } = {}) {
  const all = readJson(CURSOR_KEY, {});
  all[conversationId] = { messageId: messageId || null, at: at || new Date().toISOString() };
  writeJson(CURSOR_KEY, all);
  return all[conversationId];
}

/** Reconnect sync payload — server is `since` se missed events deta hai. */
export function buildSyncPayload(conversationId, { lookbackMs = 60000 } = {}) {
  const cursor = getCursor(conversationId);
  const since = cursor?.at ? new Date(cursor.at).getTime() : Date.now() - lookbackMs;
  return { conversationId, since, afterId: cursor?.messageId || null };
}

/**
 * Missed + local messages ka idempotent merge.
 * Key order: server `_id` > `clientGeneratedId`. Dono me se koi bhi match ho to
 * duplicate nahi jodte — server echo + REST flush ka double-delivery yahin rukta hai.
 */
export function mergeMessages(existing = [], incoming = []) {
  const seen = new Set();
  for (const m of existing) {
    if (m?._id) seen.add(`id:${m._id}`);
    if (m?.clientGeneratedId) seen.add(`cg:${m.clientGeneratedId}`);
  }
  const out = [...existing];
  for (const m of incoming) {
    if (!m) continue;
    // REST ack / socket echo for an optimistic row: same clientGeneratedId but
    // server-assigned _id — replace in place instead of treating as duplicate.
    if (m.clientGeneratedId) {
      const idx = out.findIndex(
        (x) => x.clientGeneratedId === m.clientGeneratedId && x._id !== m._id,
      );
      if (idx !== -1) {
        out[idx] = { ...out[idx], ...m };
        if (m._id) seen.add(`id:${m._id}`);
        continue;
      }
    }
    if ((m._id && seen.has(`id:${m._id}`)) || (m.clientGeneratedId && seen.has(`cg:${m.clientGeneratedId}`))) continue;
    if (m._id) seen.add(`id:${m._id}`);
    if (m.clientGeneratedId) seen.add(`cg:${m.clientGeneratedId}`);
    out.push(m);
  }
  return out;
}

/** Ack classification: REST response aayi to durable, network error to retry, 4xx to failed. */
export function classifySendError(err) {
  if (!err || !err.response) return 'queued'; // network error → offline queue me rahega
  return 'failed'; // 4xx/5xx with response → permanent, queue se hatao
}
