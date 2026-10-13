/**
 * File 25 §11/§12: activity & audit endpoints (the Activity tab + the
 * patient-facing "who viewed my record" view).
 *
 * Three audiences, three doors:
 *   GET /me       — self-service. Patients see accesses TO their record;
 *                   staff see their own trail. No permission needed beyond
 *                   authentication (the filter IS the gate — you can only
 *                   ever read rows about yourself).
 *   GET /         — auditors (audit:read): full trail, filterable.
 *   GET /metrics  — auditors: in-process IAM counters (§12 observability).
 */
import express from 'express';
import IamAccessLog from '../models/IamAccessLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { getIamMetrics } from '../services/iamAccessLogService.js';
import logger from '../config/logger.js';

const router = express.Router();

const capInt = (v, fallback, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
};

// ─── Self view ─────────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const selfId = req.user._id ?? req.user.id;
    // Patients ask "who touched MY record"; everyone else asks "what did I do".
    const filter = req.user.role === 'patient'
      ? { patientId: selfId }
      : { actorId: selfId };
    const rows = await IamAccessLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ entries: rows });
  } catch (err) {
    logger.error(`Access log /me error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Metrics (§12) ─────────────────────────────────────────────────────────
router.get('/metrics', protect, authorize('audit:read'), (_req, res) => {
  return res.json(getIamMetrics());
});

// ─── Full trail (auditors) ─────────────────────────────────────────────────
router.get('/', protect, authorize('audit:read'), async (req, res) => {
  try {
    const { patientId, actorId, action, flagged, sensitivity, from, to } = req.query;
    const filter = {};
    if (patientId) filter.patientId = String(patientId);
    if (actorId) filter.actorId = String(actorId);
    if (action) filter.action = String(action);
    if (sensitivity) filter.sensitivity = String(sensitivity);
    if (flagged === 'true') filter.flagged = true;
    if (flagged === 'false') filter.flagged = false;
    if (from || to) {
      const range = {};
      const fromMs = from ? Date.parse(String(from)) : NaN;
      const toMs = to ? Date.parse(String(to)) : NaN;
      if (!Number.isNaN(fromMs)) range.$gte = new Date(fromMs);
      if (!Number.isNaN(toMs)) range.$lte = new Date(toMs);
      // Garbage dates are ignored rather than 500ing — a filter typo must
      // not take the audit view down.
      if (Object.keys(range).length) filter.createdAt = range;
    }
    const page = capInt(req.query.page, 1, 10_000);
    const limit = capInt(req.query.limit, 50, 200);
    const [entries, total] = await Promise.all([
      IamAccessLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      IamAccessLog.countDocuments(filter),
    ]);
    return res.json({ entries, total, page, limit });
  } catch (err) {
    logger.error(`Access log list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
