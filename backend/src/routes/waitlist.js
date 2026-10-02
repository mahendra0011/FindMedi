import express from 'express';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import {
  joinWaitlist,
  listMyEntries,
  acceptOffer,
  leaveEntry,
  sendWaitlistError,
} from '../services/waitlistService.js';

/**
 * APPT-M-01: patient-facing waitlist API.
 *
 * All four routes are self-scoped (the entry is loaded with
 * `patientId: req.user._id`, so someone else's id 404s rather than 403s) -
 * hence the `self` tag on every definition. The slot-free side of the feature
 * lives in waitlistService.onSlotFreed and is wired into the cancellation
 * paths in routes/appointments.js, routes/billing.js and routes/transactions.js.
 */
const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

// authz: self
router.post('/', protect, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body || {};
    if (!doctorId || !OBJECT_ID.test(String(doctorId))) {
      return res.status(400).json({ message: 'doctorId is required and must be an ObjectId' });
    }
    if (!date || !DATE.test(String(date))) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }
    if (!time || !TIME.test(String(time))) {
      return res.status(400).json({ message: 'time must be HH:MM' });
    }
    const entry = await joinWaitlist({
      patientId: req.user._id,
      patientName: req.user.name || '',
      doctorId,
      date,
      time,
    });
    await auditLog('waitlist_join', req.user._id, {
      recordId: entry._id, ip: req.ip, userAgent: req.get('user-agent'),
      doctorId, date, time,
    });
    return res.status(201).json(entry);
  } catch (err) {
    return sendWaitlistError(res, err);
  }
});

// authz: self
router.get('/mine', protect, async (req, res) => {
  try {
    const entries = await listMyEntries(req.user._id);
    return res.json(entries);
  } catch (err) {
    return sendWaitlistError(res, err);
  }
});

// authz: self
router.post('/:id/accept', protect, async (req, res) => {
  try {
    if (!OBJECT_ID.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid waitlist entry id' });
    }
    const result = await acceptOffer(req.params.id, req.user);
    await auditLog('waitlist_accept', req.user._id, {
      recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent'),
      alreadyAccepted: Boolean(result.alreadyAccepted),
    });
    return res.json(result);
  } catch (err) {
    return sendWaitlistError(res, err);
  }
});

// authz: self
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!OBJECT_ID.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid waitlist entry id' });
    }
    const result = await leaveEntry(req.params.id, req.user);
    await auditLog('waitlist_leave', req.user._id, {
      recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent'),
      released: Boolean(result.released), entryStatus: result.entry?.status,
    });
    return res.json(result);
  } catch (err) {
    return sendWaitlistError(res, err);
  }
});

export default router;
