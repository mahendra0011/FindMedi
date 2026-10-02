/* CHAT-M-04 — chat Web Push service worker.
 *
 * NOTIF-B-05: push payloads are PHI-free static copy built by the server
 * (pushSender.js). This worker renders what it receives and never derives
 * notification text from message content. Deep links are restricted to
 * same-site relative paths so a payload cannot turn a click into an
 * open-redirect.
 */

self.addEventListener('push', (event) => {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    data = null;
  }

  const title = (data && typeof data.title === 'string' && data.title) || 'FindMedi';
  const body = (data && typeof data.body === 'string' && data.body)
    || 'You have a new message in FindMedi.';
  const tag = (data && typeof data.tag === 'string' && data.tag) || 'findmedi-chat';
  const rawUrl = (data && typeof data.url === 'string') ? data.url : '/patient/chat';
  const url = (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) ? rawUrl : '/patient/chat';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
      icon: '/icon.png',
      badge: '/icon.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const rawUrl = typeof payload.url === 'string' ? payload.url : '/patient/chat';
  const url = (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) ? rawUrl : '/patient/chat';

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Focus a window that is already on a chat page (any role) and hand it
    // the deep link; otherwise open a fresh window at the role-scoped URL —
    // focusing an unrelated page would swallow the click.
    let chatClient = null;
    for (const client of windows) {
      try {
        if (new URL(client.url).pathname.endsWith('/chat')) { chatClient = client; break; }
      } catch { /* unparsable client url — keep looking */ }
    }
    if (chatClient) {
      chatClient.postMessage({ type: 'findmedi:notification-click', url });
      return chatClient.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
    return undefined;
  })());
});

/* The browser may rotate the subscription (endpoint expiry, UA change).
 * The server cannot be re-POSTed from here (the auth token lives in the
 * page), so open clients are told to re-sync; if none are open, the next
 * page load with granted permission re-syncs automatically via syncChatPush.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      client.postMessage({ type: 'findmedi:push-subscription-changed' });
    }
  })());
});
