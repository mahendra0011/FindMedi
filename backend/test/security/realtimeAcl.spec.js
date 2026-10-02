/**
 * Realtime ACL regression suite (CHAT-M-07).
 *
 * `chatMembership.js` is the only thing standing between an authenticated
 * account and every other conversation, order and appointment room on the
 * platform, and it had no test at all. The defects it contained were structural
 * rather than visible from any one route: a role check standing in for a tenant
 * check, a `default:` branch that could fall open, a group grant applied to
 * rooms whose payloads carry PHI. Each was fixed once, and nothing would have
 * caught a regression.
 *
 * The question throughout: *may this caller join this room?* and, where the room
 * is tenant-scoped, *is that tenant the caller's own?*
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const lean = (v) => {
  const q = {
    select: () => q, sort: () => q, limit: () => q, lean: () => q, skip: () => q,
    then: (resolve) => Promise.resolve(v).then(resolve),
  };
  return q;
};

const conversationFindById = jest.fn();
const rideFindById = jest.fn();
const rideFindOne = jest.fn();
const apptFindById = jest.fn();
const doctorFindOne = jest.fn();
const deliveryFindOne = jest.fn();
const orderFindOne = jest.fn();
const trackFindOne = jest.fn();
const emergencyFindOne = jest.fn();
const profileFindOne = jest.fn();

const stub = (fn) => ({ default: { findById: fn, findOne: fn } });

jest.unstable_mockModule('../../src/models/ChatConversation.js', () => stub(conversationFindById));
jest.unstable_mockModule('../../src/models/RideBooking.js', () => stub(rideFindById));
jest.unstable_mockModule('../../src/models/RideTracking.js', () => ({ default: { findOne: trackFindOne } }));
jest.unstable_mockModule('../../src/models/Appointment.js', () => stub(apptFindById));
jest.unstable_mockModule('../../src/models/Doctor.js', () => stub(doctorFindOne));
jest.unstable_mockModule('../../src/models/PharmacyDelivery.js', () => ({ default: { findOne: deliveryFindOne } }));
jest.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({ default: { findOne: orderFindOne } }));
jest.unstable_mockModule('../../src/models/EmergencyRequest.js', () => ({ default: { findOne: emergencyFindOne } }));
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => stub(profileFindOne));
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => stub(profileFindOne));
// Models the switch may reach on some paths. They resolve to lean() rather
// than undefined, because a bare jest.fn() returns undefined and the next
// .select() throws - which surfaces as a room-ACL failure rather than as the
// harness fault it actually is.
const inert = { default: { findById: () => lean(null), findOne: () => lean(null) } };
jest.unstable_mockModule('../../src/models/AssistantBooking.js', () => inert);
jest.unstable_mockModule('../../src/models/LawyerBooking.js', () => inert);
jest.unstable_mockModule('../../src/models/Ambulance.js', () => inert);
jest.unstable_mockModule('../../src/models/DeliveryPartner.js', () => inert);
jest.unstable_mockModule('../../src/models/RiderProfile.js', () => inert);
// User is NOT inert-by-default: `resolveTenantForUser` calls `User.findById()`
// to decide an operator's tenant, and a real mongoose model here means a real
// query against a database that does not exist. That mistake was made once
// already - the mock was dropped by an over-eager bulk edit and two tenant
// tests failed for reasons that had nothing to do with the rule under test.
const userFindById = jest.fn();
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: userFindById, findOne: () => lean(null) },
}));

const { assertRoomAccess, KNOWN_ROOMS } = await import('../../src/middleware/chatMembership.js');

const ok = async (uid, role, room, key) => (await assertRoomAccess(uid, role, room, key)).ok;

// Room keys must be real ObjectIds: the ACL rejects anything else with 'bad-id'
// before the room logic runs, so a short literal like 'a1' silently tests the
// id validator instead of the room rule it appears to test.
const APPT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const RIDE_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const CONV_ID = 'cccccccccccccccccccccccc';
const ORDER_ID = 'dddddddddddddddddddddddd';
const MISSING_ID = 'eeeeeeeeeeeeeeeeeeeeeeee';

describe('ACL · appointment rooms are not a role grant', () => {
  // This is the room whose broadcast payload carries appointment PHI.
  const appt = { _id: APPT_ID, patientId: 'patA', doctorId: 'docA', hospitalId: 'h1' };

  it('lets the patient in', async () => {
    apptFindById.mockReturnValue(lean(appt));
    expect(await ok('patA', 'patient', 'appointment', APPT_ID)).toBe(true);
  });

  it('lets the assigned doctor in', async () => {
    apptFindById.mockReturnValue(lean(appt));
    expect(await ok('docA', 'doctor', 'appointment', APPT_ID)).toBe(true);
  });

  it('refuses a delivery boy in the same hospital', async () => {
    // THE regression. `DISPATCH_ROLES.has(role)` was the entire check, so ANY
    // rider, delivery partner, lawyer or assistant on the platform could
    // subscribe to ANY patient's appointment, on any hospital.
    apptFindById.mockReturnValue(lean(appt));
    expect(await ok('rider1', 'delivery_boy', 'appointment', APPT_ID)).toBe(false);
  });

  it('refuses a rider in the same hospital', async () => {
    apptFindById.mockReturnValue(lean(appt));
    expect(await ok('rider1', 'rider', 'appointment', APPT_ID)).toBe(false);
  });

  it('refuses a hospital_admin from another hospital', async () => {
    apptFindById.mockReturnValue(lean(appt));
    // Even the admin role does not carry on its own: the tenant must match too.
    expect(await ok('admX', 'hospital_admin', 'appointment', APPT_ID)).toBe(false);
  });

  it('refuses an unknown appointment rather than defaulting to allow', async () => {
    apptFindById.mockReturnValue(lean(null));
    expect(await ok('patA', 'patient', 'appointment', APPT_ID)).toBe(false);
  });

  it('refuses an operator whose tenant cannot be determined', async () => {
    // "Cannot determine" must never mean "allow". This is the fail-open shape
    // check-tenant-guard-regression.mjs blocks at the source level; the same
    // rule has to hold at the room-join level, which is the reachable one.
    apptFindById.mockReturnValue(lean(appt));
    userFindById.mockReturnValue(lean({ hospitalId: null, facilityId: null }));
    expect(await ok('uX', 'hospital_admin', 'appointment', APPT_ID)).toBe(false);
  });

  it('documents that the tenant cache is keyed by role AND user', async () => {
    // resolveTenantForUser memoises by `${role}:${userId}` for 30s at module
    // scope, so it survives across tests in one file. A test that grants a
    // caller a tenant must not let a LATER test with the same id and a
    // different expectation pass on the cached answer. Each tenant-sensitive
    // case here therefore uses a distinct id.
    apptFindById.mockReturnValue(lean(appt));
    userFindById.mockReturnValue(lean({ hospitalId: 'h1' }));
    expect(await ok('adminCache1', 'hospital_admin', 'appointment', APPT_ID)).toBe(true);

    // Different id, tenant gone: the cache must not be doing the work.
    userFindById.mockReturnValue(lean({ hospitalId: null }));
    expect(await ok('adminCache2', 'hospital_admin', 'appointment', APPT_ID)).toBe(false);
  });
});

describe('ACL · ride rooms require being the rider', () => {
  // RideBooking has `userId`, NOT `patientId`. The ACL compares `userId` and
  // `riderId`, so a fixture carrying `patientId` exercises nothing and silently
  // denies - a test that looks like it covers the booking user and does not.
  const ride = { _id: RIDE_ID, userId: 'patA', riderId: 'riderX', hospitalId: 'h1' };

  it('refuses a non-rider', async () => {
    rideFindById.mockReturnValue(lean(ride));
    expect(await ok('riderY', 'rider', 'ride', RIDE_ID)).toBe(false);
  });

  it('lets the user who booked the ride in', async () => {
    rideFindById.mockReturnValue(lean(ride));
    expect(await ok('patA', 'patient', 'ride', RIDE_ID)).toBe(true);
  });

  it('ride-tracking is the rider only', async () => {
    trackFindOne.mockReturnValue(lean({ rideId: RIDE_ID, riderId: 'riderX' }));
    expect(await ok('riderY', 'rider', 'ride-tracking', RIDE_ID)).toBe(false);
    expect(await ok('riderX', 'rider', 'ride-tracking', RIDE_ID)).toBe(true);
  });
});


beforeEach(() => {
  conversationFindById.mockReset().mockReturnValue(lean(null));
  rideFindById.mockReset().mockReturnValue(lean(null));
  rideFindOne.mockReset().mockReturnValue(lean(null));
  apptFindById.mockReset().mockReturnValue(lean(null));
  doctorFindOne.mockReset().mockReturnValue(lean(null));
  deliveryFindOne.mockReset().mockReturnValue(lean(null));
  orderFindOne.mockReset().mockReturnValue(lean(null));
  trackFindOne.mockReset().mockReturnValue(lean(null));
  emergencyFindOne.mockReset().mockReturnValue(lean(null));
  profileFindOne.mockReset().mockReturnValue(lean(null));
  userFindById.mockReset().mockReturnValue(lean(null));
});

describe('ACL · pharmacy orders are the customer or a scoped operator', () => {
  const delivery = { orderId: ORDER_ID, userId: 'custA', deliveryPartnerId: 'dpX', hospitalId: 'h1' };

  it('refuses a stranger', async () => {
    deliveryFindOne.mockReturnValue(lean(delivery));
    orderFindOne.mockReturnValue(lean(null));
    expect(await ok('custB', 'patient', 'order', ORDER_ID)).toBe(false);
  });

  it('lets the customer in', async () => {
    deliveryFindOne.mockReturnValue(lean(delivery));
    orderFindOne.mockReturnValue(lean(null));
    expect(await ok('custA', 'patient', 'order', ORDER_ID)).toBe(true);
  });

  it('lets the assigned delivery partner in', async () => {
    deliveryFindOne.mockReturnValue(lean(delivery));
    orderFindOne.mockReturnValue(lean(null));
    expect(await ok('dpX', 'delivery_boy', 'order', ORDER_ID)).toBe(true);
  });

  it('reports not-found for an order that does not exist', async () => {
    deliveryFindOne.mockReturnValue(lean(null));
    orderFindOne.mockReturnValue(lean(null));
    const v = await assertRoomAccess('custA', 'patient', 'order', ORDER_ID);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('not-found');
  });
});

describe('ACL · chat-room membership (the room is called "chat")', () => {
  it('lets a listed participant in', async () => {
    conversationFindById.mockReturnValue(lean({ _id: CONV_ID, participants: ['u1', 'u2'] }));
    expect(await ok('u2', 'patient', 'chat', CONV_ID)).toBe(true);
  });

  it('refuses a non-participant', async () => {
    conversationFindById.mockReturnValue(lean({ _id: CONV_ID, participants: ['u1', 'u2'] }));
    expect(await ok('uX', 'patient', 'chat', CONV_ID)).toBe(false);
  });

  it('resolves a populated participant reference', async () => {
    conversationFindById.mockReturnValue(lean({ _id: CONV_ID, participants: [{ _id: 'u1' }, { _id: 'u2' }] }));
    expect(await ok('u2', 'patient', 'chat', CONV_ID)).toBe(true);
  });

  it('refuses when the conversation does not exist', async () => {
    conversationFindById.mockReturnValue(lean(null));
    expect(await ok('u1', 'patient', 'chat', CONV_ID)).toBe(false);
  });
});

describe('ACL · unknown rooms are denied by default', () => {
  it('refuses a room the switch does not know', async () => {
    // CHAT-B-02: an unknown room must never be joinable merely because its name
    // was absent from the switch.
    const v = await assertRoomAccess('u1', 'patient', 'made-up-room', 'x');
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('unknown-room');
  });

  it('refuses a superadmin on an unknown room too', async () => {
    // Break-glass is a deliberate, audited path. It is not "skip the switch".
    const v = await assertRoomAccess('root', 'superadmin', 'made-up-room', 'x');
    expect(v.ok).toBe(false);
  });

  it('refuses a caller with no identity', async () => {
    expect((await assertRoomAccess(undefined, 'patient', 'chat', CONV_ID)).ok).toBe(false);
  });
});
