import { jest } from '@jest/globals';

const rideFindOne = jest.fn();
const profileFindOne = jest.fn();
const profileFindOneAndUpdate = jest.fn();
const trackingCreate = jest.fn();
const deliveryFindOne = jest.fn();
const deliveryUpdate = jest.fn();
const pharmacyDeliveryFindOne = jest.fn();
const pharmacyDeliveryUpdate = jest.fn();
const emergencyFindOne = jest.fn();
const riderFindOne = jest.fn();
const riderFindOneAndUpdate = jest.fn();
const ambulanceFindOne = jest.fn();
const ambulanceUpdate = jest.fn();
const handlers = new Map();

const leanQuery = (fn) => ({
  select: () => ({ lean: fn }),
});

jest.unstable_mockModule('../../src/models/RideBooking.js', () => ({ default: { findOne: (...a) => rideFindOne(...a) } }));
jest.unstable_mockModule('../../src/models/RiderProfile.js', () => ({ default: { findOne: (...a) => profileFindOne(...a), findOneAndUpdate: (...a) => profileFindOneAndUpdate(...a) } }));
jest.unstable_mockModule('../../src/models/RideTracking.js', () => ({ default: { create: (...a) => trackingCreate(...a) } }));
jest.unstable_mockModule('../../src/models/DeliveryPartner.js', () => ({ default: { findOne: (...a) => deliveryFindOne(...a), findOneAndUpdate: (...a) => deliveryUpdate(...a) } }));
jest.unstable_mockModule('../../src/models/PharmacyDelivery.js', () => ({ default: { findOne: (...a) => pharmacyDeliveryFindOne(...a), findOneAndUpdate: (...a) => pharmacyDeliveryUpdate(...a) } }));
jest.unstable_mockModule('../../src/models/EmergencyRequest.js', () => ({ default: { findOne: (...a) => emergencyFindOne(...a) } }));
jest.unstable_mockModule('../../src/models/Ambulance.js', () => ({ default: { findOne: (...a) => ambulanceFindOne(...a), findByIdAndUpdate: (...a) => ambulanceUpdate(...a) } }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisPub: {}, redisSub: {}, connectRedis: jest.fn(), isRedisReady: () => false,
  updateDeliveryBoyLocation: jest.fn(), setUserPresence: jest.fn(), removeUserPresence: jest.fn(),
  getOnlinePresence: jest.fn(), getOnlineDoctorsList: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/middleware/chatMembership.js', () => ({
  assertRoomAccess: jest.fn(async (uid, _role, room, id) => {
    if (room === 'ride') return id === 'ride-owned' && uid === 'rider-1' ? { ok: true } : { ok: false };
    if (room === 'order') return id === 'order-owned' && uid === 'driver-1' ? { ok: true } : { ok: false };
    if (room === 'emergency') return id === 'sos-owned' && uid === 'provider-1' ? { ok: true } : { ok: false };
    return { ok: false };
  }),
  isParticipant: jest.fn(),
}));

const { attachRideSocketHandlers, attachEmergencySocketHandlers, attachDeliverySocketHandlers } = await import('../../src/services/socketService.js');

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

describe('socket tracking write ownership and input checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rideFindOne.mockReturnValue(leanQuery(async () => ({ _id: 'ride-owned' })));
    profileFindOne.mockReturnValue(leanQuery(async () => ({ _id: 'profile-1', currentLocation: {} })));
    profileFindOneAndUpdate.mockResolvedValue({ _id: 'profile-1' });
    trackingCreate.mockResolvedValue({});
    deliveryFindOne.mockReturnValue(leanQuery(async () => ({ _id: 'partner-1', userId: 'driver-1' })));
    deliveryUpdate.mockResolvedValue({});
    pharmacyDeliveryFindOne.mockReturnValue(leanQuery(async () => ({ _id: 'assignment-1' })));
    pharmacyDeliveryUpdate.mockResolvedValue({});
    emergencyFindOne.mockReturnValue(leanQuery(async () => ({ status: 'assigned', assignedProviderId: 'provider-1', assignedProviderType: 'rider' })));
    riderFindOne.mockReturnValue(leanQuery(async () => ({ _id: 'rider-profile-1' })));
    riderFindOneAndUpdate.mockResolvedValue({});
    ambulanceFindOne.mockReturnValue(leanQuery(async () => null));
    ambulanceUpdate.mockResolvedValue({});
  });

  it('writes accurate ride GPS with accuracy supplied (regression: previously threw ReferenceError)', async () => {
    const socket = makeSocket('rider-1', 'rider');
    attachRideSocketHandlers(socket, namespace);
    const update = handlers.get('rider_location_update');
    await update({ rideId: 'ride-owned', lat: 19, lng: 72, riderId: 'rider-1', accuracy: 30 });
    await update({ rideId: 'ride-owned', lat: 19.001, lng: 72, riderId: 'rider-1', accuracy: 30 });
    expect(profileFindOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ userId: 'rider-1' }), expect.objectContaining({ 'currentLocation.lat': 19, 'currentLocation.lng': 72 }));
    expect(trackingCreate).toHaveBeenCalledWith(expect.objectContaining({ rideId: 'ride-owned', riderId: 'rider-1', lat: 19, lng: 72 }));
    expect(profileFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(trackingCreate).toHaveBeenCalledTimes(1);
  });

  it('does not create a tracking point for a foreign ride ID', async () => {
    const socket = makeSocket('rider-1', 'rider');
    attachRideSocketHandlers(socket, namespace);
    await handlers.get('rider_location_update')({ rideId: 'ride-foreign', lat: 19, lng: 72, riderId: 'rider-1', accuracy: 30 });
    expect(rideFindOne).not.toHaveBeenCalled();
    expect(trackingCreate).not.toHaveBeenCalled();
    expect(profileFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects invalid GPS accuracy before reading or writing rider state', async () => {
    const socket = makeSocket('rider-1', 'rider');
    attachRideSocketHandlers(socket, namespace);
    await handlers.get('rider_location_update')({ rideId: 'ride-owned', lat: 19, lng: 72, riderId: 'rider-1', accuracy: 5000 });
    expect(profileFindOne).not.toHaveBeenCalled();
    expect(trackingCreate).not.toHaveBeenCalled();
  });

  it('rejects emergency provider location if SOS assignment differs', async () => {
    emergencyFindOne.mockReturnValue(leanQuery(async () => ({ status: 'assigned', assignedProviderId: 'somebody-else', assignedProviderType: 'rider' })));
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ requestId: 'sos-owned', providerId: 'provider-1', providerType: 'rider', lat: 19, lng: 72 });
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects emergency provider writes with a forged provider identity', async () => {
    const socket = makeSocket('provider-1', 'rider');
    attachEmergencySocketHandlers(socket, namespace);
    await handlers.get('emergency_provider_location')({ requestId: 'sos-owned', providerId: 'attacker', providerType: 'rider', lat: 19, lng: 72 });
    expect(emergencyFindOne).not.toHaveBeenCalled();
    expect(riderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects delivery partner ID spoofing before reading or writing another partner', async () => {
    const socket = makeSocket('driver-1', 'delivery_partner');
    attachDeliverySocketHandlers(socket, namespace);
    await handlers.get('deliveryboy:location')({ deliveryPartnerId: 'driver-2', orderId: 'order-owned', lat: 19, lng: 72 });
    expect(deliveryFindOne).not.toHaveBeenCalled();
    expect(deliveryUpdate).not.toHaveBeenCalled();
    expect(pharmacyDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('does not update partner location or order history for an unassigned order', async () => {
    const socket = makeSocket('driver-1', 'delivery_partner');
    attachDeliverySocketHandlers(socket, namespace);
    await handlers.get('deliveryboy:location')({ deliveryPartnerId: 'driver-1', orderId: 'order-foreign', lat: 19, lng: 72 });
    expect(deliveryFindOne).toHaveBeenCalledWith({ userId: 'driver-1', status: 'approved' });
    expect(pharmacyDeliveryFindOne).not.toHaveBeenCalled();
    expect(deliveryUpdate).not.toHaveBeenCalled();
    expect(pharmacyDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('persists and broadcasts only assigned delivery location updates', async () => {
    const socket = makeSocket('driver-1', 'delivery_partner');
    const orderRoom = { emit: jest.fn() };
    const io = { to: jest.fn(() => orderRoom) };
    attachDeliverySocketHandlers(socket, io);
    const update = handlers.get('deliveryboy:location');
    await update({ deliveryPartnerId: 'driver-1', orderId: 'order-owned', lat: 19, lng: 72 });
    await update({ deliveryPartnerId: 'driver-1', orderId: 'order-owned', lat: 19.001, lng: 72 });
    expect(deliveryUpdate).toHaveBeenCalledWith({ _id: 'partner-1', userId: 'driver-1' }, expect.objectContaining({ currentLocation: expect.objectContaining({ lat: 19, lng: 72 }) }));
    expect(deliveryUpdate).toHaveBeenCalledTimes(1);
    expect(pharmacyDeliveryUpdate).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-owned', deliveryPartnerId: 'partner-1' }), expect.objectContaining({ $push: expect.any(Object) }));
    expect(orderRoom.emit).toHaveBeenCalledWith('location:updated', expect.objectContaining({ lat: 19, lng: 72 }));
  });
});
