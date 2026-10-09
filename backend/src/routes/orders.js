import express from 'express';
import Order, { ORDER_TRANSITIONS } from '../models/Order.js';
import LabOrder from '../models/LabOrder.js';
import Admission from '../models/Admission.js';
import OperationTheatre from '../models/OperationTheatre.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §9.3 / docs 11 §4: CPOE orders + doctor review inbox/rounds/OT list.
// Ordering: clinician roles. Review = ordering doctor's ack (verify stays
// pathologist-only, SoD intact).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const ORDER_ROLES = ['doctor', 'clinic_doctor', 'hospital_admin', 'superadmin'];
const orderRoleOnly = (req, res, next) => (
  ORDER_ROLES.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Clinician access required' })
);

router.post('/', orderRoleOnly, async (req, res) => {
  try {
    const { encounterId, admissionId, patientId, kind, items, priority, prescriptionId } = req.body || {};
    if (!patientId || !kind) return res.status(400).json({ message: 'patientId + kind required' });
    if (!['lab', 'radiology', 'medication', 'diet', 'nursing', 'procedure', 'consult'].includes(kind)) {
      return res.status(400).json({ message: 'Invalid kind' });
    }
    const o = await Order.create({
      encounterId: encounterId || null, admissionId: admissionId || null, patientId,
      hospitalId: req.user.hospitalId, orderedBy: actorId(req), kind,
      items: Array.isArray(items) ? items.slice(0, 50) : [],
      priority: priority || 'Routine', prescriptionId: prescriptionId || null,
    });
    await auditLog('order_created', actorId(req), { orderId: o._id, kind, ip: req.ip });
    return res.status(201).json({ id: String(o._id), status: o.status });
  } catch (err) {
    logger.error(`Orders create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/', orderRoleOnly, async (req, res) => {
  try {
    const { encounterId, admissionId, status, kind } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (encounterId) filter.encounterId = encounterId;
    if (admissionId) filter.admissionId = admissionId;
    if (status) filter.status = status;
    if (kind) filter.kind = kind;
    const rows = await Order.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ orders: rows });
  } catch (err) {
    logger.error(`Orders list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/status', orderRoleOnly, async (req, res) => {
  try {
    const { status } = req.body || {};
    const o = await Order.findById(req.params.id);
    if (!o) return res.status(404).json({ message: 'Not found' });
    if (!ORDER_TRANSITIONS[o.status].includes(status)) {
      return res.status(409).json({ message: `Cannot move order from ${o.status} to ${status}` });
    }
    o.status = status;
    if (status === 'Reviewed') { o.reviewedBy = actorId(req); o.reviewedAt = new Date(); }
    await o.save();
    return res.json({ id: String(o._id), status: o.status });
  } catch (err) {
    logger.error(`Orders status error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Doctor review inbox: Resulted lab orders for MY patients, not yet reviewed.
router.get('/review-inbox', orderRoleOnly, async (req, res) => {
  try {
    const mine = req.user.doctorProfileId || req.user._id;
    const filter = {
      $or: [{ doctorId: mine }, { createdBy: req.user._id }],
      status: { $in: ['Completed', 'Verified', 'Report Delivered'] },
      reviewedAt: null,
    };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const rows = await LabOrder.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    return res.json({ count: rows.length, orders: rows });
  } catch (err) {
    logger.error(`Review inbox error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Ack a result as reviewed (ordering doctor; verify stays pathologist-only).
router.put('/review-lab/:id', orderRoleOnly, async (req, res) => {
  try {
    const o = await LabOrder.findById(req.params.id);
    if (!o) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin'
      && o.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    o.reviewedBy = actorId(req);
    o.reviewedAt = new Date();
    await o.save();
    await auditLog('lab_result_reviewed', actorId(req), { orderId: o._id, ip: req.ip });
    return res.json({ id: String(o._id), reviewedAt: o.reviewedAt });
  } catch (err) {
    logger.error(`Review ack error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// My IPD rounds: active admissions where I am the admitting doctor.
router.get('/my-rounds', orderRoleOnly, async (req, res) => {
  try {
    const me = String(req.user._id);
    const filter = { status: 'Admitted' };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const rows = await Admission.find(filter).lean();
    const byMe = rows.filter((a) => String(a.admittedBy || '') === me);
    return res.json({ rounds: byMe });
  } catch (err) {
    logger.error(`Rounds error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// My OT list.
router.get('/my-ot', orderRoleOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { doctorId: req.user._id };
    if (from || to) {
      filter.scheduledDate = {};
      if (from) filter.scheduledDate.$gte = new Date(from);
      if (to) filter.scheduledDate.$lte = new Date(to);
    }
    const rows = await OperationTheatre.find(filter).sort({ scheduledDate: 1 }).limit(200).lean();
    return res.json({ surgeries: rows });
  } catch (err) {
    logger.error(`OT list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
