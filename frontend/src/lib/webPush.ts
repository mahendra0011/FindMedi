/**
 * CHAT-M-04 — Web Push subscription management for chat notifications.
 *
 * Server side: GET  /chat/push-config        → { configured, publicKey }
 *              POST /chat/push-subscriptions → upsert (auth: chat:write:own)
 *              DELETE /chat/push-subscriptions/:id
 *
 * NOTIF-B-05: nothing here builds notification copy — the server sends a
 * static PHI-free payload; this module only handles permission, SW
 * registration, subscription and persistence of the endpoint.
 *
 * Two entry points:
 *  - enableChatPush(): must run inside a user gesture (bell button click) —
 *    asks for Notification permission when it is still 'default'.
 *  - syncChatPush():   silent re-sync when permission is already granted
 *    (mount, or after the service worker reports a rotated subscription).
 */

import api from './axios';

export type PushState = 'on' | 'off' | 'unsupported' | 'server-off';

export interface PushEnableResult {
  ok: boolean;
  state: PushState;
  reason?: 'unsupported' | 'not-configured' | 'permission-denied' | 'failed';
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** VAPID public key is base64url → PushManager wants a Uint8Array. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function getPushConfig(): Promise<{ configured: boolean; publicKey: string | null }> {
  const { data } = await api.get('/chat/push-config');
  return { configured: Boolean(data?.configured), publicKey: data?.publicKey || null };
}

async function ensureSubscription(publicKey: string): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.register('/sw.js');
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('incomplete push subscription');
  }
  await api.post('/chat/push-subscriptions', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent.slice(0, 300),
  });
}

/** User-gesture path: permission ask (if needed) → subscribe → persist. */
export async function enableChatPush(): Promise<PushEnableResult> {
  if (!isPushSupported()) return { ok: false, state: 'unsupported', reason: 'unsupported' };

  let config: { configured: boolean; publicKey: string | null };
  try {
    config = await getPushConfig();
  } catch {
    return { ok: false, state: 'off', reason: 'failed' };
  }
  if (!config.configured || !config.publicKey) {
    return { ok: false, state: 'server-off', reason: 'not-configured' };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { ok: false, state: 'off', reason: 'failed' };
  }
  if (permission !== 'granted') {
    return { ok: false, state: 'off', reason: 'permission-denied' };
  }

  try {
    const sub = await ensureSubscription(config.publicKey);
    await postSubscription(sub);
    return { ok: true, state: 'on' };
  } catch {
    return { ok: false, state: 'off', reason: 'failed' };
  }
}

/** Silent path: permission already granted → ensure SW + subscription + server row. */
export async function syncChatPush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const config = await getPushConfig();
    if (!config.configured || !config.publicKey) return 'server-off';
    const sub = await ensureSubscription(config.publicKey);
    await postSubscription(sub);
    return 'on';
  } catch {
    return 'off';
  }
}
