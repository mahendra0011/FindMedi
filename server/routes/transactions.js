import express from 'express';
import crypto from 'crypto';
import Billing from '../models/Billing.js';
import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import LabBooking from '../models/LabBooking.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import Notification from '../models/Notification.js';
import { generatePaymentInvoicePDF } from '../services/pdfService.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';
import { validate, createPaymentSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';

const router = express.Router();

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

// POST /api/transactions/pay — unified payment + confirm
router.post('/pay', protect, async (req, res, next) => {
  try {
    const { serviceType, referenceId, amount, method, description, provider, lineItems } = req.body;
    if (!serviceType || !amount || !method) {
      return res.status(400).json({ message: 'serviceType, amount, and method are required' });
    }

    if (referenceId) {
      const existingPayment = await Payment.findOne({ referenceId, status: 'completed' });
      if (existingPayment) {
        return res.status(409).json({ message: 'Payment already completed for this service.' });
      }
    }

    const year = new Date().getFullYear();
    const prefixMap = { appointment: 'APT', test: 'TST', medicine: 'MED' };
    const invPrefix = prefixMap[serviceType] || serviceType.slice(0,3).toUpperCase();
    const rndTxn = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 chars
    const rndInv = crypto.randomBytes(8).toString('hex').toUpperCase(); // 16 chars
    const transaction_id = `TXN-${year}-${rndTxn}`;
    const invoice_id = `INV-${invPrefix}-${year}-${rndInv}`;

    const payment = await Payment.create({
      transaction_id,
      invoice_id,
      patient_id: req.user._id.toString(),
      patient_name: req.user.name || 'Patient',
      amount,
      method,
      status: 'completed',
      serviceType,
      referenceId: referenceId || '',
      description: description || `${serviceType} payment`,
      provider: provider || '',
      lineItems: lineItems || [],
    });

    // Auto-confirm the referenced booking
    if (referenceId) {
      try {
        if (serviceType === 'appointment') {
          await Appointment.findByIdAndUpdate(referenceId, { status: 'Confirmed' });
        } else if (serviceType === 'test') {
          await LabBooking.findByIdAndUpdate(referenceId, { status: 'Confirmed', paymentStatus: 'Paid' });
        } else if (serviceType === 'medicine') {
          await PharmacyOrder.findByIdAndUpdate(referenceId, { status: 'Confirmed', paymentStatus: 'Paid' });
        }
      } catch (refErr) {
        console.error('Failed to update reference status:', refErr);
      }
    }

    // Auto-create billing record (Paid)
    try {
      const methodMap = { upi:'UPI', card:'Card', netbanking:'Online', cash:'Cash' };
      const sourceMap = { appointment:'appointment', test:'lab', medicine:'pharmacy' };
      const serviceLabel = description || `${serviceType} service`;
      const providerName = provider || '';
      const today = new Date().toISOString().split('T')[0];
      const billServices = (lineItems || []).map(item => ({
        name: item.name || 'Service',
        description: '',
        price: Number(item.price) || 0,
        quantity: Number(item.qty) || 1,
        category: 'General',
      }));
      await Billing.create({
        invoiceId: invoice_id,
        patient: req.user.name || 'Patient',
        patientId: req.user._id,
        doctor: serviceType === 'appointment' ? providerName : (serviceType === 'test' ? 'Lab Services' : 'Pharmacy'),
        appointmentId: serviceType === 'appointment' ? referenceId : undefined,
        service: serviceLabel,
        services: billServices,
        source: sourceMap[serviceType] || 'manual',
        amount,
        paid: amount,
        balance: 0,
        status: 'Paid',
        date: today,
        paymentMethod: methodMap[method] || 'Online',
        transactionId: transaction_id,
      });
    } catch (billErr) {
      console.error('Failed to create billing record:', billErr.message);
    }

    await Notification.create({
      userId: req.user._id.toString(),
      title: 'Payment Successful',
      message: `₹${amount} paid for ${description || serviceType}. Invoice: ${invoice_id}`,
      type: 'payment',
      date: new Date().toISOString().split('T')[0],
    });

    await auditLog('create_payment', req.user._id, { transaction_id, amount, serviceType, referenceId });

    res.status(201).json({
      success: true,
      transaction_id,
      invoice_id,
      payment,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate transaction. Please try again.' });
    }
    next(err);
  }
});

// GET /api/transactions/:id/invoice — download invoice PDF
router.get('/:id/invoice', protect, async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Transaction not found' });
    if (payment.patient_id !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let reference = null;
    if (payment.referenceId && payment.serviceType === 'appointment') {
      reference = await Appointment.findById(payment.referenceId)
        .populate('doctorId', 'name specialization qualification')
        .populate('hospitalId', 'name address phone licenseNo');
    } else if (payment.referenceId && payment.serviceType === 'test') {
      reference = await LabBooking.findById(payment.referenceId)
        .populate('testIds')
        .populate('hospitalId', 'name address phone licenseNo nablNo');
    } else if (payment.referenceId && payment.serviceType === 'medicine') {
      reference = await PharmacyOrder.findById(payment.referenceId)
        .populate('items.medicineId', 'name form');
    }

    const pdfBuffer = await generatePaymentInvoicePDF(payment, reference);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${payment.invoice_id || 'invoice'}.pdf`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

export default router;