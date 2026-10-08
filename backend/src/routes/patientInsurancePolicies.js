import express from 'express';
import InsurancePolicy from '../models/InsurancePolicy.js';
// Repo convention (patient.js:8, insurance.js:8): authorize comes from
// middleware/auth.js alongside protect — middleware/authorize.js's copy is a
// different export graph, and the integration harness substitutes auth.js.
import { protect, authorize } from '../middleware/auth.js';
import { validate, createPolicySchema } from '../utils/validate.js';
import { bookingLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;

// Expiry is derived at READ from validTo — the DSR effectiveStatus precedent.
// A stored status needs a cron job to move ACTIVE -> EXPIRED and is stale
// between runs; a derived one is correct on every response, and there is no
// field for a request to forge.
const withStatus = (row) => ({
  ...row,
  status: new Date(row.validTo).getTime() < Date.now() ? 'expired' : 'active',
});

// ─── My policies (6.md 2.13 "Policies", 6.md 140) ──────────────────────────
// authz: role
router.get('/', protect, authorize('insurance:read', 'insurance:read:own'), async (req, res) => {
  try {
    const rows = await InsurancePolicy.find({ patientId: actorId(req) })
      .sort({ validTo: -1 })
      .lean();
    res.json({ policies: rows.map(withStatus) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add my own policy (6.md 88 "add insurer/TPA, member IDs, validity").
// authz: role
router.post('/', protect, authorize('insurance:write', 'insurance:write:own'), bookingLimiter, validate(createPolicySchema), async (req, res) => {
  try {
    // patientId is NEVER read from the body — the schema is strict, so
    // `patientId: <someone else>` is a 400 before this line, and the session
    // owns the row either way.
    const policy = await InsurancePolicy.create({ ...req.body, patientId: actorId(req) });
    return res.status(201).json(withStatus(policy.toObject?.() ?? policy));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
