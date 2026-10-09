import express from 'express';
import Insurer from '../models/Insurer.js';
import PreAuthRequest from '../models/PreAuthRequest.js';
import Claim from '../models/Claim.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §9.6: TPA desk — insurer master, pre-auth lifecycle with
// query thread + enhancements, claim file + settlement reconciliation.
// tpa_agent (hospital-side desk) + billing roles operate it.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });
const TPA_ROLES = ['tpa_agent', 'hospital_admin', 'superadmin', 'accountant', 'receptionist'];
const tpaOnly = (req, res, next) => (
  TPA_ROLES.includes(req.user?.role) ? next() : res.status(403).json({ message: 'TPA desk access required' })
);
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

// ─── Insurers ───────────────────────────────────────────────────────────────
router.get('/insurers', authorize('billing:read'), async (req, res) => {
  try {
    const rows = await Insurer.find({ ...tenantFilter(req), isActive: true }).limit(200).lean();
    return res.json({ insurers: rows });
  } catch (err) {
    logger.error(`TPA insurers error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/insurers', tpaOnly, async (req, res) => {
  try {
    const { name, type, contact, empanelmentNo, rateCardId, docChecklist } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const row = await Insurer.create({
      hospitalId: req.user.hospitalId, name, type: type || 'Insurer',
      contact: contact || '', empanelmentNo: empanelmentNo || '',
      rateCardId: rateCardId || null, docChecklist: docChecklist || [],
      createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`TPA insurer create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Pre-auth ───────────────────────────────────────────────────────────────
router.get('/preauth', tpaOnly, async (req, res) => {
  try {
    const { status, admissionId } = req.query;
    const filter = { ...tenantFilter(req) };
    if (status) filter.status = status;
    if (admissionId) filter.admissionId = admissionId;
    const rows = await PreAuthRequest.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    return res.json({ preauths: rows });
  } catch (err) {
    logger.error(`TPA preauth list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/preauth', tpaOnly, async (req, res) => {
  try {
    const { admissionId, insurerId, policyId, estimate, diagnosis, plannedProcedure } = req.body || {};
    if (!admissionId || !insurerId) return res.status(400).json({ message: 'admissionId + insurerId required' });
    const row = await PreAuthRequest.create({
      admissionId, insurerId, policyId: policyId || '', estimate: Number(estimate) || 0,
      diagnosis: diagnosis || '', plannedProcedure: plannedProcedure || '',
      hospitalId: req.user.hospitalId, createdBy: actorId(req),
    });
    await auditLog('tpa_preauth_created', actorId(req), { preAuthId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`TPA preauth create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const PREAUTH_FLOW = {
  Draft: ['Submitted'], Submitted: ['QueryRaised', 'Approved', 'PartiallyApproved', 'Rejected'],
  QueryRaised: ['Submitted', 'Approved', 'PartiallyApproved', 'Rejected'],
  Approved: ['Expired'], PartiallyApproved: ['Expired'], Rejected: [], Expired: [],
};

router.put('/preauth/:id/status', tpaOnly, requireObjectId, async (req, res) => {
  try {
    const { status, approvedAmount, validTill, queryText, enhancement } = req.body || {};
    const row = await PreAuthRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    if (!PREAUTH_FLOW[row.status].includes(status)) {
      return res.status(409).json({ message: `Cannot move pre-auth from ${row.status} to ${status}` });
    }
    row.status = status;
    if (approvedAmount != null) row.approvedAmount = Number(approvedAmount);
    if (validTill) row.validTill = new Date(validTill);
    if (queryText) row.queries.push({ by: req.user.name || req.user.role, text: String(queryText).slice(0, 2000) });
    if (enhancement) row.enhancements.push({ amount: Number(enhancement.amount) || 0, reason: String(enhancement.reason || '') });
    await row.save();
    await auditLog('tpa_preauth_status', actorId(req), { preAuthId: row._id, status, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`TPA preauth status error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Claims ─────────────────────────────────────────────────────────────────
router.post('/claims', tpaOnly, async (req, res) => {
  try {
    const { admissionId, preAuthId, billId, insurerId, documents } = req.body || {};
    if (!admissionId) return res.status(400).json({ message: 'admissionId required' });
    const row = await Claim.create({
      admissionId, preAuthId: preAuthId || null, billId: billId || null,
      insurerId: insurerId || null, documents: documents || [],
      hospitalId: req.user.hospitalId, createdBy: actorId(req),
    });
    await auditLog('tpa_claim_created', actorId(req), { claimId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`TPA claim create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.put('/claims/:id/settle', tpaOnly, requireObjectId, async (req, res) => {
  try {
    const { settledAmount, utr, tds, shortSettlement, status } = req.body || {};
    const row = await Claim.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    if (!['Settled', 'Partial', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be Settled|Partial|Rejected' });
    }
    row.status = status;
    row.settledAmount = Number(settledAmount) || 0;
    row.utr = utr || '';
    row.tds = Number(tds) || 0;
    row.shortSettlement = shortSettlement || [];
    await row.save();
    await auditLog('tpa_claim_settled', actorId(req), { claimId: row._id, status, settledAmount, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`TPA settle error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Pipeline funnel (counts by status) for the dashboard insurance widget.
router.get('/pipeline', authorize('billing:read'), async (req, res) => {
  try {
    const [pre, claims] = await Promise.all([
      PreAuthRequest.aggregate([{ $match: tenantFilter(req) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Claim.aggregate([{ $match: tenantFilter(req) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    return res.json({ preauth: pre, claims });
  } catch (err) {
    logger.error(`TPA pipeline error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
