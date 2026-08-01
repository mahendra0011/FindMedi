import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import logger from '../config/logger.js';
import { redisPub, redisSub, connectRedis, updateDeliveryBoyLocation } from '../config/redis.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

let io = null;

export async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Redis adapter sirf tab lagao jab REDIS_URL set ho aur connect ho sake.
  // Locally (bina Redis) default in-memory adapter use hota hai — warna har emit
  // ek kabhi-connected-na-huye pub/sub client par atak kar silently fail ho jaata
  // tha (real-time updates kabhi nahi pahunchte the).
  if (process.env.REDIS_URL) {
    try {
      await connectRedis();
      io.adapter(createAdapter(redisPub, redisSub));
      logger.info('Socket.IO initialized (with Redis adapter)');
    } catch (err) {
      logger.warn(`Redis unavailable (${err.message}) — falling back to in-memory Socket.IO adapter`);
    }
  } else {
    logger.info('Socket.IO initialized (in-memory adapter — single instance mode)');
  }

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('order:join_tracking', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on('order:leave_tracking', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });

    socket.on('deliveryboy:location', async ({ deliveryPartnerId, orderId, lat, lng }) => {
      try {
        // Redis cache best-effort hai — fail hone par DB updates ko skip mat karo
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

    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
  });

  logger.info('Socket.IO ready');
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket first.');
  }
  return io;
}

export function notifyUser(userId, notification) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
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
