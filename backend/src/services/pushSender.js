// CHAT-M-04 — Web Push fallback for chat (offline delivery guarantee).
//
// The audit: chat delivery was socket-only, so a closed tab/app never saw a
// message. Sockets stay the fast path; this module is the fallback for a
// recipient with no live presence. Native FCM/APNs device tokens remain
// NOTIF-M-01 (needs Firebase/APNs credentials) — Web Push needs only a locally
// generated VAPID key pair, so it ships now:
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (+ optional VAPID_SUBJECT)
//   generate: npx web-push generate-vapid-keys
// Unconfigured server → isPushConfigured() false, sends are skipped (dev/test
// default, same env-gate pattern as ClamAV).
//
// NOTIF-B-05 holds here too: the payload copy is built HERE from static
// strings — callers only pass routing metadata (conversationId/tag, never
// message content or sender name), so nothing a user typed can reach a lock
// screen.
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
import { getOnlinePresence } from '../config/redis.js';
import { loadPreference, decide } from './notificationPreferences.js';
import logger from '../config/logger.js';

export const isPushConfigured = () =>
  Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export const getVapidPublicKey = () =>
  (isPushConfigured() ? process.env.VAPID_PUBLIC_KEY : null);

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  if (!isPushConfigured()) return false;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:security@findmedi.example',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    vapidReady = true;
    return true;
  } catch (err) {
    logger.warn(`[push] VAPID configuration invalid: ${err.message}`);
    return false;
  }
}

// Static, PHI-free copy (NOTIF-B-05). Callers pass only routing metadata.
const PUSH_COPY = { title: 'New message', body: 'You have a new message in FindMedi.' };

// The FE chat routes are role-scoped (App.tsx: /patient/chat, /doctor/chat,
// …). A push for a role with no chat page would open RoleRoute's deny screen,
// so those sends are skipped instead of deep-linking somewhere useless.
const CHAT_ROLE_PATHS = {
  patient: '/patient/chat',
  doctor: '/doctor/chat',
  hospital_admin: '/doctor/chat',
  counsellor: '/counsellor/chat',
  psychiatrist: '/psychiatrist/chat',
  clinic_doctor: '/clinic/chat',
};

/**
 * Best-effort push to a recipient's subscribed browsers.
 * Never throws — delivery failures are logged and counted, not propagated
 * (the message itself was already persisted + socket-emitted by the caller).
 *
 * Routing: pass `conversationId` and the role-scoped deep link is resolved
 * from the recipient's User doc (one query, only after every cheap gate has
 * passed and there is at least one subscription to send to). An explicit
 * `url` wins if provided. Roles with no chat route are skipped.
 *
 * @param {string} recipientId
 * @param {{ url?: string, conversationId?: string, tag?: string }} routing
 * @returns {Promise<{ sent: number, skipped: string|null }>}
 */
export async function sendChatPush(recipientId, { url, conversationId, tag } = {}) {
  if (!recipientId) return { sent: 0, skipped: 'no-recipient' };
  if (!ensureVapid()) return { sent: 0, skipped: 'not-configured' };

  // User controls: channels.push toggle, mutedTypes, quiet-hours (chat_message
  // is NOT transactional, so decide() applies them). loadPreference fails open.
  try {
    const preference = await loadPreference(recipientId);
    const decision = decide({ type: 'chat_message', channel: 'push', preference });
    if (!decision.allow) return { sent: 0, skipped: decision.reason };
  } catch (err) {
    logger.warn(`[push] preference check failed, delivering by defaults: ${err.message}`);
  }

  // Presence: skip ONLY when the recipient is known-live (90s TTL key). Redis
  // down → {} → we push (fail toward delivery; worst case the browser shows a
  // push alongside the in-app socket toast for the same message).
  const presence = await getOnlinePresence([String(recipientId)]);
  if (presence[String(recipientId)]) return { sent: 0, skipped: 'online' };

  const subs = await PushSubscription.find({ userId: String(recipientId) }).lean();
  if (!subs.length) return { sent: 0, skipped: 'no-subscriptions' };

  // Resolve the deep link last: the User lookup only happens when we are
  // actually about to send (all cheap gates already passed).
  let deepLink = url || '/';
  if (conversationId) {
    let recipient = null;
    try {
      recipient = await User.findById(recipientId).select('role').lean();
    } catch (err) {
      logger.warn(`[push] recipient lookup failed: ${err.message}`);
    }
    const path = recipient && CHAT_ROLE_PATHS[recipient.role];
    if (!path) return { sent: 0, skipped: 'no-chat-route' };
    deepLink = `${path}?conversation=${encodeURIComponent(String(conversationId))}`;
  }

  const payload = JSON.stringify({ title: PUSH_COPY.title, body: PUSH_COPY.body, url: deepLink, tag });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
        { TTL: 4 * 60 * 60 }, // a chat ping is stale after a few hours
      );
      sent += 1;
    } catch (err) {
      // 404/410 = the browser's push service no longer knows this endpoint
      // (subscription expired / user unsubscribed) — clean it up so we stop
      // paying for dead sends.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        continue;
      }
      logger.warn(`[push] send failed (${err?.statusCode || 'no-status'}): ${err?.message}`);
    }
  }
  return { sent, skipped: null };
}
