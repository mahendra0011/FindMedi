import { jest } from '@jest/globals';

process.env.REDIS_URL = '';

const accessCheck = jest.fn(async (userId, _role, room, id) => ({
  ok: room === 'chat' && id === 'conversation-a' && ['user-a', 'user-b'].includes(String(userId)),
}));
const conversation = { participants: ['user-a', 'user-b'] };
const conversationModel = {
  findById: jest.fn(() => ({ select: () => ({ lean: async () => conversation }) })),
};

class FakeNamespace {
  handlers = {};
  use() {}
  on(event, handler) { this.handlers[event] = handler; }
}

class FakeServer {
  static current;
  handlers = {};
  namespaces = new Map();
  constructor() { FakeServer.current = this; }
  use() {}
  on(event, handler) { this.handlers[event] = handler; }
  of(name) {
    if (!this.namespaces.has(name)) this.namespaces.set(name, new FakeNamespace());
    return this.namespaces.get(name);
  }
  emit() {}
  to(room) { return { emit: (event, payload) => this.emitted.push({ room, event, payload }) }; }
  emitted = [];
}

jest.unstable_mockModule('socket.io', () => ({ Server: FakeServer }));
jest.unstable_mockModule('@socket.io/redis-adapter', () => ({ createAdapter: jest.fn() }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: { verify: jest.fn() } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisPub: {}, redisSub: {}, connectRedis: jest.fn(), isRedisReady: jest.fn(() => false),
  updateDeliveryBoyLocation: jest.fn(), setUserPresence: jest.fn(), removeUserPresence: jest.fn(),
  getOnlinePresence: jest.fn(), getOnlineDoctorsList: jest.fn(),
}));
jest.unstable_mockModule('../../src/models/DeliveryPartner.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/PharmacyDelivery.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/Patient.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/RideTracking.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/models/ChatConversation.js', () => ({ default: conversationModel }));
jest.unstable_mockModule('../../src/middleware/chatMembership.js', () => ({
  assertRoomAccess: accessCheck,
  isParticipant: jest.fn(),
}));

const { initSocket } = await import('../../src/services/socketService.js');

function makeSocket(userId = 'user-a') {
  const handlers = {};
  const emitted = [];
  return {
    handlers,
    emitted,
    id: 'socket-1',
    userId,
    userRole: 'patient',
    data: { userId, role: 'patient' },
    on: (event, handler) => { handlers[event] = handler; },
    emit: (event, payload) => emitted.push({ event, payload }),
    join: jest.fn(), leave: jest.fn(),
    to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }),
  };
}

describe('chat socket actor and recipient identity', () => {
  let socket;
  let server;

  beforeEach(async () => {
    jest.clearAllMocks();
    await initSocket({});
    server = FakeServer.current;
    socket = makeSocket();
    server.handlers.connection(socket);
  });

  it('rejects a participant who forges another user as typing or recording actor', async () => {
    await socket.handlers['chat:typing']({ conversationId: 'conversation-a', userId: 'user-b', isTyping: true });
    await socket.handlers['chat:recording']({ conversationId: 'conversation-a', userId: 'user-b', isRecording: true });

    expect(socket.emitted).toEqual([]);
    expect(accessCheck).not.toHaveBeenCalled();
  });

  it('uses the authenticated actor for valid typing and recording events', async () => {
    await socket.handlers['chat:typing']({ conversationId: 'conversation-a', userId: 'user-a', isTyping: true });
    await socket.handlers['chat:recording']({ conversationId: 'conversation-a', userId: 'user-a', isRecording: true });

    expect(socket.emitted).toContainEqual(expect.objectContaining({ event: 'chat:typing', payload: { conversationId: 'conversation-a', userId: 'user-a', isTyping: true } }));
    expect(socket.emitted).toContainEqual(expect.objectContaining({ event: 'chat:recording', payload: { conversationId: 'conversation-a', userId: 'user-a', isRecording: true } }));
  });

  it('rejects chat call signaling to a user outside the conversation', async () => {
    await socket.handlers['chat:call_offer']({ conversationId: 'conversation-a', to: 'outsider', from: 'forged', sdp: 'secret' });

    expect(server.emitted).toEqual([]);
    expect(socket.emitted).toEqual([]);
    expect(conversationModel.findById).toHaveBeenCalled();
  });

  it('fails closed when chat call membership cannot be checked', async () => {
    accessCheck.mockRejectedValueOnce(new Error('database unavailable'));
    await socket.handlers['chat:call_offer']({ conversationId: 'conversation-a', to: 'user-b', sdp: 'offer' });

    expect(server.emitted).toEqual([]);
    expect(socket.emitted).toEqual([]);
  });

  it('only relays chat call signaling to an authenticated conversation peer', async () => {
    await socket.handlers['chat:call_offer']({ conversationId: 'conversation-a', to: 'user-b', from: 'forged', sdp: 'offer' });

    expect(server.emitted).toContainEqual(expect.objectContaining({
      room: 'user:user-b', event: 'chat:call_offer',
      payload: expect.objectContaining({ from: 'user-a', to: 'user-b', sdp: 'offer' }),
    }));
    expect(socket.emitted).toContainEqual(expect.objectContaining({
      room: 'chat:conversation-a', event: 'chat:call_offer',
      payload: expect.objectContaining({ from: 'user-a' }),
    }));
  });

  it('does not register the ephemeral socket message writer', () => {
    expect(socket.handlers['chat:send_message']).toBeUndefined();
  });
});
