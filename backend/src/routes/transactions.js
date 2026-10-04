import express from 'express';
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
import { paymentLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { paginatedResults } from '../utils/pagination.js';
import { checkWithdrawal, claimBudget, releaseBudget } from '../services/walletGuard.js';
// APPT-M-01: a swept-away Pending appointment frees its seat - offer it onward.
import { onSlotFreed } from '../services/waitlistService.js';
import { paymentReplayConflict } from '../services/paymentReplayService.js';

const router = express.Router();

// PAY-M-02: withdrawal guard reasons -> user-facing messages. Kept next to the
// one route that can surface them so a new guard reason cannot ship without a
// message a patient/provider can understand.
const WITHDRAWAL_GUARD_MESSAGES = {
  'wallet-frozen': 'This wallet is frozen for review. Contact support to release it.',
  'kyc-required': 'KYC verification is required before withdrawals.',
  'per-txn-limit': 'Amount exceeds the per-transaction withdrawal limit.',
  'daily-cap': 'Daily withdrawal limit reached. Try again tomorrow.',
  'velocity-freeze': 'Too many withdrawals in a short window. Wallet frozen for review.',
};

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


// ── Periodic cleanup: remove stale unpaid Pending appointments (older than 15 min) ──
// Runs once at startup, then every 5 minutes.
async function cleanupStalePending() {
  try {
    const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const staleAppts = await Appointment.find({ status: 'Pending', createdAt: { $lt: staleCutoff } }).lean();
    for (const appt of staleAppts) {
      const hasPayment = await Payment.findOne({ referenceId: appt._id.toString(), status: 'completed' }).lean();
      if (!hasPayment) {
        await Appointment.findByIdAndDelete(appt._id);
        // APPT-M-01: the deleted hold's slot is free - offer it to the queue.
        void onSlotFreed({ doctorId: appt.doctorId, date: appt.date, time: appt.time }).catch(() => {});
      }
    }
    if (staleAppts.length) console.log(`[Cleanup] Removed ${staleAppts.length} stale Pending appointments`);
  } catch (_) {}
}
cleanupStalePending();
setInterval(cleanupStalePending, 5 * 60 * 1000);

// GET /api/transactions — user's payment history
// Patient: sees own payments. Doctor/clinic_doctor: sees payments for their clinic.
router.get('/', protect, authorize('billing:read', 'billing:read:own'), async (req, res, next) => {
  try {
    const { page, limit, serviceType } = req.query;
    const isDoctor = req.user.role === 'doctor' || req.user.role === 'clinic_doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist';
    let filter = {};
    if (isDoctor) {
      // Doctors see payments for their own clinic. Provider name match alone is
      // unreliable — jab patient clinic ke through book karta hai to provider me
      // facility ka naam aata hai, doctor ka nahi. Isliye apne appointments se
      // linked saare payments bhi include karo.
      const ownRefIds = req.user.doctorProfileId
        ? await Appointment.find({ doctorId: req.user.doctorProfileId })
            .select('_id')
            .lean()
            .then(appts => appts.map(a => a._id.toString()))
        : [];
      filter = {
        $or: [
          { provider: { $regex: req.user.name, $options: 'i' } },
          ...(ownRefIds.length ? [{ referenceId: { $in: ownRefIds } }] : []),
        ],
      };
    } else {
      filter = { patient_id: req.user._id.toString() };
    }
    if (serviceType) filter.serviceType = serviceType;
    const result = await paginatedResults(Payment, filter, { page, limit, sort: { createdAt: -1 } });

    // Populate reference data + patient details for richer history card display
    if (result.data?.length) {
      for (const payment of result.data) {
        // ── Patient full profile for doctor view ──
        try {
          const patientUser = await User.findById(payment.patient_id)
            .select('name phone email address gender bloodGroup dateOfBirth uhid city state')
            .lean();
          if (patientUser) {
            payment._doc.patient = {
              name: patientUser.name || payment.patient_name || '',
              phone: patientUser.phone || '',
              email: patientUser.email || '',
              address: patientUser.address || '',
              city: patientUser.city || '',
              state: patientUser.state || '',
              gender: patientUser.gender || '',
              bloodGroup: patientUser.bloodGroup || '',
              dateOfBirth: patientUser.dateOfBirth || null,
              uhid: patientUser.uhid || '',
            };
          }
        } catch (patientErr) { /* skip patient populate */ }

        if (!payment.referenceId) continue;
        try {
          if (payment.serviceType === 'appointment') {
            const appt = await Appointment.findById(payment.referenceId)
              .populate('doctorId', 'name specialization')
              .lean();
            if (appt) {
              payment._doc.reference = {
                doctorName: appt.doctor || appt.doctorId?.name || '',
                doctorSpecialization: appt.doctorId?.specialization || '',
                appointmentDate: appt.date,
                appointmentTime: appt.time,
                appointmentType: appt.type,
                tokenNumber: appt.tokenNumber || '',
                appointmentId: appt._id.toString(),
              };
            }
          } else if (payment.serviceType === 'test') {
            const booking = await LabBooking.findById(payment.referenceId)
              .populate('testIds', 'name')
              .lean();
            if (booking) {
              payment._doc.reference = {
                collectionMode: booking.visitType === 'Home Collection' ? 'Home' : 'Lab Visit',
                timeSlot: booking.timeSlot || '',
                tests: booking.tests || [],
                testDetails: (booking.testIds || []).map(t => t?.name).filter(Boolean),
                bookingId: booking.bookingId || '',
              };
            }
          } else if (payment.serviceType === 'medicine') {
            const order = await PharmacyOrder.findById(payment.referenceId)
              .populate('items.medicineId', 'name')
              .lean();
            if (order) {
              payment._doc.reference = {
                deliveryMode: order.deliveryMode || 'delivery',
                items: (order.items || []).map(i => i.medicineName || i.medicineId?.name || ''),
                itemCount: order.items?.length || 0,
                orderId: order.orderId || '',
              };
            }
            }
          } catch (refErr) { /* silently skip reference populate */ }
        }
      }

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/transactions/withdraw — instant provider wallet withdrawal (Spec 22 §4).
// Resolves the caller profile by role, enforces ₹100 minimum reserve, writes a
// balanced DEBIT/CREDIT pair into TransactionLedger.
router.post('/withdraw', protect, authorize('wallet:withdraw'), paymentLimiter, async (req, res, next) => {
  try {
    const amount = Math.round(Number(req.body.amount) || 0);
    if (!(amount > 0)) return res.status(400).json({ message: 'Valid amount required' });
    const role = req.user.role;
    const profileMap = {
      rider: ['../models/RiderProfile.js', 'ride'],
      assistant: ['../models/AssistantProfile.js', 'assistant'],
      lawyer: ['../models/LawyerProfile.js', 'lawyer'],
    };
    const entry = profileMap[role];
    if (!entry) return res.status(403).json({ message: 'Only rider/assistant/lawyer providers can withdraw' });
    const { default: Profile } = await import(entry[0]);
    const { default: TransactionLedger } = await import('../models/TransactionLedger.js');
    const MIN_RESERVE = 100;
    // PAY-M-02: limits / KYC / velocity pass BEFORE any balance moves, and the
    // daily quota claim is released if the debit below fails — a rejected
    // withdrawal must never consume tomorrow's limit.
    const guardNow = new Date();
    const guardUserId = String(req.user._id);
    const pre = await checkWithdrawal({ userId: guardUserId, amount, now: guardNow });
    if (!pre.allowed) {
      return res.status(pre.code).json({ message: WITHDRAWAL_GUARD_MESSAGES[pre.reason], reason: pre.reason });
    }
    const claim = await claimBudget({ userId: guardUserId, amount, now: guardNow });
    if (!claim.allowed) {
      return res.status(claim.frozen ? 403 : 429).json({
        message: WITHDRAWAL_GUARD_MESSAGES[claim.reason],
        reason: claim.reason,
      });
    }
    // PAY-001: atomic conditional debit — the $gte guard and the $inc happen in a
    // single operation, so concurrent withdrawals can never overdraw the wallet.
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id, walletBalance: { $gte: amount + MIN_RESERVE } },
      { $inc: { walletBalance: -amount } },
      { new: true }
    );
    if (!profile) {
      await releaseBudget({ userId: guardUserId, amount, now: guardNow });
      const existing = await Profile.findOne({ userId: req.user._id });
      if (!existing) return res.status(404).json({ message: 'Provider profile not found' });
      return res.status(402).json({
        message: `Insufficient balance (need ₹${amount + MIN_RESERVE} incl. ₹${MIN_RESERVE} reserve)`,
        walletBalance: existing.walletBalance || 0,
      });
    }
    const ref = `WDL-${Date.now().toString(36).toUpperCase()}`;
    const [debitEntry, creditEntry] = await TransactionLedger.create([
      { providerId: req.user._id, source: entry[1], sourceId: ref, amount, netAmount: -amount, entryType: 'DEBIT', status: 'completed', bookingNumber: ref },
      { providerId: req.user._id, source: entry[1], sourceId: ref, amount, netAmount: amount, entryType: 'CREDIT', status: 'completed', bookingNumber: ref },
    ]);
    void import('../lib/pgDualWrite.js').then(({ mirrorLedgerEntry }) => {
      void mirrorLedgerEntry(debitEntry);
      void mirrorLedgerEntry(creditEntry);
    }).catch(() => {});
    res.json({ success: true, message: `₹${amount} withdrawal recorded`, walletBalance: profile.walletBalance, transactionRef: ref });
  } catch (err) { next(err); }
});

// POST /api/transactions/pay — legacy replay compatibility only.
// New checkout uses /api/billing/pay; this endpoint must never create a payment.
router.post('/pay', protect, authorize('billing:write', 'billing:write:own'), paymentLimiter, idempotencyGuard({ prefix: 'txn-pay', failClosed: true }), async (req, res, next) => {
  const { serviceType, referenceId } = req.body || {};
  if (!serviceType || !referenceId) {
    return res.status(400).json({ message: 'serviceType and referenceId are required.' });
  }
  try {
    const payment = await Payment.findOne({ referenceId, status: 'completed' });
    if (!payment) {
      return res.status(410).json({
        message: 'This payment endpoint is retired. Please use the current checkout flow.',
        code: 'LEGACY_PAYMENT_ENDPOINT_RETIRED',
      });
    }
    const conflict = paymentReplayConflict(payment, req.user._id, serviceType);
    if (conflict) return res.status(conflict.status).json({ message: conflict.message });
    return res.status(200).json({
      success: true,
      transaction_id: payment.transaction_id,
      invoice_id: payment.invoice_id,
      payment,
      appointment: null,
      appointmentStatus: null,
      alreadyPaid: true,
    });
  } catch (err) {
    return next(err);
  }
});
// GET /api/transactions/:id/invoice — download invoice PDF
router.get('/:id/invoice', protect, authorize('billing:read', 'billing:read:own'), async (req, res, next) => {
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
router.get('/:id/bill', protect, authorize('billing:read', 'billing:read:own'), async (req, res, next) => {
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
router.get('/verify/:id', protect, authorize('billing:read', 'billing:read:own'), async (req, res, next) => {
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

    // Strategy 4: Demo sandbox payment by transaction ref (receipt hash verification).
    let demoPayment = null;
    if (!payment) {
      const { default: DemoPayment } = await import('../models/DemoPayment.js');
      demoPayment = await DemoPayment.findOne({ transactionRef: idParam }).lean();
      if (demoPayment) {
        const { verifyTxnHash } = await import('../lib/receiptSecurity.js');
        const supplied = req.query.hash ? String(req.query.hash) : null;
        return res.json({
          found: true,
          verified: supplied ? verifyTxnHash(demoPayment.transactionRef, supplied) : null,
          payment: { ...demoPayment, transaction_id: demoPayment.transactionRef },
          sandbox: true,
        });
      }
    }

    if (!payment) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // DLB-27: ownership. The lookup accepted ANY id (ObjectId, transaction id,
    // invoice id, reference id), so any authenticated user could read another
    // patient's payment + payer PII (name, phone, email, UHID, address) and the
    // linked appointment / lab / pharmacy order. The payer, the owning hospital
    // and the platform superadmin are the only readers.
    const callerIsSuperadmin = req.user.role === 'superadmin';
    const callerIsPayer = payment.patient_id && String(payment.patient_id) === String(req.user._id || req.user.id);
    const callerOwnsHospital = req.user.hospitalId
      && payment.hospitalId
      && String(payment.hospitalId) === String(req.user.hospitalId);
    if (!callerIsSuperadmin && !callerIsPayer && !callerOwnsHospital) {
      return res.status(403).json({ message: 'Not authorized to view this transaction' });
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
