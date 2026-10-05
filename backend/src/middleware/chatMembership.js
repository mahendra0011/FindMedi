import mongoose from 'mongoose';
import ChatConversation from '../models/ChatConversation.js';
import RideBooking from '../models/RideBooking.js';
import RideTracking from '../models/RideTracking.js';
import EmergencyRequest from '../models/EmergencyRequest.js';
import EmergencyDoctorRequest from '../models/EmergencyDoctorRequest.js';
import AssistantBooking from '../models/AssistantBooking.js';
import LawyerBooking from '../models/LawyerBooking.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import Appointment from '../models/Appointment.js';
import Ambulance from '../models/Ambulance.js';
import RiderProfile from '../models/RiderProfile.js';
import AssistantProfile from '../models/AssistantProfile.js';
import LawyerProfile from '../models/LawyerProfile.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import DeliveryPartner from '../models/DeliveryPartner.js';

// CHAT-003: conversation-scoped authorisation.
//
// chat.js registered 39 routes guarded only by `protect`, and every one of them
// addressed its target by a conversationId / messageId / userId taken from the
// request. Any authenticated account — a delivery partner, a rider, a
// self-registered patient — could therefore read or post into a doctor↔patient
// conversation it was not part of, purely by enumerating ObjectIds.
//
// Two deliberate choices:
//  * 404, not 403, for a non-member. A 403 confirms the id exists, which turns
//    the endpoint into an oracle for harvesting live conversation ids.
//  * Membership is resolved from the document every time. There is no cached
//    "my conversations" shortcut, because a stale cache is a stale permission.

const MEMBER_ID_FIELDS = ['participants'];

function isParticipant(conversation, userId) {
  const uid = String(userId);
  for (const f of MEMBER_ID_FIELDS) {
    const list = conversation?.[f];
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      const pid = p?._id ? String(p._id) : String(p);
      if (pid === uid) return true;
    }
  }
  return false;
}

/**
 * Resolve the target conversation id from the request, following one hop
 * through ChatMessage when the route addresses a message rather than a thread.
 */
async function resolveConversation(req) {
  const idParam = req.params.conversationId || req.params.id || req.params.chatId;
  if (!idParam) return { error: 'bad_request' };
  if (!mongoose.Types.ObjectId.isValid(idParam)) return { error: 'not_found' };

  // Message-scoped routes: authorise the thread the message belongs to.
  if (req.params.messageId && mongoose.Types.ObjectId.isValid(req.params.messageId)) {
    const { default: ChatMessage } = await import('../models/ChatMessage.js');
    const message = await ChatMessage.findById(req.params.messageId).select('conversationId').lean();
    if (!message) return { error: 'not_found' };
    const conversation = await ChatConversation.findById(message.conversationId);
    return { conversation };
  }

  const conversation = await ChatConversation.findById(idParam);
  return { conversation };
}

export function requireConversationMember({ param } = {}) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authorized' });
      if (param && req.params[param]) req.params.conversationId = req.params[param];

      const { conversation, error } = await resolveConversation(req);
      if (error === 'bad_request') {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      if (error === 'not_found' || !conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      if (!isParticipant(conversation, req.user._id)) {
        // 404, deliberately — see the note above.
        return res.status(404).json({ message: 'Conversation not found' });
      }
      req.conversation = conversation;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export { isParticipant };

// ==============================================================================
// CHAT-B-01/02/03/05/10: realtime ROOM access control
// ==============================================================================
// The REST layer was fixed to be conversation-scoped, but the SOCKET layer was
// never mirrored: `socket.on('chat:join', id => socket.join('chat:'+id))` and
// every `join_*_room` handler subscribed on a client-supplied id with no lookup at
// all.
//
// The consequence is worse than a REST data leak. A socket room is a BROADCAST
// CHANNEL: once joined, the socket receives `chat:typing`, `chat:recording`,
// `chat:delivered`, `rider_location_update`, dispatch progress and delivery
// tracking — i.e. the live GPS of a stranger, the stage of someone else's
// emergency, or the typing pattern in a doctor↔patient thread. Any authenticated
// socket could join `emergency:<sosId>` and watch a real emergency unfold.
//
// Room membership is therefore resolved server-side, from the document, every
// time, and an unresolvable case is a DENY. Because `join` only ever happens
// after this check, `io.to(room)` on the emit side becomes inherently safe
// (CHAT-B-05): no un-admitted socket is ever in the room to broadcast to.

/** Roles that legitimately observe rooms in their own vertical. */
const DISPATCH_ROLES = new Set(['superadmin', 'hospital_admin', 'rider', 'ambulance', 'assistant', 'lawyer', 'delivery_boy']);

const sameId = (a, b) => {
  if (a == null || b == null) return false;
  const norm = (v) => String(typeof v === 'object' ? (v._id ?? v.id ?? v) : v);
  return norm(a) === norm(b);
};

const anySame = (doc, fields, userId) => fields.some((f) => sameId(doc?.[f], userId));

/**
 * Is `role` a dispatcher/operator for THIS tenant?
 *
 * Previously `DISPATCH_ROLES.has(role)` alone decided it, with no tenant test at
 * all. That granted `rider`, `assistant`, `lawyer`, `delivery_boy` and
 * `hospital_admin` blanket access to EVERY `order:*` and `appointment:*` room on
 * the platform — so any delivery partner could join another hospital's
 * appointment room and receive its live broadcasts, including PHI in the payload.
 * A role is a claim about capability; it is not a claim about WHOSE data.
 *
 * The rule now: an operator may observe a room only when they are demonstrably
 * attached to that specific row — as its own operator, or through the same
 * hospital/tenant. A caller with no tenant at all is denied rather than trusted,
 * because "I could not determine the caller's tenant" must not mean "allow".
 */
async function isOperatorForRow(userId, role, row, { tenantFields = [], operatorFields = [] } = {}) {
  if (!DISPATCH_ROLES.has(role)) return false;

  // Explicit operator attachment always wins: this row names them.
  if (operatorFields.length && anySame(row, operatorFields, userId)) return true;

  const callerProfile = await resolveTenantForUser(userId, role);
  if (!callerProfile?.tenant) return false; // no tenant → fail closed

  // The row must actually carry a tenant to compare against.
  const rowTenant = tenantFields.map((f) => row?.[f]).find(Boolean);
  if (!rowTenant) return false;

  return String(rowTenant) === String(callerProfile.tenant);
}

/** Resolve the caller's tenant (hospital/facility) once per check. */
const tenantCache = new Map();
async function resolveTenantForUser(userId, role) {
  const key = `${role}:${userId}`;
  if (tenantCache.has(key)) return tenantCache.get(key);

  let tenant = null;
  if (role === 'hospital_admin' || role === 'admin' || role === 'doctor' || role === 'clinic_doctor') {
    const u = await User.findById(userId).select('hospitalId facilityId').lean();
    tenant = u?.hospitalId || u?.facilityId || null;
  } else if (role === 'rider') {
    const r = await RiderProfile.findOne({ userId }).select('hospitalId').lean();
    tenant = r?.hospitalId || null;
  } else if (role === 'delivery_boy') {
    const d = await DeliveryPartner.findOne({ userId }).select('hospitalId').lean();
    tenant = d?.hospitalId || null;
  }
  // assistants and lawyers are marketplace providers with no tenant of their own,
  // so they are admitted only via the explicit operator attachment above.

  const result = { tenant };
  // Bounded cache: this is a hot path (every room join), but the data changes only
  // when a user is reassigned, so a short TTL is plenty.
  tenantCache.set(key, result);
  setTimeout(() => tenantCache.delete(key), 30_000).unref?.();
  return result;
}

/** Test seam: clear the tenant cache. */
export function _resetRoomTenantCache() {
  tenantCache.clear();
}

/**
 * Resolve whether `userId` (with `role`) may subscribe to `<room>:<id>`.
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
/**
 * The rooms this module knows how to reason about.
 *
 * Declared as the single source of truth rather than a hand-kept list beside
 * the switch: a new `case` that is not added here is denied for EVERY role,
 * including superadmin, and fails loudly in the ACL test suite. The failure
 * mode is a closed door, not an open one.
 */
export const KNOWN_ROOMS = new Set([
  'chat', 'ride', 'emergency', 'assistant-booking', 'lawyer-booking',
  'order', 'appointment', 'ride-tracking',
]);

async function checkRoomAccess(userId, role, room, id) {
  if (!userId || !id) return { ok: false, reason: 'missing-identity' };

  // CHAT-B-02: deny by default, FOR EVERY ROLE INCLUDING SUPERADMIN.
  //
  // This grant used to sit above the switch, so it bypassed the `default:`
  // branch as well as the id check. That inverted the invariant the whole
  // function is built on: "a room nobody has defined is not joinable" is a
  // property of the ROOM, not a permission a role can hold. An unknown room has
  // no data model, no membership rule and no broadcast, so there is nothing for
  // a break-glass role to be granted access TO.
  //
  // The room is checked BEFORE the id, not after: the room is the outer question,
  // and validating the id first would answer "your id is malformed" for a
  // request that was never joinable in the first place.
  if (!KNOWN_ROOMS.has(room)) return { ok: false, reason: 'unknown-room' };

  // The id is validated before the superadmin grant. Validating later meant a
  // superadmin "joined" rooms whose id was not even an ObjectId, so a malformed
  // request succeeded and reported success.
  if (!mongoose.Types.ObjectId.isValid(String(id))) return { ok: false, reason: 'bad-id' };

  // Break-glass for a real room. Kept above the per-room ownership checks
  // because platform administration is the intended capability, and
  // deliberately narrow because it is the one path with no tenant comparison.
  if (role === 'superadmin') return { ok: true };

  const key = String(id);

  switch (room) {
    case 'chat': {
      const conversation = await ChatConversation.findById(key).lean();
      if (!conversation) return { ok: false, reason: 'not-found' };
      if (!isParticipant(conversation, userId)) return { ok: false, reason: 'not-a-participant' };
      return { ok: true };
    }

    case 'ride': {
      const ride = await RideBooking.findById(key).select('userId riderId').lean();
      if (!ride) return { ok: false, reason: 'not-found' };
      if (anySame(ride, ['userId', 'riderId'], userId)) return { ok: true };
      const profile = await RiderProfile.findOne({ userId }).select('userId').lean();
      if (profile && sameId(ride.riderId, profile._id)) return { ok: true };
      return { ok: false, reason: 'not-the-rider' };
    }

    // ── emergency:<sosId> ── (mirrors the REST canAccessSos rules)
    case 'emergency': {
      const sos = await EmergencyRequest.findById(key).select('userId assignedProviderId assignedProviderType').lean();
      const doctorRequest = await EmergencyDoctorRequest.findById(key).select('userId patientId assignedDoctorId assignedDoctorUserId').lean();
      if (!sos && !doctorRequest) return { ok: false, reason: 'not-found' };
      if (sos && sameId(sos.userId, userId)) return { ok: true };
      if (doctorRequest && anySame(doctorRequest, ['userId', 'patientId', 'assignedDoctorUserId'], userId)) return { ok: true };
      if (doctorRequest?.assignedDoctorId) {
        const doctor = await Doctor.findById(doctorRequest.assignedDoctorId).select('user_id').lean();
        if (doctor && sameId(doctor.user_id, userId)) return { ok: true };
      }
      if (sos && sameId(sos.assignedProviderId, userId)) return { ok: true };
      if (sos?.assignedProviderType === 'ambulance') {
        const amb = await Ambulance.findById(sos.assignedProviderId).select('userId').lean();
        if (amb && sameId(amb.userId, userId)) return { ok: true };
      }
      return { ok: false, reason: 'not-the-subject' };
    }

    case 'ambulance': {
      const amb = await Ambulance.findById(key).select('userId hospitalId').lean();
      if (!amb) return { ok: false, reason: 'not-found' };
      if (sameId(amb.userId, userId)) return { ok: true };
      return { ok: false, reason: 'not-the-crew' };
    }

    case 'assistant-booking':
    case 'lawyer-booking': {
      const Model = room === 'assistant-booking' ? AssistantBooking : LawyerBooking;
      const booking = await Model.findById(key).lean();
      if (!booking) return { ok: false, reason: 'not-found' };
      if (anySame(booking, ['userId', 'patientId', 'clientId'], userId)) return { ok: true };
      const ProviderModel = room === 'assistant-booking' ? AssistantProfile : LawyerProfile;
      const profile = await ProviderModel.findOne({ userId }).select('_id').lean();
      if (profile && anySame(booking, ['assistantId', 'lawyerId', 'providerId'], profile._id)) return { ok: true };
      return { ok: false, reason: 'not-a-party' };
    }

    case 'order': {
      const delivery = await PharmacyDelivery.findOne({ orderId: key })
        .select('userId patientId deliveryPartnerId orderId hospitalId').lean();
      if (delivery) {
        if (anySame(delivery, ['userId', 'patientId', 'deliveryPartnerId'], userId)) return { ok: true };
        if (role === 'delivery_boy' && delivery.deliveryPartnerId) {
          const partner = await DeliveryPartner.findOne({ userId }).select('_id').lean();
          if (partner && sameId(delivery.deliveryPartnerId, partner._id)) return { ok: true };
        }
        // Tenant-scoped operator, not a blanket role check. See isOperatorForRow.
        if (await isOperatorForRow(userId, role, delivery, {
          tenantFields: ['hospitalId'],
          operatorFields: ['deliveryPartnerId'],
        })) return { ok: true };
        return { ok: false, reason: 'not-the-customer' };
      }
      const order = await PharmacyOrder.findOne({ orderId: key })
        .select('userId patientId hospitalId').lean();
      if (order) {
        if (anySame(order, ['userId', 'patientId'], userId)) return { ok: true };
        if (await isOperatorForRow(userId, role, order, { tenantFields: ['hospitalId'] })) {
          return { ok: true };
        }
        return { ok: false, reason: 'not-the-customer' };
      }
      return { ok: false, reason: 'not-found' };
    }

    case 'appointment': {
      const appt = await Appointment.findById(key)
        .select('patientId doctorId hospitalId').lean();
      if (!appt) return { ok: false, reason: 'not-found' };
      if (sameId(appt.patientId, userId)) return { ok: true };
      if (sameId(appt.doctorId, userId)) return { ok: true };
      const doctor = await Doctor.findOne({ user_id: String(userId) }).select('_id').lean();
      if (doctor && sameId(appt.doctorId, doctor._id)) return { ok: true };
      // Tenant-scoped operator, not a blanket role check. This is the room whose
      // broadcast payload carries appointment PHI, so the previous
      // `DISPATCH_ROLES.has(role)` grant let any delivery boy or rider on the
      // platform subscribe to any patient's appointment.
      if (await isOperatorForRow(userId, role, appt, { tenantFields: ['hospitalId'] })) {
        return { ok: true };
      }
      return { ok: false, reason: 'not-a-party' };
    }

    case 'ride-tracking': {
      const track = await RideTracking.findOne({ rideId: key }).select('rideId riderId').lean();
      if (!track) return { ok: false, reason: 'not-found' };
      if (anySame(track, ['riderId'], userId)) return { ok: true };
      return { ok: false, reason: 'not-the-rider' };
    }

    // CHAT-B-02: deny by default. An unknown room must never be joinable merely
    // because its name was not in the switch above.
    default:
      return { ok: false, reason: 'unknown-room' };
  }
}

/**
 * Public ACL gate. A success verdict carries the canonical room name, so the
 * caller joins exactly the room THIS helper validated — the join site never
 * re-derives the string from the raw payload (CHAT raw-join guard).
 */
export async function assertRoomAccess(userId, role, room, id) {
  const verdict = await checkRoomAccess(userId, role, room, id);
  return verdict.ok ? { ...verdict, room: `${room}:${String(id)}` } : verdict;
}

/**
 * Express middleware form, for any REST route that mirrors a socket room.
 *   router.get('/:id/live', protect, requireRoomAccess('ride', (req) => req.params.id), handler)
 */
export function requireRoomAccess(room, idFrom = (req) => req.params.id) {
  return async (req, res, next) => {
    const verdict = await assertRoomAccess(req.user?._id, req.user?.role, room, idFrom(req));
    if (verdict.ok) return next();
    // 404 keeps the id un-probeable, matching the REST chat convention.
    return res.status(404).json({ message: 'Not found' });
  };
}

