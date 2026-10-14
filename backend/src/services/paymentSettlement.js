import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import { gatewayFor } from '../lib/gateways.js';
import { mirrorPayment } from '../lib/pgDualWrite.js';
import logger from '../config/logger.js';
import { getISTDateString } from '../utils/dateUtils.js';

/**
 * PAY-B-07: Atomic Webhook Settlement Service
 *
 * Settle payments and their referenced service/order entities atomically
 * from verified webhook events.
 */
export async function settlePaymentFromWebhook({ provider, payload } = {}) {
  try {
    const gateway = gatewayFor(provider || 'razorpay');
    const normalized = gateway.normalizeEvent ? gateway.normalizeEvent(payload) : {
      event: payload?.event || '',
      gatewayOrderId: payload?.orderId || payload?.payload?.payment?.entity?.order_id || '',
      gatewayPaymentId: payload?.paymentId || payload?.payload?.payment?.entity?.id || '',
      amount: payload?.amount || (payload?.payload?.payment?.entity?.amount ? Number(payload.payload.payment.entity.amount) / 100 : 0),
    };

    const eventName = normalized.event || payload?.event || 'payment.captured';
    const gwOrderId = normalized.gatewayOrderId;
    const gwPaymentId = normalized.gatewayPaymentId;

    if (!gwOrderId && !gwPaymentId && !payload?.notes?.paymentId && !payload?.notes?.transactionId) {
      return {
        ok: false,
        status: 400,
        code: 'MISSING_PAYMENT_IDENTIFIER',
        message: 'Webhook payload does not contain a recognizable order_id, payment_id, or transaction notes',
      };
    }

    // Lookup payment by gatewayOrderId, gatewayPaymentId, notes.paymentId, or notes.transactionId
    let payment = null;
    if (gwOrderId) {
      payment = await Payment.findOne({ gatewayOrderId: gwOrderId });
    }
    if (!payment && gwPaymentId) {
      payment = await Payment.findOne({ gatewayPaymentId: gwPaymentId });
    }
    if (!payment && payload?.notes?.paymentId) {
      payment = await Payment.findById(payload.notes.paymentId).catch(() => null);
    }
    if (!payment && payload?.notes?.transactionId) {
      payment = await Payment.findOne({ transaction_id: payload.notes.transactionId });
    }

    if (!payment) {
      logger.warn(`Webhook settlement: No payment found for gatewayOrderId=${gwOrderId}, gatewayPaymentId=${gwPaymentId}`);
      return {
        ok: false,
        status: 404,
        code: 'PAYMENT_NOT_FOUND',
        message: 'No corresponding payment record found for this gateway event',
      };
    }

    // Idempotency: If payment is already completed with this gatewayPaymentId, return ok immediately
    if (payment.status === 'completed') {
      if (gwPaymentId && payment.gatewayPaymentId === gwPaymentId) {
        return {
          ok: true,
          settled: true,
          alreadySettled: true,
          paymentId: payment._id,
          transactionId: payment.transaction_id,
        };
      }
    }

    // Handle failure events
    if (eventName === 'payment.failed' || eventName === 'order.failed') {
      payment.status = 'failed';
      payment.attempts = payment.attempts || [];
      payment.attempts.push({
        at: new Date(),
        gateway: provider,
        event: eventName,
        payload,
      });
      await payment.save();
      return {
        ok: true,
        settled: false,
        status: 'failed',
        paymentId: payment._id,
      };
    }

    // Handle success events (payment.captured, order.paid, payment.authorized)
    if (
      eventName === 'payment.captured' ||
      eventName === 'order.paid' ||
      eventName === 'payment.authorized' ||
      eventName === 'payment.success'
    ) {
      payment.status = 'completed';
      if (gwPaymentId) payment.gatewayPaymentId = gwPaymentId;
      if (gwOrderId && !payment.gatewayOrderId) payment.gatewayOrderId = gwOrderId;
      payment.gateway = provider || payment.gateway || 'razorpay';
      payment.settledAt = new Date();

      // Extract payment method from payload if available
      const method = payload?.payload?.payment?.entity?.method || payload?.method;
      if (method && ['card', 'upi', 'netbanking', 'cash', 'wallet'].includes(method)) {
        payment.method = method;
      }

      payment.attempts = payment.attempts || [];
      payment.attempts.push({
        at: new Date(),
        gateway: provider,
        event: eventName,
        payload,
      });

      await payment.save();

      // Cascade status update to referenced entity
      if (payment.referenceId) {
        try {
          if (payment.serviceType === 'appointment' || !payment.serviceType) {
            await Appointment.findByIdAndUpdate(payment.referenceId, {
              paymentStatus: 'completed',
              status: 'confirmed',
            });
          } else if (payment.serviceType === 'test') {
            const { default: LabBooking } = await import('../models/LabBooking.js').catch(() => ({ default: null }));
            if (LabBooking) {
              await LabBooking.findByIdAndUpdate(payment.referenceId, {
                paymentStatus: 'completed',
                status: 'confirmed',
              });
            }
          } else if (payment.serviceType === 'medicine') {
            const { default: PharmacyOrder } = await import('../models/PharmacyOrder.js').catch(() => ({ default: null }));
            if (PharmacyOrder) {
              await PharmacyOrder.findByIdAndUpdate(payment.referenceId, {
                paymentStatus: 'completed',
                status: 'placed',
              });
            }
          }
        } catch (cascadeErr) {
          logger.error(`Webhook settlement cascade failed for ${payment.referenceId}: ${cascadeErr.message}`);
        }
      }

      // Dual write to postgres ledger if configured
      void mirrorPayment(payment);

      // Patient notification
      if (payment.patient_id) {
        try {
          await Notification.create({
            userId: payment.patient_id,
            title: 'Payment Received',
            message: `Your payment of INR ${payment.amount} was confirmed. Transaction ID: ${payment.transaction_id}`,
            type: 'payment',
            date: getISTDateString(),
          });
        } catch (notifErr) {
          logger.warn(`Payment confirmation notification failed: ${notifErr.message}`);
        }
      }

      return {
        ok: true,
        settled: true,
        paymentId: payment._id,
        transactionId: payment.transaction_id,
        status: 'completed',
      };
    }

    return {
      ok: true,
      settled: false,
      message: `Ignored unhandled event: ${eventName}`,
    };
  } catch (err) {
    logger.error(`Webhook settlement error: ${err.message}`, { stack: err.stack });
    return {
      ok: false,
      status: 500,
      code: 'SETTLEMENT_ERROR',
      message: err.message,
    };
  }
}
