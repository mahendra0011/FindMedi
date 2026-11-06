import express from 'express';
import { z } from 'zod';
import VendorDpa from '../models/VendorDpa.js';
import { protect } from '../middleware/auth.js';
import { auditLogRequired } from '../middleware/audit.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const READ_ROLES = new Set(['dpo', 'compliance_officer', 'superadmin', 'super_admin', 'security_admin']);
const WRITE_ROLES = new Set(['dpo', 'compliance_officer', 'superadmin', 'super_admin']);
const gate = (roles) => (req, res, next) => roles.has(req.user?.role)
  ? next()
  : res.status(403).json({ message: 'DPO or compliance role required' });
const actorId = (req) => req.user._id ?? req.user.id;
const idParam = (req, res, next) => (/^[0-9a-f]{24}$/i.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' }));
const dateField = z.string().datetime().nullable().optional();
const bodySchema = z.object({
  vendorName: z.string().trim().min(2).max(160),
  serviceDescription: z.string().trim().min(10).max(1000),
  dataCategories: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  processingRegions: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  subprocessors: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  dpaStatus: z.enum(['not_started', 'in_review', 'signed', 'not_required', 'expired']).default('not_started'),
  signedAt: dateField,
  expiresAt: dateField,
  nextReviewAt: dateField,
  dpoOwnerId: z.string().regex(/^[0-9a-f]{24}$/i).nullable().optional(),
  reviewNote: z.string().max(1000).optional(),
}).strict();

// authz: role
router.get('/', gate(READ_ROLES), async (_req, res) => {
  try {
    const vendors = await VendorDpa.find({}).sort({ nextReviewAt: 1, vendorName: 1 }).limit(500).lean();
    return res.json({ vendors });
  } catch (err) {
    logger.error(`Vendor DPA register read failed: ${err.message}`);
    return res.status(500).json({ message: 'Could not load vendor register' });
  }
});

// authz: role
router.post('/', gate(WRITE_ROLES), async (req, res) => {
  const parsed = bodySchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ message: 'Invalid vendor DPA record', errors: parsed.error.issues });
  try {
    const row = await VendorDpa.create({ ...parsed.data, createdBy: actorId(req), updatedBy: actorId(req) });
    await auditLogRequired('vendor_dpa_created', actorId(req), { vendorDpaId: row._id, dpaStatus: row.dpaStatus, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Vendor already exists in the register' });
    logger.error(`Vendor DPA register create failed: ${err.message}`);
    return res.status(500).json({ message: 'Could not create vendor record' });
  }
});

// authz: role
router.patch('/:id', gate(WRITE_ROLES), idParam, async (req, res) => {
  const parsed = bodySchema.partial().safeParse(req.body || {});
  if (!parsed.success || !Object.keys(parsed.data || {}).length) return res.status(400).json({ message: 'Provide valid vendor fields to update' });
  try {
    const row = await VendorDpa.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Vendor record not found' });
    Object.assign(row, parsed.data, { updatedBy: actorId(req) });
    await row.save();
    await auditLogRequired('vendor_dpa_updated', actorId(req), { vendorDpaId: row._id, dpaStatus: row.dpaStatus, ip: req.ip });
    return res.json({ id: String(row._id), dpaStatus: row.dpaStatus, updatedAt: row.updatedAt });
  } catch (err) {
    logger.error(`Vendor DPA register update failed: ${err.message}`);
    return res.status(500).json({ message: 'Could not update vendor record' });
  }
});

export default router;
