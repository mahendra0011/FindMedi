import express from 'express';
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';
import IcuFlowsheet from '../models/IcuFlowsheet.js';
import Admission from '../models/Admission.js';
import { protect } from '../middleware/auth.js';
import { templateFor, templateSpecialties } from '../lib/emrTemplates.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §04.1/04.3/04.5: EMR templates (read-only), CDSS safety check
// (allergy + interaction + duplicate therapy from catalog data), ICU
// flowsheet rows. Advisory only — never blocks prescribing (the clinician
// decides; the alert is the safety net, and it is logged).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const norm = (s) => String(s || '').trim().toLowerCase();

// authz: any authenticated clinician context (templates are knowledge, not PHI).
router.get('/emr/templates', async (req, res) => {
  try {
    const { specialty } = req.query;
    if (!specialty) return res.json({ specialties: templateSpecialties() });
    return res.json({ specialty, template: templateFor(specialty) });
  } catch (err) {
    logger.error(`EMR templates error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: clinical roles prescribe; the check itself reveals nothing stored.
router.post('/cds/check', async (req, res) => {
  try {
    const { patientId, medicines } = req.body || {};
    if (!Array.isArray(medicines) || !medicines.length) {
      return res.status(400).json({ message: 'medicines[] required' });
    }
    const names = medicines.map((m) => String(m.medicineName || m.name || '')).filter(Boolean);
    const catalog = await Medicine.find({ $or: [
      { name: { $in: names } }, { genericName: { $in: names } },
    ] }).select('name genericName interactions contraindications').lean();
    const byName = new Map();
    for (const c of catalog) {
      byName.set(norm(c.name), c);
      byName.set(norm(c.genericName), c);
    }
    let allergies = [];
    if (patientId) {
      const u = await User.findById(patientId).select('allergies').lean();
      allergies = (u?.allergies || []).map((a) => norm(a.allergen || a));
    }
    const alerts = [];
    const seen = new Set();
    for (const n of names) {
      const key = norm(n);
      if (seen.has(key)) {
        alerts.push({ level: 'warning', type: 'duplicate_therapy', drug: n });
        continue;
      }
      seen.add(key);
      const c = byName.get(key);
      if (!c) {
        alerts.push({ level: 'info', type: 'unknown_drug', drug: n });
        continue;
      }
      for (const al of allergies) {
        if (al && (key.includes(al) || al.includes(key))) {
          alerts.push({ level: 'critical', type: 'allergy', drug: n, allergen: al });
        }
      }
      for (const inter of (c.interactions || [])) {
        if (names.some((o) => norm(o) !== key && norm(inter).includes(norm(o)))) {
          alerts.push({ level: 'warning', type: 'interaction', drug: n, with: inter });
        }
      }
    }
    await auditLog('cds_checked', actorId(req), {
      patientId: patientId || null, drugs: names.length,
      critical: alerts.filter((a) => a.level === 'critical').length, ip: req.ip,
    }).catch(() => {});
    return res.json({ alerts });
  } catch (err) {
    logger.error(`CDSS error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Doc 11 §5 P0: Rx templates + favourites (private to authoring doctor).
router.get('/rx-templates', async (req, res) => {
  try {
    const { default: RxTemplate } = await import('../models/RxTemplate.js');
    const rows = await RxTemplate.find({ doctorId: actorId(req) }).sort({ favourite: -1, updatedAt: -1 }).limit(100).lean();
    return res.json({ templates: rows });
  } catch (err) {
    logger.error(`Rx templates error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/rx-templates', async (req, res) => {
  try {
    const { name, diagnosis, diagnosisIcd, medicines, favourite } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const { default: RxTemplate } = await import('../models/RxTemplate.js');
    const t = await RxTemplate.create({
      doctorId: actorId(req), hospitalId: req.user.hospitalId,
      name: String(name).slice(0, 120), diagnosis: diagnosis || '', diagnosisIcd: diagnosisIcd || '',
      medicines: Array.isArray(medicines) ? medicines.slice(0, 50) : [],
      favourite: Boolean(favourite),
    });
    return res.status(201).json({ id: String(t._id) });
  } catch (err) {
    logger.error(`Rx template create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Doc 11 P2: scribe draft — deterministic SOAP composer from chart data.
// A future LLM call slots in here (same input/output); the draft is ALWAYS
// doctor-reviewed before sign, never auto-filed.
router.post('/scribe/draft', async (req, res) => {
  try {
    const { encounterId } = req.body || {};
    if (!encounterId) return res.status(400).json({ message: 'encounterId required' });
    const { default: Encounter } = await import('../models/Encounter.js');
    const { default: Record } = await import('../models/Record.js');
    const { default: Order } = await import('../models/Order.js');
    const enc = await Encounter.findById(encounterId).lean();
    if (!enc) return res.status(404).json({ message: 'Encounter not found' });
    const [records, orders] = await Promise.all([
      Record.find({ encounterId }).sort({ createdAt: -1 }).limit(10).lean(),
      Order.find({ encounterId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const latest = records[0] || {};
    const vitals = latest.vitals && typeof latest.vitals === 'object'
      ? Object.entries(latest.vitals).map(([k, v]) => `${k}: ${v}`).join(', ') : 'not recorded';
    const draft = {
      subjective: `Chief complaint: ${latest.chiefComplaint || latest.diagnosis || '—'}. HPI: ${latest.notes || '—'}`,
      objective: `Vitals: ${vitals}. Examination: ${latest.examination || '—'}`,
      assessment: `Provisional: ${latest.diagnosis || '—'}${latest.diagnosisIcd ? ` (${latest.diagnosisIcd})` : ''}`,
      plan: orders.length
        ? orders.map((o) => `${o.kind}: ${(o.items || []).map((i) => i.description || i).join(', ') || o.status}`).join(' | ')
        : 'No orders yet',
      disclaimer: 'Draft for doctor review — verify before signing.',
    };
    await auditLog('scribe_drafted', actorId(req), { encounterId, ip: req.ip }).catch(() => {});
    return res.json({ draft });
  } catch (err) {
    logger.error(`Scribe error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ICU flowsheet rows (upsert per admission+hour).
router.post('/icu/flowsheet', async (req, res) => {
  try {
    const { admissionId, hourSlot, vitals, ventilator, infusions, gcs, sedationScore } = req.body || {};
    if (!admissionId || !hourSlot) return res.status(400).json({ message: 'admissionId + hourSlot required' });
    const adm = await Admission.findById(admissionId).select('patientId hospitalId').lean();
    if (!adm) return res.status(404).json({ message: 'Admission not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && String(adm.hospitalId || '') !== String(req.user.hospitalId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const row = await IcuFlowsheet.findOneAndUpdate(
      { admissionId, hourSlot: new Date(hourSlot) },
      {
        $set: {
          patientId: adm.patientId, hospitalId: adm.hospitalId,
          vitals: vitals || {}, ventilator: ventilator || {}, infusions: infusions || [],
          gcs: gcs || {}, sedationScore: sedationScore || '', recordedBy: actorId(req),
        },
      },
      { new: true, upsert: true },
    );
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`ICU flowsheet error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/icu/flowsheet', async (req, res) => {
  try {
    const { admissionId } = req.query;
    if (!admissionId) return res.status(400).json({ message: 'admissionId required' });
    const rows = await IcuFlowsheet.find({ admissionId }).sort({ hourSlot: 1 }).limit(500).lean();
    return res.json({ rows });
  } catch (err) {
    logger.error(`ICU flowsheet read error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
