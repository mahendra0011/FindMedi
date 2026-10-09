import express from 'express';
import DeathRecord from '../models/DeathRecord.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §06.7: mortuary — body receipt (ward/ER/outside) with chamber tag,
// ID verification, release to authorised person, unclaimed-body flagging.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const STAFF = ['hospital_admin', 'superadmin', 'doctor', 'nurse',
  // File 22 P0-8: mortuary attendants + nursing supervisors work here too.
  'mortuary_attendant', 'nursing_supervisor', 'matron'];
const staffOnly = (req, res, next) => (
  STAFF.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Staff access required' })
);
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

router.get('/', staffOnly, async (req, res) => {
  try {
    const { released } = req.query;
    const filter = { ...tenantFilter(req) };
    if (released === 'no') filter.releasedAt = null;
    if (released === 'yes') filter.releasedAt = { $ne: null };
    const rows = await DeathRecord.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ records: rows });
  } catch (err) {
    logger.error(`Mortuary list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/receive', staffOnly, async (req, res) => {
  try {
    const { patientName, from, timeOfDeath, causeIcd10, causeText, mlcCaseId } = req.body || {};
    if (!patientName || !timeOfDeath) return res.status(400).json({ message: 'patientName + timeOfDeath required' });
    const tagNo = `MT-${Date.now().toString(36).toUpperCase()}`;
    const row = await DeathRecord.create({
      hospitalId: req.user.hospitalId, patientName, timeOfDeath: new Date(timeOfDeath),
      causeIcd10: causeIcd10 || '', causeText: String(causeText || '').slice(0, 2000),
      mlcCaseId: mlcCaseId || null, mortuaryTagNo: tagNo, createdBy: actorId(req),
    });
    await auditLog('mortuary_received', actorId(req), { deathId: row._id, tagNo, from: from || '', ip: req.ip });
    return res.status(201).json({ id: String(row._id), mortuaryTagNo: tagNo });
  } catch (err) {
    logger.error(`Mortuary receive error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:id/release', staffOnly, async (req, res) => {
  try {
    const { releasedTo, releasedToId, certificateNo } = req.body || {};
    if (!releasedTo) return res.status(400).json({ message: 'releasedTo (authorised person) required' });
    const row = await DeathRecord.findById(req.params.id);
    if (!row || row.releasedAt) return res.status(404).json({ message: 'Releasable record not found' });
    row.releasedTo = String(releasedTo).slice(0, 200);
    row.releasedToId = String(releasedToId || '').slice(0, 60);
    if (certificateNo) row.certificateNo = String(certificateNo).slice(0, 60);
    row.releasedAt = new Date();
    await row.save();
    await auditLog('mortuary_released', actorId(req), {
      deathId: row._id, tagNo: row.mortuaryTagNo, releasedTo, ip: req.ip,
    });
    return res.json({ id: String(row._id), releasedAt: row.releasedAt });
  } catch (err) {
    logger.error(`Mortuary release error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
