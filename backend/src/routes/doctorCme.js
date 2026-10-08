import express from 'express';
import Doctor from '../models/Doctor.js';
import CMECredit from '../models/CMECredit.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createCMECreditSchema } from '../utils/validate.js';

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;

// Own Doctor profiles, resolved once per request: every read and write below
// is scoped to these ids, so the profile boundary — not a parameter — decides
// whose credits are visible. A caller with no linked Doctor rows gets empty
// lists and 404s on writes, never another clinician's data.
const myDoctorIds = async (req) => {
  const rows = await Doctor.find({ user_id: actorId(req) }).select('_id').lean();
  return rows.map((r) => r._id);
};

// ─── CME tracker (7.md:39) ──────────────────────────────────────────────────
// Doctor-dashboard surface: self-reported credits with year totals derived at
// read (never stored — a stored total drifts the moment a row is deleted).
// authz: object
router.get('/', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const year = req.query.year == null || req.query.year === '' ? null : String(req.query.year);
    if (year && !/^\d{4}$/.test(year)) return res.status(400).json({ message: 'year must be YYYY' });
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const ids = await myDoctorIds(req);
    if (!ids.length) return res.json({ total: 0, creditsTotal: 0, byYear: {}, credits: [] });
    const filter = { doctorId: { $in: ids }, ...(year ? { date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } } : {}) };
    const rows = await CMECredit.find(filter).sort({ date: -1 }).limit(limit).lean();
    const creditsTotal = rows.reduce((sum, r) => sum + (r.credits || 0), 0);
    const byYear = {};
    for (const r of rows) {
      const y = String(r.date ?? '').slice(0, 4);
      byYear[y] = (byYear[y] || 0) + (r.credits || 0);
    }
    return res.json({
      total: rows.length, creditsTotal, byYear,
      credits: rows.map((r) => ({
        id: String(r._id), doctorId: String(r.doctorId), title: r.title,
        organizer: r.organizer ?? '', credits: r.credits, date: r.date,
        certificateUrl: r.certificateUrl ?? '',
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.post('/', protect, authorize('profile:write:own'), validate(createCMECreditSchema), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const ids = await myDoctorIds(req);
    if (!ids.map(String).includes(String(req.body.doctorId))) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    const row = await CMECredit.create({
      doctorId: req.body.doctorId,
      doctorUserId: me,
      title: req.body.title,
      organizer: req.body.organizer ?? '',
      credits: req.body.credits,
      date: req.body.date,
      certificateUrl: req.body.certificateUrl ?? '',
    });
    await auditLog('cme_credit_created', me, { doctorId: String(req.body.doctorId), creditId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.delete('/:id', protect, requireObjectId, authorize('profile:write:own'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const ids = await myDoctorIds(req);
    const removed = await CMECredit.findOneAndDelete({ _id: req.params.id, doctorId: { $in: ids } });
    if (!removed) return res.status(404).json({ message: 'Credit not found' });
    await auditLog('cme_credit_deleted', me, { creditId: String(removed._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
