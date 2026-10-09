import express from 'express';
import Enquiry from '../models/Enquiry.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 22 P0-6: front-office enquiry log + conversion to patient.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

router.get('/enquiries', authorize('staff:view'), async (req, res) => {
  try {
    const filter = tenant(req);
    if (req.query.status) filter.status = req.query.status;
    const rows = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ enquiries: rows });
  } catch (err) {
    logger.error(`Enquiries error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/enquiries', authorize('staff:view'), async (req, res) => {
  try {
    const { name, phone, source, interest, notes, followUpAt } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const row = await Enquiry.create({
      ...tenant(req), name: String(name).slice(0, 120), phone: String(phone || '').slice(0, 20),
      source: source || 'walkin', interest: String(interest || '').slice(0, 200),
      notes: String(notes || '').slice(0, 1000), followUpAt: followUpAt || null,
      createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Enquiry create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/enquiries/:id', authorize('staff:view'), async (req, res) => {
  try {
    const allowed = ['source', 'interest', 'notes', 'followUpAt', 'status', 'convertedPatientId'];
    const set = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    const row = await Enquiry.findOneAndUpdate({ _id: req.params.id, ...tenant(req) }, { $set: set }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('enquiry_updated', actorId(req), { enquiryId: row._id, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Enquiry patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
