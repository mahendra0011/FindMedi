import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getIO, notifyUser } from '../services/socketService.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../services/notificationService.js';
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
    // NOTIF-B-05: code-blue / critical broadcasts go through the controlled
    // writer so they are de-duplicated but never rate-capped.
    await createNotification({
      title,
      message,
      type,
      userId: String(a._id),
      priority: 'critical',
    }).catch(() => {});
  }
  return admins.length;
}

// ─── POST /api/clinical-alerts/code-blue ────────────────────────────────────
// Spec expansion-09A: ward cardiac-arrest broadcast to the hospital room.
router.post('/code-blue', protect, authorize('emergency:write'), requireStaff, async (req, res) => {
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
    const notified = await notifyHospitalAdmins(hospitalId, '🚨 CODE BLUE', `Cardiac arrest — Ward ${ward}, Bed ${bedId} (${patientName}).`);
    // File 22 P0-10: manual trigger flows through the alert doorway too
    // (persisted Action-Center row + dashboard:alert push + rule ledger).
    const { raiseAlert } = await import('../lib/alerts.js');
    await raiseAlert({
      hospitalId, severity: 'critical',
      message: `CODE BLUE — Ward ${ward}, Bed ${bedId} (${patientName})${note ? `: ${note}` : ''}`,
      entityRef: { model: 'Emergency', id: null }, ruleKey: 'code-blue',
      by: req.user._id ?? req.user.id,
    });
    res.status(201).json({ success: true, ...payload, notifiedAdmins: notified });
  } catch (err) {
    logger.error(`Code blue error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/clinical-alerts/lab-panic ────────────────────────────────────
// Spec expansion-09B: critical lab value → ordering physician interception.
router.post('/lab-panic', protect, authorize('emergency:write'), requireStaff, async (req, res) => {
  try {
    const { doctorId, patientName = '', testName = '', value = '', countermeasure = '' } = req.body;
    if (!doctorId) return res.status(400).json({ message: 'doctorId required' });
    const payload = {
      alertId: `LP-${Date.now().toString(36).toUpperCase()}`,
      patientName, testName, value, countermeasure,
      toneType: 'lab_panic',
      at: new Date().toISOString(),
    };
    const { notification } = await createNotification({
      title: '🔴 STAT LAB PANIC VALUE',
      message: `${testName}: ${value} for ${patientName}. Immediate countermeasure required.`,
      type: 'emergency',
      userId: String(doctorId),
      // NOTIF-B-05: a panic value is a life-safety alert — never rate-capped or
      // de-duplicated away.
      priority: 'critical',
    }).catch(() => ({ notification: null }));
    if (notification) notifyUser(notification.userId, notification);
    const io = getIO();
    io?.to(`user:${doctorId}`).emit('clinical:lab_panic', payload);
    // File 22 P0-10: same doorway (persisted + dashboard push + ledger).
    const { raiseAlert } = await import('../lib/alerts.js');
    await raiseAlert({
      hospitalId: req.user.hospitalId, severity: 'critical',
      message: `LAB PANIC — ${testName}: ${value} for ${patientName}`,
      entityRef: { model: 'LabOrder', id: null }, ruleKey: 'lab-panic',
      by: req.user._id ?? req.user.id,
    });
    res.status(201).json({ success: true, ...payload });
  } catch (err) {
    logger.error(`Lab panic error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/clinical-alerts/mtp ──────────────────────────────────────────
// Spec expansion-09C: massive-transfusion protocol → blood-bank + hospital room.
router.post('/mtp', protect, authorize('emergency:write'), requireStaff, async (req, res) => {
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
    // File 22 P0-10: same doorway (persisted + dashboard push + ledger).
    const { raiseAlert } = await import('../lib/alerts.js');
    await raiseAlert({
      hospitalId, severity: 'critical',
      message: `MTP ACTIVATED — ${payload.units} units ${bloodGroup} (${requester || 'ER'})`,
      entityRef: { model: 'BloodRequest', id: null }, ruleKey: 'mtp',
      by: req.user._id ?? req.user.id,
    });
    res.status(201).json({ success: true, ...payload, notifiedAdmins: notified });
  } catch (err) {
    logger.error(`MTP error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;
