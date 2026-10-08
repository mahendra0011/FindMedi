import express from 'express';
import DeletionRequest from '../models/DeletionRequest.js';
import User from '../models/User.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { executeDeletion } from '../services/deletionService.js';
import logger from '../config/logger.js';

/**
 * ADM-M-07 / DLM-06: the request -> approve -> anonymize -> certificate chain.
 *
 * Four hands, deliberately: a user asks, an admin approves, a job performs the
 * erasure, and the certificate records what actually happened. Collapsing any
 * two removes a check the finding was specifically about - the original code
 * was `status: 'blocked'`, i.e. one hand and no verification.
 */
const router = express.Router();

// Admins may see the whole queue (filter: all) and read anyone's record or
// certificate. APPROVE and EXECUTE are NOT in here - those stay behind
// superadminOnly below, keeping 8.md 11's four-hands split: the compliance
// officer investigates and reads the audit trail, a second pair of hands
// performs the erasure.
const isAdmin = (role) => role === 'superadmin' || role === 'admin' || role === 'compliance_officer';

// ─── Request erasure (user self-service) ────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (typeof req.body?.reason !== 'string' || req.body.reason.length > 1000) {
      return res.status(400).json({ message: 'reason must be a string of at most 1000 characters' });
    }
    const userId = String(req.user.id);

    // One open request per user: duplicates would either double-erase or leave
    // two competing records of the same event for an auditor to reconcile.
    const open = await DeletionRequest.findOne({ userId, status: { $in: ['pending', 'approved', 'executing'] } });
    if (open) return res.status(409).json({ message: 'A deletion request is already in progress', id: String(open._id) });

    const done = await DeletionRequest.findOne({ userId, status: 'completed' });
    if (done) return res.status(409).json({ message: 'This account has already been erased' });

    const created = await DeletionRequest.create({
      userId,
      requestedBy: userId,
      channel: 'user_self_service',
      reason: req.body.reason,
    });

    await auditLog(req, { action: 'deletion_request_created', resourceId: String(created._id) });
    res.status(201).json({ id: String(created._id), status: created.status });
  } catch (err) {
    logger.error(`Create deletion request error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Request erasure for someone else (admin-initiated) ─────────────────────
router.post('/for-user', protect, superadminOnly, async (req, res) => {
  try {
    const target = String(req.body?.userId || '');
    if (!target) return res.status(400).json({ message: 'userId is required' });

    if (!(await User.findById(target).select('_id'))) {
      return res.status(404).json({ message: 'User not found' });
    }

    const open = await DeletionRequest.findOne({ userId: target, status: { $in: ['pending', 'approved', 'executing'] } });
    if (open) return res.status(409).json({ message: 'A deletion request is already in progress', id: String(open._id) });

    const created = await DeletionRequest.create({
      userId: target,
      requestedBy: req.user.id,
      channel: 'admin_initiated',
      reason: String(req.body?.reason || ''),
    });

    await auditLog(req, { action: 'admin_deletion_request_created', resourceId: String(created._id) });
    res.status(201).json({ id: String(created._id), status: created.status });
  } catch (err) {
    logger.error(`Admin deletion request error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── List ───────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    // Non-admins see only their own rows. The filter is in the QUERY, not a
    // slice after the fetch, so nothing leaks out of an oversized page.
    const filter = isAdmin(req.user.role) && req.query.all === '1' ? {} : { userId: String(req.user.id) };
    const rows = await DeletionRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      requests: rows.map((r) => ({
        id: String(r._id),
        status: r.status,
        channel: r.channel,
        reason: r.reason,
        createdAt: r.createdAt,
        executedAt: r.executedAt,
        steps: r.steps,
        hasCertificate: Boolean(r.certificate?.sha256),
      })),
    });
  } catch (err) {
    logger.error(`List deletion requests error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const row = await DeletionRequest.findById(req.params.id).lean();
    // 404 rather than 403 for someone else's id: confirming that a guessed id
    // exists is itself a disclosure.
    if (!row) return res.status(404).json({ message: 'Deletion request not found' });
    if (!isAdmin(req.user.role) && String(row.userId) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Deletion request not found' });
    }
    res.json({ ...row, id: String(row._id) });
  } catch (err) {
    logger.error(`Get deletion request error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Approve ────────────────────────────────────────────────────────────────
router.post('/:id/approve', protect, superadminOnly, async (req, res) => {
  try {
    const row = await DeletionRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Deletion request not found' });
    // A state machine, not a free-form status write: approving out of a
    // terminal state would let an already-executed erasure be "approved" again
    // and re-run against a person whose data is gone.
    if (row.status !== 'pending') {
      return res.status(409).json({ message: `Cannot approve a request in status '${row.status}'` });
    }

    row.status = 'approved';
    row.approvedBy = req.user.id;
    row.approvedAt = new Date();
    await row.save();

    await auditLog(req, { action: 'deletion_request_approved', resourceId: String(row._id) });
    res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Approve deletion request error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Execute the erasure chain ──────────────────────────────────────────────
router.post('/:id/execute', protect, superadminOnly, async (req, res) => {
  try {
    const row = await DeletionRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Deletion request not found' });
    // 'failed' may re-run (idempotent steps, so a retry is safe); a completed
    // erasure may not, because the identity it would re-scrub is already gone.
    if (row.status !== 'approved' && row.status !== 'failed') {
      return res.status(409).json({ message: `Cannot execute a request in status '${row.status}'` });
    }

    row.status = 'executing';
    row.executedBy = req.user.id;
    row.attempts += 1;
    await row.save();

    const { steps, failed } = await executeDeletion(row.userId);

    // APPENDED, never overwritten: an earlier attempt's record of a failure
    // must survive a later attempt's success, or the certificate would claim an
    // unbroken chain that was not unbroken.
    row.steps = [...(row.steps || []), ...steps];
    row.executedAt = new Date();

    if (failed.length) {
      row.status = 'failed';
      row.lastError = `failed step(s): ${failed.join(', ')}`;
      // The fail-closed rule the whole feature rests on: no certificate here.
      await row.save();
      await auditLog(req, { action: 'deletion_execution_failed', resourceId: String(row._id), details: { failed } });
      return res.status(500).json({
        id: String(row._id),
        status: row.status,
        failed,
        certificate: null,
        message: 'Erasure incomplete; no certificate issued. The request can be retried.',
      });
    }

    row.status = 'completed';
    row.lastError = '';
    const certificate = row.issueCertificate();
    if (!certificate) {
      // The model refuses to certify a chain containing a failure; if we got
      // here the two disagree, so record that rather than save a completed
      // request with no certificate.
      row.status = 'failed';
      row.lastError = 'certificate_generation_refused';
      await row.save();
      return res.status(500).json({ id: String(row._id), status: row.status, certificate: null, message: 'Certificate refused despite clean chain' });
    }
    await row.save();

    await auditLog(req, { action: 'deletion_executed', resourceId: String(row._id), details: { sha256: certificate.sha256 } });
    res.json({ id: String(row._id), status: row.status, certificate });
  } catch (err) {
    logger.error(`Execute deletion request error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Certificate ────────────────────────────────────────────────────────────
router.get('/:id/certificate', protect, async (req, res) => {
  try {
    const row = await DeletionRequest.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Deletion request not found' });
    if (!isAdmin(req.user.role) && String(row.userId) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Deletion request not found' });
    }
    if (!row.certificate?.sha256) {
      return res.status(404).json({ message: 'No certificate has been issued for this request' });
    }

    // RE-VERIFIED, not merely echoed. Returning the stored hash without
    // recomputing it would let a tampered chain still present a
    // valid-looking certificate, which defeats the point of having one.
    const doc = await DeletionRequest.findById(req.params.id);
    if (!doc.certificateIsValid()) {
      logger.error(`Certificate for ${req.params.id} does not match its recorded chain`);
      return res.status(500).json({ message: 'Certificate does not match the recorded execution chain' });
    }

    res.json({
      certificate: row.certificate,
      // No PII about the erased person travels with the certificate.
      userId: isAdmin(req.user.role) ? String(row.userId) : undefined,
      status: row.status,
      executedAt: row.executedAt,
      steps: row.steps,
    });
  } catch (err) {
    logger.error(`Get certificate error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;
