import express from 'express';
import { z } from 'zod';
import License from '../models/License.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const licenseSchema = z.object({
  facilityName: z.string().trim().min(1).max(200).optional(),
  licenseType: z.string().trim().max(120).optional(),
  licenseNumber: z.string().trim().max(120).optional(),
  issuingAuthority: z.string().trim().max(200).optional(),
  issueDate: z.string().max(40).optional(),
  expiryDate: z.string().max(40).optional(),
  status: z.string().trim().max(60).optional(),
  documentUrl: z.string().trim().max(2048).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

const router = express.Router();

// 8.md 11: the licence/registry tracker is the compliance_officer's console
// (list, edit, expiry watch, stats). Licences are evidence of who may practise
// at a facility, so the gate is platform-wide - never tenant-scoped.
router.get('/', protect, requireRole(['superadmin', 'compliance_officer']), async (req, res) => {
  try {
    const { status, facilityType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (facilityType) filter.facilityType = facilityType;
    if (search) filter.$or = [
      { facilityName: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { licenseNumber: new RegExp(escapeRegex(capSearch(search)), 'i') },
    ];
    const licenses = await License.find(filter).sort({ expiryDate: 1 });
    res.json({ licenses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, requireRole(['superadmin', 'compliance_officer']), validate(licenseSchema), async (req, res) => {
  try {
    const { pickBody } = await import('../utils/pick.js');
    const license = await License.findByIdAndUpdate(req.params.id,
      pickBody(req.body, ['facilityName', 'licenseType', 'licenseNumber', 'issuingAuthority', 'issueDate', 'expiryDate', 'status', 'documentUrl', 'notes']), { new: true });
    if (!license) return res.status(404).json({ message: 'License not found' });
    await auditLog('update_license', req.user._id, { targetLicenseId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(license);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/expiring', protect, requireRole(['superadmin', 'compliance_officer']), async (req, res) => {
  try {
    const licenses = await License.find({ status: 'Expiring Soon' }).sort({ expiryDate: 1 });
    res.json({ licenses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, requireRole(['superadmin', 'compliance_officer']), async (req, res) => {
  try {
    const total = await License.countDocuments();
    const active = await License.countDocuments({ status: 'Active' });
    const expiringSoon = await License.countDocuments({ status: 'Expiring Soon' });
    const expired = await License.countDocuments({ status: 'Expired' });
    res.json({ total, active, expiringSoon, expired });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;