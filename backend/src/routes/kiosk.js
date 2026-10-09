import express from 'express';
import Patient from '../models/Patient.js';
import Token from '../models/Token.js';
import Queue from '../models/Queue.js';
import QueueTicket from '../models/QueueTicket.js';
import { publicSearchLimiter } from '../middleware/rateLimit.js';
import { botProtection } from '../middleware/botProtection.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 15 §15.3: kiosk self-service. Public but hardened: strict rate
// limits + bot protection, minimal fields, provisional records the front
// desk completes (KYC later), duplicate detection routes matches to
// reception instead of forking a second file. No PHI persists on device
// (page auto-resets; enforced client-side with a server short TTL here).

const router = express.Router();

// Walk-in check-in: minimal fields → provisional patient + OPD token.
// Duplicate mobile+DOB routes to reception (no second file).
router.post('/checkin', publicSearchLimiter, botProtection(), async (req, res) => {
  try {
    const { hospitalId, name, phone, dob, department } = req.body || {};
    if (!hospitalId || !name || !phone) {
      return res.status(400).json({ message: 'hospitalId + name + phone required' });
    }
    const dup = await Patient.findOne({ phone: String(phone), dateOfBirth: dob || { $exists: true } })
      .select('_id name').lean();
    if (dup && (!dob || String(dup.dateOfBirth || '') === String(dob))) {
      return res.status(409).json({ message: 'Possible existing record — please see reception', code: 'DUPLICATE_ROUTE_RECEPTION' });
    }
    const patient = await Patient.create({
      name: String(name).slice(0, 120), phone: String(phone).slice(0, 15),
      dateOfBirth: dob || null, hospitalId, provisional: true,
    });
    const dept = department || 'General';
    const queueLength = await Token.countDocuments({
      department: dept, hospitalId, status: { $in: ['Waiting', 'Called', 'In Consultation'] },
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    const token = await Token.create({
      patientId: patient._id, patientName: patient.name,
      department: dept, hospitalId, queuePosition: queueLength + 1,
      estimatedWaitTime: queueLength * 15, checkedInAt: new Date(),
    });
    await auditLog('kiosk_checkin', null, {
      patientId: patient._id, tokenId: token._id, hospitalId, ip: req.ip,
    }).catch(() => {});
    // Also mirror into the unified engine when an OPD queue exists.
    const uq = await Queue.findOne({ hospitalId, type: 'OPD', active: true });
    let unified = null;
    if (uq) {
      const seq = (uq.seq || 0) + 1;
      uq.seq = seq;
      await uq.save();
      unified = await QueueTicket.create({
        queueId: uq._id, hospitalId, number: seq,
        display: `${uq.prefix}-${String(seq).padStart(3, '0')}`,
        patientId: patient._id, priority: 'Walkin', createdVia: 'kiosk',
      });
    }
    return res.status(201).json({
      tokenNumber: token.tokenNumber, queuePosition: token.queuePosition,
      estimatedWaitTime: token.estimatedWaitTime,
      unifiedDisplay: unified ? unified.display : null,
    });
  } catch (err) {
    logger.error(`Kiosk checkin error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
