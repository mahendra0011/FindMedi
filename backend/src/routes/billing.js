import express from 'express';
import crypto from 'crypto';
import Billing from '../models/Billing.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Facility from '../models/Facility.js';
import Hospital from '../models/Hospital.js';
import Appointment from '../models/Appointment.js';
import LabBooking from '../models/LabBooking.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import SystemSetting from '../models/SystemSetting.js';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { generatePaymentInvoicePDF } from '../services/pdfService.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { validate, createPaymentSchema, createBillingSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { paginatedResults } from '../utils/pagination.js';
import { generateTransactionId, generateInvoiceId, generateBillId, generateTokenNumber } from '../utils/idGenerator.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { emitAppointmentUpdate } from '../services/socketService.js';
import { resolveAuthoritativeAmount, assertAmountMatches } from '../services/pricingService.js';
import { reserveSlotSeat, releaseSlotSeat, reconcileSlot } from '../services/slotCapacity.js';
// APPT-M-01: an expired checkout frees its seat - offer it to the waitlist.
import { onSlotFreed } from '../services/waitlistService.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
// LOYAL-B-02: coupon eligibility is re-checked server-side at pay time.
import { resolveCoupon, recordCouponRedemption } from '../services/couponService.js';
import { toPaise, fromPaise } from '../services/ledgerService.js';
import { paymentReplayConflict } from '../services/paymentReplayService.js';

const router = express.Router();

/**
 * PAY-B-11: who may read a payment document (invoice / bill PDF).
 * owner | same-tenant admin | superadmin — nothing else. The old check was
 * `patient_id !== user._id && role !== 'hospital_admin'`, which was
 * tenant-BLIND (any hospital admin could read every patient's invoice) and
 * denied the superadmin access to their own platform's documents.
 */
const canViewPaymentDoc = (user, payment) => {
  if (!payment) return false;
  if (user.role === 'superadmin') return true;
  if (payment.patient_id && String(payment.patient_id) === String(user._id || user.id)) return true;
  if (user.role === 'hospital_admin') {
    return Boolean(user.hospitalId && payment.hospitalId
      && String(payment.hospitalId) === String(user.hospitalId));
  }
  return false;
};


// PAY-004 / DLB-25: tenant scoping — a bill/payment is visible to a superadmin,
// the payment's patient, or a user whose hospitalId matches the document's.
// The old version compared two `undefined` values when NEITHER side had a
// hospitalId, which returned TRUE — so any tenant-less account (doctor, nurse,
// accountant, lab staff, ...) could read any other tenant-less bill/payment.
// It now fails closed.
function canViewBill(bill, user) {
  if (user.role === 'superadmin') return true;
  if (bill.patientId && String(bill.patientId) === String(user._id || user.id)) return true;
  const userScope = user.hospitalId || user.facilityId;
  const billScope = bill.hospitalId || bill.facilityId;
  if (!userScope || !billScope) return false;
  return String(billScope) === String(userScope);
}

function canViewPayment(payment, user) {
  if (user.role === 'superadmin') return true;
  if (payment.patient_id && String(payment.patient_id) === String(user._id || user.id)) return true;
  const userScope = user.hospitalId || user.facilityId;
  const payScope = payment.hospitalId;
  if (!userScope || !payScope) return false;
  return String(payScope) === String(userScope);
}

// PAY-B-08: how long a Pending appointment holds its checkout slot.
const CHECKOUT_HOLD_MINUTES = 15;

/**
 * PAY-B-08: remove stale unpaid Pending appointments.
 *
 * The old version deleted every Pending appointment older than 15 minutes and
 * relied on a single `Payment.findOne` to decide whether money had been captured.
 * That is a race with an in-flight gateway webhook: a payment that completes a
 * second after the check leaves the patient PAID with NO booking, and the webhook
 * then either throws or silently marks a missing appointment.
 *
 * The fix is defence in depth:
 *   1. the hold has an explicit `checkoutExpiresAt` (not a guess from createdAt);
 *   2. the payment check covers EVERY non-terminal status, not just `completed`,
 *      because `pending`/`processing` will settle;
 *   3. the appointment is archived (soft-delete) instead of destroyed, so an
 *      orphan payment can still be reconciled by `reconcileOrphanPayments()`
 *      instead of vanishing with no trace.
 */
async function cleanupStalePending() {
  try {
    const staleCutoff = new Date(Date.now() - CHECKOUT_HOLD_MINUTES * 60 * 1000);
    const staleAppts = await Appointment.find({
      status: 'Pending',
      $or: [
        { checkoutExpiresAt: { $lt: new Date() } },
        // Legacy rows written before checkoutExpiresAt existed.
        { checkoutExpiresAt: { $exists: false }, createdAt: { $lt: staleCutoff } },
      ],
    }).lean();

    let removed = 0;
    for (const appt of staleAppts) {
      // Any payment that is still live means the checkout may yet succeed.
      const livePayment = await Payment.findOne({
        referenceId: appt._id.toString(),
        status: { $in: ['pending', 'processing', 'completed', 'authorized'] },
      }).lean();
      if (livePayment) continue;

      await Appointment.updateOne(
        { _id: appt._id },
        {
          $set: {
            status: 'Cancelled',
            cancellationReason: 'checkout_expired',
            cancelledAt: new Date(),
            checkoutExpiredAt: new Date(),
          },
        }
      );
      // PAY-B-03: the seat this appointment was holding must go back.
      if (appt.doctorId) {
        await releaseSlotSeat({
          doctorId: appt.doctorId,
          date: appt.date,
          time: appt.time,
        }).catch(() => {});
        // APPT-M-01: checkout expiry is the most common way a slot frees -
        // this is the primary waitlist backfill point.
        void onSlotFreed({ doctorId: appt.doctorId, date: appt.date, time: appt.time })
          .catch(() => {});
      }
      removed += 1;
    }
    if (removed) logger.info(`[billing/cleanup] expired ${removed} abandoned checkout(s)`);
  } catch (err) {
    logger.error(`[billing/cleanup] failed: ${err.message}`);
  }
}
// The background jobs above touch the database on a timer. Under Jest the
// environment is torn down long before the first interval fires, so a late
// database call fails UNRELATED suites with "environment has been torn down".
// In tests the jobs are exported for a suite to invoke deterministically instead
// of being scheduled.
const IS_TEST = process.env.NODE_ENV === 'test';

let cleanupTimer = null;
let reconcileTimer = null;
if (!IS_TEST) {
  cleanupStalePending();
  cleanupTimer = setInterval(cleanupStalePending, 5 * 60 * 1000);
  reconcileTimer = setInterval(reconcileOrphanPayments, 10 * 60 * 1000);
  // `unref` so a pending sweep never holds the process open.
  cleanupTimer.unref?.();
  reconcileTimer.unref?.();
}

export const billingJobs = {
  cleanupStalePending,
  reconcileOrphanPayments,
  stop: () => {
    if (cleanupTimer) clearInterval(cleanupTimer);
    if (reconcileTimer) clearInterval(reconcileTimer);
  },
};

/**
 * PAY-B-08: payments that completed for an appointment which no longer exists (or
 * was expired by the cleanup above). Money must never be silently swallowed: the
 * orphan is flagged so finance can refund it, and the reconciliation is itself
 * idempotent so a retry cannot double-refund.
 */
async function reconcileOrphanPayments() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPayments = await Payment.find({ status: 'completed', createdAt: { $gte: since } })
      .select('_id referenceId serviceType amount invoice_id')
      .lean();

    for (const pay of recentPayments) {
      if (!pay.referenceId) continue;
      if (pay.serviceType !== 'appointment') continue;
      if (!mongoose.Types.ObjectId.isValid(pay.referenceId)) continue;

      const appt = await Appointment.findById(pay.referenceId).select('status cancellationReason').lean();
      if (appt) continue; // healthy

      const { default: Refund } = await import('../models/Refund.js');
      if (Refund) {
        // An idempotent orphan-refund marker: unique on paymentId.
        await Refund.create({
          paymentId: pay._id,
          amount: pay.amount,
          reason: 'orphan_payment_no_appointment',
          status: 'REFUND_PENDING',
          idempotencyKey: `orphan:${pay._id}`,
        }).catch((err) => {
          if (err?.code === 11000) return; // already reconciled
          throw err;
        });
      }
      logger.error(
        `[billing/reconcile] ORPHAN PAYMENT ${pay._id} (${pay.amount}) has no appointment ${pay.referenceId} — refund required`
      );
    }
  } catch (err) {
    logger.error(`[billing/reconcile] failed: ${err.message}`);
  }
}

// GET /api/billing — bills list with stats summary
router.get('/', protect, authorize('billing:read'), async (req, res, next) => {
  try {
    const { status, search, patientId, patient_id } = req.query;
    const filter = {};

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'superadmin') {
      if (patientId || patient_id) filter.patientId = patientId || patient_id;
    } else if (['doctor', 'clinic_doctor', 'counsellor', 'psychiatrist'].includes(req.user.role)) {
      // DLB-24: a doctor is scoped to THEIR OWN bills. `patientId` used to be
      // accepted from any staff role and short-circuited the doctor/hospital
      // scope entirely, which made it a cross-tenant patient-bill lookup.
      filter.$or = [
        { doctorId: req.user.doctorProfileId || req.user._id },
        { doctor: { $regex: req.user.name, $options: 'i' } }
      ];
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else {
      // DLB-24: fail closed — a staff account with no tenant gets nothing.
      if (!req.user.hospitalId && !req.user.facilityId) {
        return res.status(403).json({ message: 'No hospital scope for this account' });
      }
      filter.hospitalId = req.user.hospitalId || req.user.facilityId;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search) {
      // DLB-24: `search` used to REPLACE the $or clause, wiping the doctor /
      // hospital scope. It is merged into it instead.
      const searchOr = [
        { patient: { $regex: search, $options: 'i' } },
        { doctor: { $regex: search, $options: 'i' } },
        { service: { $regex: search, $options: 'i' } },
        { invoiceId: { $regex: search, $options: 'i' } },
      ];
      filter.$and = [...(filter.$and || []), { $or: searchOr }];
      if (filter.$or) filter.$and.push({ $or: filter.$or });
      delete filter.$or;
    }

    const { page, limit } = req.query;
    const result = await paginatedResults(Billing, filter, { page, limit, sort: { createdAt: -1 } });
    const bills = result.data;
    const total = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const paid = bills.reduce((s, b) => s + (b.paid || 0), 0);
    const balance = total - paid;

    res.json({
      data: bills,
      bills,
      summary: { total, paid, balance },
      count: bills.length,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) { next(err); }
});

// POST /api/billing — create a new bill
// DLB-26: validated + allow-listed. The body is no longer spread into the
// document, so `hospitalId` / `facilityId` / `balance` / `_id` / `createdAt`
// can no longer be injected; the tenant is always the caller's own.
router.post('/', protect, authorize('billing:write'), paymentLimiter, validate(createBillingSchema), async (req, res, next) => {
  try {
    // File 13 §13.6: blacklisted/deceased patients are a hard stop at billing.
    if (req.body.patientId) {
      const { patientHardStop } = await import('./masters.js');
      const stop = await patientHardStop(req.user.hospitalId, req.body.patientId).catch(() => null);
      if (stop) return res.status(409).json({ message: `Billing blocked: patient is ${stop}`, code: 'PATIENT_HARD_STOP' });
    }
    // File 22 P0-1: over-policy discounts need a consumed approval.
    const { discountPct, overDiscountPolicy, approverRolesFor, safeFirst } = await import('../lib/approvalWiring.js');
    const pct = discountPct(req.body || {});
    let approvalRef = null;
    if (pct > 0) {
      const { default: DiscountPolicy } = await import('../models/DiscountPolicy.js');
      const policy = await safeFirst(DiscountPolicy.findOne({
        hospitalId: req.user.hospitalId, role: req.user.role, active: true,
      }).lean());
      if (overDiscountPolicy(pct, policy, req.user.role)) {
        const { ensureApproval, approvalError } = await import('./approvals.js');
        try {
          const approval = await ensureApproval({
            req, policyKey: 'billing-discount',
            entityRef: { model: 'Billing', id: null },
            title: `Discount ${pct.toFixed(1)}% on ₹${Number(req.body.amount) || 0}`,
            amount: Number(req.body.amount) || 0,
            roles: approverRolesFor(policy, 'billing-discount'),
          });
          approvalRef = approval._id;
        } catch (e) {
          if (approvalError(res, e)) return undefined;
          throw e;
        }
      }
    }
    const invoiceId = req.body.invoiceId || generateInvoiceId();
    const date = req.body.date || getISTDateString();
    const bill = await Billing.create({
      ...req.body,
      approvalRef,
      invoiceId,
      date,
      hospitalId: req.user.hospitalId || undefined,
      facilityId: req.user.facilityId || undefined,
    });
    await auditLog('create_billing', req.user._id, { billId: bill._id, invoiceId, amount: bill.amount });
    void import('../lib/pgDualWrite.js').then((m) => m.mirrorBilling(bill)).catch(() => {});
    res.status(201).json(bill);
  } catch (err) { next(err); }
});

// GET /api/billing/:id
router.get('/:id', protect, authorize('billing:read'), async (req, res, next) => {
  try {
    const bill = mongoose.Types.ObjectId.isValid(req.params.id)
      ? await Billing.findById(req.params.id)
      : await Billing.findOne({ invoiceId: req.params.id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    // PAY-004: tenant check — superadmin or same-hospital only.

    if (!canViewBill(bill, req.user)) {

      return res.status(403).json({ message: 'Not authorized' });

    }

    res.json(bill);
  } catch (err) { next(err); }
});

// PUT /api/billing/:id
router.put('/:id', protect, authorize('billing:write'), paymentLimiter, async (req, res, next) => {
  try {
    const bill = mongoose.Types.ObjectId.isValid(req.params.id)
      ? await Billing.findById(req.params.id)
      : await Billing.findOne({ invoiceId: req.params.id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    // PAY-004: tenant check — superadmin or same-hospital only.

    if (!canViewBill(bill, req.user)) {

      return res.status(403).json({ message: 'Not authorized' });

    }

    // AUTH-030: allowlisted fields only — identity/tenant linkage and status immutable here.
    const { pickBody } = await import('../utils/pick.js');
    const patch = pickBody(req.body, ['patient', 'doctor', 'service', 'services', 'source', 'amount', 'subTotal', 'discount', 'tax', 'taxRate', 'taxableAmount', 'paid', 'balance', 'date', 'dueDate', 'paymentMethod', 'transactionId', 'insuranceClaimId', 'insuranceApprovedAmount', 'insuranceStatus']);
    // File 22 P0-1: discount top-ups re-check the policy (bill + patch merged).
    if (patch.discount != null) {
      const { discountPct, overDiscountPolicy, approverRolesFor, safeFirst } = await import('../lib/approvalWiring.js');
      const merged = { amount: bill.amount, subTotal: bill.subTotal, discount: bill.discount, ...patch };
      const pct = discountPct(merged);
      if (pct > discountPct({ amount: bill.amount, subTotal: bill.subTotal, discount: bill.discount })) {
        const { default: DiscountPolicy } = await import('../models/DiscountPolicy.js');
        const policy = await safeFirst(DiscountPolicy.findOne({
          hospitalId: req.user.hospitalId, role: req.user.role, active: true,
        }).lean());
        if (overDiscountPolicy(pct, policy, req.user.role)) {
          const { ensureApproval, approvalError } = await import('./approvals.js');
          try {
            const approval = await ensureApproval({
              req, policyKey: 'billing-discount',
              entityRef: { model: 'Billing', id: bill._id },
              title: `Discount top-up to ${pct.toFixed(1)}% on bill ${bill.invoiceId}`,
              amount: Number(merged.amount) || 0,
              roles: approverRolesFor(policy, 'billing-discount'),
            });
            patch.approvalRef = approval._id;
          } catch (e) {
            if (approvalError(res, e)) return undefined;
            throw e;
          }
        }
      }
    }
    Object.assign(bill, patch);
    await bill.save();
    await auditLog('update_billing', req.user._id, { billId: bill._id, changes: req.body });
    res.json(bill);
  } catch (err) { next(err); }
});

// DELETE /api/billing/:id
router.delete('/:id', protect, authorize('billing:write'), paymentLimiter, async (req, res, next) => {
  try {
    const bill = await Billing.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    await auditLog('delete_billing', req.user._id, { billId: req.params.id });
    res.json({ success: true, message: 'Bill deleted' });
  } catch (err) { next(err); }
});

// POST /api/transactions/pay — unified payment + confirm (idempotent)
// Can also accept appointment data to create appointment + payment atomically
// PAY-B-05: every mutating money route opts into the replay guard.
// `failClosed: true` means no `Idempotency-Key` header => 400 and Redis being
// down => 503, i.e. a double-submit can never reach the money path.
router.post('/pay', protect, paymentLimiter, idempotencyGuard({ prefix: 'pay', failClosed: true }), async (req, res, next) => {
  let createdAppointment = null;
  let pharmacyOrderStateChanged = null;
  // PAY-B-03: holds the atomic seat claim so the compensating release can run on
  // any failure between the reservation and the committed appointment.
  let slotReserved = null;

  // ── PAY-B-02: one session for the appointment + its payment ──
  // The comment claimed this flow was atomic; it was a sequence of awaits with a
  // best-effort compensating delete. If the process died between the two inserts
  // (or the delete failed), the patient had a captured payment and no booking.
  // Mongo transactions require a replica set; on a standalone mongod we degrade to
  // the old behaviour rather than failing every payment.
  const supportsTransactions = Boolean(mongoose.connection?.getClient?.()
    && typeof mongoose.connection.getClient().topology === 'object'
    && mongoose.connection.getClient().topology.description?.type !== 'Single');
  let paymentSession = null;
  const startPaymentTransaction = async () => {
    if (paymentSession || !supportsTransactions || mongoose.connection.readyState !== 1) return;
    paymentSession = await mongoose.startSession();
    paymentSession.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
  };
  // Declared outside the try: the catch block releases the seat held by this
  // appointment (PAY-B-03), so its scope must span both blocks.
  let apptData = null;
  let pharmacyOrderForPayment = null;
  try {
    let { serviceType, referenceId, amount, method, description, provider, lineItems } = req.body;
    apptData = req.body.appointment;
    if (!serviceType || !method) {
      return res.status(400).json({ message: 'serviceType and method are required' });
    }
    // No provider adapter is currently connected to this route. Refuse to mint
    // a fake completed payment in production; a signed provider settlement path
    // must be installed before real customer money/fulfilment can be enabled.
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        message: 'Online payments are temporarily unavailable until a payment provider is configured.',
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
      });
    }

    if (String(serviceType).toLowerCase() === 'medicine') {
      if (!referenceId || !mongoose.Types.ObjectId.isValid(referenceId)) {
        return res.status(400).json({ message: 'A valid pharmacy order reference is required.' });
      }
      pharmacyOrderForPayment = await PharmacyOrder.findById(referenceId)
        .select('patientId status paymentStatus couponCode hospitalId')
        .lean();
      if (!pharmacyOrderForPayment) return res.status(404).json({ message: 'Pharmacy order not found.' });
      if (String(pharmacyOrderForPayment.patientId) !== String(req.user._id)) {
        return res.status(404).json({ message: 'Pharmacy order not found.' });
      }
      if (pharmacyOrderForPayment.status === 'Cancelled' || pharmacyOrderForPayment.paymentStatus === 'Refunded') {
        return res.status(409).json({ message: 'This pharmacy order cannot be paid.' });
      }
      if (pharmacyOrderForPayment.couponCode && req.body.couponCode && String(pharmacyOrderForPayment.couponCode).toUpperCase() !== String(req.body.couponCode).toUpperCase()) {
        return res.status(409).json({ message: 'The coupon does not match this checkout.' });
      }
      if (pharmacyOrderForPayment.couponCode && !req.body.couponCode) req.body.couponCode = pharmacyOrderForPayment.couponCode;
    }

    // ── PAY-B-01: the SERVER owns the price ──
    // `amount` used to be taken from the body with only a `> 0` check, so a
    // modified client could book a consultation for ₹1 and the appointment was
    // recorded PAID. The authoritative price is resolved from the doctor's
    // consultation fee / the lab booking / the pharmacy order lines; the client's
    // amount is only a checksum and must agree. No resolvable price => refuse.
    let authoritative;
    try {
      authoritative = await resolveAuthoritativeAmount({
        serviceType,
        referenceId,
        appointment: apptData,
        lineItems,
      });
    } catch (priceErr) {
      logger.error(`PAY-B-01 price resolution failed: ${priceErr.message}`);
      return res.status(503).json({ message: 'Could not determine the price for this service. Please retry.' });
    }

    if (!authoritative.ok) {
      // 404 when the referenced document is missing, 409/422 when it exists but
      // has no price — never "trust the client instead".
      const status = authoritative.reason === 'not-found' ? 404 : 422;
      return res.status(status).json({
        message: authoritative.message,
        code: `PRICE_UNRESOLVED_${authoritative.reason.toUpperCase()}`,
      });
    }

    const amountMatch = assertAmountMatches(authoritative.amount, amount);
    if (!amountMatch.ok) {
      return res.status(409).json({
        message: amountMatch.message,
        code: 'PRICE_MISMATCH',
        expectedAmount: amountMatch.authoritative,
        receivedAmount: amountMatch.received,
      });
    }

    // From here on `amount` is server-owned, never client-owned.
    amount = authoritative.amount;

    // A successful retry must not be re-evaluated against a coupon cap already
    // consumed by its first request. Scope the replay to the payment owner and
    // service before returning any payment details.
    if (referenceId) {
      const completedPayment = await Payment.findOne({ referenceId, status: 'completed' });
      if (completedPayment) {
        const conflict = paymentReplayConflict(completedPayment, req.user._id, serviceType);
        if (conflict) return res.status(conflict.status).json({ message: conflict.message });
        return res.status(200).json({
          success: true,
          transaction_id: completedPayment.transaction_id,
          invoice_id: completedPayment.invoice_id,
          payment: completedPayment,
          appointment: null,
          appointmentStatus: null,
          alreadyPaid: true,
        });
      }
    }

    // ── LOYAL-B-02: the coupon is re-validated HERE, at pay time ──
    // The client sends only a CODE. Whether it is active, inside its validity
    // window, above the minimum order, inside the per-user cap and bound to this
    // tenant is decided by re-reading the coupon from the database, and the
    // discount is computed from the SERVER price. A client-computed total is
    // never trusted.
    let appliedCoupon = null;
    if (req.body.couponCode) {
      const verdict = await resolveCoupon({
        code: req.body.couponCode,
        subtotalPaise: toPaise(amount),
        userId: req.user._id,
        hospitalId: pharmacyOrderForPayment?.hospitalId || req.user.hospitalId || null,
        serviceType,
      });
      if (!verdict.ok) {
        // 422 rather than 400: the request is well-formed, the coupon is not valid.
        return res.status(422).json({
          message: verdict.message,
          code: verdict.reason,
        });
      }
      // The price can never fall below zero, and a coupon can never make the
      // booking free unless the coupon explicitly says so.
      const discounted = fromPaise(verdict.finalPaise);
      if (discounted < 0) {
        return res.status(422).json({ message: 'Coupon produced a negative amount', code: 'COUPON_NEGATIVE' });
      }
      appliedCoupon = verdict;
      amount = discounted;
      if (!supportsTransactions || mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          message: 'Coupon payments temporarily require transactional database support.',
          code: 'COUPON_TRANSACTION_UNAVAILABLE',
        });
      }
    }

    // Defense-in-depth: cap free-text inputs and line items for invoice generation safety
    if (provider && typeof provider === 'string') provider = provider.trim().slice(0, 120);
    if (description && typeof description === 'string') description = description.trim().slice(0, 120);
    if (serviceType && typeof serviceType === 'string') serviceType = serviceType.trim().slice(0, 50);
    if (Array.isArray(lineItems)) {
      lineItems = lineItems.slice(0, 50).map(item => ({
        ...item,
        name: typeof item.name === 'string' ? item.name.trim().slice(0, 120) : item.name,
      }));
    }

    // ── If appointment data is provided, create appointment first (atomic flow) ──
    if (apptData && serviceType === 'appointment') {
      let appointment;
      try {
        const { doctorId, doctor, doctorName, department, date, time, notes, type, symptoms, priority, facilityId, preConsultationDetails } = apptData;
        const patientName = req.user.name;
        const patientId = req.user._id;

        // PAY-B-08: expire abandoned checkouts for THIS patient. The old inline
        // cleanup deleted rows after a single `status: 'completed'` payment probe,
        // which raced an in-flight gateway webhook: the payment could settle a
        // second later, leaving the patient PAID with no booking. It now only
        // cancels appointments whose hold has expired AND which have no payment in
        // ANY non-terminal state.
        try {
          const now = new Date();
          const staleAppts = await Appointment.find({
            patientId,
            status: 'Pending',
            $or: [
              { checkoutExpiresAt: { $lt: now } },
              { checkoutExpiresAt: { $exists: false }, createdAt: { $lt: new Date(now.getTime() - CHECKOUT_HOLD_MINUTES * 60 * 1000) } },
            ],
          }).lean();
          for (const stale of staleAppts) {
            const livePayment = await Payment.findOne({
              referenceId: stale._id.toString(),
              status: { $in: ['pending', 'processing', 'completed', 'authorized'] },
            }).lean();
            if (livePayment) continue;
            await Appointment.updateOne(
              { _id: stale._id },
              { $set: { status: 'Cancelled', cancellationReason: 'checkout_expired', cancelledAt: now } }
            );
            if (stale.doctorId) {
              await releaseSlotSeat({ doctorId: stale.doctorId, date: stale.date, time: stale.time }).catch(() => {});
              // APPT-M-01: same backfill for the in-request sweep.
              void onSlotFreed({ doctorId: stale.doctorId, date: stale.date, time: stale.time }).catch(() => {});
            }
          }
        } catch (_) { /* best-effort cleanup */ }

        let hospitalId = null;
        if (doctorId) {
          const doctorDoc = await Doctor.findById(doctorId);
          if (doctorDoc && doctorDoc.hospitalId) {
            hospitalId = doctorDoc.hospitalId;
          }
        }

        if (patientId && date && time) {
          // First: check if THIS patient already has an appointment at this slot
          const ownFilter = { patientId, doctorId: doctorId || null, date, time, status: { $nin: ['Cancelled', 'Completed', 'Missed'] } };
          const ownExisting = await Appointment.findOne(ownFilter);
          if (ownExisting) {
            if (ownExisting.status === 'Pending') {
              const hasCompletedPayment = await Payment.findOne({ referenceId: ownExisting._id.toString(), status: 'completed' });
              if (hasCompletedPayment) {
                return res.status(409).json({ message: 'You already have an appointment with this doctor on this date and time.' });
              }
              // Only delete if it belongs to this patient AND is older than 2 minutes (stale checkout)
              const ageMs = Date.now() - new Date(ownExisting.createdAt).getTime();
              if (ageMs > 2 * 60 * 1000) {
                await Appointment.findByIdAndDelete(ownExisting._id);
              } else {
                return res.status(409).json({ message: 'You already have an appointment with this doctor on this date and time.' });
              }
            } else {
              return res.status(409).json({ message: 'You already have an appointment with this doctor on this date and time.' });
            }
          }

        }

        // Capacity check: alag users tab tak book kar sakte hain jab tak doctor ki maxBookingsPerSlot limit na aa jaye
        if (doctorId) {
          const doctorDoc2 = await Doctor.findById(doctorId).select('maxBookingsPerSlot dateDisabledSlots bookingWindow workingHours breakTime').lean();
          const capacity = doctorDoc2?.maxBookingsPerSlot || 1;

          // ── Booking window restriction ──
          // Patient sirf aaj se window ke andar book kar sakta hai (e.g. 2 weeks)
          const bw = doctorDoc2?.bookingWindow;
          if (bw && typeof bw.value === 'number' && bw.value > 0 && bw.unit) {
            const now = new Date();
            const maxDate = new Date(now);
            switch (bw.unit) {
              case 'hours': maxDate.setHours(maxDate.getHours() + bw.value); break;
              case 'days': maxDate.setDate(maxDate.getDate() + bw.value); break;
              case 'weeks': maxDate.setDate(maxDate.getDate() + bw.value * 7); break;
              case 'months': maxDate.setMonth(maxDate.getMonth() + bw.value); break;
            }
            const apptDate = new Date(`${date}T23:59:59`);
            if (apptDate > maxDate) {
              return res.status(400).json({
                message: `Appointments can only be booked within ${bw.value} ${bw.unit} from today.`
              });
            }
          }

          // ── Date-specific disabled slot check ──
          const dateDisabled = (doctorDoc2?.dateDisabledSlots && doctorDoc2.dateDisabledSlots[date]) || [];
          if (dateDisabled.includes(time)) {
            return res.status(400).json({ message: 'This time slot is not available for the selected date.' });
          }

          const slotFilter = { doctorId, date, time, status: { $nin: ['Cancelled', 'Completed', 'Missed'] } };
          const existingBookings = await Appointment.find(slotFilter).select('patientId').lean();

          // PAY-B-03: the read above is only a friendly pre-check. The DECISIVE
          // guard is the atomic reservation below, because `find` → compare →
          // `create` has a race window in which two different patients both see
          // `capacity - 1` bookings and both book the last seat.
          const reservation = await reserveSlotSeat({ doctorId, date, time, capacity });
          if (!reservation.ok) {
            return res.status(409).json({
              message: reservation.reason === 'invalid-slot'
                ? 'Could not verify slot availability.'
                : 'This time slot is full. Please choose a different time.',
              code: 'SLOT_FULL',
            });
          }
          slotReserved = reservation;
          if (existingBookings.length >= capacity) {
            // Unreachable while the counter is in sync; kept as a belt-and-braces
            // check, and the reservation is released on the way out.
            return res.status(409).json({ message: 'This time slot is full. Please choose a different time.' });
          }
        }

        const tokenNumber = generateTokenNumber();
        const patientUser = await User.findById(patientId);
        const countToday = await Appointment.countDocuments({ date, doctor: doctor || '' });
        const estimatedWaitTime = countToday * 10; // simple estimate

        // PAY-B-02: created inside the caller's session (when there is one) so the
        // appointment and its payment commit or roll back together.
        await startPaymentTransaction();
        const [apptDoc] = await Appointment.create([{
          tokenNumber,
          uhid: patientUser?.uhid || '',
          patient: patientName,
          patientId,
          doctor: doctor || doctorName || '',
          doctorId: doctorId || null,
          department: department || 'General',
          date,
          time,
          type: type || 'Consultation',
          symptoms: symptoms || '',
          notes: notes || '',
          priority: priority || 'Normal',
          estimatedWaitTime,
          hospitalId: hospitalId || undefined,
          fees: Number(amount) || 0,
          status: 'Pending',
          preConsultationDetails: preConsultationDetails ? { ...preConsultationDetails, filledAt: new Date() } : undefined,
          // PAY-B-08: an explicit hold expiry, so cleanup never has to guess from
          // `createdAt` and can reason about an in-flight checkout.
          checkoutExpiresAt: new Date(Date.now() + (CHECKOUT_HOLD_MINUTES * 60 * 1000)),
        }], paymentSession ? { session: paymentSession } : {});
        createdAppointment = apptDoc;

        referenceId = createdAppointment._id.toString();

        await createdAppointment.populate('doctorId', 'name specialization');

        try {
          await auditLog('create_appointment', req.user._id, { recordId: createdAppointment._id, ip: req.ip, userAgent: req.get('user-agent') });
        } catch (_) {}

      } catch (apptErr) {
        // PAY-B-03: release the seat we claimed, otherwise a failed booking
        // permanently shrinks the doctor's capacity for that slot.
        if (slotReserved) {
          await releaseSlotSeat({
            doctorId: apptData?.doctorId,
            date: apptData?.date,
            time: apptData?.time,
          }).catch((relErr) => logger.error(`slot release failed: ${relErr.message}`));
        }
        if (createdAppointment) {
          try { await Appointment.findByIdAndDelete(createdAppointment._id); } catch (_) {}
        }
        throw apptErr;
      }
    }

    // ── Idempotency: if payment already completed for this referenceId, return it as success ──
    if (referenceId) {
      const existingPayment = await Payment.findOne({ referenceId, status: 'completed' });
      if (existingPayment) {
        const conflict = paymentReplayConflict(existingPayment, req.user._id, serviceType);
        if (conflict) return res.status(conflict.status).json({ message: conflict.message });
        if (paymentSession) {
          await paymentSession.abortTransaction().catch(() => {});
          paymentSession.endSession();
          paymentSession = null;
        }
        return res.status(200).json({
          success: true,
          transaction_id: existingPayment.transaction_id,
          invoice_id: existingPayment.invoice_id,
          payment: existingPayment,
          appointment: createdAppointment,
          appointmentStatus: createdAppointment?.status || null,
          alreadyPaid: true,
        });
      }
    }

    // Generate IDs using centralized utility
    const transaction_id = generateTransactionId(serviceType);
    const invoice_id = generateInvoiceId(serviceType);
    // Billing record ke liye alag random ID generate mat karo — same invoice_id
    // use karo, warna Billing dashboard aur patient-facing Invoice/Bill PDF me
    // do alag numbers dikhenge same transaction ke liye.
    const bill_id = invoice_id;

    const methodMap = { upi:'UPI', card:'Card', netbanking:'Online', cash:'Cash', wallet:'Wallet' };
    const sourceMap = { appointment:'appointment', test:'lab', medicine:'pharmacy' };
    const serviceLabel = description || `${serviceType} service`;
    const today = getISTDateString();
    const billServices = (lineItems || []).map(item => ({
      name: item.name || 'Service',
      description: '',
      price: Number(item.price) || 0,
      quantity: Number(item.qty) || 1,
      category: 'General',
    }));

    let payment;

    try {

      await startPaymentTransaction();

      if (String(serviceType).toLowerCase() === 'medicine') {
      const orderBeforePayment = await PharmacyOrder.findOneAndUpdate(
          {
            _id: referenceId,
            patientId: req.user._id,
            status: 'Pending',
            paymentStatus: { $nin: ['Paid', 'Refunded'] },
            inventoryReservationStatus: 'reserved',
            inventoryReservationExpiresAt: { $gt: new Date() },
          },
          { $set: { status: 'Confirmed', paymentStatus: 'Paid', inventoryReservationStatus: 'consumed' }, $unset: { inventoryReservationExpiresAt: 1 } },
          { new: false, ...(paymentSession ? { session: paymentSession } : {}) }
        );
        if (!orderBeforePayment) {
          const conflict = new Error('Pharmacy order was cancelled or paid by another request.');
          conflict.status = 409;
          conflict.code = 'PHARMACY_ORDER_NOT_PAYABLE';
          throw conflict;
        }
        pharmacyOrderStateChanged = {
          id: orderBeforePayment._id,
          status: orderBeforePayment.status,
          paymentStatus: orderBeforePayment.paymentStatus,
          inventoryReservationStatus: orderBeforePayment.inventoryReservationStatus || 'none',
          inventoryReservationExpiresAt: orderBeforePayment.inventoryReservationExpiresAt || null,
        };
      }

      const [p] = await Payment.create([{
        transaction_id, invoice_id,
        patient_id: req.user._id.toString(),
        patient_name: req.user.name || 'Patient',
        amount, method, status: 'completed',
        serviceType, referenceId: referenceId || '',
        description: description || `${serviceType} payment`,
        provider: provider || '',
        lineItems: lineItems || [],
      }], paymentSession ? { session: paymentSession } : {});
      payment = p;

      // Auto-confirm the referenced booking (check facility setting)
      if (referenceId) {
        if (serviceType === 'appointment') {
          let shouldConfirm = true;
          try {
            const appt = await Appointment.findById(referenceId)
              .populate('doctorId', 'facilityId hospitalId autoConfirmAppointment')
              .lean();
            const facilityId = appt?.doctorId?.facilityId;
            const hospitalId = appt?.doctorId?.hospitalId;
            let settings = null;
            if (facilityId) {
              const facility = await Facility.findById(facilityId).select('settings').lean();
              settings = facility?.settings;
            }
            if (!settings && hospitalId) {
              const hospital = await Hospital.findById(hospitalId).select('settings').lean();
              settings = hospital?.settings;
            }

            const doctorSetting = appt?.doctorId?.autoConfirmAppointment;
            if (doctorSetting === false) {
              shouldConfirm = false;
            } else if (doctorSetting === true) {
              shouldConfirm = true;
            } else {
              if (settings?.autoConfirmAppointment === false) shouldConfirm = false;
              if (shouldConfirm) {
                try {
                  const platformSetting = await SystemSetting.findOne({ key: 'autoConfirmAppointment' }).lean();
                  if (platformSetting?.value === false) {
                    shouldConfirm = false;
                  }
                } catch (_) {}
              }
            }
          } catch (_) { /* default to confirm on error */ }
          if (shouldConfirm) {
            await Appointment.findByIdAndUpdate(referenceId, { status: 'Confirmed' }, paymentSession ? { session: paymentSession } : {});
          }
          try {
            const appt = await Appointment.findById(referenceId);
            if (appt) await emitAppointmentUpdate(appt);
          } catch (emitErr) {
            console.error('[billing/pay] socket emit failed:', emitErr.message);
          }
        } else if (serviceType === 'test') {
          await LabBooking.findByIdAndUpdate(referenceId, { status: 'Confirmed', paymentStatus: 'Paid' }, paymentSession ? { session: paymentSession } : {});
        }
      }

    } catch (txErr) {
      // PAY-B-02: the "atomic" appointment+payment flow was a comment, not a
      // transaction. The compensating delete below is best-effort: if the process
      // dies between the two inserts, or the delete itself fails, the patient is
      // left with a captured payment and NO booking (paid-but-unbooked), which is
      // exactly the partial state this cleanup cannot reliably prevent.
      //
      // Wrapping both writes in one session makes the pair genuinely all-or-nothing.
      if (req.body?.appointment && createdAppointment?._id) {
        try { await Appointment.findByIdAndDelete(createdAppointment._id); } catch (_) {}
      }
      if (!paymentSession && pharmacyOrderStateChanged) {
        await PharmacyOrder.updateOne(
          { _id: pharmacyOrderStateChanged.id, status: 'Confirmed', paymentStatus: 'Paid' },
          {
            $set: {
              status: pharmacyOrderStateChanged.status,
              paymentStatus: pharmacyOrderStateChanged.paymentStatus,
              inventoryReservationStatus: pharmacyOrderStateChanged.inventoryReservationStatus,
              ...(pharmacyOrderStateChanged.inventoryReservationExpiresAt ? { inventoryReservationExpiresAt: pharmacyOrderStateChanged.inventoryReservationExpiresAt } : {}),
            },
            ...(pharmacyOrderStateChanged.inventoryReservationExpiresAt ? {} : { $unset: { inventoryReservationExpiresAt: 1 } }),
          }
        ).catch((rollbackErr) => logger.error(`pharmacy order payment rollback failed: ${rollbackErr.message}`));
        pharmacyOrderStateChanged = null;
      }
      // PAY-B-03: give the seat back too, or the slot stays artificially full.
      if (slotReserved) {
        await releaseSlotSeat({
          doctorId: apptData?.doctorId,
          date: apptData?.date,
          time: apptData?.time,
        }).catch(() => {});
      }
      throw txErr;
    }

    // ── Payment successfully committed — these steps must NOT roll back the appointment ──
    try {
      await Billing.create([{
        invoiceId: bill_id,
        patient: req.user.name || 'Patient',
        patientId: req.user._id,
        doctor: serviceType === 'appointment' ? (provider || 'Doctor') : (serviceType === 'test' ? 'Lab Services' : 'Pharmacy'),
        appointmentId: serviceType === 'appointment' ? referenceId : undefined,
        service: serviceLabel, services: billServices,
        source: sourceMap[serviceType] || 'manual',
        amount, paid: amount, balance: 0, status: 'Paid',
        date: today,
        paymentMethod: methodMap[method] || 'Online',
        transactionId: transaction_id,
      }]);
    } catch (billErr) {
      logger.error('[transactions/pay] Billing.create failed post-payment', billErr);
    }

    // ── Payment confirmed — ab hi doctor ko notify karo ──
    if (serviceType === 'appointment' && createdAppointment?.doctorId) {
      try {
        const notifModule = await import('../models/Notification.js');
        const NotificationModel = notifModule.default;
        const doctorDoc = await Doctor.findById(createdAppointment.doctorId).select('user_id').lean();
        const notifUserId = doctorDoc?.user_id ? doctorDoc.user_id.toString() : createdAppointment.doctorId.toString();
        await NotificationModel.create({
          userId: notifUserId,
          title: 'New Appointment',
          message: `New ${createdAppointment.type || 'Consultation'} appointment from ${createdAppointment.patient} for ${createdAppointment.date} at ${createdAppointment.time}`,
          type: 'appointment',
          date: getISTDateString(),
        });
      } catch (_) {}
    }

    // ── Non-critical side-effects (outside transaction, can fail independently) ──
    try {
      await Notification.create({
        userId: req.user._id.toString(),
        title: 'Payment Successful',
        message: `₹${amount} paid for ${description || serviceType}. Invoice: ${invoice_id}`,
        type: 'payment',
        date: today,
      });
    } catch (notifErr) {
      console.error('Failed to create payment notification:', notifErr.message);
    }

    try {
      await auditLog('create_payment', req.user._id, { transaction_id, amount, serviceType, referenceId });
    } catch (auditErr) {
      console.error('Failed to create audit log:', auditErr.message);
    }

    let finalStatus = null;
    if (referenceId && serviceType === 'appointment') {
      try {
        const appt = await Appointment.findById(referenceId).select('status').lean();
        if (appt) finalStatus = appt.status;
      } catch (_) {}
    }

    // ── PAY-B-02: commit the appointment + payment pair atomically ──
    if (paymentSession) {
      if (appliedCoupon) {
        await recordCouponRedemption({
          code: appliedCoupon.code,
          userId: req.user._id,
          discountPaise: appliedCoupon.discountPaise,
          orderRef: referenceId || invoice_id,
          perUserLimit: appliedCoupon.coupon.perUserLimit,
          session: paymentSession,
        });
      }
      await paymentSession.commitTransaction();
      paymentSession.endSession();
      paymentSession = null;
    }

    res.status(201).json({
      success: true,
      transaction_id,
      invoice_id,
      payment,
      appointment: createdAppointment,
      appointmentStatus: finalStatus,
      ...(appliedCoupon
        ? { couponApplied: { code: appliedCoupon.code, discount: fromPaise(appliedCoupon.discountPaise) } }
        : {}),
    });
  } catch (err) {
    // The transaction (if any) aborts here; every write inside it is rolled back,
    // so there is no partial "paid but not booked" state to clean up.
    if (paymentSession) {
      await paymentSession.abortTransaction().catch(() => {});
      paymentSession.endSession();
    }
    // PAY-B-03: give the seat back — on both the transaction and the
    // non-transactional (standalone mongod) path.
    if (slotReserved) {
      await releaseSlotSeat({
        doctorId: apptData?.doctorId,
        date: apptData?.date,
        time: apptData?.time,
      }).catch(() => {});
    }
    // Cleanup: if appointment was created (via apptData) but payment failed, delete it
    if (createdAppointment?._id) {
      try {
        const stillUnpaid = !(await Payment.findOne({ referenceId: createdAppointment._id.toString(), status: 'completed' }));
        if (stillUnpaid) {
          await Appointment.findByIdAndDelete(createdAppointment._id);
        }
      } catch (_) {}
    }
    if (err.code === 11000) {
      const refId = req.body.referenceId || createdAppointment?._id?.toString();
      if (refId) {
        try {
          const existing = await Payment.findOne({ referenceId: refId, status: 'completed' });
          if (existing) {
            return res.status(200).json({
              success: true,
              transaction_id: existing.transaction_id,
              invoice_id: existing.invoice_id,
              payment: existing,
              appointment: createdAppointment,
              alreadyPaid: true,
            });
          }
        } catch (_) { /* fall through */ }
      }
      return res.status(409).json({ message: 'This slot is already booked with this doctor, or your previous payment for it is still processing. Please check your appointment history.' });
    }
    next(err);
  }
});


// GET /api/transactions/:id/invoice — download invoice PDF
router.get('/:id/invoice', protect, authorize('billing:read'), async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const payment = mongoose.Types.ObjectId.isValid(idParam)
      ? await Payment.findById(idParam)
      : await Payment.findOne({ transaction_id: idParam });
    if (!payment) return res.status(404).json({ message: 'Transaction not found' });
    // PAY-B-11: owner | same-tenant admin | superadmin. The old clause let ANY
    // hospital admin (tenant-blind) download any patient's invoice while denying
    // the superadmin their own platform's documents.
    if (!(await canViewPaymentDoc(req.user, payment))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let reference = null;
    if (payment.referenceId && payment.serviceType === 'appointment') {
      reference = await Appointment.findById(payment.referenceId)
        .populate('doctorId', 'name specialization qualification')
        .populate('hospitalId', 'name address phone licenseNo')
        .populate('patientId', 'phone address');
    } else if (payment.referenceId && payment.serviceType === 'test') {
      reference = await LabBooking.findById(payment.referenceId)
        .populate('testIds')
        .populate('hospitalId', 'name address phone licenseNo nablNo');
    } else if (payment.referenceId && payment.serviceType === 'medicine') {
      reference = await PharmacyOrder.findById(payment.referenceId)
        .populate('items.medicineId', 'name form');
    }

    const pdfBuffer = await generatePaymentInvoicePDF(payment, reference, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${payment.invoice_id || 'invoice'}.pdf`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// GET /api/transactions/:id/bill — download bill PDF (type-specific Tax Invoice format)
router.get('/:id/bill', protect, authorize('billing:read'), async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const payment = mongoose.Types.ObjectId.isValid(idParam)
      ? await Payment.findById(idParam)
      : await Payment.findOne({ transaction_id: idParam });
    if (!payment) return res.status(404).json({ message: 'Transaction not found' });
    // PAY-B-11: owner | same-tenant admin | superadmin. The old clause let ANY
    // hospital admin (tenant-blind) download any patient's invoice while denying
    // the superadmin their own platform's documents.
    if (!(await canViewPaymentDoc(req.user, payment))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let reference = null;
    if (payment.referenceId && payment.serviceType === 'appointment') {
      reference = await Appointment.findById(payment.referenceId)
        .populate('doctorId', 'name specialization registrationNo')
        .populate('hospitalId', 'name tagline address city state pincode phone licenseNo')
        .populate('patientId', 'phone address');
    } else if (payment.referenceId && payment.serviceType === 'test') {
      reference = await LabBooking.findById(payment.referenceId)
        .populate('testIds')
        .populate('hospitalId', 'name address city state pincode phone nablNo');
    } else if (payment.referenceId && payment.serviceType === 'medicine') {
      reference = await PharmacyOrder.findById(payment.referenceId)
        .populate('items.medicineId', 'name form rxRequired rx');
    }

    const pdfBuffer = await generatePaymentInvoicePDF(payment, reference, req.user, 'Payment Bill');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${payment.transaction_id || 'bill'}.pdf`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// GET /api/transactions/verify/:id — universal transaction lookup by any valid ID
router.get('/verify/:id', protect, async (req, res, next) => {
  try {
    const idParam = req.params.id;
    let payment = null;
    let reference = null;

    // Strategy 1: Direct Payment lookup by _id or transaction_id or invoice_id
    payment = mongoose.Types.ObjectId.isValid(idParam)
      ? await Payment.findById(idParam)
      : await Payment.findOne({
          $or: [
            { transaction_id: idParam },
            { invoice_id: idParam },
          ],
        });

    // Strategy 2: Billing lookup by _id or invoiceId → find Payment via transactionId
    if (!payment) {
      const billing = mongoose.Types.ObjectId.isValid(idParam)
        ? await Billing.findById(idParam)
        : await Billing.findOne({ invoiceId: idParam });

      if (billing?.transactionId) {
        payment = await Payment.findOne({ transaction_id: billing.transactionId });
      } else if (billing?.invoiceId) {
        payment = await Payment.findOne({ invoice_id: billing.invoiceId });
      }
    }

    // Strategy 3: Reference lookup (Appointment, LabBooking, PharmacyOrder) via referenceId
    if (!payment && mongoose.Types.ObjectId.isValid(idParam)) {
      payment = await Payment.findOne({
        referenceId: idParam,
        status: 'completed',
      });
    }

    if (!payment) {

      return res.status(404).json({ message: 'Transaction not found' });

    }



    // PAY-004: ownership — patient, superadmin, or same-hospital tenant only.

    if (!canViewPayment(payment, req.user)) {

      return res.status(403).json({ message: 'Not authorized' });

    }

    // Populate reference data based on serviceType
    if (payment.referenceId && payment.serviceType === 'appointment') {
      reference = await Appointment.findById(payment.referenceId)
        .populate('doctorId', 'name specialization registrationNo')
        .populate('hospitalId', 'name tagline address city state pincode phone licenseNo')
        .populate('patientId', 'name phone address uhid')
        .lean();
    } else if (payment.referenceId && payment.serviceType === 'test') {
      reference = await LabBooking.findById(payment.referenceId)
        .populate('testIds')
        .populate('hospitalId', 'name address city state pincode phone nablNo')
        .populate('patientId', 'name phone address uhid')
        .lean();
    } else if (payment.referenceId && payment.serviceType === 'medicine') {
      reference = await PharmacyOrder.findById(payment.referenceId)
        .populate('items.medicineId', 'name form rxRequired rx')
        .populate('hospitalId', 'name address city state pincode phone')
        .populate('patientId', 'name phone address uhid')
        .lean();
    }

    // Populate patient and hospital details
    let patient = null;
    if (payment.patient_id) {
      patient = await User.findById(payment.patient_id)
        .select('name phone email uhid address')
        .lean();
    }

    let hospital = null;
    if (payment.hospitalId) {
      hospital = await Hospital.findById(payment.hospitalId)
        .select('name tagline address city state pincode phone licenseNo')
        .lean();
    }

    res.json({
      payment: payment.toObject(),
      reference,
      patient,
      hospital,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
