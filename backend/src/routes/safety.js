import express from 'express';
import VisitorPass from '../models/VisitorPass.js';
import MlcCase from '../models/MlcCase.js';
import Incident from '../models/Incident.js';
import AdrReport from '../models/AdrReport.js';
import BmwLog from '../models/BmwLog.js';
import Credential from '../models/Credential.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 22 P0-5: safety/quality/compliance CRUD — visitor passes, MLC cases,
// incidents (+RCA), ADR reports, BMW daily logs, staff credentials.
// NOTE: every head below is an explicit single-line router.* call — the
// authz inventory (routeScan.mjs) cannot see factory-generated routes, and
// an invisible route is an unaudited route.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

const lister = (Model, key, statusField) => async (req, res) => {
  try {
    const filter = tenant(req);
    if (req.query.status && statusField) filter[statusField] = req.query.status;
    const rows = await Model.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ [key]: rows });
  } catch (err) {
    logger.error(`Safety list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
};

const creator = (Model, fields, audit) => async (req, res) => {
  try {
    const body = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) body[f] = req.body[f];
    }
    const row = await Model.create({ ...body, hospitalId: req.user.hospitalId, createdBy: actorId(req) });
    await auditLog(audit, actorId(req), { id: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Safety create error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
};

const patcher = (Model, fields, audit) => async (req, res) => {
  try {
    const set = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) set[f] = req.body[f];
    }
    const row = await Model.findOneAndUpdate(
      { _id: req.params.id, ...tenant(req) }, { $set: set }, { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog(`${audit}_updated`, actorId(req), { id: row._id, ip: req.ip });
    return res.json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Safety patch error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
};

// ─── Visitor passes ─────────────────────────────────────────────────────────
router.get('/visitor-passes', protect, authorize('staff:view'), lister(VisitorPass, 'visitorpasses'));
router.post('/visitor-passes', protect, authorize('staff:manage'), creator(VisitorPass, ['patientId', 'admissionId', 'visitorName', 'phone', 'idType', 'photoUrl', 'relation', 'validFrom', 'validTill'], 'visitor_pass'));
router.patch('/visitor-passes/:id', protect, authorize('staff:manage'), patcher(VisitorPass, ['validTill', 'status'], 'visitor_pass'));

// ─── MLC cases ──────────────────────────────────────────────────────────────
router.get('/mlc', protect, authorize('staff:view'), lister(MlcCase, 'mlccases', 'status'));
router.post('/mlc', protect, authorize('staff:manage'), creator(MlcCase, ['encounterId', 'patientId', 'mlcNo', 'policeStation', 'injuryType', 'history', 'opinion'], 'mlc_case'));
router.patch('/mlc/:id', protect, authorize('staff:manage'), patcher(MlcCase, ['policeStation', 'intimationAt', 'injuryType', 'history', 'opinion', 'status'], 'mlc_case'));

// ─── Incidents (+RCA) ───────────────────────────────────────────────────────
router.get('/incidents', protect, authorize('staff:view'), lister(Incident, 'incidents', 'status'));
router.post('/incidents', protect, authorize('staff:manage'), creator(Incident, ['type', 'severity', 'location', 'involvedPatientId', 'description', 'immediateAction'], 'incident'));
router.patch('/incidents/:id', protect, authorize('staff:manage'), patcher(Incident, ['severity', 'immediateAction', 'rca', 'correctiveAction', 'status', 'closedAt'], 'incident'));

// ─── ADR reports ────────────────────────────────────────────────────────────
router.get('/adr', protect, authorize('staff:view'), lister(AdrReport, 'adrreports', 'status'));
router.post('/adr', protect, authorize('staff:manage'), creator(AdrReport, ['patientId', 'drug', 'reaction', 'severity', 'outcome', 'causality'], 'adr_report'));
router.patch('/adr/:id', protect, authorize('staff:manage'), patcher(AdrReport, ['outcome', 'causality', 'reportedToPvPI', 'status'], 'adr_report'));

// ─── BMW daily logs ─────────────────────────────────────────────────────────
router.get('/bmw', protect, authorize('staff:view'), lister(BmwLog, 'bmwlogs'));
router.post('/bmw', protect, authorize('staff:manage'), creator(BmwLog, ['date', 'wardId', 'yellowKg', 'redKg', 'whiteKg', 'blueKg', 'handedTo', 'manifestNo'], 'bmw_log'));
router.patch('/bmw/:id', protect, authorize('staff:manage'), patcher(BmwLog, ['yellowKg', 'redKg', 'whiteKg', 'blueKg', 'handedTo', 'manifestNo'], 'bmw_log'));

// ─── Staff credentials ──────────────────────────────────────────────────────
router.get('/credentials', protect, authorize('staff:view'), lister(Credential, 'credentials', 'status'));
router.post('/credentials', protect, authorize('staff:manage'), creator(Credential, ['staffId', 'type', 'number', 'validTill', 'docUrl', 'privileges'], 'credential'));
router.patch('/credentials/:id', protect, authorize('staff:manage'), patcher(Credential, ['number', 'validTill', 'docUrl', 'privileges', 'verifiedAt', 'verifiedBy', 'status'], 'credential'));

// Credential expiry watch (drives a rule + the HR page).
router.get('/credentials/expiring', protect, authorize('staff:view'), async (req, res) => {
  try {
    const days = Number(req.query.days) || 60;
    const rows = await Credential.find({
      ...tenant(req), validTill: { $lte: new Date(Date.now() + days * 86400 * 1000) },
    }).sort({ validTill: 1 }).limit(200).lean();
    return res.json({ expiring: rows });
  } catch (err) {
    logger.error(`Credentials expiring error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
