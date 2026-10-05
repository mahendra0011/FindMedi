/**
 * CHAT-M-02 — chat upload + message-send routes (HTTP layer).
 *
 * Proves the policy wiring end-to-end through a real Express router:
 *   POST /upload  — auth, dataUrl validation, and the service's status codes
 *                   (415 unsupported / 422 malware / 503 scanner down / 413 too
 *                   large / 500) are surfaced, and a quarantine event is audited.
 *   POST /messages — the client `attachments` array goes through
 *                   validateChatAttachments() BEFORE persistence; a rejection
 *                   stops the message with the validator's status/message.
 *
 * The service itself is mocked here (its logic is covered in
 * chatUploadService.spec.js); models are stubbed by the harness.
 */
import { jest } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const storeChatUpload = jest.fn();
const validateChatAttachments = jest.fn(() => null);
const auditLog = jest.fn(async () => {});

jest.unstable_mockModule('../../src/services/chatUploadService.js', () => ({
  storeChatUpload,
  validateChatAttachments,
  MAX_CHAT_UPLOAD_BYTES: 1024,
  CHAT_UPLOAD_DIR: '/tmp/chat-uploads-test',
  CHAT_EXT_MAP: { 'image/png': 'png' },
}));

jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog,
  scrubAuditDetails: (v) => v,
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

const messageInstances = [];
const ChatMessage = jest.fn(function ChatMessage(doc) {
  Object.assign(this, doc);
  this._id = this._id || 'msg-new-1';
  messageInstances.push(this);
});
ChatMessage.prototype.save = jest.fn(async function save() { return this; });
ChatMessage.prototype.populate = jest.fn(async function populate() { return this; });
ChatMessage.findOne = jest.fn(() => query(null));
ChatMessage.find = jest.fn(() => query([]));
jest.unstable_mockModule('../../src/models/ChatMessage.js', () => ({ default: ChatMessage }));

const { as } = await mountApp('chat');

const PATIENT = { id: 'u1', role: 'patient', name: 'Pat' };

const makeConversation = () => ({
  _id: 'c1',
  participants: ['u1', 'u2'],
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
  validateChatAttachments.mockImplementation(() => null);
  conversationById = () => query(makeConversation());
  messageInstances.length = 0;
});

const pngDataUrl = 'data:image/png;base64,aGVsbG8='; // decodes to 5 bytes
const validAttachment = {
  url: '/uploads/chat/123e4567-e89b-42d3-a456-426614174000.png',
  mimeType: 'image/png',
  size: 2048,
  name: 'photo.png',
};

describe('POST /upload', () => {
  it('rejects unauthenticated callers with 401 (service never called)', async () => {
    await as().post('/upload').send({ dataUrl: pngDataUrl, name: 'a.png' }).expect(401);
    expect(storeChatUpload).not.toHaveBeenCalled();
  });

  it('400 when dataUrl is missing', async () => {
    const res = await as(PATIENT).post('/upload').send({ name: 'a.png' }).expect(400);
    expect(res.body.message).toBe('dataUrl required');
    expect(storeChatUpload).not.toHaveBeenCalled();
  });

  it('400 when dataUrl does not parse (data: prefix, no payload)', async () => {
    const res = await as(PATIENT).post('/upload').send({ dataUrl: 'data:image/png;base64' }).expect(400);
    expect(res.body.message).toBe('Invalid dataUrl');
    expect(storeChatUpload).not.toHaveBeenCalled();
  });

  it('400 when the value is not a data: URL at all', async () => {
    const res = await as(PATIENT).post('/upload').send({ dataUrl: 'https://evil/x.png' }).expect(400);
    expect(res.body.message).toBe('dataUrl required');
    expect(storeChatUpload).not.toHaveBeenCalled();
  });

  it('200: delegates to storeChatUpload with decoded buffer, mime, name and uploader id', async () => {
    storeChatUpload.mockResolvedValue({
      url: '/uploads/chat/abc.png', name: 'a.png', mimeType: 'image/png', size: 5,
    });
    const res = await as(PATIENT).post('/upload').send({ dataUrl: pngDataUrl, name: 'a.png' }).expect(200);
    expect(res.body).toEqual({
      url: '/uploads/chat/abc.png', name: 'a.png', mimeType: 'image/png', size: 5,
    });
    expect(storeChatUpload).toHaveBeenCalledTimes(1);
    const arg = storeChatUpload.mock.calls[0][0];
    expect(arg.mimeType).toBe('image/png');
    expect(arg.name).toBe('a.png');
    expect(arg.userId).toBe('u1');
    expect(Buffer.isBuffer(arg.buffer)).toBe(true);
    expect(arg.buffer.toString('utf8')).toBe('hello');
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('415 from the MIME allow-list bubbles up with the service message', async () => {
    storeChatUpload.mockRejectedValue({ status: 415, message: 'Unsupported file type: text/html' });
    const res = await as(PATIENT).post('/upload')
      .send({ dataUrl: 'data:text/html;base64,aGVsbG8=', name: 'x.html' })
      .expect(415);
    expect(res.body.message).toBe('Unsupported file type: text/html');
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('422 on malware detection (quarantine + audit assertions live in the service spec)', async () => {
    storeChatUpload.mockRejectedValue({ status: 422, message: 'File rejected: malware detected' });
    const res = await as(PATIENT).post('/upload').send({ dataUrl: pngDataUrl, name: 'evil.png' }).expect(422);
    expect(res.body.message).toBe('File rejected: malware detected');
  });

  it('503 when the scanner is required but unavailable', async () => {
    storeChatUpload.mockRejectedValue({ status: 503, message: 'File scanning is unavailable, upload rejected. Try again later.' });
    await as(PATIENT).post('/upload').send({ dataUrl: pngDataUrl, name: 'a.png' }).expect(503);
  });

  it('413 for oversize files', async () => {
    storeChatUpload.mockRejectedValue({ status: 413, message: 'File too large (max 25MB)' });
    const res = await as(PATIENT).post('/upload').send({ dataUrl: pngDataUrl, name: 'big.png' }).expect(413);
    expect(res.body.message).toContain('too large');
  });

  it('unexpected errors → 500 without crashing the route', async () => {
    storeChatUpload.mockRejectedValue(new Error('disk on fire'));
    const res = await as(PATIENT).post('/upload').send({ dataUrl: pngDataUrl, name: 'a.png' }).expect(500);
    expect(res.body.message).toBe('disk on fire');
  });
});

describe('POST /messages — attachments array is validated server-side', () => {
  it('rejects unauthenticated callers with 401', async () => {
    await as().post('/messages').send({ conversationId: 'c1', content: 'hi' }).expect(401);
  });

  it('404 when the conversation does not exist or is not yours', async () => {
    conversationById = () => query(null);
    await as(PATIENT).post('/messages').send({ conversationId: 'nope', content: 'hi' }).expect(404);
    expect(validateChatAttachments).not.toHaveBeenCalled();
  });

  it('400 on an empty message', async () => {
    const res = await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: '', attachments: [] })
      .expect(400);
    expect(res.body.message).toBe('Message cannot be empty');
  });

  it('201 text message: validator runs on the (empty) list, message persisted', async () => {
    const res = await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: 'hello' })
      .expect(201);
    expect(validateChatAttachments).toHaveBeenCalledWith([]);
    expect(ChatMessage).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({ _id: 'msg-new-1', content: 'hello' });
  });

  it('validator rejection stops the message with its status/message (400 external URL)', async () => {
    validateChatAttachments.mockReturnValue({ status: 400, message: 'Attachment must be an uploaded chat file' });
    const res = await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: '', attachments: [{ url: 'https://evil/x.png' }] })
      .expect(400);
    expect(res.body.message).toBe('Attachment must be an uploaded chat file');
    expect(validateChatAttachments).toHaveBeenCalledWith([{ url: 'https://evil/x.png' }]);
    expect(ChatMessage).not.toHaveBeenCalled();
  });

  it('validator rejection 415 (bad type) is surfaced verbatim', async () => {
    validateChatAttachments.mockReturnValue({ status: 415, message: 'Unsupported file type: image/svg+xml' });
    await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: '', attachments: [{ ...validAttachment, mimeType: 'image/svg+xml' }] })
      .expect(415);
    expect(ChatMessage).not.toHaveBeenCalled();
  });

  it('201 with attachments when the validator passes — payload reaches the model', async () => {
    const res = await as(PATIENT).post('/messages')
      .send({ conversationId: 'c1', content: '', attachments: [validAttachment], type: 'image' })
      .expect(201);
    expect(validateChatAttachments).toHaveBeenCalledWith([validAttachment]);
    expect(ChatMessage).toHaveBeenCalledTimes(1);
    expect(messageInstances[0].attachments).toEqual([validAttachment]);
    expect(res.body.type).toBe('image');
  });
});

describe('wiring pins', () => {
  it('upload route carries the chatUploadLimiter in the chain (P2-14)', async () => {
    // This pin used to forbid any rateLimit import ("harness compatibility").
    // The harness stubs every limiter export now (appHarness rateLimit mock,
    // including chatUploadLimiter), so the constraint it protected is gone and
    // the absence it pinned was a real gap: chat upload was the only file-capable
    // POST with no write budget at all.
    const fs = await import('fs');
    const src = fs.readFileSync(new URL('../../src/routes/chat.js', import.meta.url), 'utf8');
    expect(src).toMatch(/from\s+['"][^'"]*rateLimit/);
    expect(src).toMatch(/router\.post\('\/upload', protect, authorize\('chat:write:own'\), chatUploadLimiter/);
  });

  it('upload + messages keep the protect + authorize guard chain', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(new URL('../../src/routes/chat.js', import.meta.url), 'utf8');
    expect(src).toMatch(/router\.post\('\/upload', protect, authorize\('chat:write:own'\)/);
    expect(src).toMatch(/router\.post\('\/messages', protect, authorize\('chat:write:own'\)/);
  });
});
