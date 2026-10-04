import express from 'express';
import DemoPayment from '../models/DemoPayment.js';
import RideBooking from '../models/RideBooking.js';
import AssistantBooking from '../models/AssistantBooking.js';
import LawyerBooking from '../models/LawyerBooking.js';
import EmergencyDoctorRequest from '../models/EmergencyDoctorRequest.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { validate, demoPaySchema } from '../utils/validate.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';
import User from '../models/User.js';

const router = express.Router();

function walletBalanceOf(user) {
  return Number(user?.demoWallet?.balance ?? 10000);
}

// PAY-002: a user may only touch their own demo payments (superadmin excepted).
function canAccessPayment(payment, user) {
  return payment.userId?.toString() === user._id.toString() || user.role === 'superadmin';
}

function ownsBooking(booking, ownerField, user) {
  const ownerId = booking?.[ownerField]?._id ?? booking?.[ownerField];
  return user?.role === 'superadmin' || (ownerId != null && String(ownerId) === String(user?._id));
}

function blockProductionDemoPayments(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      success: false,
      code: 'DEMO_PAYMENTS_DISABLED',
      message: 'Demo payment operations are disabled in production.',
    });
  }
  return next();
}

// Spec 21: demo-wallet payments actually debit the ₹10,000 sandbox credit.
// Cash skips the ledger. Throws 402 when the balance cannot cover the fare.
// PAY-001: atomic conditional debit ($gte guard + $inc) — a read-then-write would
// let two concurrent payments both pass the balance check and overdraw the wallet.
async function debitDemoWallet(userId, amount, method) {
  if (method !== 'demo_wallet' || !(amount > 0)) return;
  const user = await User.findOneAndUpdate(
    { _id: userId, 'demoWallet.balance': { $gte: amount } },
    { $inc: { 'demoWallet.balance': -amount } },
    { new: true }
  );
  if (!user) {
    const current = await User.findById(userId).select('demoWallet');
    const balance = walletBalanceOf(current);
    const err = new Error(`Insufficient demo wallet balance (₹${balance} < ₹${amount}). Use cash or top up sandbox credit.`);
    err.statusCode = 402;
    throw err;
  }
  return user;
}

/**
 * PAY-B-12 + PAY-M-03: normalized per-booking claim key.
 * Distinct idempotency keys racing on the same booking share this value, so
 * the second insert fails on the unique index instead of double-debiting.
 */
export function bookingRefFor(bookingType, targetId) {
  if (!bookingType || !targetId) return undefined;
  return `${bookingType}:${String(targetId)}`;
}

function bookingIdFieldFor(bookingType) {
  switch (bookingType) {
    case 'assistant': return 'bookingId';
    case 'lawyer': return 'lawyerBookingId';
    case 'emergency_doctor': return 'doctorRequestId';
    case 'ride':
    default: return 'rideId';
  }
}

async function findExistingClaim(bookingType, targetId, bookingRef) {
  if (bookingRef) {
    const byRef = await DemoPayment.findOne({ bookingRef }).lean?.()
      ?? await DemoPayment.findOne({ bookingRef });
    if (byRef) return byRef;
  }
  if (targetId) {
    const field = bookingIdFieldFor(bookingType);
    const found = await DemoPayment.findOne({ bookingType, [field]: targetId });
    if (found) return found;
  }
  return null;
}

async function compensateDemoWallet(userId, amount, method) {
  if (method !== 'demo_wallet' || !(amount > 0)) return;
  await User.updateOne({ _id: userId }, { $inc: { 'demoWallet.balance': amount } }).catch(() => {});
}

/**
 * PAY-B-12 + PAY-M-03: atomic per-booking claim.
 * The caller has ALREADY debited the wallet (atomic $gte+$inc). This insert is
 * the DECISIVE claim: the unique index on {bookingType, <id>} / bookingRef
 * makes exactly one winner. On E11000 the debit is compensated and the
 * existing row is returned so the loser reports "already paid" with a single
 * net debit instead of two.
 */
export async function createClaimedDemoPayment({ payload, userId, amount, method, bookingType, targetId }) {
  try {
    const demoPayment = await DemoPayment.create(payload);
    return { demoPayment, duplicate: false };
  } catch (err) {
    if (err?.code === 11000) {
      await compensateDemoWallet(userId, amount, method);
      const existing = await findExistingClaim(bookingType, targetId, payload?.bookingRef).catch(() => null);
      const dup = new Error('Payment already recorded for this booking');
      dup.statusCode = 200;
      dup.code = 'DEMO_PAYMENT_DUPLICATE_CLAIM';
      dup.duplicate = true;
      dup.existing = existing;
      throw dup;
    }
    throw err;
  }
}

/**
 * Shared escrow-hold helper (also used by POST /lawyer-bookings/:id/hold-retainer).
 * Debits the payer demo wallet and records a HELD_IN_ESCROW DemoPayment.
 */
export async function holdDemoEscrow({ userId, amount, ref = {} }) {
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Demo payment operations are disabled in production.');
    error.statusCode = 503;
    throw error;
  }
  // PAY-001: same atomic conditional debit as debitDemoWallet.
  const user = await User.findOneAndUpdate(
    { _id: userId, 'demoWallet.balance': { $gte: amount } },
    { $inc: { 'demoWallet.balance': -amount } },
    { new: true }
  );
  if (!user) {
    const existing = await User.findById(userId);
    if (!existing) throw new Error('User not found');
    const err = new Error(`Insufficient demo wallet balance (₹${walletBalanceOf(existing)} < ₹${amount})`);
    err.statusCode = 402;
    throw err;
  }
  const holdBookingType = ref.bookingType || 'ride';
  const holdTargetId = ref.bookingId || ref.rideId || ref.lawyerBookingId || ref.doctorRequestId || null;
  const holdBookingRef = bookingRefFor(holdBookingType, holdTargetId);
  try {
    const payment = await DemoPayment.create({
      userId,
      amount,
      method: 'demo_wallet',
      status: 'held_in_escrow',
      ...ref,
      ...(holdBookingRef ? { bookingRef: holdBookingRef } : {}),
    });
    return { payment, newBalance: user.demoWallet?.balance ?? 0 };
  } catch (err) {
    if (err?.code === 11000) {
      // Lost the claim race: give the debit back and return the winner.
      await compensateDemoWallet(userId, amount, 'demo_wallet');
      const existing = await findExistingClaim(holdBookingType, holdTargetId, holdBookingRef).catch(() => null);
      if (existing) return { payment: existing, newBalance: walletBalanceOf(await User.findById(userId).select('demoWallet').catch(() => null)), duplicate: true };
    }
    throw err;
  }
}

async function releaseEscrowToPaid(payment) {
  payment.status = 'paid';
  payment.paidAt = new Date();
  await payment.save();
  return payment;
}

// ─── POST /api/payment/demo/pay ─────────────────────────────────────────────
// Simulate payment (Demo for rides, assistant, lawyer, emergency doctor)
router.post('/pay', protect, authorize('billing:write', 'billing:write:own'), blockProductionDemoPayments, paymentLimiter, idempotencyGuard({ prefix: 'demo-pay', failClosed: true }), validate(demoPaySchema), idempotencyGuard(), async (req, res) => {
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
      if (!ownsBooking(docReq, 'userId', req.user)) {
        return res.status(404).json({ message: 'Emergency doctor request not found' });
      }

      const transactionRef = `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const paidAt = new Date();
      const amount = docReq.pricing?.total || 1000;

      await debitDemoWallet(req.user._id, amount, method);
      const { demoPayment } = await createClaimedDemoPayment({
        payload: {
          bookingType: 'emergency_doctor',
          doctorRequestId: docReq._id,
          userId: req.user._id,
          doctorId: docReq.assignedDoctorId,
          amount,
          method,
          status: 'paid',
          transactionRef,
          paidAt,
          bookingRef: bookingRefFor('emergency_doctor', docReq._id),
        },
        userId: req.user._id, amount, method,
        bookingType: 'emergency_doctor', targetId: docReq._id,
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
      if (!ownsBooking(booking, 'userId', req.user)) {
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
      const { demoPayment } = await createClaimedDemoPayment({
        payload: {
          bookingType: 'lawyer',
          lawyerBookingId: booking._id,
          userId: req.user._id,
          lawyerId: booking.lawyerId,
          amount,
          method,
          status: 'paid',
          transactionRef,
          paidAt,
          bookingRef: bookingRefFor('lawyer', booking._id),
        },
        userId: req.user._id, amount, method,
        bookingType: 'lawyer', targetId: booking._id,
      });

      // Update lawyer booking payment
      booking.payment = {
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      };
      await booking.save();

      if (booking.lawyerId) {
        // In-app notification to lawyer
        await Notification.create({
          userId: String(booking.lawyerId),
          title: '💰 Payment Received (Demo)',
          message: `Consultation payment of Rs. ${amount} recorded for Booking #${booking.bookingNumber || booking._id}.`,
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
      if (!ownsBooking(booking, 'patientId', req.user)) {
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
      const { demoPayment } = await createClaimedDemoPayment({
        payload: {
          bookingType: 'assistant',
          bookingId: booking._id,
          userId: req.user._id,
          assistantId: booking.assistantId,
          amount,
          method,
          status: 'paid',
          transactionRef,
          paidAt,
          bookingRef: bookingRefFor('assistant', booking._id),
        },
        userId: req.user._id, amount, method,
        bookingType: 'assistant', targetId: booking._id,
      });

      // Update assistant booking payment
      booking.payment = {
        method,
        status: 'paid',
        transactionRef,
        paidAt,
      };
      await booking.save();

      if (booking.assistantId) {
        // In-app notification to assistant
        await Notification.create({
          userId: String(booking.assistantId),
          title: '💰 Payment Received (Demo)',
          message: `Payment of Rs. ${amount} recorded for Booking #${booking.bookingNumber || booking._id}.`,
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
    if (!ownsBooking(ride, 'userId', req.user)) {
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
    const { demoPayment } = await createClaimedDemoPayment({
      payload: {
        bookingType: 'ride',
        rideId: ride._id,
        userId: req.user._id,
        riderId: ride.riderId,
        amount,
        method,
        status: 'paid',
        transactionRef,
        paidAt,
        bookingRef: bookingRefFor('ride', ride._id),
      },
      userId: req.user._id, amount, method,
      bookingType: 'ride', targetId: ride._id,
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
    // PAY-B-12 + PAY-M-03: lost the per-booking claim race — the debit was
    // already compensated inside createClaimedDemoPayment. Report the winner
    // as an idempotent replay, never as a 500 that invites a third debit.
    if (err?.duplicate) {
      return res.json({
        success: true,
        message: 'Payment already completed for this booking',
        payment: err.existing?.status ? { status: err.existing.status } : undefined,
        demoPayment: err.existing || undefined,
        duplicate: true,
      });
    }
    logger.error(`Demo payment error: ${err.message}`);
    res.status(err.statusCode || 500).json({ message: 'Failed to process demo payment', error: err.message });
  }
});

// ─── GET /api/payment/demo/:id ──────────────────────────────────────────────
// Get payment status for a ride or assistant booking
router.get('/:id', protect, authorize('billing:read', 'billing:read:own'), async (req, res) => {
  try {
    const id = req.params.id;
    const payment = await DemoPayment.findOne({
      $or: [{ rideId: id }, { bookingId: id }, { lawyerBookingId: id }, { doctorRequestId: id }, { _id: id }],
    }).lean();

    if (!payment) {
      return res.status(404).json({ message: 'No payment record found' });
    }
    // PAY-002: a payment is readable only by the account that owns it.
    if (!canAccessPayment(payment, req.user)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ payment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment', error: err.message });
  }
});

// ─── POST /api/payment/demo/hold ────────────────────────────────────────────
// Spec 21: lock funds in mock escrow (DEMO_ESCROW_HELD). Body accepts any one of
// { rideId, bookingId, lawyerBookingId, doctorRequestId } + optional amount.
router.post('/hold', protect, authorize('billing:write', 'billing:write:own'), blockProductionDemoPayments, paymentLimiter, async (req, res) => {
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
      ref.doctorRequestId = doctorRequestId;
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
router.post('/confirm/:id', protect, authorize('billing:write', 'billing:write:own'), blockProductionDemoPayments, paymentLimiter, async (req, res) => {
  try {
    const payment = await DemoPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (!canAccessPayment(payment, req.user)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
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
router.post('/fail/:id', protect, authorize('billing:write', 'billing:write:own'), blockProductionDemoPayments, paymentLimiter, async (req, res) => {
  try {
    const payment = await DemoPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (!canAccessPayment(payment, req.user)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
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
router.post('/refund/:id', protect, authorize('billing:write', 'billing:write:own'), blockProductionDemoPayments, paymentLimiter, idempotencyGuard({ prefix: 'demo-refund', failClosed: true }), async (req, res) => {
  try {
    // PAY-002: atomic status transition guarded on the expected prior state, so a
    // concurrent second refund cannot double-credit the wallet.
    const payment = await DemoPayment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: 'paid' },
      { $set: { status: 'refunded', refundedAt: new Date() } },
      { new: true }
    );
    if (payment) {
      if (payment.method === 'demo_wallet') {
        await User.updateOne(
          { _id: payment.userId },
          { $inc: { 'demoWallet.balance': payment.amount } }
        );
      }
      const user = await User.findById(payment.userId).select('demoWallet').lean();
      return res.json({ success: true, message: 'Demo payment refunded', payment, demoWalletBalance: walletBalanceOf(user) });
    }
    // Either it does not exist, is not the caller's, or was already refunded.
    const existing = await DemoPayment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Payment not found' });
    if (!canAccessPayment(existing, req.user)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    return res.json({ success: true, message: `Already ${existing.status}`, payment: existing });
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
