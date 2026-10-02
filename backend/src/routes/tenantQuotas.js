import express from 'express';
import { z } from 'zod';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';
import { listQuotas, setQuota, deleteQuota } from '../services/tenantQuotaService.js';

/**
 * ADM-M-06 - superadmin management surface for per-tenant API quotas.
 *
 * The enforcement lives in services/tenantQuotaService.js (wired into
 * `protect`); these routes are the management half of the finding: platform
 * operators can see the default, every hospital override and the live window
 * usage, then set or remove an override with an audit row per change.
 *
 * NOTE (harness constraint): this file must NOT import middleware/rateLimit.js
 * - the test harness mock registry stubs a fixed list of limiter exports and
 * any other named import breaks module resolution for every mounted spec.
 */
const router = express.Router();

// Same bounds as normalizeQuota() in the service - a request body can never
// write a value the guard's own reader would reject.
const quotaBodySchema = z.object({
  windowMs: z.number().int().min(1_000).max(3_600_000),
  max: z.number().int().min(1).max(1_000_000),
});

const hospitalIdParam = z.string().regex(/^(default|[0-9a-f]{24})$/, 'hospitalId must be an ObjectId or "default"');

router.get('/', protect, superadminOnly, async (_req, res) => {
  try {
    res.json(await listQuotas());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:hospitalId', protect, superadminOnly, validate(quotaBodySchema), async (req, res) => {
  const parsed = hospitalIdParam.safeParse(req.params.hospitalId);
  if (!parsed.success) return res.status(400).json({ message: 'hospitalId must be an ObjectId or "default"' });
  const hospitalId = parsed.data;
  try {
    const quota = await setQuota(hospitalId, req.body, req.user.name || req.user.id);
    await auditLog('set_tenant_quota', req.user._id, {
      targetHospitalId: hospitalId,
      windowMs: quota.windowMs,
      max: quota.max,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ hospitalId, ...quota });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

router.delete('/:hospitalId', protect, superadminOnly, async (req, res) => {
  const parsed = hospitalIdParam.safeParse(req.params.hospitalId);
  if (!parsed.success) return res.status(400).json({ message: 'hospitalId must be an ObjectId or "default"' });
  const hospitalId = parsed.data;
  try {
    await deleteQuota(hospitalId);
    await auditLog('delete_tenant_quota', req.user._id, {
      targetHospitalId: hospitalId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ hospitalId, deleted: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

export default router;
