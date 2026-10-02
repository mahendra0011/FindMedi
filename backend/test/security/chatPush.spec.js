/**
 * CHAT-M-04 — push subscription routes + send wiring (HTTP layer).
 *
 *   GET    /push-config              — advertises VAPID config to the client
 *   POST   /push-subscriptions       — upserts a browser endpoint for the caller
 *   DELETE /push-subscriptions/:id   — self-scoped unregister
 *   POST   /messages                 — after socket emit, falls back to
 *                                      sendChatPush(recipient, routing meta)
 *                                      and never blocks the send on push
 *                                      failure (message is already persisted).
 *
 * pushSender is mocked here (its decision tree lives in pushSender.spec.js);
 * models are stubbed by the harness.
 */
import { jest } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const sendChatPush = jest.fn(async () => ({ sent: 0, skipped: 'not-configured' }));
const isPushConfigured = jest.fn(() => true);
const getVapidPublicKey = jest.fn(() => 'TEST_PUBLIC_KEY');

jest.unstable_mockModule('../../src/services/pushSender.js', () => ({
  sendChatPush,
  isPushConfigured,
  getVapidPublicKey,
}));

let conversationById = () => query(null);
jest.unstable_mockModule('../../src/models/ChatConversation.js', () => ({
  default: Object.assign(jest.fn(), {
    findById: (id) => conversationById(id),
    findOne: jest.fn(() => query(null)),
    find: jest.fn(() => query([])),
    create: jest.fn(),
  }),
}));

const ChatMessage = jest.fn(function ChatMessage(doc) {
  Object.assign(this, doc);
  this._id = this._id || 'msg-new-1';
});
ChatMessage.prototype.save = jest.fn(async function save() { return this; });
ChatMessage.prototype.populate = jest.fn(async function populate() { return this; });
ChatMessage.findOne = jest.fn(() => query(null));
ChatMessage.find = jest.fn(() => query([]));
jest.unstable_mockModule('../../src/models/ChatMessage.js', () => ({ default: ChatMessage }));

const findOneAndUpdate = jest.fn();
const deleteOne = jest.fn();
jest.unstable_mockModule('../../src/models/PushSubscription.js', () => ({
  default: { findOneAndUpdate, deleteOne, find: jest.fn(() => query([])) },
}));

const { as } = await mountApp('chat');

const PATIENT = { id: 'u1', role: 'patient', name: 'Pat' };
const SUB_ID = '64b000000000000000000001';
const validBody = {
  endpoint: 'https://push.example.com/sub/abc',
  keys: { p256dh: 'BFxTESTKEY', auth: 'authtoken' },
  userAgent: 'Mozilla/5.0',
};

const makeConversation = (participants = ['u1', 'u2']) => ({
  _id: 'c1',
  participants,
  blockedBy: [],
  requestStatus: 'accepted',
  unreadCounts: [],
  deletedFor: [],
  clearedFor: [],
  drafts: [],
  disappearing: { enabled: false },
  save: jest.fn(async () => {}),
});

beforeEach(() => {
  jest.clearAllMocks();
  isPushConfigured.mockReturnValue(true);
  getVapidPublicKey.mockReturnValue('TEST_PUBLIC_KEY');
  sendChatPush.mockResolvedValue({ sent: 1, skipped: null });
  conversationById = () => query(makeConversation());
  findOneAndUpdate.mockResolvedValue({ _id: SUB_ID });
  deleteOne.mockResolvedValue({ deletedCount: 1 });
});

describe('GET /push-config', () => {
  it('401 unauthenticated', async () => {
    await as().get('/push-config').expect(401);
  });

  it('advertises configured + public key to the signed-in caller', async () => {
    const res = await as(PATIENT).get('/push-config').expect(200);
    expect(res.body).toEqual({ configured: true, publicKey: 'TEST_PUBLIC_KEY' });
  });

  it('reports configured:false with null key when VAPID keys are absent', async () => {
    isPushConfigured.mockReturnValue(false);
    getVapidPublicKey.mockReturnValue(null);
    const res = await as(PATIENT).get('/push-config').expect(200);
    expect(res.body).toEqual({ configured: false, publicKey: null });
  });
});

describe('POST /push-subscriptions', () => {
  it('401 unauthenticated', async () => {
    await as().post('/push-subscriptions').send(validBody).expect(401);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('400 when endpoint is missing or not a URL', async () => {
    await as(PATIENT).post('/push-subscriptions').send({ keys: validBody.keys }).expect(400);
    await as(PATIENT).post('/push-subscriptions')
      .send({ ...validBody, endpoint: 'not a url' })
      .expect(400);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('400 for non-http(s) endpoints (no internal-service SSRF shape)', async () => {
    const res = await as(PATIENT).post('/push-subscriptions')
      .send({ ...validBody, endpoint: 'file:///etc/passwd' })
      .expect(400);
    expect(res.body.message).toContain('http(s)');
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('400 when p256dh/auth keys are missing or oversized', async () => {
    await as(PATIENT).post('/push-subscriptions')
      .send({ ...validBody, keys: { auth: 'a' } })
      .expect(400);
    await as(PATIENT).post('/push-subscriptions')
      .send({ ...validBody, keys: { p256dh: 'x'.repeat(600), auth: 'a' } })
      .expect(400);
    await as(PATIENT).post('/push-subscriptions')
      .send({ ...validBody, keys: { p256dh: 'p' } })
      .expect(400);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('201: upserts keyed on (callerId, endpoint) with the device keys', async () => {
    const res = await as(PATIENT).post('/push-subscriptions').send(validBody).expect(201);
    expect(res.body).toEqual({ id: SUB_ID, endpoint: validBody.endpoint });
    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ userId: 'u1', endpoint: validBody.endpoint });
    expect(update.$set.keys).toEqual({ p256dh: 'BFxTESTKEY', auth: 'authtoken' });
    expect(update.$set.lastSeenAt).toBeInstanceOf(Date);
    expect(options).toMatchObject({ upsert: true, new: true });
  });
});

describe('DELETE /push-subscriptions/:id', () => {
  it('401 unauthenticated', async () => {
    await as().delete(`/push-subscriptions/${SUB_ID}`).expect(401);
  });

  it('404 for a malformed id (no DB round-trip)', async () => {
    await as(PATIENT).delete('/push-subscriptions/not-an-id').expect(404);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it('404 when the subscription belongs to someone else (self-scoped delete)', async () => {
    deleteOne.mockResolvedValue({ deletedCount: 0 });
    await as(PATIENT).delete(`/push-subscriptions/${SUB_ID}`).expect(404);
    expect(deleteOne).toHaveBeenCalledWith({ _id: SUB_ID, userId: 'u1' });
  });

  it('204 when removed', async () => {
    await as(PATIENT).delete(`/push-subscriptions/${SUB_ID}`).expect(204);
    expect(deleteOne).toHaveBeenCalledWith({ _id: SUB_ID, userId: 'u1' });
  });
});

describe('POST /messages → push fallback wiring', () => {
  it('calls sendChatPush for the OTHER participant with routing metadata only', async () => {
    await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: 'hello' })
      .expect(201);
    expect(sendChatPush).toHaveBeenCalledTimes(1);
    const [recipientId, routing] = sendChatPush.mock.calls[0];
    expect(recipientId).toBe('u2');
    expect(routing).toEqual({ conversationId: 'c1', tag: 'chat:c1' });
  });

  it('no push when there is no other participant', async () => {
    conversationById = () => query(makeConversation(['u1']));
    await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: 'note to self' })
      .expect(201);
    expect(sendChatPush).not.toHaveBeenCalled();
  });

  it('push failure never blocks the send (message is already persisted)', async () => {
    sendChatPush.mockRejectedValue(new Error('push exploded'));
    await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: 'hello' })
      .expect(201);
  });

  it('sendChatPush is imported from pushSender, not re-implemented in the route', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(new URL('../../src/routes/chat.js', import.meta.url), 'utf8');
    expect(src).toMatch(/import \{[^}]*sendChatPush[^}]*\} from '\.\.\/services\/pushSender\.js'/);
    expect(src).toMatch(/\/\/ authz: self\s*\nrouter\.get\('\/push-config'/);
    expect(src).toMatch(/\/\/ authz: self\s*\nrouter\.post\('\/push-subscriptions'/);
    expect(src).toMatch(/\/\/ authz: self\s*\nrouter\.delete\('\/push-subscriptions\/:id'/);
  });
});
