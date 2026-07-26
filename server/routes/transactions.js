import express from 'express';
import crypto from 'crypto';
import Billing from '../models/Billing.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Facility from '../models/Facility.js';
import Appointment from '../models/Appointment.js';
import LabBooking from '../models/LabBooking.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { generatePaymentInvoicePDF } from '../services/pdfService.js';
import { protect } from '../middleware/auth.js';
import { validate, createPaymentSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';
import { generateTransactionId, generateInvoiceId, generateBillId, generateTokenNumber } from '../utils/idGenerator.js';

const router = express.Router();

// ── Startup: clean stale unpaid Pending appointments (older than 15 min) ──
(async function cleanupStalePending() {
  try {
    const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const staleAppts = await Appointment.find({ status: 'Pending', createdAt: { $lt: staleCutoff } }).lean();
    for (const appt of staleAppts) {
      const hasPayment = await Payment.findOne({ referenceId: appt._id.toString(), status: 'completed' }).lean();
      if (!hasPayment) await Appointment.findByIdAndDelete(appt._id);
    }
    if (staleAppts.length) console.log(`[Cleanup] Removed ${staleAppts.length} stale Pending appointments`);
  } catch (_) {}
})();

// GET /api/transactions — user's payment history
router.get('/', protect, async (req, res, next) => {
  try {
    const { page, limit, serviceType } = req.query;
    const filter = { patient_id: req.user._id.toString() };
    if (serviceType) filter.serviceType = serviceType;
    const result = await paginatedResults(Payment, filter, { page, limit, sort: { createdAt: -1 } });

    // Populate reference data for richer history card display
    if (result.data?.length) {
      for (const payment of result.data) {
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
              };
            }
          }
        } catch (refErr) { /* silently skip reference populate */ }
      }
    }

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/transactions/pay — unified payment + confirm (idempotent)
// Can also accept appointment data to create appointment + payment atomically
router.post('/pay', protect, async (req, res, next) => {
  try {
    let { serviceType, referenceId, amount, method, description, provider, lineItems, appointment: apptData } = req.body;
    if (!serviceType || !amount || !method) {
      return res.status(400).json({ message: 'serviceType, amount, and method are required' });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0. Please check doctor consultation fee.' });
    }

    // ── If appointment data is provided, create appointment first (atomic flow) ──
    let createdAppointment = null;
    if (apptData && serviceType === 'appointment') {
      try {
        const { doctorId, doctor, doctorName, department, date, time, notes, type, symptoms, priority, facilityId } = apptData;
        const patientName = req.user.name;
        const patientId = req.user._id;

        // Clean up stale Pending appointments (unpaid, older than 15 min) for this patient
        try {
          const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
          const staleAppts = await Appointment.find({
            patientId, status: 'Pending', createdAt: { $lt: staleCutoff },
          }).lean();
          for (const stale of staleAppts) {
            const hasPayment = await Payment.findOne({ referenceId: stale._id.toString(), status: 'completed' }).lean();
            if (!hasPayment) {
              await Appointment.findByIdAndDelete(stale._id);
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
          const existing = await Appointment.findOne({ patientId, date, time, status: { $nin: ['Cancelled', 'Completed'] } });
          if (existing) {
            return res.status(409).json({ message: 'You have already booked this slot. Please try another slot.' });
          }
        }

        const tokenNumber = generateTokenNumber();
        const patientUser = await User.findById(patientId);
        const countToday = await Appointment.countDocuments({ date, doctor: doctor || '' });
        const estimatedWaitTime = countToday * 10; // simple estimate

        createdAppointment = await Appointment.create({
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
          status: 'Pending',
        });

        referenceId = createdAppointment._id.toString();

        await createdAppointment.populate('doctorId', 'name specialization');

        try {
          await auditLog('create_appointment', req.user._id, { recordId: createdAppointment._id, ip: req.ip, userAgent: req.get('user-agent') });
        } catch (_) {}

        if (doctorId) {
          try {
            const notifModule = await import('../models/Notification.js');
            const NotificationModel = notifModule.default;
            const doctorDoc = await Doctor.findById(doctorId).select('user_id').lean();
            const notifUserId = doctorDoc?.user_id ? doctorDoc.user_id.toString() : doctorId.toString();
            await NotificationModel.create({
              userId: notifUserId,
              title: 'New Appointment',
              message: `New ${type || 'Consultation'} appointment from ${patientName} for ${date} at ${time}`,
              type: 'appointment',
              date: new Date().toISOString().split('T')[0],
            });
          } catch (_) {}
        }
      } catch (apptErr) {
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
    const bill_id = generateBillId(serviceType);

    const methodMap = { upi:'UPI', card:'Card', netbanking:'Online', cash:'Cash', wallet:'Wallet' };
    const sourceMap = { appointment:'appointment', test:'lab', medicine:'pharmacy' };
    const serviceLabel = description || `${serviceType} service`;
    const today = new Date().toISOString().split('T')[0];
    const billServices = (lineItems || []).map(item => ({
      name: item.name || 'Service',
      description: '',
      price: Number(item.price) || 0,
      quantity: Number(item.qty) || 1,
      category: 'General',
    }));

    let payment;

    try {

      const [p] = await Payment.create([{
        transaction_id, invoice_id,
        patient_id: req.user._id.toString(),
        patient_name: req.user.name || 'Patient',
        amount, method, status: 'completed',
        serviceType, referenceId: referenceId || '',
        description: description || `${serviceType} payment`,
        provider: provider || '',
        lineItems: lineItems || [],
      }]);
      payment = p;

      // Auto-confirm the referenced booking (check facility setting)
      if (referenceId) {
        if (serviceType === 'appointment') {
          let shouldConfirm = true;
          try {
            const appt = await Appointment.findById(referenceId).populate('doctorId', 'facilityId').lean();
            if (appt?.doctorId?.facilityId) {
              const facility = await Facility.findById(appt.doctorId.facilityId).select('settings').lean();
              if (facility?.settings?.autoConfirmAppointment === false) {
                shouldConfirm = false;
              }
            }
          } catch (_) { /* default to confirm on error */ }
          if (shouldConfirm) {
            await Appointment.findByIdAndUpdate(referenceId, { status: 'Confirmed' });
          }
        } else if (serviceType === 'test') {
          await LabBooking.findByIdAndUpdate(referenceId, { status: 'Confirmed', paymentStatus: 'Paid' });
        } else if (serviceType === 'medicine') {
          await PharmacyOrder.findByIdAndUpdate(referenceId, { status: 'Confirmed', paymentStatus: 'Paid' });
        }
      }

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

    } catch (txErr) {
      // If appointment was newly created but payment failed, clean up
      if (req.body?.appointment && createdAppointment?._id) {
        try { await Appointment.findByIdAndDelete(createdAppointment._id); } catch (_) {}
      }
      throw txErr;
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

    res.status(201).json({
      success: true,
      transaction_id,
      invoice_id,
      payment,
      appointment: createdAppointment,
      appointmentStatus: finalStatus,
    });
  } catch (err) {
    // Cleanup: if appointment was created (via apptData) but payment failed, delete it
    if (req.body?.appointment && req.body?.serviceType === 'appointment' && !err.message?.includes('Duplicate')) {
      try {
        const orphan = await Appointment.findOne({ patientId: req.user._id, status: 'Pending' }).sort({ createdAt: -1 });
        if (orphan && !(await Payment.findOne({ referenceId: orphan._id.toString() }))) {
          await Appointment.findByIdAndDelete(orphan._id);
        }
      } catch (_) {}
    }
    if (err.code === 11000 && req.body.referenceId) {
      try {
        const existing = await Payment.findOne({ referenceId: req.body.referenceId, status: 'completed' });
        if (existing) {
          return res.status(200).json({
            success: true,
            transaction_id: existing.transaction_id,
            invoice_id: existing.invoice_id,
            payment: existing,
            alreadyPaid: true,
          });
        }
      } catch (_) { /* fall through */ }
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate transaction detected. Please check your appointment history — your payment may already be completed.' });
    }
    next(err);
  }
});


// GET /api/transactions/:id/invoice — download invoice PDF
router.get('/:id/invoice', protect, async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const payment = mongoose.Types.ObjectId.isValid(idParam)
      ? await Payment.findById(idParam)
      : await Payment.findOne({ transaction_id: idParam });
    if (!payment) return res.status(404).json({ message: 'Transaction not found' });
    if (payment.patient_id !== req.user._id.toString() && req.user.role !== 'admin') {
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
router.get('/:id/bill', protect, async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const payment = mongoose.Types.ObjectId.isValid(idParam)
      ? await Payment.findById(idParam)
      : await Payment.findOne({ transaction_id: idParam });
    if (!payment) return res.status(404).json({ message: 'Transaction not found' });
    if (payment.patient_id !== req.user._id.toString() && req.user.role !== 'admin') {
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

export default router;