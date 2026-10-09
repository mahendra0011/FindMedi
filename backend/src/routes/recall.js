import express from 'express';
import RecallRule from '../models/RecallRule.js';
import RecallLog from '../models/RecallLog.js';
import Prescription from '../models/Prescription.js';
import VaccinationSchedule from '../models/VaccinationSchedule.js';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// Doc 12 §6 P1: recall engine. Dues are DERIVED (follow-up dates +
// vaccine schedules due within 7 days); sends dedupe per rule+patient+
// due-date and honour mutedTypes/opt-out. Only the `notification` channel
// sends today (durable in-app record); whatsapp/sms rules are configurable
// but report pending-provider until a DLT sender is connected.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const CLINIC_ROLES = ['clinic_admin', 'clinic_doctor', 'clinic_receptionist', 'hospital_admin', 'superadmin', 'doctor'];
const clinicOnly = (req, res, next) => (
  CLINIC_ROLES.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Clinic access required' })
);
const tenantFilter = (req) => {
  const t = req.user.facilityId || req.user.hospitalId;
  return req.user.role === 'superadmin' && !t ? {} : { $or: [{ facilityId: t }, { hospitalId: t }] };
};
const WINDOW_DAYS = 7;
const windowEnd = () => new Date(Date.now() + WINDOW_DAYS * 864e5);

router.get('/rules', clinicOnly, async (req, res) => {
  try {
    const rows = await RecallRule.find(tenantFilter(req)).limit(100).lean();
    return res.json({ rules: rows });
  } catch (err) {
    logger.error(`Recall rules error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/rules', clinicOnly, async (req, res) => {
  try {
    const { kind, intervalDays, messageTemplate, channel } = req.body || {};
    if (!['follow_up', 'vaccination', 'chronic_lab', 'post_procedure'].includes(kind)) {
      return res.status(400).json({ message: 'Invalid kind' });
    }
    const row = await RecallRule.create({
      hospitalId: req.user.hospitalId, facilityId: req.user.facilityId,
      kind, intervalDays: Number(intervalDays) || 90,
      messageTemplate: String(messageTemplate || '').slice(0, 500),
      channel: channel || 'notification', createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Recall rule error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Derived dues: follow-ups + vaccine doses due within the window.
router.get('/dues', clinicOnly, async (req, res) => {
  try {
    const end = windowEnd();
    const tf = tenantFilter(req);
    const [followUps, schedules] = await Promise.all([
      Prescription.find({ ...tf, status: 'Active', followUpDate: { $lte: end } })
        .select('patientId patientName followUpDate diagnosis').limit(200).lean(),
      VaccinationSchedule.find({ status: 'scheduled', 'doses.dueAt': { $lte: end }, 'doses.givenAt': null })
        .select('userId vaccineName doses').limit(200).lean(),
    ]);
    const dues = [
      ...followUps.map((p) => ({ kind: 'follow_up', patientId: p.patientId, name: p.patientName, dueAt: p.followUpDate, detail: p.diagnosis })),
      ...schedules.flatMap((s) => (s.doses || [])
        .filter((d) => !d.givenAt && new Date(d.dueAt) <= end)
        .map((d) => ({ kind: 'vaccination', patientId: s.userId, name: s.vaccineName, dueAt: d.dueAt, detail: `Dose ${d.number}` }))),
    ];
    return res.json({ dues, windowDays: WINDOW_DAYS });
  } catch (err) {
    logger.error(`Recall dues error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/send', clinicOnly, async (req, res) => {
  try {
    const { ruleId, patientIds } = req.body || {};
    const rule = ruleId ? await RecallRule.findById(ruleId) : null;
    if (rule && rule.channel !== 'notification') {
      return res.status(409).json({ message: 'WhatsApp/SMS sender not connected yet — notification channel only' });
    }
    if (!Array.isArray(patientIds) || !patientIds.length) {
      return res.status(400).json({ message: 'patientIds[] required' });
    }
    const prefs = await NotificationPreference.find({ userId: { $in: patientIds.map(String) } }).lean();
    const muted = new Set(prefs.filter((p) => (p.mutedTypes || []).includes('recall') || p.marketingOptIn === false).map((p) => String(p.userId)));
    let sent = 0;
    let skippedOptOut = 0;
    let skippedDup = 0;
    for (const pid of [...new Set(patientIds.map(String))].slice(0, 100)) {
      if (muted.has(pid)) { skippedOptOut += 1; continue; }
      const key = `${ruleId || 'adhoc'}:${pid}:${new Date().toISOString().slice(0, 10)}`;
      try {
        await RecallLog.create({
          hospitalId: req.user.hospitalId, ruleId: ruleId || null, patientId: pid,
          kind: rule ? rule.kind : 'follow_up', dedupeKey: key,
          channel: 'notification', sentBy: actorId(req),
        });
      } catch {
        skippedDup += 1; // dedupeKey hit — already messaged today
        continue;
      }
      await Notification.create({
        title: 'Follow-up reminder',
        message: (rule && rule.messageTemplate) || 'Your follow-up is due. Please book your visit.',
        type: 'recall', userId: pid,
      });
      sent += 1;
    }
    await auditLog('recall_sent', actorId(req), { ruleId: ruleId || null, sent, skippedOptOut, skippedDup, ip: req.ip });
    return res.json({ sent, skippedOptOut, skippedDup });
  } catch (err) {
    logger.error(`Recall send error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
