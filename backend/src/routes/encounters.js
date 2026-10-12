import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Encounter from '../models/Encounter.js';
import { closeEncounter } from '../lib/encounter.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();
router.use(protect);

// Recent encounters (open first) for the OPD panel — records:read covers
// clinicians, appointments:read covers front-desk/counter roles.
router.get('/', authorize('records:read', 'appointments:read'), async (req, res) => {
  try {
    const { patientId, status, limit: lim } = req.query || {};
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    const rows = await Encounter.find(filter)
      .sort({ status: 1, openedAt: -1 })
      .limit(Math.min(Number(lim) || 50, 200))
      .lean();
    res.json({ encounters: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', authorize('records:read', 'appointments:read'), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const enc = await Encounter.findOne(filter).lean();
    if (!enc) return res.status(404).json({ message: 'Encounter not found' });
    res.json({ encounter: enc });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Manual close (front-desk correcting a visit the token/ticket never closed).
router.put('/:id/close', authorize('records:write', 'appointments:write'), async (req, res) => {
  try {
    const enc = await closeEncounter({ encounterId: req.params.id, hospitalId: req.user.hospitalId });
    if (!enc) return res.status(404).json({ message: 'Open encounter not found' });
    await auditLog('encounter.close', req.user._id, { encounterId: enc._id, encounterNo: enc.encounterNo });
    res.json({ encounter: enc });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Reopen (amendment window) — admin/records:amend style correction.
router.put('/:id/reopen', authorize('records:write'), async (req, res) => {
  try {
    const filter = { _id: req.params.id, status: 'Closed' };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const enc = await Encounter.findOneAndUpdate(
      filter,
      { $set: { status: 'Open', closedAt: null } },
      { new: true },
    );
    if (!enc) return res.status(404).json({ message: 'Closed encounter not found' });
    await auditLog('encounter.reopen', req.user._id, { encounterId: enc._id, encounterNo: enc.encounterNo });
    res.json({ encounter: enc });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
