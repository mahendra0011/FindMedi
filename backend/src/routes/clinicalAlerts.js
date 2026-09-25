import express from 'express';
import { protect } from '../middleware/auth.js';
import { getIO } from '../services/socketService.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const router = express.Router();

const STAFF_ROLES = ['superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'nurse', 'technician'];

function requireStaff(req, res, next) {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Clinical staff only' });
  }
  next();
}

async function notifyHospitalAdmins(hospitalId, title, message, type = 'emergency') {
  if (!hospitalId) return 0;
  const admins = await User.find({ hospitalId, role: 'hospital_admin' }, { _id: 1 }).lean();
  for (const a of admins) {
    await Notification.create({ title, message, type, userId: String(a._id) }).catch(() => {});
  }
  return admins.length;
}

// ─── POST /api/clinical-alerts/code-blue ────────────────────────────────────
// Spec expansion-09A: ward cardiac-arrest broadcast to the hospital room.
router.post('/code-blue', protect, requireStaff, async (req, res) => {
  try {
    const { hospitalId, ward = '', bedId = '', patientName = '', note = '' } = req.body;
    if (!hospitalId) return res.status(400).json({ message: 'hospitalId required' });
    const payload = {
      alertId: `CB-${Date.now().toString(36).toUpperCase()}`,
      hospitalId: String(hospitalId),
      ward, bedId, patientName, note,
      toneType: 'code_blue',
      at: new Date().toISOString(),
    };
    const io = getIO();
    io?.to(`hospital:${hospitalId}`).emit('clinical:code_blue', payload);
    const notified = await notifyHospitalAdmins(hospitalId, '🔵 CODE BLUE', `Cardiac arrest — Ward ${ward}, Bed ${bedId} (${patientName}).`);
    res.status(201).json({ success: true, ...payload, notifiedAdmins: notified });
  } catch (err) {
    logger.error(`Code blue error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/clinical-alerts/lab-panic ────────────────────────────────────
// Spec expansion-09B: critical lab value → ordering physician interception.
router.post('/lab-panic', protect, requireStaff, async (req, res) => {
  try {
    const { doctorId, patientName = '', testName = '', value = '', countermeasure = '' } = req.body;
    if (!doctorId) return res.status(400).json({ message: 'doctorId required' });
    const payload = {
      alertId: `LP-${Date.now().toString(36).toUpperCase()}`,
      patientName, testName, value, countermeasure,
      toneType: 'lab_panic',
      at: new Date().toISOString(),
    };
    await Notification.create({
      title: '🔴 STAT LAB PANIC VALUE',
      message: `${testName}: ${value} for ${patientName}. Immediate countermeasure required.`,
      type: 'emergency',
      userId: String(doctorId),
    }).catch(() => {});
    const io = getIO();
    io?.to(`user:${doctorId}`).emit('clinical:lab_panic', payload);
    res.status(201).json({ success: true, ...payload });
  } catch (err) {
    logger.error(`Lab panic error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/clinical-alerts/mtp ──────────────────────────────────────────
// Spec expansion-09C: massive-transfusion protocol → blood-bank + hospital room.
router.post('/mtp', protect, requireStaff, async (req, res) => {
  try {
    const { hospitalId, bloodGroup = 'O-Neg', units = 4, requester = '' } = req.body;
    if (!hospitalId) return res.status(400).json({ message: 'hospitalId required' });
    const payload = {
      alertId: `MTP-${Date.now().toString(36).toUpperCase()}`,
      hospitalId: String(hospitalId),
      bloodGroup, units: Number(units) || 4, requester,
      toneType: 'siren',
      at: new Date().toISOString(),
    };
    const io = getIO();
    io?.to(`hospital:${hospitalId}`).emit('clinical:mtp', payload);
    const notified = await notifyHospitalAdmins(hospitalId, '🩸 MTP ACTIVATED', `Pack ${payload.units} units ${bloodGroup} — requested by ${requester || 'ER'}.`);
    res.status(201).json({ success: true, ...payload, notifiedAdmins: notified });
  } catch (err) {
    logger.error(`MTP error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;
