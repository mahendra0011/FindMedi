import express from 'express';
import DemoPayment from '../models/DemoPayment.js';
import RideBooking from '../models/RideBooking.js';
import AssistantBooking from '../models/AssistantBooking.js';
import AssistantProfile from '../models/AssistantProfile.js';
import LawyerBooking from '../models/LawyerBooking.js';
import LawyerProfile from '../models/LawyerProfile.js';
import EmergencyDoctorRequest from '../models/EmergencyDoctorRequest.js';
import Doctor from '../models/Doctor.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { validate, demoPaySchema } from '../utils/validate.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';
import User from '../models/User.js';

const router = express.Router();

function walletBalanceOf(user) {
  return Number(user?.demoWallet?.balance ?? 10000);
}

// Spec 21: demo-wallet payments actually debit the ₹10,000 sandbox credit.
// Cash skips the ledger. Throws 402 when the balance cannot cover the fare.
async function debitDemoWallet(userId, amount, method) {
  if (method !== 'demo_wallet' || !(amount > 0)) return;
  const user = await User.findById(userId).select('demoWallet');
  const balance = walletBalanceOf(user);
  if (balance < amount) {
    const err = new Error(`Insufficient demo wallet balance (₹${balance} < ₹${amount}). Use cash or top up sandbox credit.`);
    err.statusCode = 402;
    throw err;
  }
  await User.updateOne({ _id: userId }, { $set: { 'demoWallet.balance': balance - amount } });
}

/**
 * Shared escrow-hold helper (also used by POST /lawyer-bookings/:id/hold-retainer).
 * Debits the payer demo wallet and records a HELD_IN_ESCROW DemoPayment.
 */
export async function holdDemoEscrow({ userId, amount, ref = {} }) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  const balance = walletBalanceOf(user);
  if (balance < amount) {
    const err = new Error(`Insufficient demo wallet balance (₹${balance} < ₹${amount})`);
    err.statusCode = 402;
    throw err;
  }
  await User.updateOne({ _id: userId }, { $set: { 'demoWallet.balance': balance - amount } });
  const payment = await DemoPayment.create({
    userId,
    amount,
    method: 'demo_wallet',
    status: 'held_in_escrow',
    ...ref,
  });
  return { payment, newBalance: balance - amount };
}

async function releaseEscrowToPaid(payment) {
  payment.status = 'paid';
  payment.paidAt = new Date();
  await payment.save();
  return payment;
}

// ─── POST /api/payment/demo/pay ─────────────────────────────────────────────
// Simulate payment (Demo for rides, assistant, lawyer, emergency doctor)
router.post('/pay', protect, validate(demoPaySchema), idempotencyGuard(), async (req, res) => {
  try {
    const { rideId, bookingId, lawyerBookingId, doctorRequestId, bookingType = 'ride', method = 'demo_wallet' } = req.body;
    const isLawyer = bookingType === 'lawyer' || Boolean(lawyerBookingId);
    const isAssistant = !isLawyer && (bookingType === 'assistant' || (Boolean(bookingId) && bookingType !== 'emergency_doctor'));
    const isDoctor = bookingType === 'emergency_doctor' || Boolean(doctorRequestId);
    const targetId = isLawyer ? (lawyerBookingId || bookingId || rideId) : isAssistant ? (bookingId || rideId) : isDoctor ? (doctorRequestId || bookingId || rideId) : rideId;

    if (isDoctor) {
      const docReq = await EmergencyDoctorRequest.findById(targetId);
      if (!docReq) {
        return res.status(404).json({ message: 'Emergency doctor request not found' });
      }

      const transactionRef = `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const paidAt = new Date();
      const amount = docReq.pricing?.total || 1000;

      await debitDemoWallet(req.user._id, amount, method);
      const demoPayment = await DemoPayment.create({
        bookingType: 'emergency_doctor',
        bookingId: docReq._id,
        userId: req.user._id,
        doctorId: docReq.assignedDoctorId,
        amount,
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      });

      docReq.payment = {
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      };
      await docReq.save();

      const io = getIO();
      if (io) {
        io.to(`doctor-request:${docReq._id}`).emit('payment_received', {
          requestId: String(docReq._id),
          payment: docReq.payment,
        });
      }

      return res.json({
        success: true,
        message: 'Emergency doctor payment completed (Demo Mode)',
        payment: docReq.payment,
        demoPayment,
      });
    }

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

      await debitDemoWallet(req.user._id, amount, method);
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

      await debitDemoWallet(req.user._id, amount, method);
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

    await debitDemoWallet(req.user._id, amount, method);
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
    res.status(err.statusCode || 500).json({ message: 'Failed to process demo payment', error: err.message });
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

// ─── POST /api/payment/demo/hold ────────────────────────────────────────────
// Spec 21: lock funds in mock escrow (DEMO_ESCROW_HELD). Body accepts any one of
// { rideId, bookingId, lawyerBookingId, doctorRequestId } + optional amount.
router.post('/hold', protect, async (req, res) => {
  try {
    const { rideId, bookingId, lawyerBookingId, doctorRequestId, amount } = req.body;
    const ref = {};
    if (lawyerBookingId) {
      ref.bookingType = 'lawyer';
      ref.lawyerBookingId = lawyerBookingId;
    } else if (bookingId) {
      ref.bookingType = 'assistant';
      ref.bookingId = bookingId;
    } else if (doctorRequestId) {
      ref.bookingType = 'emergency_doctor';
      ref.bookingId = doctorRequestId;
    } else {
      ref.bookingType = 'ride';
      if (rideId) ref.rideId = rideId;
    }
    const holdAmount = Number(amount) || 0;
    if (!(holdAmount > 0)) return res.status(400).json({ message: 'Valid amount required to hold escrow' });
    const { payment, newBalance } = await holdDemoEscrow({ userId: req.user._id, amount: holdAmount, ref });
    res.status(201).json({ success: true, message: 'Demo escrow held', payment, demoWalletBalance: newBalance });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Failed to hold escrow' });
  }
});

// ─── POST /api/payment/demo/confirm/:id ────────────────────────────────────
// Spec 21: 1-click demo success — held/pending → paid (escrow released).
router.post('/confirm/:id', protect, async (req, res) => {
  try {
    const payment = await DemoPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (['paid', 'refunded'].includes(payment.status)) {
      return res.json({ success: true, message: `Already ${payment.status}`, payment });
    }
    await releaseEscrowToPaid(payment);
    res.json({ success: true, message: 'Demo payment approved (escrow released)', payment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to confirm payment', error: err.message });
  }
});

// ─── POST /api/payment/demo/fail/:id ───────────────────────────────────────
// Spec 21: 1-click demo failure — tests frontend decline handling.
router.post('/fail/:id', protect, async (req, res) => {
  try {
    const payment = await DemoPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    payment.status = 'failed';
    await payment.save();
    // Held funds return to the payer wallet on failure.
    if (payment.method === 'demo_wallet') {
      await User.updateOne({ _id: payment.userId }, { $inc: { 'demoWallet.balance': payment.amount } });
    }
    res.json({ success: true, message: 'Demo payment marked failed (held funds returned)', payment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fail payment', error: err.message });
  }
});

// ─── POST /api/payment/demo/refund/:id ─────────────────────────────────────
// Spec 21: instant demo refund on cancellation.
router.post('/refund/:id', protect, async (req, res) => {
  try {
    const payment = await DemoPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'refunded') {
      return res.json({ success: true, message: 'Already refunded', payment });
    }
    payment.status = 'refunded';
    await payment.save();
    if (payment.method === 'demo_wallet') {
      await User.updateOne({ _id: payment.userId }, { $inc: { 'demoWallet.balance': payment.amount } });
    }
    const user = await User.findById(payment.userId).select('demoWallet').lean();
    res.json({ success: true, message: 'Demo payment refunded', payment, demoWalletBalance: walletBalanceOf(user) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to refund payment', error: err.message });
  }
});

// ─── GET /api/payment/demo/wallet/me ───────────────────────────────────────
// Spec 21: virtual sandbox wallet balance (₹10,000 default credit).
router.get('/wallet/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('demoWallet').lean();
    res.json({ success: true, balance: walletBalanceOf(user), currency: 'INR', sandbox: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch wallet', error: err.message });
  }
});

export default router;
