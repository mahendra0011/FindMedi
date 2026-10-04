import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import {
  redisPub,
  redisSub,
  connectRedis,
  isRedisReady,
  updateDeliveryBoyLocation,
  setUserPresence,
  removeUserPresence,
  getOnlinePresence,
  getOnlineDoctorsList,
} from '../config/redis.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import RideTracking from '../models/RideTracking.js';
import AssistantProfile from '../models/AssistantProfile.js';
import LawyerProfile from '../models/LawyerProfile.js';
// CHAT-B-01/02/10: server-side room ACL. A socket room is a BROADCAST channel, so
// membership must be proven before socket.join, never assumed from the payload.
import { assertRoomAccess, isParticipant } from '../middleware/chatMembership.js';

let io = null;
const socketEventTimes = new WeakMap();
const SOCKET_LOCATION_INTERVAL_MS = Math.min(5000, Math.max(250, Number.parseInt(process.env.SOCKET_LOCATION_INTERVAL_MS || '1000', 10) || 1000));

function isSocketEventRateLimited(socket, eventName) {
  const now = Date.now();
  let eventTimes = socketEventTimes.get(socket);
  if (!eventTimes) {
    eventTimes = new Map();
    socketEventTimes.set(socket, eventTimes);
  }
  const previous = eventTimes.get(eventName);
  if (previous != null && now - previous < SOCKET_LOCATION_INTERVAL_MS) return true;
  eventTimes.set(eventName, now);
  return false;
}

export function getIO() {
  return io;
}

// CHAT-002: the acting identity is ALWAYS the authenticated socket identity.
//
// These handlers used to read the actor from the payload with
// `riderId || socket.userId`. The fallback looks like a convenience, but the
// left-hand side always wins whenever a client supplies a value — and a client
// always can. The result was message impersonation in a doctor/patient context
// and forged GPS for live dispatch, which is a physical-safety problem in the
// ambulance flow, not just an integrity one.
//
// A payload id is therefore only ever a *claim*, and it must match the token.
export function selfOrReject(socket, claimed) {
  const me = socket.userId ? String(socket.userId) : null;
  if (!me) return null;
  if (claimed === undefined || claimed === null || String(claimed) === me) return me;
  logger.warn(`socket actor mismatch rejected: claimed=${claimed} socket=${me}`);
  return null;
}

/**
 * CHAT-B-03: is this socket's own identity allowed into `<room>:<id>`?
 *
 * Deliberately resolves from the DOCUMENT every time rather than from room
 * membership: room membership is itself the thing being protected, so trusting
 * it here would be circular. A membership cache is a permission cache.
 */
export async function isRoomMember(socket, room, id) {
  if (!socket?.userId) return false;
  const { ok } = await assertRoomAccess(socket.userId, socket.userRole, room, id);
  return ok;
}

/**
 * CHAT-B-04: ONE identity source.
 *
 * Handlers historically read `socket.data.userId` (set by the handshake) and the
 * legacy `socket.userId`, which were written in two places and could diverge after
 * a reconnect or a merge flow. A handler that read the unpopulated one silently
 * fell back to payload data — which is exactly how impersonation returned.
 *
 * `verifySocketAuth` now sets both from a single value and every reader goes
 * through this accessor, so there is no field left to read by mistake.
 */
export function socketIdentity(socket) {
  const id = socket?.data?.userId ?? socket?.userId ?? null;
  const role = socket?.data?.role ?? socket?.userRole ?? null;
  return { userId: id ? String(id) : null, role };
}

/** Keep the legacy mirrors in step with the single source of truth. */
export function setSocketIdentity(socket, userId, role) {
  const id = userId ? String(userId) : null;
  socket.data.userId = id;
  socket.data.role = role;
  // Legacy fields predate `socket.data`; handlers below still read them, so they
  // are mirrors rather than an independent source.
  socket.userId = id;
  socket.userRole = role;
  return id;
}

export function attachRideSocketHandlers(socket, namespace) {
  socket.on('join_ride_room', async ({ rideId }) => {
    // CHAT-B-02/10: this joined on a client-supplied id alone, so any
    // authenticated socket streamed a stranger's live GPS and could inject
    // forged coordinates into their room.
    const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'ride', rideId);
    if (!verdict.ok) {
      logger.warn(`CHAT-B-02: ride room join denied user=${socket.userId} ride=${rideId} reason=${verdict.reason}`);
      socket.emit('error:room', { room: 'ride', id: rideId, message: 'Not authorized' });
      return;
    }
    socket.join(`ride:${rideId}`);
  });
  socket.on('leave_ride_room', ({ rideId }) => {
    if (rideId) socket.leave(`ride:${rideId}`);
  });
    socket.on('rider_location_update', async ({ rideId, lat, lng, riderId, accuracy }) => {
    try {
      const id = selfOrReject(socket, riderId);
      if (!id) return;
      if (!Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90 || !Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180) return;
      if (accuracy != null && (!Number.isFinite(Number(accuracy)) || Number(accuracy) <= 0 || Number(accuracy) > 1000)) return;
      if (!rideId) return;
      if (isSocketEventRateLimited(socket, 'rider_location_update')) return;
      const verdict = await assertRoomAccess(id, socket.userRole, 'ride', rideId);
      if (!verdict.ok) return;
      const ride = await (await import('../models/RideBooking.js')).default.findOne({ _id: rideId, riderId: id }).select('_id').lean();
      if (!ride) return;
      const RiderBookingProfile = await RiderProfile.findOne({ userId: id }).select('_id currentLocation').lean();
      if (!RiderBookingProfile) return;
      const oldCoordinates = RiderBookingProfile.currentLocation?.coordinates;
      const oldTimestamp = RiderBookingProfile.currentLocation?.updatedAt ? new Date(RiderBookingProfile.currentLocation.updatedAt).getTime() : 0;
      if (Array.isArray(oldCoordinates) && oldTimestamp > 0) {
        const { calculateDistanceKm } = await import('../lib/geoUtils.js');
        const seconds = Math.max((Date.now() - oldTimestamp) / 1000, 1);
        const meters = calculateDistanceKm(oldCoordinates[1], oldCoordinates[0], Number(lat), Number(lng)) * 1000;
        if ((meters / seconds) * 3.6 > 180) return;
      }
      await RiderProfile.findOneAndUpdate(
        { _id: RiderBookingProfile._id, userId: id },
        {
          isOnline: true,
          'currentLocation.lat': lat,
          'currentLocation.lng': lng,
          'currentLocation.coordinates': [lng, lat],
          ...(accuracy != null ? { 'currentLocation.accuracy': Number(accuracy) } : {}),
          'currentLocation.updatedAt': new Date(),
          lastLocationAt: new Date(),
        }
      ).catch(() => {});
      await RideTracking.create({ rideId, riderId: id, lat, lng }).catch(() => {});
      namespace.to(`ride:${rideId}`).emit('ride_location_update', { rideId, lat, lng, timestamp: Date.now() });
      if (io && namespace !== io) {
        io.to(`ride:${rideId}`).emit('ride_location_update', { rideId, lat, lng, timestamp: Date.now() });
      }
    } catch (err) {
      logger.error(`rider_location_update error: ${err.message}`);
    }
  });
  socket.on('rider_go_online', async ({ riderId, lat, lng, accuracy }) => {
    try {
      const id = selfOrReject(socket, riderId);
      if (id) {
        const update = { isOnline: true, lastLocationAt: new Date() };
        if (lat != null && lng != null) {
          update['currentLocation.lat'] = lat;
          update['currentLocation.lng'] = lng;
          update['currentLocation.coordinates'] = [lng, lat];
          update['currentLocation.updatedAt'] = new Date();
          if (accuracy != null) update['currentLocation.accuracy'] = Number(accuracy);
        }
        await RiderProfile.findOneAndUpdate({ userId: id }, update);
      }
    } catch (err) {
      logger.error(`rider_go_online error: ${err.message}`);
    }
  });
  socket.on('rider_go_offline', async ({ riderId }) => {
    try {
      const id = selfOrReject(socket, riderId);
      if (id) {
        await RiderProfile.findOneAndUpdate({ userId: id }, { isOnline: false });
      }
    } catch (err) {
      logger.error(`rider_go_offline error: ${err.message}`);
    }
  });
}

export function attachAssistantSocketHandlers(socket, namespace) {
  socket.on('join_booking_room', async ({ bookingId }) => {
    // CHAT-B-02/10: assistant booking rooms carry case notes and chat.
    const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'assistant-booking', bookingId);
    if (!verdict.ok) {
      logger.warn(`CHAT-B-02: assistant room join denied user=${socket.userId} booking=${bookingId} reason=${verdict.reason}`);
      socket.emit('error:room', { room: 'assistant-booking', id: bookingId, message: 'Not authorized' });
      return;
    }
    socket.join(`assistant-booking:${bookingId}`);
  });
  socket.on('leave_booking_room', ({ bookingId }) => {
    if (bookingId) socket.leave(`assistant-booking:${bookingId}`);
  });
  socket.on('assistant_go_available', async ({ assistantId }) => {
    try {
      const id = selfOrReject(socket, assistantId);
      if (id) {
        await AssistantProfile.findOneAndUpdate(
          { userId: id, assistantStatus: 'active' },
          { isAvailable: true }
        );
      }
    } catch (err) {
      logger.error(`assistant_go_available error: ${err.message}`);
    }
  });
  socket.on('assistant_go_unavailable', async ({ assistantId }) => {
    try {
      const id = selfOrReject(socket, assistantId);
      if (id) {
        await AssistantProfile.findOneAndUpdate(
          { userId: id },
          { isAvailable: false }
        );
      }
    } catch (err) {
      logger.error(`assistant_go_unavailable error: ${err.message}`);
    }
  });
  socket.on('send_chat_message', async ({ bookingId }) => {
    if (!bookingId) return;
    const actor = socket.userId;
    const verdict = await assertRoomAccess(actor, socket.userRole, 'assistant-booking', bookingId);
    if (!verdict.ok) return;
    // Until booking-specific durable conversation IDs are available, do not
    // broadcast clinical/legal free text through an unpersisted socket path.
    socket.emit('chat_message_rejected', { bookingId, message: 'Use the secure conversation to send this message.' });
  });
}

export function attachLawyerSocketHandlers(socket, namespace) {
  socket.on('join_booking_room', async ({ bookingId }) => {
    const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'lawyer-booking', bookingId);
    if (!verdict.ok) {
      logger.warn(`CHAT-B-02: lawyer room join denied user=${socket.userId} booking=${bookingId} reason=${verdict.reason}`);
      socket.emit('error:room', { room: 'lawyer-booking', id: bookingId, message: 'Not authorized' });
      return;
    }
    socket.join(`lawyer-booking:${bookingId}`);
  });
  socket.on('leave_booking_room', ({ bookingId }) => {
    if (bookingId) socket.leave(`lawyer-booking:${bookingId}`);
  });
  socket.on('lawyer_go_available', async ({ lawyerId }) => {
    try {
      const id = selfOrReject(socket, lawyerId);
      if (id) {
        await LawyerProfile.findOneAndUpdate(
          { userId: id, lawyerStatus: 'active' },
          { isAvailable: true }
        );
      }
    } catch (err) {
      logger.error(`lawyer_go_available error: ${err.message}`);
    }
  });
  socket.on('lawyer_go_unavailable', async ({ lawyerId }) => {
    try {
      const id = selfOrReject(socket, lawyerId);
      if (id) {
        await LawyerProfile.findOneAndUpdate(
          { userId: id },
          { isAvailable: false }
        );
      }
    } catch (err) {
      logger.error(`lawyer_go_unavailable error: ${err.message}`);
    }
  });
  socket.on('case_note_updated', async ({ bookingId, note }) => {
    if (!bookingId) return;
    const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'lawyer-booking', bookingId);
    if (!verdict.ok || !['lawyer', 'superadmin', 'hospital_admin'].includes(socket.userRole)) return;
    socket.emit('case_note_rejected', { bookingId, message: 'Case notes must be saved through the authorized booking workflow.' });
  });
  socket.on('send_chat_message', async ({ bookingId }) => {
    if (!bookingId) return;
    const actor = socket.userId;
    const verdict = await assertRoomAccess(actor, socket.userRole, 'lawyer-booking', bookingId);
    if (!verdict.ok) return;
    socket.emit('chat_message_rejected', { bookingId, message: 'Use the secure conversation to send this message.' });
  });
}

// Emergency GPS velocity gate (rider handler parity): reject jumps faster than
// 180 km/h so a forged coordinate cannot teleport the responder on the live map.
const EMERGENCY_MAX_KMH = 180;
async function isEmergencyVelocityRejected(currentLocation, lat, lng) {
  try {
    const oldCoordinates = currentLocation?.coordinates;
    const oldTimestamp = currentLocation?.updatedAt ? new Date(currentLocation.updatedAt).getTime() : 0;
    if (!Array.isArray(oldCoordinates) || !(oldTimestamp > 0)) return false;
    const { calculateDistanceKm } = await import('../lib/geoUtils.js');
    const seconds = Math.max((Date.now() - oldTimestamp) / 1000, 1);
    const meters = calculateDistanceKm(oldCoordinates[1], oldCoordinates[0], Number(lat), Number(lng)) * 1000;
    return ((meters / seconds) * 3.6) > EMERGENCY_MAX_KMH;
  } catch {
    return false;
  }
}

export function attachEmergencySocketHandlers(socket, namespace) {
  socket.on('join_emergency_room', async ({ requestId }) => {
    // CHAT-B-02: an emergency room carries a live dispatch, so joining by id
    // alone let any account watch another patient's emergency unfold.
    const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'emergency', requestId);
    if (!verdict.ok) {
      logger.warn(`CHAT-B-02: emergency room join denied user=${socket.userId} sos=${requestId} reason=${verdict.reason}`);
      socket.emit('error:room', { room: 'emergency', id: requestId, message: 'Not authorized' });
      return;
    }
    socket.join(`emergency:${requestId}`);
  });
  socket.on('leave_emergency_room', ({ requestId }) => {
    if (requestId) socket.leave(`emergency:${requestId}`);
  });
  socket.on('join_ambulance_room', async ({ ambulanceId }) => {
    const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'ambulance', ambulanceId);
    if (!verdict.ok) {
      socket.emit('error:room', { room: 'ambulance', id: ambulanceId, message: 'Not authorized' });
      return;
    }
    socket.join(`ambulance:${ambulanceId}`);
  });
  socket.on('leave_ambulance_room', ({ ambulanceId }) => {
    if (ambulanceId) socket.leave(`ambulance:${ambulanceId}`);
  });
  socket.on('emergency_provider_location', async ({ requestId, providerId, providerType, lat, lng, accuracy }) => {
    try {
      const actor = selfOrReject(socket, providerId);
      if (!actor || !requestId || !Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90 || !Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180) return;
      // Rider handler parity: emergency GPS must be precise — reject coarse fixes.
      if (accuracy != null && (!Number.isFinite(Number(accuracy)) || Number(accuracy) <= 0 || Number(accuracy) > 250)) return;
      if (isSocketEventRateLimited(socket, 'emergency_provider_location')) return;
      const access = await assertRoomAccess(actor, socket.userRole, 'emergency', requestId);
      if (!access.ok) return;
      const EmergencyRequest = (await import('../models/EmergencyRequest.js')).default;
      const activeRequest = await EmergencyRequest.findOne({ _id: requestId, status: { $in: ['assigned', 'en_route'] } }).select('assignedProviderId assignedProviderType').lean();
      if (!activeRequest) return;
      if (activeRequest.assignedProviderType !== providerType) return;
      if (providerType === 'ambulance' && providerId) {
        const Ambulance = (await import('../models/Ambulance.js')).default;
        const ambulance = await Ambulance.findOne({ _id: activeRequest.assignedProviderId, userId: actor, currentEmergencyId: requestId }).select('_id currentLocation').lean();
        if (!ambulance) return;
        if (await isEmergencyVelocityRejected(ambulance?.currentLocation, lat, lng)) return;
        await Ambulance.findByIdAndUpdate(ambulance._id, {
          'currentLocation.coordinates': [lng, lat],
          'currentLocation.updatedAt': new Date(),
          ...(accuracy != null ? { 'currentLocation.accuracy': Number(accuracy) } : {}),
          lastLocationAt: new Date(),
        }).catch(() => {});
      } else if (providerType === 'rider' && providerId) {
        const rider = await RiderProfile.findOne({ userId: actor }).select('_id currentLocation').lean();
        if (!rider || String(activeRequest.assignedProviderId) !== String(actor)) return;
        if (await isEmergencyVelocityRejected(rider?.currentLocation, lat, lng)) return;
        await RiderProfile.findOneAndUpdate(
          { _id: rider._id, userId: actor },
          {
            'currentLocation.lat': lat,
            'currentLocation.lng': lng,
            'currentLocation.coordinates': [lng, lat],
            ...(accuracy != null ? { 'currentLocation.accuracy': Number(accuracy) } : {}),
            'currentLocation.updatedAt': new Date(),
            lastLocationAt: new Date(),
          }
        ).catch(() => {});
      }

      if (requestId) {
        const updatePayload = { requestId, lat, lng, timestamp: Date.now() };
        namespace.to(`emergency:${requestId}`).emit('emergency_provider_location_update', updatePayload);
        if (io && namespace !== io) {
          io.to(`emergency:${requestId}`).emit('emergency_provider_location_update', updatePayload);
        }
      }
    } catch (err) {
      logger.error(`emergency_provider_location error: ${err.message}`);
    }
  });
}


const getAllowedSocketOrigins = () => {
  const envOrigins = [
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : []),
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
  ];
  const defaults = [
    'https://findmedi.online',
    'https://www.findmedi.online',
    ...(process.env.NODE_ENV === 'production' ? [] : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5001',
    ]),
  ];
  return Array.from(new Set([...envOrigins, ...defaults]))
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

/**
 * Socket.IO handshake authentication (audit CHAT-001).
 *
 * Before this existed there was no `io.use()` anywhere in the backend, so the
 * `join` handler trusted the `userId`/`role` in the client payload. Any
 * anonymous socket could therefore claim to be any user, join that user's
 * `user:<id>` room and receive their notifications and chat, and forge events
 * that carried a client-supplied `riderId` / `senderId`.
 *
 * Identity is now derived ONLY from a verified JWT, and the token is taken
 * from the handshake (auth token first, then the httpOnly cookie) so this
 * reuses exactly the credentials the REST layer already validates.
 */
function readHandshakeToken(socket) {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return String(authToken).replace(/^Bearer\s+/i, '');

  const header = socket.handshake?.headers?.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);

  // Cookie header fallback: the REST layer accepts `cookies.token` too, so a
  // same-origin socket connects without the client having to duplicate the
  // token into the handshake payload.
  const cookieHeader = socket.handshake?.headers?.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  return null;
}

async function verifySocketAuth(socket, next) {
  const token = readHandshakeToken(socket);
  if (!token) {
    return next(new Error('unauthorized: no token'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new Error('unauthorized: invalid token'));
  }

  try {
    const user = await User.findById(decoded.id).select('role status isVerified');
    if (!user) return next(new Error('unauthorized: user not found'));
    if (user.status === 'blocked') return next(new Error('unauthorized: blocked'));

    // CHAT-B-04: written once, through one accessor, so `socket.data.*` and the
    // legacy mirrors can never diverge after a reconnect or a merge flow.
    setSocketIdentity(socket, user._id, user.role);
    return next();
  } catch (err) {
    // A DB error must not silently become "authenticated".
    logger.error(`Socket auth lookup failed: ${err.message}`);
    return next(new Error('unauthorized: auth lookup failed'));
  }
}

export function attachDeliverySocketHandlers(socket, io) {
  socket.on('deliveryboy:location', async ({ deliveryPartnerId, orderId, lat, lng }) => {
    try {
      const actor = selfOrReject(socket, deliveryPartnerId);
      if (!actor || !Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90 || !Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180) return;
      if (isSocketEventRateLimited(socket, 'deliveryboy:location')) return;
      const partner = await DeliveryPartner.findOne({ userId: actor, status: 'approved' }).select('_id userId').lean();
      if (!partner) return;
      if (orderId) {
        const verdict = await assertRoomAccess(actor, socket.userRole, 'order', orderId);
        if (!verdict.ok) return;
        const assigned = await PharmacyDelivery.findOne({ orderId, deliveryPartnerId: partner._id, status: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] } }).select('_id').lean();
        if (!assigned) return;
      }
      try {
        await updateDeliveryBoyLocation(actor, lat, lng);
      } catch (redisErr) {
        logger.warn(`Delivery location Redis cache skipped: ${redisErr.message}`);
      }
      await DeliveryPartner.findOneAndUpdate({ _id: partner._id, userId: actor }, {
        currentLocation: { lat, lng, updatedAt: new Date() },
      });
      if (orderId) {
        await PharmacyDelivery.findOneAndUpdate({ orderId, deliveryPartnerId: partner._id, status: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] } }, {
          $push: { trackingHistory: { lat, lng, timestamp: new Date() } },
        });
        io.to(`order:${orderId}`).emit('location:updated', { lat, lng, timestamp: Date.now() });
      }
    } catch (err) {
      logger.error(`location update failed: ${err.message}`);
    }
  });

  socket.on('deliveryboy:online', async ({ deliveryPartnerId, online }) => {
    const actor = selfOrReject(socket, deliveryPartnerId);
    if (!actor || typeof online !== 'boolean') return;
    await DeliveryPartner.findOneAndUpdate({ userId: actor, status: 'approved' }, { isOnline: online, isAvailable: online });
  });
}

export async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        // AUTH-B-07: the allowlist applies in EVERY environment. The old
        // `if (process.env.NODE_ENV !== 'production') return callback(null, true)`
        // accepted any origin on staging/preview, so a malicious page could open
        // an authenticated socket from a browser that already holds a token.
        const allowed = getAllowedSocketOrigins();
        const normalized = origin.trim().replace(/\/+$/, '');
        // AUTH-001/AUTH-020: exact match only — no endsWith suffix bypass.
        if (allowed.includes(normalized)) {
          return callback(null, true);
        }
        logger.warn(`Socket.IO CORS blocked for origin ${origin}`);
        return callback(new Error(`Socket.IO CORS blocked for origin ${origin}`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Redis adapter sirf tab lagao jab REDIS_URL set ho aur actual connect ho sake.
  if (process.env.REDIS_URL) {
    try {
      await connectRedis();
      if (isRedisReady()) {
        io.adapter(createAdapter(redisPub, redisSub));
        logger.info('Socket.IO initialized (with Redis adapter)');
      } else {
        logger.warn('Redis not ready — using in-memory Socket.IO adapter');
      }
    } catch (err) {
      logger.warn(`Redis unavailable (${err.message}) — falling back to in-memory Socket.IO adapter`);
    }
  } else {
    logger.info('Socket.IO initialized (in-memory adapter — single instance mode)');
  }

  // Every connection must present a valid token. Applied on the parent so the
  // default namespace is covered; each `io.of(...)` namespace gets it explicitly
  // below because namespaces do NOT inherit middleware from the parent.
  io.use(verifySocketAuth);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join', async (payload) => {
      // The client used to supply `userId`/`role` here and the server trusted
      // both, so any socket could join an arbitrary `user:<id>` room and read
      // that user's notifications and chat (audit CHAT-001). Identity now comes
      // exclusively from the token verified in verifySocketAuth; the payload is
      // retained only for the non-identity fields older clients still send.
      const userId = socket.data?.userId;
      const role = socket.data?.role;

      if (userId) {
        socket.userId = userId;
        socket.userRole = role;
        socket.join(`user:${userId}`);

        // Mark presence in Redis + DB (last seen / online indicator ke liye)
        try {
          await setUserPresence(userId, role);
          await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() }).catch(() => {});
          io.emit('presence:change', { userId: String(userId), online: true, role });
        } catch (e) {}
      }
    });

    socket.on('presence:ping', async () => {
      if (socket.userId) {
        await setUserPresence(socket.userId, socket.userRole);
      }
    });

    socket.on('order:join_tracking', async (orderId) => {
      const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'order', orderId);
      if (!verdict.ok) {
        socket.emit('error:room', { room: 'order', id: orderId, message: 'Not authorized' });
        return;
      }
      socket.join(`order:${orderId}`);
    });
    socket.on('order:leave_tracking', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });

    attachDeliverySocketHandlers(socket, io);

    // ─── Vehicle & Ride Events (Doc 05 §4) ───────────────────────────
    attachRideSocketHandlers(socket, io);

    // ─── Hospital Assistant Events (Doc 05 §4) ────────────────────────
    attachAssistantSocketHandlers(socket, io);

    // ─── Lawyer & Legal Events (Doc 05 §4) ─────────────────────────────
    attachLawyerSocketHandlers(socket, io);

    // ─── Emergency SOS Events ──────────────────────────────────────────
    attachEmergencySocketHandlers(socket, io);

    // Chat Events
    // CHAT-B-01: joining used to be `socket.join('chat:'+id)` on a client-supplied
    // id with NO membership lookup, while the REST layer (chatMembership.js)
    // correctly enforced participants-only. Once joined, the socket received
    // typing, recording, delivered and read events for a doctor<->patient thread
    // it was not part of — and would receive message content the moment any event
    // carried it through the room.
    socket.on('chat:join', async (conversationId) => {
      const id = conversationId?.conversationId ?? conversationId;
      const verdict = await assertRoomAccess(socket.userId, socket.userRole, 'chat', id);
      if (!verdict.ok) {
        logger.warn(`CHAT-B-01: chat join denied user=${socket.userId} conversation=${id} reason=${verdict.reason}`);
        socket.emit('error:room', { room: 'chat', id, message: 'Not authorized' });
        return;
      }
      socket.join(`chat:${id}`);
    });

    socket.on('chat:leave', (conversationId) => {
      socket.leave(`chat:${conversationId}`);
    });

    // CHAT-B-03/05: typing/recording are broadcasts into the room, so the SENDER
    // must itself be a member. Without this an outsider could emit typing events
    // into a thread they were never in, and `socket.to(room)` would faithfully
    // deliver them to both participants.
    socket.on('chat:typing', async ({ conversationId, userId, isTyping }) => {
      const actor = selfOrReject(socket, userId);
      if (!actor || !(await isRoomMember(socket, 'chat', conversationId))) return;
      socket.to(`chat:${conversationId}`).emit('chat:typing', { conversationId, userId: actor, isTyping });
    });

    // Recording a voice message (mic button pressed)
    socket.on('chat:recording', async ({ conversationId, userId, isRecording }) => {
      const actor = selfOrReject(socket, userId);
      if (!actor || !(await isRoomMember(socket, 'chat', conversationId))) return;
      socket.to(`chat:${conversationId}`).emit('chat:recording', { conversationId, userId: actor, isRecording });
    });

    // Delivery receipts — sender ko wapas broadcast karo
    // CHAT-002: a receipt is an assertion about the RECIPIENT, so it may only be
    // written for the authenticated socket identity. Previously the payload
    // `userId` was used, letting any client mark another user's messages as
    // delivered and corrupt the sender's tick state.
    socket.on('chat:delivered', async ({ conversationId, userId }) => {
      if (!conversationId) return;
      const actor = selfOrReject(socket, userId);
      if (!actor) return;
      // CHAT-B-03: pinning the ACTOR to the token is necessary but not sufficient —
      // the actor must also be a member of THAT conversation. Otherwise (while
      // CHAT-B-01 was open) an outsider could clear a victim's unread badges.
      if (!(await isRoomMember(socket, 'chat', conversationId))) {
        logger.warn(`CHAT-B-03: chat:delivered rejected — user=${actor} conversation=${conversationId}`);
        return;
      }
      try {
        const ChatMessage = (await import('../models/ChatMessage.js')).default;
        await ChatMessage.updateMany(
          { conversationId, sender: { $ne: actor }, 'deliveredTo.userId': { $ne: actor } },
          { $push: { deliveredTo: { userId: actor, at: new Date() } } }
        );
      } catch (e) {}
      socket.to(`chat:${conversationId}`).emit('chat:delivered', { conversationId, userId: actor, at: new Date() });
    });

    // Read receipts — sender ko wapas broadcast karo (participant sirf apne messages ke ticks update kare)
    socket.on('chat:read', async ({ conversationId, userId }) => {
      if (!conversationId) return;
      const actor = selfOrReject(socket, userId);
      if (!actor) return;
      // CHAT-B-03: same membership gate as chat:delivered.
      if (!(await isRoomMember(socket, 'chat', conversationId))) {
        logger.warn(`CHAT-B-03: chat:read rejected — user=${actor} conversation=${conversationId}`);
        return;
      }
      let shareReceipt = true;
      try {
        const [{ default: ChatMessage }, { default: ChatPrivacy }] = await Promise.all([
          import('../models/ChatMessage.js'),
          import('../models/ChatPrivacy.js'),
        ]);
        // Privacy: user ne read receipts OFF kiye hain to sender ko blue tick nahi milega
        const privacy = await ChatPrivacy.findOne({ userId: actor }).select('readReceipts').lean();
        shareReceipt = privacy ? privacy.readReceipts !== false : true;

        if (shareReceipt) {
          const now = new Date();
          await ChatMessage.updateMany(
            { conversationId, sender: { $ne: actor }, 'readBy.userId': { $ne: actor } },
            { $push: { readBy: { userId: actor, at: now }, deliveredTo: { userId: actor, at: now } } }
          );
        }
      } catch (e) {}
      if (shareReceipt) {
        socket.to(`chat:${conversationId}`).emit('chat:read', { conversationId, userId: actor, at: new Date() });
      }
    });

    // Presence ping from chat page — last seen fresh rakhta hai
    // CHAT-002: presence is a property of the caller, never of a payload id.
    socket.on('chat:presence', async ({ userId }) => {
      const actor = selfOrReject(socket, userId);
      if (actor) {
        await setUserPresence(actor, socket.userRole);
        try {
          await User.findByIdAndUpdate(actor, { isOnline: true, lastActive: new Date() });
        } catch (e) {}
      }
    });

    // ── WebRTC 1-to-1 Audio & Video Call Signalling ──────────────────────────────
    // Socket.IO is solely used for signaling (SDP & ICE exchange); media travels directly via WebRTC peer connection.
    const allCallEvents = [
      // 1-to-1 Audio Calls
      'call:invite', 'call:ringing', 'call:accept', 'call:reject',
      'call:cancel', 'call:end', 'call:busy', 'call:timeout',
      'call:offer', 'call:answer', 'call:ice', 'call:state', 'call:missed',
      'chat:call_invite', 'chat:call_ringing', 'chat:call_accept', 'chat:call_reject',
      'chat:call_cancel', 'chat:call_end', 'chat:call_offer', 'chat:call_answer',
      'chat:call_ice', 'chat:call_state', 'chat:call_missed',
      // 1-to-1 Full HD Video Calls (Strictly isolated channel)
      'videocall:invite', 'videocall:ringing', 'videocall:accept', 'videocall:reject',
      'videocall:cancel', 'videocall:end', 'videocall:busy', 'videocall:timeout',
      'videocall:offer', 'videocall:answer', 'videocall:ice', 'videocall:state',
      'videocall:track_state', 'videocall:switch_camera', 'videocall:message', 'videocall:screen_share',
    ];

    allCallEvents.forEach((event) => {
      socket.on(event, async (payload = {}) => {
        const target = payload.to || payload.recipientId || payload.peerId || payload.targetUserId;
        // CHAT-002: `from` is the authenticated identity. A caller-supplied
        // `from` would let anyone place a call invite or SDP offer in someone
        // else's name.
        const from = socket.userId;
        if (!target || !from) return;
        if (event.startsWith('chat:call_')) {
          const conversationId = payload.conversationId;
          if (!conversationId) return;
          try {
            const verdict = await assertRoomAccess(from, socket.userRole, 'chat', conversationId);
            if (!verdict.ok) return;
            const ChatConversation = (await import('../models/ChatConversation.js')).default;
            const conversation = await ChatConversation.findById(conversationId).select('participants').lean();
            const participants = (conversation?.participants || []).map((participant) => String(participant?._id || participant));
            if (!participants.includes(String(from)) || !participants.includes(String(target)) || String(target) === String(from)) return;
          } catch (error) {
            logger.warn(`chat call relay denied after membership lookup failure: ${error.message}`);
            return;
          }
        }
        const body = { ...payload, from };
        io.to(`user:${target}`).emit(event, body);
        if (payload.conversationId) {
          socket.to(`chat:${payload.conversationId}`).emit(event, body);
        }
      });
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (socket.userId) {
        try {
          await removeUserPresence(socket.userId, socket.userRole);
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastActive: new Date() }).catch(() => {});
          io.emit('presence:change', { userId: socket.userId, online: false, role: socket.userRole });
        } catch (e) {}
      }
    });
  });

  const rideNsp = io.of('/ride');
  rideNsp.use(verifySocketAuth);
  rideNsp.on('connection', (socket) => {
    attachRideSocketHandlers(socket, rideNsp);
  });

  const assistantNsp = io.of('/assistant');
  assistantNsp.use(verifySocketAuth);
  assistantNsp.on('connection', (socket) => {
    attachAssistantSocketHandlers(socket, assistantNsp);
  });

  const lawyerNsp = io.of('/lawyer');
  lawyerNsp.use(verifySocketAuth);
  lawyerNsp.on('connection', (socket) => {
    attachLawyerSocketHandlers(socket, lawyerNsp);
  });

  logger.info('Socket.IO ready');
  return io;
}


export function notifyUser(userId, notification) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
}

/**
 * Chat REST handlers se room-wide realtime event bhejne ke liye helper.
 * DB mutation ke baad route code ise call karta hai — clients turant
 * update ho jaate hain bina refetch kiye. Silent no-op agar socket band ho.
 */
export function emitChatEvent(conversationId, event, payload) {
  if (!io || !conversationId) return;
  try {
    io.to(`chat:${conversationId}`).emit(event, payload);
  } catch (e) {}
}

/** Specific user ke personal room me event (notifications, force-refresh etc.) */
export function emitChatNotification(userId, event, payload) {
  if (!io || !userId) return;
  try {
    io.to(`user:${userId}`).emit(event, payload);
  } catch (e) {}
}


export function notifyUsers(userIds, notification) {
  if (io) {
    userIds.forEach((userId) => {
      io.to(`user:${userId}`).emit('notification', notification);
    });
  }
}

export function emitDeliveryStatus(orderId, status, extra = {}) {
  if (io) io.to(`order:${orderId}`).emit('delivery:status', { status, ...extra, timestamp: Date.now() });
}

/**
 * Notify a doctor (by their user ID) that a schedule change request was reviewed.
 * The doctor's My Schedule page listens for this event to auto-remove the blur
 * and render blue/red highlights without requiring a page refresh.
 */
export function emitScheduleRequestUpdate(doctorUserId, payload) {
  if (io) io.to(`user:${doctorUserId}`).emit('schedule-request-updated', payload);
}

/**
 * Realtime appointment updates — naya booking ya status change hone par
 * doctor, clinic staff aur patient ke rooms ko notify karta hai. Client pages
 * 'appointment:updated' sun kar data reload kar lete hain (koi polling nahi chahiye).
 */
export async function emitAppointmentUpdate(appointment) {
  if (!io || !appointment) return;
  try {
    const rooms = new Set();

    const doctorId = appointment.doctorId?._id || appointment.doctorId;
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId).select('user_id facilityId hospitalId').lean();
      if (doctor?.user_id) rooms.add(`user:${doctor.user_id}`);
      // Clinic admins/staff bhi usi facility ke appointments dekhte hain
      if (doctor?.facilityId) {
        const staff = await User.find({ role: { $in: ['clinic_admin', 'clinic_doctor'] }, facilityId: doctor.facilityId }).select('_id').lean();
        staff.forEach(u => rooms.add(`user:${u._id}`));
      }
      if (doctor?.hospitalId) {
        const admins = await User.find({ role: 'hospital_admin', hospitalId: doctor.hospitalId }).select('_id').lean();
        admins.forEach(u => rooms.add(`user:${u._id}`));
      }
    }

    const patientId = appointment.patientId?._id || appointment.patientId;
    if (patientId) {
      const patient = await Patient.findById(patientId).select('userId').lean();
      if (patient?.userId) rooms.add(`user:${patient.userId}`);
    }

    const payload = { appointmentId: String(appointment._id) };
    rooms.forEach(room => io.to(room).emit('appointment:updated', payload));
  } catch (err) {
    logger.error(`appointment socket emit failed: ${err.message}`);
  }
}
