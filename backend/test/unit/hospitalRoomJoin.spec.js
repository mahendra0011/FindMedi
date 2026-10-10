/**
 * Hospital room join (dashboard:alert fan-out): `join_room` is the event the
 * DashboardAlertHost emits on every connect. Room membership is a broadcast
 * grant, so the join is format-checked AND tenant-checked against the
 * authenticated socket identity — never trusted from the payload.
 */
import { jest } from '@jest/globals';

const userFindById = jest.fn();

const inert = () => ({
  default: {
    findById: () => ({ select: () => ({ lean: async () => null }) }),
    findOne: () => ({ select: () => ({ lean: async () => null }) }),
    find: () => ({ select: () => ({ lean: async () => [] }) }),
  },
});

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisPub: {},
  redisSub: {},
  connectRedis: async () => {},
  isRedisReady: () => false,
  updateDeliveryBoyLocation: async () => {},
  setUserPresence: async () => {},
  removeUserPresence: async () => {},
  getOnlinePresence: () => null,
  getOnlineDoctorsList: () => [],
}));
jest.unstable_mockModule('../../src/services/notificationPreferences.js', () => ({
  loadPreference: async () => null,
  applyDiscreetCopy: (n) => n,
}));
jest.unstable_mockModule('../../src/middleware/chatMembership.js', () => ({
  assertRoomAccess: async () => ({ ok: false, reason: 'stub' }),
  isParticipant: () => false,
  KNOWN_ROOMS: new Set(),
  requireRoomAccess: () => (req, _res, next) => next(),
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findById: (...a) => userFindById(...a),
    find: () => ({ select: () => ({ lean: async () => [] }) }),
    findOne: () => ({ select: () => ({ lean: async () => null }) }),
    findOneAndUpdate: async () => null,
    findByIdAndUpdate: async () => null,
  },
}));
for (const name of [
  'DeliveryPartner', 'PharmacyDelivery', 'Doctor', 'Patient',
  'RiderProfile', 'RideTracking', 'AssistantProfile', 'LawyerProfile',
]) {
  jest.unstable_mockModule(`../../src/models/${name}.js`, inert);
}

const { attachHospitalSocketHandlers } = await import('../../src/services/socketService.js');

function fakeSocket(data = {}) {
  const handlers = new Map();
  return {
    data,
    joined: [],
    left: [],
    emitted: [],
    on: (event, fn) => handlers.set(event, fn),
    join(room) { this.joined.push(room); },
    leave(room) { this.left.push(room); },
    emit(event, payload) { this.emitted.push({ event, payload }); },
    fire: (event, payload) => handlers.get(event)(payload),
  };
}

const chain = (doc) => ({ select: () => ({ lean: async () => doc }) });

describe('socket join_room — hospital dashboard room', () => {
  beforeEach(() => { userFindById.mockReset(); });

  test('a caller whose hospital matches joins the room', async () => {
    userFindById.mockReturnValue(chain({ hospitalId: 'h1' }));
    const socket = fakeSocket({ userId: 'u1', role: 'nurse' });
    attachHospitalSocketHandlers(socket);
    await socket.fire('join_room', 'hospital:h1');
    expect(socket.joined).toEqual(['hospital:h1']);
    expect(socket.emitted).toEqual([]);
  });

  test('the { room } object form is accepted too', async () => {
    userFindById.mockReturnValue(chain({ hospitalId: 'h1' }));
    const socket = fakeSocket({ userId: 'u1', role: 'hospital_admin' });
    attachHospitalSocketHandlers(socket);
    await socket.fire('join_room', { room: 'hospital:h1' });
    expect(socket.joined).toEqual(['hospital:h1']);
  });

  test('a caller from another hospital is denied and told so', async () => {
    userFindById.mockReturnValue(chain({ hospitalId: 'h2' }));
    const socket = fakeSocket({ userId: 'u1', role: 'nurse' });
    attachHospitalSocketHandlers(socket);
    await socket.fire('join_room', 'hospital:h1');
    expect(socket.joined).toEqual([]);
    expect(socket.emitted[0]).toEqual({
      event: 'error:room',
      payload: { room: 'hospital', id: 'h1', message: 'Not authorized' },
    });
  });

  test('a caller with no tenant at all is denied, never trusted', async () => {
    userFindById.mockReturnValue(chain({ hospitalId: null }));
    const socket = fakeSocket({ userId: 'u1', role: 'doctor' });
    attachHospitalSocketHandlers(socket);
    await socket.fire('join_room', 'hospital:h1');
    expect(socket.joined).toEqual([]);
  });

  test('an unresolvable tenant lookup fails closed', async () => {
    userFindById.mockReturnValue({ select: () => ({ lean: async () => { throw new Error('db down'); } }) });
    const socket = fakeSocket({ userId: 'u1', role: 'nurse' });
    attachHospitalSocketHandlers(socket);
    await socket.fire('join_room', 'hospital:h1');
    expect(socket.joined).toEqual([]);
  });

  test('an unauthenticated socket cannot join', async () => {
    const socket = fakeSocket({});
    attachHospitalSocketHandlers(socket);
    await socket.fire('join_room', 'hospital:h1');
    expect(socket.joined).toEqual([]);
    expect(userFindById).not.toHaveBeenCalled();
  });

  test('superadmin may join any hospital room', async () => {
    const socket = fakeSocket({ userId: 'sa1', role: 'superadmin' });
    attachHospitalSocketHandlers(socket);
    await socket.fire('join_room', 'hospital:zzz');
    expect(socket.joined).toEqual(['hospital:zzz']);
    expect(userFindById).not.toHaveBeenCalled();
  });

  test('non-hospital and malformed room names are ignored, not joined', async () => {
    userFindById.mockReturnValue(chain({ hospitalId: 'h1' }));
    const socket = fakeSocket({ userId: 'u1', role: 'nurse' });
    attachHospitalSocketHandlers(socket);
    for (const room of ['ambulance:a1', 'user:u1', 'hospital:', 'hospital:', 'hospital:h1:extra', 'hospital:h1/x', 42, null]) {
      await socket.fire('join_room', room);
    }
    expect(socket.joined).toEqual([]);
    expect(userFindById).not.toHaveBeenCalled();
  });

  test('leave_room only leaves a validated hospital room', async () => {
    const socket = fakeSocket({ userId: 'u1', role: 'nurse' });
    attachHospitalSocketHandlers(socket);
    await socket.fire('leave_room', 'hospital:h1');
    await socket.fire('leave_room', 'chat:c1');
    expect(socket.left).toEqual(['hospital:h1']);
  });
});
