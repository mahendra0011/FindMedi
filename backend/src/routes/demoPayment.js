import express from 'express';
import DemoPayment from '../models/DemoPayment.js';
import RideBooking from '../models/RideBooking.js';
import AssistantBooking from '../models/AssistantBooking.js';
import AssistantProfile from '../models/AssistantProfile.js';
import LawyerBooking from '../models/LawyerBooking.js';
import LawyerProfile from '../models/LawyerProfile.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { validate, demoPaySchema } from '../utils/validate.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── POST /api/payment/demo/pay ─────────────────────────────────────────────
// Simulate payment (Demo only for rides and assistant bookings)
router.post('/pay', protect, validate(demoPaySchema), async (req, res) => {
  try {
    const { rideId, bookingId, lawyerBookingId, bookingType = 'ride', method = 'demo_wallet' } = req.body;
    const isLawyer = bookingType === 'lawyer' || Boolean(lawyerBookingId);
    const isAssistant = !isLawyer && (bookingType === 'assistant' || Boolean(bookingId));
    const targetId = isLawyer ? (lawyerBookingId || bookingId || rideId) : isAssistant ? (bookingId || rideId) : rideId;

    if (isLawyer) {
      const booking = await LawyerBooking.findById(targetId);
      if (!booking) {
        return res.status(404).json({ message: 'Legal consultation booking not found' });
      }

      if (booking.payment?.status === 'paid') {
        return res.json({
          success: true,
          message: 'Payment already completed for this consultation',
          payment: booking.payment,
        });
      }

      const transactionRef = `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const paidAt = new Date();
      const amount = booking.fee || 800;

      const demoPayment = await DemoPayment.create({
        bookingType: 'lawyer',
        lawyerBookingId: booking._id,
        userId: req.user._id,
        lawyerId: booking.lawyerId,
        amount,
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      });

      // Update lawyer booking payment
      booking.payment = {
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      };
      await booking.save();

      // Credit net 90% earnings to lawyer's wallet (10% platform commission retained)
      if (booking.lawyerId) {
        const netCredit = Math.round(amount * 0.90);
        await LawyerProfile.findOneAndUpdate(
          { userId: booking.lawyerId },
          { $inc: { walletBalance: netCredit, totalEarnings: amount } }
        );

        // In-app notification to lawyer
        await Notification.create({
          userId: String(booking.lawyerId),
          title: '💰 Payment Received (Demo)',
          message: `Consultation fee of Rs. ${amount} received for Booking #${booking.bookingNumber || booking._id} via ${method === 'cash' ? 'Cash' : 'Demo Wallet'}. Net credit: Rs. ${netCredit}.`,
          type: 'lawyer',
        }).catch(() => {});
      }

      // Notify socket rooms
      const io = getIO();
      if (io) {
        const payload = {
          bookingId: String(booking._id),
          payment: booking.payment,
          status: booking.status,
        };
        io.to(`lawyer-booking:${booking._id}`).emit('payment_received', payload);
        io.of('/lawyer').to(`lawyer-booking:${booking._id}`).emit('payment_received', payload);
      }

      return res.json({
        success: true,
        message: 'Payment successful (Demo Mode)',
        payment: booking.payment,
        demoPayment,
      });
    }

    if (isAssistant) {
      const booking = await AssistantBooking.findById(targetId);
      if (!booking) {
        return res.status(404).json({ message: 'Assistant booking not found' });
      }

      if (booking.payment?.status === 'paid') {
        return res.json({
          success: true,
          message: 'Payment already completed for this assistant booking',
          payment: booking.payment,
        });
      }

      const transactionRef = `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const paidAt = new Date();
      const amount = booking.cost?.total || 0;

      const demoPayment = await DemoPayment.create({
        bookingType: 'assistant',
        bookingId: booking._id,
        userId: req.user._id,
        assistantId: booking.assistantId,
        amount,
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      });

      // Update assistant booking payment
      booking.payment = {
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      };
      await booking.save();

      // Credit net 90% earnings to assistant's wallet
      if (booking.assistantId) {
        const netCredit = Math.round(amount * 0.90);
        await AssistantProfile.findOneAndUpdate(
          { userId: booking.assistantId },
          { $inc: { walletBalance: netCredit } }
        );

        // In-app notification to assistant
        await Notification.create({
          userId: String(booking.assistantId),
          title: '💰 Payment Received (Demo)',
          message: `Payment of Rs. ${amount} received for Booking #${booking.bookingNumber || booking._id} via ${method === 'cash' ? 'Cash' : 'Demo Wallet'}. Net credit: Rs. ${netCredit}.`,
          type: 'assistant',
        }).catch(() => {});
      }

      // Notify socket rooms
      const io = getIO();
      if (io) {
        const payload = {
          bookingId: String(booking._id),
          payment: booking.payment,
          status: booking.status,
        };
        io.to(`assistant-booking:${booking._id}`).emit('payment_received', payload);
        io.of('/assistant').to(`assistant-booking:${booking._id}`).emit('payment_received', payload);
      }

      return res.json({
        success: true,
        message: `Payment of Rs. ${amount} successful (Demo Mode)`,
        transactionRef,
        payment: booking.payment,
        demoPayment,
      });
    }

    // Ride payment flow (existing)
    const ride = await RideBooking.findById(targetId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride booking not found' });
    }

    if (ride.payment?.status === 'paid') {
      return res.json({
        success: true,
        message: 'Payment already completed for this ride',
        payment: ride.payment,
      });
    }

    const transactionRef = `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const paidAt = new Date();
    const amount = ride.fare?.total || 0;

    const demoPayment = await DemoPayment.create({
      bookingType: 'ride',
      rideId: ride._id,
      userId: req.user._id,
      riderId: ride.riderId,
      amount,
      method,
      status: 'paid',
      transactionRef,
      paidAt,
    });

    // Update ride booking payment
    ride.payment = {
      method,
      status: 'paid',
      transactionRef,
      paidAt,
    };
    await ride.save();

    // Notify ride room via Socket.IO
    const io = getIO();
    if (io) {
      const payload = {
        rideId: String(ride._id),
        payment: ride.payment,
        status: ride.status,
      };
      io.to(`ride:${ride._id}`).emit('payment_received', payload);
      io.of('/ride').to(`ride:${ride._id}`).emit('payment_received', payload);
    }

    // In-app notification to driver
    if (ride.riderId) {
      await Notification.create({
        userId: String(ride.riderId),
        title: '💰 Payment Received (Demo)',
        message: `Payment of ₹${amount} completed for Ride #${ride.bookingNumber || ride._id} via ${method === 'cash' ? 'Cash' : 'Demo Wallet'}.`,
        type: 'payment',
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `Payment of ₹${amount} successful (Demo Mode)`,
      transactionRef,
      payment: ride.payment,
      demoPayment,
    });
  } catch (err) {
    logger.error(`Demo payment error: ${err.message}`);
    res.status(500).json({ message: 'Failed to process demo payment', error: err.message });
  }
});

// ─── GET /api/payment/demo/:id ──────────────────────────────────────────────
// Get payment status for a ride or assistant booking
router.get('/:id', protect, async (req, res) => {
  try {
    const id = req.params.id;
    const payment = await DemoPayment.findOne({
      $or: [{ rideId: id }, { bookingId: id }, { lawyerBookingId: id }, { _id: id }],
    }).lean();

    if (!payment) {
      return res.status(404).json({ message: 'No payment record found' });
    }
    res.json({ payment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment', error: err.message });
  }
});

export default router;
