import express from 'express';
import NabhChapter, { NABH_SEED } from '../models/NabhChapter.js';
import NabhAssessment from '../models/NabhAssessment.js';
import Capa from '../models/Capa.js';
import PcpndtFormF from '../models/PcpndtFormF.js';
import MtpRegister from '../models/MtpRegister.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 22 P2-30: NABH chapters + assessments (auto-KPIs resolved live),
// CAPA ledger, PCPNDT Form F + MTP registers.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

// NOTE: explicit single-line heads (routeScan inventory).

router.get('/chapters', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await NabhChapter.find({}).sort({ code: 1 }).lean();
    return res.json({ chapters: rows });
  } catch (err) {
    logger.error(`NABH chapters error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/chapters/seed', authorize('staff:manage'), async (req, res) => {
  try {
    let created = 0;
    for (const s of NABH_SEED) {
      // eslint-disable-next-line no-await-in-loop
      const r = await NabhChapter.findOneAndUpdate(
        { code: s.code }, { $setOnInsert: { title: s.title, objectives: s.objectives } }, { upsert: true, new: true },
      );
      if (r) created += 1;
    }
    return res.status(201).json({ chapters: created });
  } catch (err) {
    logger.error(`NABH seed error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Assessment with auto-KPI resolution (insights compute, same hospital).
router.post('/assessments', authorize('staff:manage'), async (req, res) => {
  try {
    const { chapter, scores } = req.body || {};
    if (!chapter || !scores) return res.status(400).json({ message: 'chapter + scores required' });
    const chap = await NabhChapter.findOne({ code: chapter }).lean();
    if (!chap) return res.status(404).json({ message: 'Unknown chapter' });
    const autoValues = {};
    const autoKeys = [...new Set((chap.objectives || []).map((o) => o.autoKpi).filter(Boolean))];
    if (autoKeys.length) {
      // Reuse the insights KPI compute through an internal call (same data,
      // no HTTP round-trip): replicate the minimal queries here would fork
      // the formulas, so instead we store the keys and resolve at read.
      autoValues._keys = autoKeys;
    }
    const vals = Object.values(scores || {});
    const counted = vals.filter((v) => v !== 'na');
    const pts = counted.reduce((s, v) => s + (v === 'compliant' ? 1 : v === 'partial' ? 0.5 : 0), 0);
    const scorePct = counted.length ? Math.round((pts / counted.length) * 100) : null;
    const row = await NabhAssessment.create({
      ...tenant(req), chapter, scores, autoValues, scorePct, assessor: actorId(req),
    });
    await auditLog('nabh_assessed', actorId(req), { chapter, scorePct, ip: req.ip });
    return res.status(201).json({ id: String(row._id), scorePct });
  } catch (err) {
    logger.error(`NABH assess error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/assessments', authorize('staff:view'), async (req, res) => {
  try {
    const filter = tenant(req);
    if (req.query.chapter) filter.chapter = req.query.chapter;
    const rows = await NabhAssessment.find(filter).sort({ assessedAt: -1 }).limit(100).lean();
    return res.json({ assessments: rows });
  } catch (err) {
    logger.error(`NABH list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Auto-KPI keys stored at assess time; the dashboard joins live values
// from GET /api/insights/kpis/compute (single source of formulas).
router.get('/assessments/:id/auto', authorize('staff:view'), async (req, res) => {
  try {
    const row = await NabhAssessment.findOne({ _id: req.params.id, ...tenant(req) }).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ keys: row.autoValues?._keys || [], join: '/api/insights/kpis/compute' });
  } catch (err) {
    logger.error(`NABH auto error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/capa', authorize('staff:view'), async (req, res) => {
  try {
    const filter = tenant(req);
    if (req.query.status) filter.status = req.query.status;
    const rows = await Capa.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ capa: rows });
  } catch (err) {
    logger.error(`CAPA list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/capa', authorize('staff:manage'), async (req, res) => {
  try {
    const { source, sourceRef, finding, rootCause, corrective, preventive, owner, dueDate } = req.body || {};
    if (!finding) return res.status(400).json({ message: 'finding required' });
    const row = await Capa.create({
      ...tenant(req), source: source || 'audit', sourceRef: sourceRef || '',
      finding: String(finding).slice(0, 2000), rootCause: String(rootCause || '').slice(0, 2000),
      corrective: String(corrective || '').slice(0, 2000), preventive: String(preventive || '').slice(0, 2000),
      owner: owner || null, dueDate: dueDate || null, createdBy: actorId(req),
    });
    await auditLog('capa_created', actorId(req), { capaId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`CAPA create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/capa/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const allowed = ['rootCause', 'corrective', 'preventive', 'owner', 'dueDate', 'status', 'effectiveness'];
    const set = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    if (set.status === 'Closed') {
      if (!set.effectiveness) return res.status(400).json({ message: 'effectiveness review required to close' });
      set.closedAt = new Date();
    }
    const row = await Capa.findOneAndUpdate({ _id: req.params.id, ...tenant(req) }, { $set: set }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`CAPA patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/pcpndt', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await PcpndtFormF.find(tenant(req)).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ forms: rows });
  } catch (err) {
    logger.error(`PCPNDT list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/pcpndt', authorize('staff:manage'), async (req, res) => {
  try {
    const { patientId, patientName, husbandName, doctorName, indication, gestationalAgeWeeks, declarationSigned } = req.body || {};
    if (!patientName) return res.status(400).json({ message: 'patientName required' });
    const row = await PcpndtFormF.create({
      ...tenant(req), patientId: patientId || null, patientName,
      husbandName: husbandName || '', doctorName: doctorName || '',
      indication: String(indication || '').slice(0, 500),
      gestationalAgeWeeks: gestationalAgeWeeks ?? null,
      declarationSigned: Boolean(declarationSigned), createdBy: actorId(req),
    });
    await auditLog('pcpndt_filed', actorId(req), { formId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`PCPNDT create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/mtp', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await MtpRegister.find(tenant(req)).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ entries: rows });
  } catch (err) {
    logger.error(`MTP list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/mtp', authorize('staff:manage'), async (req, res) => {
  try {
    const { patientId, patientName, gestationalAgeWeeks, indication, doctorOpinion, consentTaken, procedureDate } = req.body || {};
    if (!patientName || gestationalAgeWeeks == null) {
      return res.status(400).json({ message: 'patientName + gestationalAgeWeeks required' });
    }
    if (!consentTaken) return res.status(422).json({ message: 'Consent is mandatory for MTP registration', code: 'CONSENT_REQUIRED' });
    const row = await MtpRegister.create({
      ...tenant(req), patientId: patientId || null, patientName,
      gestationalAgeWeeks: Number(gestationalAgeWeeks), indication: indication || 'other',
      doctorOpinion: String(doctorOpinion || '').slice(0, 1000),
      consentTaken: true, procedureDate: procedureDate || null, createdBy: actorId(req),
    });
    await auditLog('mtp_registered', actorId(req), { entryId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`MTP create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
