import { Server } from 'socket.io';
import logger from '../config/logger.js';
import { updateDeliveryBoyLocation } from '../config/redis.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';

let io = null;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        logger.info(`Socket ${socket.id} joined user:${userId}`);
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
        await updateDeliveryBoyLocation(deliveryPartnerId, lat, lng);
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

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized');
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
