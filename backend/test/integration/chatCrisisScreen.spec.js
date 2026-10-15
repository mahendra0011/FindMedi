/**
 * 8.md §5/§6 + 9.md §5: crisis keywords in chat text route to the human
 * review queue — never an auto-ban, never a blocked send.
 *
 * What it pins:
 *  - a message containing self-harm text still sends 201 (screening is
 *    fire-and-forget AFTER persist) AND opens a critical ModerationItem;
 *  - a benign message sends with no queue row;
 *  - the queued row carries category 'crisis' from the auto_filter source.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

jestApi.unstable_mockModule('../../src/services/chatUploadService.js', () => ({
  storeChatUpload: jestApi.fn(),
  validateChatAttachments: jestApi.fn(() => null),
  MAX_CHAT_UPLOAD_BYTES: 1024,
  CHAT_UPLOAD_DIR: '/tmp/chat-uploads-test',
  CHAT_EXT_MAP: { 'image/png': 'png' },
}));

const auditLog = jestApi.fn(async () => {});
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog,
  scrubAuditDetails: (v) => v,
}));

let conversationById = () => query(null);
jestApi.unstable_mockModule('../../src/models/ChatConversation.js', () => ({
  default: Object.assign(jestApi.fn(), {
    findById: (id) => conversationById(id),
    findOne: jestApi.fn(() => query(null)),
    find: jestApi.fn(() => query([])),
    create: jestApi.fn(),
  }),
}));

const ChatMessage = jestApi.fn(function ChatMessage(doc) {
  Object.assign(this, doc);
  this._id = this._id || 'msg-new-1';
  this.createdAt = new Date();
});
ChatMessage.prototype.save = jestApi.fn(async function save() { return this; });
ChatMessage.prototype.populate = jestApi.fn(async function populate() { return this; });
ChatMessage.findOne = jestApi.fn(() => query(null));
ChatMessage.find = jestApi.fn(() => query([]));
jestApi.unstable_mockModule('../../src/models/ChatMessage.js', () => ({ default: ChatMessage }));

const moderationCreate = jestApi.fn(async (body) => ({ _id: 'mod-1', ...body }));
jestApi.unstable_mockModule('../../src/models/ModerationItem.js', () => ({
  default: {
    findOne: jestApi.fn(() => query(null)),
    create: (...args) => moderationCreate(...args),
  },
}));
jestApi.unstable_mockModule('../../src/models/Category.js', () => ({
  default: { findOne: jestApi.fn(() => query(null)) },
}));
jestApi.unstable_mockModule('../../src/models/Strike.js', () => ({ default: {} }));
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { create: jestApi.fn(async () => ({})) },
}));
jestApi.unstable_mockModule('../../src/models/Review.js', () => ({ default: {} }));
jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({ default: {} }));
jestApi.unstable_mockModule('../../src/models/User.js', () => ({ default: {} }));
jestApi.unstable_mockModule('../../src/models/ChatReport.js', () => ({ default: {} }));

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
  save: jestApi.fn(async () => {}),
});

beforeEach(() => {
  jestApi.clearAllMocks();
  conversationById = () => query(makeConversation());
  moderationCreate.mockClear().mockImplementation(async (body) => ({ _id: 'mod-1', ...body }));
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 25));

describe('POST /messages crisis screening', () => {
  it('still sends the message AND opens a critical queue row on self-harm text', async () => {
    const res = await as(PATIENT).post('/messages').send({
      conversationId: 'c1',
      content: 'I have been thinking about suicide lately, I need help',
      type: 'text',
    });
    expect(res.status).toBe(201);
    await flush();
    expect(moderationCreate).toHaveBeenCalledTimes(1);
    expect(moderationCreate).toHaveBeenCalledWith(expect.objectContaining({
      targetType: 'chat_message',
      category: 'crisis',
      severity: 'critical',
      source: 'auto_filter',
    }));
    expect(auditLog).toHaveBeenCalledWith(
      'chat_crisis_escalated',
      expect.anything(),
      expect.objectContaining({ conversationId: 'c1' }),
    );
  });

  it('opens no queue row for benign text', async () => {
    const res = await as(PATIENT).post('/messages').send({
      conversationId: 'c1',
      content: 'Hello doctor, what time is my appointment tomorrow?',
      type: 'text',
    });
    expect(res.status).toBe(201);
    await flush();
    expect(moderationCreate).not.toHaveBeenCalled();
  });
});
