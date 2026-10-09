import express from 'express';
import Patient from '../models/Patient.js';
import Token from '../models/Token.js';
import Queue from '../models/Queue.js';
import QueueTicket from '../models/QueueTicket.js';
import { publicSearchLimiter } from '../middleware/rateLimit.js';
import { botProtection } from '../middleware/botProtection.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 15 §15.3: kiosk self-service. Public but hardened: strict rate
// limits + bot protection, minimal fields, provisional records the front
// desk completes (KYC later), duplicate detection routes matches to
// reception instead of forking a second file. No PHI persists on device
// (page auto-resets; enforced client-side with a server short TTL here).

const router = express.Router();

// File 22 P1-25: compare DOBs by calendar day (Date vs YYYY-MM-DD strings
// never equal with String() — the old check always missed).
const isoDay = (v) => {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

// Walk-in check-in: minimal fields → provisional patient + OPD token.
// Duplicate mobile+DOB routes to reception (no second file).
router.post('/checkin', publicSearchLimiter, botProtection(), async (req, res) => {
  try {
    const { hospitalId, name, phone, dob, department } = req.body || {};
    if (!hospitalId || !name || !phone) {
      return res.status(400).json({ message: 'hospitalId + name + phone required' });
    }
    const dup = await Patient.findOne({ phone: String(phone), dateOfBirth: dob || { $exists: true } })
      .select('_id name dateOfBirth').lean();
    if (dup && (!dob || isoDay(dup.dateOfBirth) === String(dob))) {
      return res.status(409).json({ message: 'Possible existing record — please see reception', code: 'DUPLICATE_ROUTE_RECEPTION' });
    }
    const patient = await Patient.create({
      name: String(name).slice(0, 120), phone: String(phone).slice(0, 15),
      dateOfBirth: dob || null, hospitalId, provisional: true,
    });
    const dept = department || 'General';
    const queueLength = await Token.countDocuments({
      department: dept, hospitalId, status: { $in: ['Waiting', 'Called', 'In Consultation'] },
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    const token = await Token.create({
      patientId: patient._id, patientName: patient.name,
      department: dept, hospitalId, queuePosition: queueLength + 1,
      estimatedWaitTime: queueLength * 15, checkedInAt: new Date(),
    });
    await auditLog('kiosk_checkin', null, {
      patientId: patient._id, tokenId: token._id, hospitalId, ip: req.ip,
    }).catch(() => {});
    // Also mirror into the unified engine when an OPD queue exists.
    const uq = await Queue.findOne({ hospitalId, type: 'OPD', active: true });
    let unified = null;
    if (uq) {
      const seq = (uq.seq || 0) + 1;
      uq.seq = seq;
      await uq.save();
      unified = await QueueTicket.create({
        queueId: uq._id, hospitalId, number: seq,
        display: `${uq.prefix}-${String(seq).padStart(3, '0')}`,
        patientId: patient._id, priority: 'Walkin', createdVia: 'kiosk',
      });
    }
    return res.status(201).json({
      tokenNumber: token.tokenNumber, queuePosition: token.queuePosition,
      estimatedWaitTime: token.estimatedWaitTime,
      unifiedDisplay: unified ? unified.display : null,
    });
  } catch (err) {
    logger.error(`Kiosk checkin error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-25: provisional registration WITHOUT a token (front desk
// completes KYC/consent later; duplicates route to reception).
router.post('/register', publicSearchLimiter, botProtection(), async (req, res) => {
  try {
    const { hospitalId, name, phone, dob, gender } = req.body || {};
    if (!hospitalId || !name || !phone) {
      return res.status(400).json({ message: 'hospitalId + name + phone required' });
    }
    const dup = await Patient.findOne({ phone: String(phone), dateOfBirth: dob || { $exists: true } })
      .select('_id name dateOfBirth').lean();
    if (dup && (!dob || isoDay(dup.dateOfBirth) === String(dob))) {
      return res.status(409).json({ message: 'Possible existing record — please see reception', code: 'DUPLICATE_ROUTE_RECEPTION' });
    }
    const patient = await Patient.create({
      name: String(name).slice(0, 120), phone: String(phone).slice(0, 15),
      dateOfBirth: dob || null, gender: gender || undefined,
      hospitalId, provisional: true,
    });
    await auditLog('kiosk_register', null, { patientId: patient._id, hospitalId, ip: req.ip }).catch(() => {});
    return res.status(201).json({ id: String(patient._id), provisional: true });
  } catch (err) {
    logger.error(`Kiosk register error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-25: bill payment — invoice + phone match, then a gateway intent
// (same state machine as /checkout; kiosk-sourced, no login required).
router.post('/pay', publicSearchLimiter, botProtection(), async (req, res) => {
  try {
    const { invoiceId, phone, gateway } = req.body || {};
    if (!invoiceId || !phone) return res.status(400).json({ message: 'invoiceId + phone required' });
    const { default: Billing } = await import('../models/Billing.js');
    const { default: Payment } = await import('../models/Payment.js');
    const { gatewayFor } = await import('../lib/gateways.js');
    const bill = await Billing.findOne({ invoiceId }).select('patient patientId amount paid balance status hospitalId gateway invoiceId').lean();
    if (!bill) return res.status(404).json({ message: 'Invoice not found' });
    // Identity gate: the kiosk phone must match the payer's phone (linked
    // Patient first, else the User record). Billing rows carry no phone.
    const { default: User } = await import('../models/User.js');
    const { default: Patient } = await import('../models/Patient.js');
    const { safeFirst } = await import('../lib/approvalWiring.js');
    let payerPhone = '';
    if (bill.patientId) {
      const linked = await safeFirst(Patient.findOne({ userId: bill.patientId }).select('phone').lean());
      const user = linked?.phone ? null : await safeFirst(User.findById(bill.patientId).select('phone').lean());
      payerPhone = String(linked?.phone || user?.phone || '');
    }
    if (!payerPhone || payerPhone.replace(/\D/g, '').slice(-10) !== String(phone).replace(/\D/g, '').slice(-10)) {
      return res.status(403).json({ message: 'Phone does not match this invoice' });
    }
    if (bill.status === 'Paid' || (bill.balance || 0) <= 0) {
      return res.status(409).json({ message: 'Nothing payable on this invoice' });
    }
    const gw = gatewayFor(gateway);
    const receipt = `ksk_${Date.now()}`;
    let order;
    try {
      order = await gw.createOrder({ amount: Number(bill.balance), receipt });
    } catch (e) {
      return res.status(422).json({ message: e.message, code: e.code || 'GATEWAY_ERROR' });
    }
    const row = await Payment.create({
      transactionId: `txn_${receipt}`,
      patientId: String(bill.patientId || ''), patientName: bill.patient || 'Kiosk',
      amount: Number(bill.balance), method: 'upi', status: 'pending',
      invoiceId: bill.invoiceId, gateway: gw.name, gatewayOrderId: order.gatewayOrderId,
      hospitalId: bill.hospitalId || undefined,
      attempts: [{ at: new Date(), gateway: `${gw.name}:kiosk`, event: 'intent.created', payload: order }],
    });
    return res.status(201).json({
      id: String(row._id), gatewayOrderId: order.gatewayOrderId,
      amount: Number(bill.balance), sessionId: order.sessionId || null,
    });
  } catch (err) {
    logger.error(`Kiosk pay error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-25: report collect — phone+dob identity match (OTP delivery
// needs SMS credentials; until then the match IS the gate), verified
// reports with URLs only.
router.post('/report-collect', publicSearchLimiter, botProtection(), async (req, res) => {
  try {
    const { phone, dob } = req.body || {};
    if (!phone || !dob) return res.status(400).json({ message: 'phone + dob required' });
    const patient = await Patient.findOne({ phone: String(phone) }).select('_id userId dateOfBirth').lean();
    if (!patient || isoDay(patient.dateOfBirth) !== String(dob)) {
      return res.status(404).json({ message: 'No matching record' });
    }
    // LabOrder.patientId is the USER id — unlinked (walk-in) patients have
    // no order identity, so there is honestly nothing to collect.
    if (!patient.userId) return res.json({ ready: [] });
    const { default: LabOrder } = await import('../models/LabOrder.js');
    const { safeFirst } = await import('../lib/approvalWiring.js');
    const orders = await safeFirst(LabOrder.find({ patientId: patient.userId })
      .select('orderId status reportUrl updatedAt').sort({ updatedAt: -1 }).limit(20).lean()) || [];
    const ready = orders.filter((o) => o.reportUrl && ['Completed', 'Verified', 'Report Delivered', 'Partially Completed'].includes(o.status));
    return res.json({ ready: ready.map((o) => ({ orderId: o.orderId, reportUrl: o.reportUrl, at: o.updatedAt })) });
  } catch (err) {
    logger.error(`Kiosk collect error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-25: token-only status (position display for TV-ticket holders).
router.get('/token-status', publicSearchLimiter, async (req, res) => {
  try {
    const { token, department, hospitalId } = req.query;
    if (!token || !hospitalId) return res.status(400).json({ message: 'token + hospitalId required' });
    const t = await Token.findOne({ tokenNumber: token, department: department || 'General', hospitalId })
      .select('tokenNumber queuePosition status estimatedWaitTime department').lean();
    if (!t) return res.status(404).json({ message: 'Token not found' });
    const { safeFirst } = await import('../lib/approvalWiring.js');
    const ahead = await safeFirst(Token.countDocuments({
      department: t.department, hospitalId, status: 'Waiting',
      queuePosition: { $lt: t.queuePosition || 0 },
    })) || 0;
    return res.json({ ...t, ahead });
  } catch (err) {
    logger.error(`Kiosk token error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
