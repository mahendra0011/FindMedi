import express from 'express';
import Appointment from '../models/Appointment.js';
import Admission from '../models/Admission.js';
import LabOrder from '../models/LabOrder.js';
import Token from '../models/Token.js';
import OperationTheatre from '../models/OperationTheatre.js';
import DischargeWorkflow from '../models/DischargeWorkflow.js';
import SecondOpinionRequest from '../models/SecondOpinionRequest.js';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';

// Doc 11 §5 P0: single-call doctor dashboard aggregate (hospital+doctor
// scoped). Replaces 6 parallel list calls + client-side truncation (D3/D4).

const router = express.Router();
router.use(protect);

const doctorOnly = (req, res, next) => (
  ['doctor', 'clinic_doctor'].includes(req.user?.role) ? next() : res.status(403).json({ message: 'Doctor access required' })
);
const tenantFilter = (req) => (req.user.hospitalId ? { hospitalId: req.user.hospitalId } : {});
const mine = (req) => req.user.doctorProfileId || req.user._id;

router.get('/dashboard', doctorOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data = {};
    const errors = {};
    const tile = async (key, fn) => {
      try { data[key] = await fn(); }
      catch (e) { errors[key] = e.message || 'failed'; data[key] = null; }
    };
    const hf = tenantFilter(req);
    const me = mine(req);

    await tile('opd', async () => {
      const [waiting, seen] = await Promise.all([
        Token.countDocuments({ status: 'Waiting', doctorId: me, createdAt: { $gte: today }, ...hf }),
        Appointment.countDocuments({ doctorId: me, date: today.toISOString().slice(0, 10), status: { $in: ['Completed', 'In Progress'] }, ...hf }),
      ]);
      return { waiting, seen };
    });
    await tile('ipd', () => Admission.countDocuments({ status: 'Admitted', admittedBy: req.user._id, ...hf }));
    await tile('results', async () => {
      const [pending, critical] = await Promise.all([
        LabOrder.countDocuments({ $or: [{ doctorId: me }, { createdBy: req.user._id }], status: { $in: ['Completed', 'Verified', 'Report Delivered'] }, reviewedAt: null, ...hf }),
        LabOrder.countDocuments({ $or: [{ doctorId: me }, { createdBy: req.user._id }], 'tests.isCritical': true, reviewedAt: null, ...hf }),
      ]);
      return { pending, critical };
    });
    await tile('discharges', () => DischargeWorkflow.countDocuments({ state: 'Initiated', ...hf }));
    await tile('otToday', () => OperationTheatre.countDocuments({
      doctorId: req.user._id, scheduledDate: { $gte: today }, status: { $nin: ['Cancelled', 'Completed'] }, ...hf,
    }));
    await tile('consults', () => SecondOpinionRequest.countDocuments({ status: 'REQUESTED', ...hf }));
    await tile('cme', async () => {
      const { default: CMECredit } = await import('../models/CMECredit.js');
      const rows = await CMECredit.aggregate([
        { $match: { doctorUserId: req.user._id } },
        { $group: { _id: null, credits: { $sum: '$credits' }, count: { $sum: 1 } } },
      ]);
      return { credits: rows[0]?.credits || 0, entries: rows[0]?.count || 0 };
    });
    await tile('queue', () => Token.find({ status: 'Waiting', doctorId: me, createdAt: { $gte: today }, ...hf })
      .select('tokenNumber priority queuePosition patientName createdAt')
      .sort({ queuePosition: 1 }).limit(10).lean());
    await tile('rounds', () => Admission.find({ status: 'Admitted', admittedBy: req.user._id, ...hf })
      .select('patientName bedNumber ward createdAt')
      .sort({ createdAt: -1 }).limit(20).lean());
    res.json({ data, errors, at: new Date() });
  } catch (err) {
    logger.error(`Doctor dashboard error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Latest encounter for a patient (workspace entry when no encounterId known).
router.get('/patient/:id/latest-encounter', doctorOnly, async (req, res) => {
  try {
    const { default: Encounter } = await import('../models/Encounter.js');
    const enc = await Encounter.findOne({ patientId: req.params.id })
      .sort({ createdAt: -1 }).select('_id encounterNo type status').lean();
    if (!enc) return res.status(404).json({ message: 'No encounters yet' });
    return res.json({ id: String(enc._id), encounterNo: enc.encounterNo, type: enc.type });
  } catch (err) {
    logger.error(`Latest encounter error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Doc 12 C14: Flying Squad opt-in/out (command bar + statutory modal gate).
router.put('/settings/flying-squad', doctorOnly, async (req, res) => {
  try {
    const { default: Doctor } = await import('../models/Doctor.js');
    const doc = await Doctor.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { 'settings.flyingSquadOptIn': Boolean(req.body?.optIn) } },
      { new: true },
    ).select('settings.flyingSquadOptIn').lean();
    if (!doc) return res.status(404).json({ message: 'Doctor profile not found' });
    return res.json({ flyingSquadOptIn: doc.settings?.flyingSquadOptIn || false });
  } catch (err) {
    logger.error(`Flying squad error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Duty toggle (On duty / On call / Off).
router.put('/duty', doctorOnly, async (req, res) => {
  try {
    const { default: Doctor } = await import('../models/Doctor.js');
    const { status } = req.body || {};
    if (!['On duty', 'On call', 'Off'].includes(status)) {
      return res.status(400).json({ message: 'status must be On duty|On call|Off' });
    }
    const doc = await Doctor.findOneAndUpdate(
      { userId: req.user._id }, { $set: { dutyStatus: status } }, { new: true },
    ).select('dutyStatus').lean();
    if (!doc) return res.status(404).json({ message: 'Doctor profile not found' });
    return res.json({ dutyStatus: doc.dutyStatus });
  } catch (err) {
    logger.error(`Duty toggle error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Earnings statement v1: completed visits + facility commission + payouts.
// Per-service breakup needs per-visit fee attribution (not yet stored).
router.get('/earnings/statement', doctorOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = {};
    if (from || to) {
      range.createdAt = {};
      if (from) range.createdAt.$gte = new Date(from);
      if (to) range.createdAt.$lte = new Date(to);
    }
    const { default: CommissionConfig } = await import('../models/CommissionConfig.js');
    const { default: Payout } = await import('../models/Payout.js');
    const me = mine(req);
    const [visits, config, payouts] = await Promise.all([
      Appointment.countDocuments({ doctorId: me, status: 'Completed', ...range }),
      CommissionConfig.findOne(req.user.hospitalId ? { facilityId: req.user.hospitalId } : {}).lean(),
      Payout.find(req.user.hospitalId ? { facilityId: req.user.hospitalId } : {})
        .sort({ periodEnd: -1 }).limit(12).lean(),
    ]);
    return res.json({
      completedVisits: visits,
      commission: config ? {
        percent: config.commissionPercent, cap: config.commissionCap,
        schedule: config.payoutSchedule, totalEarnings: config.totalEarnings,
      } : null,
      payouts: payouts.map((p) => ({
        period: [p.periodStart, p.periodEnd], gross: p.grossRevenue,
        commission: p.commissionAmount, net: p.netPayout, status: p.status,
      })),
      note: 'TDS (194J) as applicable; per-service breakup needs per-visit fee attribution.',
    });
  } catch (err) {
    logger.error(`Earnings statement error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// On-call roster view: published rosters this month mentioning me.
router.get('/oncall', doctorOnly, async (req, res) => {
  try {
    const { default: Roster } = await import('../models/Roster.js');
    const month = new Date().toISOString().slice(0, 7);
    const filter = { month, status: 'Published' };
    if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    const rows = await Roster.find(filter).limit(20).lean();
    const me = String(req.user._id);
    const mine = [];
    for (const r of rows) {
      for (const e of (r.entries || [])) {
        if (String(e.staffId || '') === me) mine.push({ month: r.month, wardId: r.wardId, deptId: r.deptId, ...e });
      }
    }
    return res.json({ entries: mine });
  } catch (err) {
    logger.error(`On-call error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Workspace bundle: encounter + patient + timeline + orders + Rx + charges.
router.get('/workspace/:encounterId', doctorOnly, async (req, res) => {
  try {
    const [{ default: Encounter }, { default: Record }, { default: Order },
      { default: Prescription }, { default: ChargeItem }, { default: User }] = await Promise.all([
      import('../models/Encounter.js'), import('../models/Record.js'), import('../models/Order.js'),
      import('../models/Prescription.js'), import('../models/ChargeItem.js'), import('../models/User.js'),
    ]);
    const enc = await Encounter.findById(req.params.encounterId).lean();
    if (!enc) return res.status(404).json({ message: 'Encounter not found' });
    if (req.user.hospitalId && String(enc.hospitalId || '') !== String(req.user.hospitalId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const [patient, timeline, orders, rxs, charges, prior] = await Promise.all([
      User.findById(enc.patientId).select('name gender dateOfBirth phone bloodGroup allergies').lean(),
      Record.find({ $or: [{ encounterId: enc._id }, { patientId: enc.patientId }] }).sort({ createdAt: -1 }).limit(30).lean(),
      Order.find({ encounterId: enc._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Prescription.find({ $or: [{ encounterId: enc._id }, { patientId: enc.patientId }] }).sort({ createdAt: -1 }).limit(20).lean(),
      ChargeItem.find({ encounterId: enc._id }).sort({ createdAt: 1 }).lean(),
      Encounter.find({ patientId: enc.patientId, _id: { $ne: enc._id } }).sort({ createdAt: -1 }).limit(5).select('encounterNo type status createdAt').lean(),
    ]);
    return res.json({ encounter: enc, patient, timeline, orders, prescriptions: rxs, charges, prior });
  } catch (err) {
    logger.error(`Workspace error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Workspace consult-note save: structured SOAP note filed as a Record on
// the encounter (addendum rules live on RecordVersion — amend, never delete).
router.post('/workspace/:encounterId/notes', doctorOnly, async (req, res) => {
  try {
    const [{ default: Encounter }, { default: Record }, { default: User }] = await Promise.all([
      import('../models/Encounter.js'), import('../models/Record.js'), import('../models/User.js'),
    ]);
    const enc = await Encounter.findById(req.params.encounterId);
    if (!enc) return res.status(404).json({ message: 'Encounter not found' });
    if (req.user.hospitalId && String(enc.hospitalId || '') !== String(req.user.hospitalId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { soap, diagnosis, diagnosisIcd } = req.body || {};
    const patient = await User.findById(enc.patientId).select('name').lean();
    const rec = await Record.create({
      patient: patient?.name || 'Unknown', patientId: enc.patientId,
      doctor: req.user.name, doctorId: req.user.doctorProfileId || req.user._id,
      date: new Date().toISOString().slice(0, 10),
      diagnosis: diagnosis || '', diagnosisIcd: diagnosisIcd || '',
      notes: typeof soap === 'object' ? JSON.stringify(soap).slice(0, 4000) : String(soap || '').slice(0, 4000),
      type: 'diagnosis', hospitalId: enc.hospitalId,
      encounterId: enc._id, appointmentId: enc.appointmentId || undefined,
    });
    return res.status(201).json({ id: String(rec._id) });
  } catch (err) {
    logger.error(`Workspace note error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Workspace sign & finalize: closes the encounter (e-sign moment). The
// prescriptions inside were already sealed at creation; this records the
// doctor's sign-off on the whole visit with audit.
router.post('/workspace/:encounterId/sign', doctorOnly, async (req, res) => {
  try {
    const { default: Encounter } = await import('../models/Encounter.js');
    const { auditLog } = await import('../middleware/audit.js');
    const enc = await Encounter.findById(req.params.encounterId);
    if (!enc) return res.status(404).json({ message: 'Encounter not found' });
    if (req.user.hospitalId && String(enc.hospitalId || '') !== String(req.user.hospitalId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (enc.status !== 'Open') return res.status(409).json({ message: `Encounter is ${enc.status}` });
    enc.status = 'Closed';
    enc.closedAt = new Date();
    await enc.save();
    await auditLog('encounter_signed', req.user._id, {
      encounterId: enc._id, ip: req.ip,
    }).catch(() => {});
    return res.json({ id: String(enc._id), status: enc.status });
  } catch (err) {
    logger.error(`Workspace sign error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Tasks: discharge approvals waiting on me + unreviewed results + OT today.
router.get('/tasks', doctorOnly, async (req, res) => {
  try {
    const hf = tenantFilter(req);
    const me = mine(req);
    const [approvals, unreviewed, ot] = await Promise.all([
      DischargeWorkflow.countDocuments({ state: 'Initiated', ...hf }),
      LabOrder.countDocuments({ $or: [{ doctorId: me }, { createdBy: req.user._id }], reviewedAt: null, ...hf }),
      OperationTheatre.countDocuments({ doctorId: req.user._id, status: 'Scheduled', ...hf }),
    ]);
    return res.json({ approvals, unreviewed, ot });
  } catch (err) {
    logger.error(`Doctor tasks error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
