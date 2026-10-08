import express from 'express';
import DataSubjectRequest from '../models/DataSubjectRequest.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createDsrSchema } from '../utils/validate.js';
import logger from '../config/logger.js';

// A4 / rolesmd 6.md §2.15 (privacy centre: "data export/delete — DPDP rights";
// only the DELETE half exists as DeletionRequest) + 10.md §4.4 (the admin queue
// is separate, in adminDsr.js).
//
// No authorize() permission here, deliberately: a DPDP right belongs to every
// account, not to a role - deletionRequests.js (POST /) is the same shape, and
// the handler scopes every read to the session's own id. `// authz: self` is
// the decision record for that.
//
// `dueAt` is DATA, computed once at creation (30-day statutory clock; the one
// extension the admin flow allows is recorded against this stored date in
// adminDsr.js, not re-derived from a calendar).
const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
// A malformed id is a 404, not a mongoose CastError surfacing as a 500
// (providerServices' path-param guard, same reasoning).
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);
const DSR_DEADLINE_MS = 30 * 24 * 60 * 60 * 1000;
// Open = still on the clock. fulfilled/rejected are terminal: they do not block
// a later request for the same right.
const OPEN_STATUSES = ['submitted', 'in_review', 'verified'];

const derive = (row) => {
  const plain = typeof row?.toObject === 'function' ? row.toObject() : { ...row };
  const dueMs = plain.dueAt ? new Date(plain.dueAt).getTime() : NaN;
  const open = OPEN_STATUSES.includes(plain.status);
  return {
    ...plain,
    id: String(plain._id),
    overdue: open && Number.isFinite(dueMs) && dueMs < Date.now(),
  };
};

// ─── Request a right ────────────────────────────────────────────────────────

// authz: self
router.post('/', validate(createDsrSchema), async (req, res) => {
  try {
    const userId = String(actorId(req));
    // ONE open request per (account, type): two competing records of the same
    // right would leave an auditor reconciling which one was honoured - the
    // same reason deletionRequests allows only one open row per user.
    const open = await DataSubjectRequest.findOne({ userId, type: req.body.type, status: { $in: OPEN_STATUSES } });
    if (open) {
      return res.status(409).json({ message: `A ${req.body.type} request is already in progress`, id: String(open._id) });
    }

    const created = await DataSubjectRequest.create({
      userId,
      type: req.body.type,
      details: req.body.details ?? '',
      status: 'submitted',
      requestedAt: new Date(),
      dueAt: new Date(Date.now() + DSR_DEADLINE_MS),
    });
    await auditLog('dsr_submitted', actorId(req), {
      requestId: created._id, type: created.type, dueAt: created.dueAt, ip: req.ip,
    });
    return res.status(201).json(derive(created));
  } catch (err) {
    logger.error(`Create data-subject request error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Track own requests ─────────────────────────────────────────────────────

// authz: self
router.get('/', async (req, res) => {
  try {
    // The filter carries the session id - not a slice after the fetch - so an
    // oversized page cannot leak anyone else's rows.
    const filter = { userId: String(actorId(req)) };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    const rows = await DataSubjectRequest.find(filter).sort({ requestedAt: -1 }).limit(100).lean();
    return res.json({ requests: rows.map(derive) });
  } catch (err) {
    logger.error(`List data-subject requests error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: self
router.get('/:id', requireObjectId, async (req, res) => {
  try {
    const row = await DataSubjectRequest.findOne({ _id: req.params.id, userId: String(actorId(req)) }).lean();
    // 404 rather than 403 for a foreign id: confirming the id exists is itself
    // a disclosure (deletionRequests' rule).
    if (!row) return res.status(404).json({ message: 'Request not found' });
    return res.json(derive(row));
  } catch (err) {
    logger.error(`Get data-subject request error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
