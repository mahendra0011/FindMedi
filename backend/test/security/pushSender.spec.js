/**
 * CHAT-M-04 — pushSender (web push fallback) unit tests.
 *
 * Covers the delivery decision tree: unconfigured VAPID (dev/test default),
 * user preference gates (channels.push / quiet-hours via decide()), presence
 * skip (fail toward delivery when Redis is down), send fan-out with the
 * NOTIF-B-05 static PHI-free payload, and stale-endpoint cleanup on 404/410.
 * web-push, redis presence, the subscription model and the preference layer
 * are all mocked — no network, no Mongo.
 */
import { jest } from '@jest/globals';

const sendNotification = jest.fn();
const setVapidDetails = jest.fn();
const getOnlinePresence = jest.fn(async () => ({}));
const findMock = jest.fn();
const deleteOneMock = jest.fn(async () => ({ deletedCount: 1 }));
const userFindById = jest.fn();
const loadPreference = jest.fn();
const decide = jest.fn(() => ({ allow: true, reason: null }));

jest.unstable_mockModule('web-push', () => ({
  default: { sendNotification, setVapidDetails },
}));
jest.unstable_mockModule('../../src/config/redis.js', () => ({ getOnlinePresence }));
jest.unstable_mockModule('../../src/models/PushSubscription.js', () => ({
  default: { find: findMock, delete: deleteOneMock, deleteOne: deleteOneMock },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: userFindById },
}));
jest.unstable_mockModule('../../src/services/notificationPreferences.js', () => ({
  loadPreference,
  decide,
}));

const { isPushConfigured, getVapidPublicKey, sendChatPush } = await import(
  '../../src/services/pushSender.js'
);

const sub = (id, endpoint) => ({ _id: id, endpoint, keys: { p256dh: 'p', auth: 'a' } });

const chain = (value) => {
  const q = { select: () => q, lean: () => q, then: (res) => Promise.resolve(value).then(res) };
  return q;
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  getOnlinePresence.mockResolvedValue({});
  loadPreference.mockResolvedValue({ channels: { push: true }, mutedTypes: [], quietHours: { enabled: false } });
  decide.mockReturnValue({ allow: true, reason: null });
  findMock.mockReturnValue(chain([]));
  deleteOneMock.mockResolvedValue({ deletedCount: 1 });
  userFindById.mockReturnValue(chain({ role: 'patient' }));
});

describe('configuration gate', () => {
  it('unconfigured when either key is missing (dev/test default = skip)', () => {
    expect(isPushConfigured()).toBe(false);
    expect(getVapidPublicKey()).toBeNull();
    process.env.VAPID_PUBLIC_KEY = 'PUB';
    expect(isPushConfigured()).toBe(false);
    process.env.VAPID_PRIVATE_KEY = 'PRIV';
    expect(isPushConfigured()).toBe(true);
    expect(getVapidPublicKey()).toBe('PUB');
  });

  it('sendChatPush without config skips without touching prefs/presence/db', async () => {
    const result = await sendChatPush('u1', { url: '/chat' });
    expect(result).toEqual({ sent: 0, skipped: 'not-configured' });
    expect(loadPreference).not.toHaveBeenCalled();
    expect(findMock).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('no recipient short-circuits before anything else', async () => {
    expect(await sendChatPush(null, {})).toEqual({ sent: 0, skipped: 'no-recipient' });
  });
});

describe('decision tree', () => {
  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = 'PUB';
    process.env.VAPID_PRIVATE_KEY = 'PRIV';
  });

  it('honours the preference decision (channels.push disabled / quiet hours)', async () => {
    decide.mockReturnValue({ allow: false, reason: 'channel-disabled' });
    expect(await sendChatPush('u1', {})).toEqual({ sent: 0, skipped: 'channel-disabled' });
    expect(findMock).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
    // first configured call flips the module-level vapidReady latch
    expect(setVapidDetails).toHaveBeenCalledWith(
      expect.any(String),
      'PUB',
      'PRIV',
    );
  });

  it('skips when the recipient has live presence (socket toast covers them)', async () => {
    getOnlinePresence.mockResolvedValue({ u1: true });
    expect(await sendChatPush('u1', {})).toEqual({ sent: 0, skipped: 'online' });
    expect(findMock).not.toHaveBeenCalled();
  });

  it('presence lookup returning {} (Redis down) fails TOWARD delivery', async () => {
    getOnlinePresence.mockResolvedValue({});
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1')]));
    sendNotification.mockResolvedValue({});
    const result = await sendChatPush('u1', {});
    expect(result).toEqual({ sent: 1, skipped: null });
  });

  it('no stored subscriptions → skipped, nothing sent', async () => {
    expect(await sendChatPush('u1', {})).toEqual({ sent: 0, skipped: 'no-subscriptions' });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe('send fan-out', () => {
  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = 'PUB';
    process.env.VAPID_PRIVATE_KEY = 'PRIV';
  });

  it('sends the static PHI-free payload (NOTIF-B-05) with routing metadata only', async () => {
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1'), sub('s2', 'https://push.example/2')]));
    sendNotification.mockResolvedValue({});

    const result = await sendChatPush('u1', { url: '/chat?conversation=c9', tag: 'chat:c9' });

    expect(result).toEqual({ sent: 2, skipped: null });
    expect(sendNotification).toHaveBeenCalledTimes(2);
    const [target, payload, options] = sendNotification.mock.calls[0];
    expect(target).toEqual({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } });
    const parsed = JSON.parse(payload);
    expect(parsed.title).toBe('New message');
    expect(parsed.body).toBe('You have a new message in FindMedi.');
    expect(parsed.url).toBe('/chat?conversation=c9');
    expect(parsed.tag).toBe('chat:c9');
    expect(options).toEqual({ TTL: 4 * 60 * 60 });
  });

  it('410 gone endpoint → subscription deleted, not counted as sent', async () => {
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/gone')]));
    sendNotification.mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));

    const result = await sendChatPush('u1', {});

    expect(result).toEqual({ sent: 0, skipped: null });
    expect(deleteOneMock).toHaveBeenCalledWith({ _id: 's1' });
  });

  it('transient send failure never throws (message already persisted by caller)', async () => {
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1')]));
    sendNotification.mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 500 }));

    await expect(sendChatPush('u1', {})).resolves.toEqual({ sent: 0, skipped: null });
    expect(deleteOneMock).not.toHaveBeenCalled();
  });

  it('preference lookup explosion fails open to defaults, not to a drop', async () => {
    loadPreference.mockRejectedValue(new Error('mongo down'));
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1')]));
    sendNotification.mockResolvedValue({});

    const result = await sendChatPush('u1', {});
    expect(result).toEqual({ sent: 1, skipped: null });
  });

  it('conversationId resolves the role-scoped deep link from the recipient User', async () => {
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1')]));
    userFindById.mockReturnValue(chain({ role: 'patient' }));
    sendNotification.mockResolvedValue({});

    const result = await sendChatPush('u1', { conversationId: 'c9', tag: 'chat:c9' });

    expect(result).toEqual({ sent: 1, skipped: null });
    expect(userFindById).toHaveBeenCalledWith('u1');
    const parsed = JSON.parse(sendNotification.mock.calls[0][1]);
    // FE chat routes are role-scoped (App.tsx) — /chat would 404.
    expect(parsed.url).toBe('/patient/chat?conversation=c9');
    expect(parsed.tag).toBe('chat:c9');
    expect(parsed.title).toBe('New message');
    expect(parsed.body).toBe('You have a new message in FindMedi.');
  });

  it('hospital_admin maps to the shared /doctor/chat route', async () => {
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1')]));
    userFindById.mockReturnValue(chain({ role: 'hospital_admin' }));
    sendNotification.mockResolvedValue({});

    await sendChatPush('u1', { conversationId: 'c9' });

    const parsed = JSON.parse(sendNotification.mock.calls[0][1]);
    expect(parsed.url).toBe('/doctor/chat?conversation=c9');
  });

  it('role with no chat route → skipped, nothing sent (would land on RoleRoute deny)', async () => {
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1')]));
    userFindById.mockReturnValue(chain({ role: 'admin' }));

    const result = await sendChatPush('u1', { conversationId: 'c9', tag: 'chat:c9' });

    expect(result).toEqual({ sent: 0, skipped: 'no-chat-route' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('recipient lookup failure skips safely instead of throwing mid-send', async () => {
    findMock.mockReturnValue(chain([sub('s1', 'https://push.example/1')]));
    userFindById.mockReturnValue({ select: () => { throw new Error('db down'); } });

    const result = await sendChatPush('u1', { conversationId: 'c9' });

    expect(result).toEqual({ sent: 0, skipped: 'no-chat-route' });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
