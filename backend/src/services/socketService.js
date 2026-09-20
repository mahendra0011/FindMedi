import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
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

let io = null;

export function getIO() {
  return io;
}

function attachRideSocketHandlers(socket, namespace) {
  socket.on('join_ride_room', ({ rideId }) => {
    if (rideId) socket.join(`ride:${rideId}`);
  });
  socket.on('leave_ride_room', ({ rideId }) => {
    if (rideId) socket.leave(`ride:${rideId}`);
  });
  socket.on('rider_location_update', async ({ rideId, lat, lng, riderId }) => {
    try {
      const id = riderId || socket.userId;
      if (id) {
        await RiderProfile.findOneAndUpdate(
          { userId: id },
          {
            isOnline: true,
            'currentLocation.lat': lat,
            'currentLocation.lng': lng,
            'currentLocation.coordinates': [lng, lat],
            'currentLocation.updatedAt': new Date(),
          }
        ).catch(() => {});
      }
      if (rideId) {
        await RideTracking.create({ rideId, riderId: id, lat, lng }).catch(() => {});
        namespace.to(`ride:${rideId}`).emit('ride_location_update', { rideId, lat, lng, timestamp: Date.now() });
        if (io && namespace !== io) {
          io.to(`ride:${rideId}`).emit('ride_location_update', { rideId, lat, lng, timestamp: Date.now() });
        }
      }
    } catch (err) {
      logger.error(`rider_location_update error: ${err.message}`);
    }
  });
  socket.on('rider_go_online', async ({ riderId, lat, lng, accuracy }) => {
    try {
      const id = riderId || socket.userId;
      if (id) {
        const update = { isOnline: true };
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
      const id = riderId || socket.userId;
      if (id) {
        await RiderProfile.findOneAndUpdate({ userId: id }, { isOnline: false });
      }
    } catch (err) {
      logger.error(`rider_go_offline error: ${err.message}`);
    }
  });
}

function attachAssistantSocketHandlers(socket, namespace) {
  socket.on('join_booking_room', ({ bookingId }) => {
    if (bookingId) socket.join(`assistant-booking:${bookingId}`);
  });
  socket.on('leave_booking_room', ({ bookingId }) => {
    if (bookingId) socket.leave(`assistant-booking:${bookingId}`);
  });
  socket.on('assistant_go_available', async ({ assistantId }) => {
    try {
      const id = assistantId || socket.userId;
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
      const id = assistantId || socket.userId;
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
  socket.on('send_chat_message', ({ bookingId, senderId, senderName, text }) => {
    if (!bookingId || !text) return;
    const msg = {
      bookingId,
      senderId: senderId || socket.userId,
      senderName: senderName || 'User',
      text,
      at: new Date().toISOString(),
    };
    namespace.to(`assistant-booking:${bookingId}`).emit('chat_message', msg);
    if (io && namespace !== io) {
      io.to(`assistant-booking:${bookingId}`).emit('chat_message', msg);
    }
  });
}

function attachLawyerSocketHandlers(socket, namespace) {
  socket.on('join_booking_room', ({ bookingId }) => {
    if (bookingId) socket.join(`lawyer-booking:${bookingId}`);
  });
  socket.on('leave_booking_room', ({ bookingId }) => {
    if (bookingId) socket.leave(`lawyer-booking:${bookingId}`);
  });
  socket.on('lawyer_go_available', async ({ lawyerId }) => {
    try {
      const id = lawyerId || socket.userId;
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
      const id = lawyerId || socket.userId;
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
  socket.on('case_note_updated', ({ bookingId, note }) => {
    if (!bookingId) return;
    const payload = { bookingId, note, at: new Date().toISOString() };
    namespace.to(`lawyer-booking:${bookingId}`).emit('case_note_update', payload);
    if (io && namespace !== io) {
      io.to(`lawyer-booking:${bookingId}`).emit('case_note_update', payload);
    }
  });
  socket.on('send_chat_message', ({ bookingId, senderId, senderName, text }) => {
    if (!bookingId || !text) return;
    const msg = {
      bookingId,
      senderId: senderId || socket.userId,
      senderName: senderName || 'User',
      text,
      at: new Date().toISOString(),
    };
    namespace.to(`lawyer-booking:${bookingId}`).emit('chat_message', msg);
    if (io && namespace !== io) {
      io.to(`lawyer-booking:${bookingId}`).emit('chat_message', msg);
    }
  });
}

function attachEmergencySocketHandlers(socket, namespace) {
  socket.on('join_emergency_room', ({ requestId }) => {
    if (requestId) socket.join(`emergency:${requestId}`);
  });
  socket.on('leave_emergency_room', ({ requestId }) => {
    if (requestId) socket.leave(`emergency:${requestId}`);
  });
  socket.on('join_ambulance_room', ({ ambulanceId }) => {
    if (ambulanceId) socket.join(`ambulance:${ambulanceId}`);
  });
  socket.on('leave_ambulance_room', ({ ambulanceId }) => {
    if (ambulanceId) socket.leave(`ambulance:${ambulanceId}`);
  });
  socket.on('emergency_provider_location', async ({ requestId, providerId, providerType, lat, lng }) => {
    try {
      if (providerType === 'ambulance' && providerId) {
        const Ambulance = (await import('../models/Ambulance.js')).default;
        await Ambulance.findByIdAndUpdate(providerId, {
          'currentLocation.coordinates': [lng, lat],
          'currentLocation.updatedAt': new Date(),
        }).catch(() => {});
      } else if (providerId) {
        const RiderProfile = (await import('../models/RiderProfile.js')).default;
        await RiderProfile.findOneAndUpdate(
          { userId: providerId },
          {
            'currentLocation.lat': lat,
            'currentLocation.lng': lng,
            'currentLocation.coordinates': [lng, lat],
            'currentLocation.updatedAt': new Date(),
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
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5001',
  ];
  return Array.from(new Set([...envOrigins, ...defaults]))
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

export async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        const allowed = getAllowedSocketOrigins();
        const normalized = origin.trim().replace(/\/+$/, '');
        if (allowed.includes(normalized) || allowed.some(a => normalized.endsWith(a.replace(/^https?:\/\//, '')))) {
          return callback(null, true);
        }
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

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join', async (payload) => {
      const userId = typeof payload === 'object' ? payload?.userId : payload;
      const role = typeof payload === 'object' ? payload?.role : undefined;

      if (userId) {
        socket.userId = String(userId);
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

    socket.on('order:join_tracking', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on('order:leave_tracking', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });

    socket.on('deliveryboy:location', async ({ deliveryPartnerId, orderId, lat, lng }) => {
      try {
        try {
          await updateDeliveryBoyLocation(deliveryPartnerId, lat, lng);
        } catch (redisErr) {
          logger.warn(`Delivery location Redis cache skipped: ${redisErr.message}`);
        }
        await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, {
          currentLocation: { lat, lng, updatedAt: new Date() },
        });
        if (orderId) {
          await PharmacyDelivery.findByIdAndUpdate(orderId, {
            $push: { trackingHistory: { lat, lng, timestamp: new Date() } },
          });
          io.to(`order:${orderId}`).emit('location:updated', { lat, lng, timestamp: Date.now() });
        }
      } catch (err) {
        logger.error(`location update failed: ${err.message}`);
      }
    });

    socket.on('deliveryboy:online', async ({ deliveryPartnerId, online }) => {
      await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, { isOnline: online, isAvailable: online });
    });

    // ─── Vehicle & Ride Events (Doc 05 §4) ───────────────────────────
    attachRideSocketHandlers(socket, io);

    // ─── Hospital Assistant Events (Doc 05 §4) ────────────────────────
    attachAssistantSocketHandlers(socket, io);

    // ─── Lawyer & Legal Events (Doc 05 §4) ─────────────────────────────
    attachLawyerSocketHandlers(socket, io);

    // ─── Emergency SOS Events ──────────────────────────────────────────
    attachEmergencySocketHandlers(socket, io);

    // Chat Events
    socket.on('chat:join', (conversationId) => {
      socket.join(`chat:${conversationId}`);
    });

    socket.on('chat:leave', (conversationId) => {
      socket.leave(`chat:${conversationId}`);
    });

    socket.on('chat:typing', ({ conversationId, userId, isTyping }) => {
      socket.to(`chat:${conversationId}`).emit('chat:typing', { conversationId, userId, isTyping });
    });

    // Recording a voice message (mic button pressed)
    socket.on('chat:recording', ({ conversationId, userId, isRecording }) => {
      socket.to(`chat:${conversationId}`).emit('chat:recording', { conversationId, userId, isRecording });
    });

    // Delivery receipts — sender ko wapas broadcast karo
    socket.on('chat:delivered', async ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;
      try {
        const ChatMessage = (await import('../models/ChatMessage.js')).default;
        await ChatMessage.updateMany(
          { conversationId, sender: { $ne: userId }, 'deliveredTo.userId': { $ne: userId } },
          { $push: { deliveredTo: { userId, at: new Date() } } }
        );
      } catch (e) {}
      socket.to(`chat:${conversationId}`).emit('chat:delivered', { conversationId, userId, at: new Date() });
    });

    // Read receipts — sender ko wapas broadcast karo (participant sirf apne messages ke ticks update kare)
    socket.on('chat:read', async ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;
      let shareReceipt = true;
      try {
        const [{ default: ChatMessage }, { default: ChatPrivacy }] = await Promise.all([
          import('../models/ChatMessage.js'),
          import('../models/ChatPrivacy.js'),
        ]);
        // Privacy: user ne read receipts OFF kiye hain to sender ko blue tick nahi milega
        const privacy = await ChatPrivacy.findOne({ userId }).select('readReceipts').lean();
        shareReceipt = privacy ? privacy.readReceipts !== false : true;

        if (shareReceipt) {
          const now = new Date();
          await ChatMessage.updateMany(
            { conversationId, sender: { $ne: userId }, 'readBy.userId': { $ne: userId } },
            { $push: { readBy: { userId, at: now }, deliveredTo: { userId, at: now } } }
          );
        }
      } catch (e) {}
      if (shareReceipt) {
        socket.to(`chat:${conversationId}`).emit('chat:read', { conversationId, userId, at: new Date() });
      }
    });

    // Presence ping from chat page — last seen fresh rakhta hai
    socket.on('chat:presence', async ({ userId }) => {
      if (userId) {
        await setUserPresence(String(userId), socket.userRole);
        try {
          await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
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
      socket.on(event, (payload = {}) => {
        const target = payload.to || payload.recipientId || payload.peerId || payload.targetUserId;
        const from = payload.from || socket.userId;
        if (!target) return;
        const body = { ...payload, from };
        io.to(`user:${target}`).emit(event, body);
        if (payload.conversationId) {
          socket.to(`chat:${payload.conversationId}`).emit(event, body);
        }
      });
    });

    socket.on('chat:send_message', (message) => {
      // Broadcast to the chat room
      io.to(`chat:${message.conversationId}`).emit('chat:receive_message', message);
      // Also trigger a notification event to the specific recipient user room if they aren't in the chat room
      // Since it's 1-on-1, the recipient is the other participant
      if (message.recipientId) {
        io.to(`user:${message.recipientId}`).emit('chat:new_message_notification', message);
      }
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
  rideNsp.on('connection', (socket) => {
    attachRideSocketHandlers(socket, rideNsp);
  });

  const assistantNsp = io.of('/assistant');
  assistantNsp.on('connection', (socket) => {
    attachAssistantSocketHandlers(socket, assistantNsp);
  });

  const lawyerNsp = io.of('/lawyer');
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
