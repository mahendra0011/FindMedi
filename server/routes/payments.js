import express from 'express';
import Payment from '../models/Payment.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createPaymentSchema, updatePaymentSchema, refundPaymentSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { status, patient_id } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (patient_id) filter.patient_id = patient_id;
    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    const total = await Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    res.json({ payments, total_amount: total[0]?.total || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createPaymentSchema), async (req, res) => {
  try {
    const transaction_id = `TXN-${Date.now()}`;
    const patient_id = req.user.role === 'patient' ? req.user._id.toString() : req.body.patient_id;
    const payment = await Payment.create({
      ...req.body,
      patient_id,
      status: 'pending',
      transaction_id,
      hospitalId: req.user.hospitalId || undefined,
    });
    await auditLog('create_payment', req.user._id, { paymentId: payment._id, amount: payment.amount, transaction_id });
    res.status(201).json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, adminOnly, validate(updatePaymentSchema), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && payment.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(payment, req.body);
    await payment.save();
    await auditLog('update_payment', req.user._id, { paymentId: payment._id, changes: req.body });
    res.json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/refund', protect, adminOnly, validate(refundPaymentSchema), async (req, res) => {
  try {
    const refund_amount = req.body.refund_amount || 0;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (refund_amount > payment.amount) {
      return res.status(400).json({ message: `Refund amount (${refund_amount}) cannot exceed original payment amount (${payment.amount})` });
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin' && payment.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    payment.status = 'refunded';
    payment.refund_amount = refund_amount;
    await payment.save();
    await auditLog('refund_payment', req.user._id, { paymentId: payment._id, refund_amount, original_amount: payment.amount });
    res.json({ message: `Refund of ${refund_amount} processed`, payment });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
