/**
 * CHAT-B-02 + DL-B-02 + rides/emergency socket ACL — foreign-booking socket test.
 *
 * - Assistant/lawyer booking rooms: foreign booking join denied, legacy
 *   free-text socket writes never broadcast (no persistence path).
 * - Emergency provider location: forged identity, assignment/type mismatch,
 *   coarse accuracy (>250m) and teleport velocity (>180 km/h) rejected before
 *   any profile write; assigned provider with precise fix persists + broadcasts.
 */
import { jest } from '@jest/globals';

const assistantJoinDenied = jest.fn();
const emergencyFindOne = jest.fn();
const riderFindOne = jest.fn();
const riderFindOneAndUpdate = jest.fn();
const ambulanceFindOne = jest.fn();
const ambulanceUpdate = jest.fn();
const handlers = new Map();

const leanQuery = (fn) => ({ select: () => ({ lean: fn }) });

jest.unstable_mockModule('../../src/models/EmergencyRequest.js', () => ({
  default: { findOne: (...a) => emergencyFindOne(...a) },
}));
jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({
  default: {
    findOne: (...a) => riderFindOne(...a),
    findOneAndUpdate: (...a) => riderFindOneAndUpdate(...a),
  },
}));
jest.unstable_mockModule('../../src/models/Ambulance.js', () => ({
  default: {
    findOne: (...a) => ambulanceFindOne(...a),
    findByIdAndUpdate: (...a) => ambulanceUpdate(...a),
  },
}));
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({
  default: { findOneAndUpdate: jest.fn() },
}));
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => ({
  default: { findOneAndUpdate: jest.fn() },
}));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisPub: {}, redisSub: {}, connectRedis: jest.fn(), isRedisReady: () => false,
  updateDeliveryBoyLocation: jest.fn(), setUserPresence: jest.fn(), removeUserPresence: jest.fn(),
  getOnlinePresence: jest.fn(), getOnlineDoctorsList: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../src/middleware/chatMembership.js', () => ({
  assertRoomAccess: jest.fn(async (uid, _role, room, id) => {
    if (room === 'assistant-booking') return id === 'booking-owned' && uid === 'user-a' ? { ok: true } : { ok: false, reason: 'not-member' };
    if (room === 'lawyer-booking') return id === 'lawyer-owned' && uid === 'user-a' ? { ok: true } : { ok: false, reason: 'not-member' };
    if (room === 'emergency') return id === 'sos-owned' && uid === 'provider-1' ? { ok: true } : { ok: false, reason: 'not-member' };
    return { ok: false, reason: 'unknown-room' };
  }),
  isParticipant: jest.fn(),
}));

const {
  attachAssistantSocketHandlers,
  attachLawyerSocketHandlers,
  attachEmergencySocketHandlers,
} = await import('../../src/services/socketService.js');

const makeSocket = (userId, userRole) => {
  handlers.clear();
  return {
    userId, userRole, data: { userId, role: userRole },
    on: (event, fn) => handlers.set(event, fn),
    emit: jest.fn(), join: jest.fn(), leave: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
  };
};
const namespace = { to: jest.fn(() => ({ emit: jest.fn() })) };

beforeEach(() => {
  jest.clearAllMocks();
  emergencyFindOne.mockReturnValue(leanQuery(async () => ({
    status: 'assigned', assignedProviderId: 'provider-1', assignedProviderType: 'rider',
  })));
  riderFindOne.mockReturnValue(leanQuery(async () => ({ _id: 'rider-profile-1' })));
  riderFindOneAndUpdate.mockResolvedValue({});
  ambulanceFindOne.mockReturnValue(leanQuery(async () => null));
  ambulanceUpdate.mockResolvedValue({});
});

describe('CHAT-B-02/DL-B-02 foreign booking socket writes', () => {
  it('denies joining a foreign assistant booking room', async () => {
    const socket = makeSocket('user-a', 'assistant');
    attachAssistantSocketHandlers(socket, namespace);
    await handlers.get('join_booking_room')({ bookingId: 'booking-foreign' });
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('error:room', expect.objectContaining({ room: 'assistant-booking' }));
    assistantJoinDenied.mock.calls.push([]);
  });

  it('never broadcasts legacy assistant free-text, even for the owning booking', async () => {
    const socket = makeSocket('user-a', 'assistant');
    attachAssistantSocketHandlers(socket, namespace);
    await handlers.get('send_chat_message')({ bookingId: 'booking-owned', text: 'take two daily' });
    // Owning booking: rejection notice only, no room broadcast of the text.
    expect(socket.emit).toHaveBeenCalledWith('chat_message_rejected', expect.objectContaining({ bookingId: 'booking-owned' }));
    expect(namespace.to).not.toHaveBeenCalled();
  });

  it('drops legacy assistant free-text for a foreign booking with no reply', async () => {
    const socket = makeSocket('user-a', 'assistant');
    attachAssistantSocketHandlers(socket, namespace);
    await handlers.get('send_chat_message')({ bookingId: 'booking-foreign', text: 'forged note' });
    expect(socket.emit).not.toHaveBeenCalled();
    expect(namespace.to).not.toHaveBeenCalled();
  });

  it('denies joining a foreign lawyer booking room and drops its free-text', async () => {
    const socket = makeSocket('user-a', 'lawyer');
    attachLawyerSocketHandlers(socket, namespace);
    await handlers.get('join_booking_room')({ bookingId: 'booking-foreign' });
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('error:room', expect.objectContaining({ room: 'lawyer-booking' }));

    const socket2 = makeSocket('user-a', 'lawyer');
    attachLawyerSocketHandlers(socket2, namespace);
    await handlers.get('send_chat_message')({ bookingId: 'booking-foreign' });
    expect(socket2.emit).not.toHaveBeenCalled();
  });
});

describe('emergency provider location ACL + fix quality', () => {
  const base = { requestId: 'sos-owned', providerId: 'provider-1', providerType: 'rider', lat: 19, lng: 72 };

  it('rejects a forged provider identity before any SOS read', async () => {
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ ...base, providerId: 'attacker' });
    expect(emergencyFindOne).not.toHaveBeenCalled();
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a provider-type mismatch against the SOS assignment', async () => {
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ ...base, providerType: 'ambulance' });
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
    expect(ambulanceUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unauthorized provider that is not the assigned responder', async () => {
    emergencyFindOne.mockReturnValue(leanQuery(async () => ({
      status: 'assigned', assignedProviderId: 'somebody-else', assignedProviderType: 'rider',
    })));
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ ...base, accuracy: 20 });
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a closed SOS (no active assignment row)', async () => {
    emergencyFindOne.mockReturnValue(leanQuery(async () => null));
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ ...base, accuracy: 20 });
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects coarse emergency fixes (accuracy > 250m) before any profile read', async () => {
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ ...base, accuracy: 500 });
    expect(riderFindOne).not.toHaveBeenCalled();
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects teleport velocity (>180 km/h) for the assigned provider', async () => {
    riderFindOne.mockReturnValue(leanQuery(async () => ({
      _id: 'rider-profile-1',
      currentLocation: { coordinates: [72, 19], updatedAt: new Date() },
    })));
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    // Mumbai -> New York in seconds: physically impossible.
    await handlers.get('emergency_provider_location')({ ...base, lat: 40.7, lng: -74, accuracy: 20 });
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('persists and broadcasts a precise fix from the assigned provider', async () => {
    riderFindOne.mockReturnValue(leanQuery(async () => ({
      _id: 'rider-profile-1',
      currentLocation: { coordinates: [72, 19], updatedAt: new Date(Date.now() - 60_000) },
    })));
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ ...base, lat: 19.001, lng: 72.001, accuracy: 20 });
    expect(riderFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'provider-1' }),
      expect.objectContaining({ 'currentLocation.lat': 19.001, 'currentLocation.accuracy': 20 }),
    );
    expect(namespace.to).toHaveBeenCalledWith('emergency:sos-owned');
  });
});
