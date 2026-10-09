import express from 'express';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';
import { protect } from '../middleware/auth.js';
import { getISTDateString } from '../utils/dateUtils.js';

const router = express.Router();

// File 09 §02 §10: single round-trip operations strip. Every tile resolves
// independently — one failure surfaces as { tileKey: message } while the rest
// still render (partial-failure flags, never a blank page).
router.get('/operations', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data = {};
    const errors = {};
    const tile = async (key, fn) => {
      try { data[key] = await fn(); }
      catch (e) { errors[key] = e.message || 'failed'; data[key] = null; }
    };
    const { default: Bed } = await import('../models/Bed.js');
    const { default: Emergency } = await import('../models/Emergency.js');
    const { default: OperationTheatre } = await import('../models/OperationTheatre.js');
    const { default: Admission } = await import('../models/Admission.js');
    const { default: LabOrder } = await import('../models/LabOrder.js');
    const { default: Prescription } = await import('../models/Prescription.js');
    const { default: Ambulance } = await import('../models/Ambulance.js');
    const { default: LeaveRequest } = await import('../models/LeaveRequest.js');
    const { default: Token } = await import('../models/Token.js');
    const { default: DischargeWorkflow } = await import('../models/DischargeWorkflow.js');
    const { default: DashboardAlert } = await import('../models/DashboardAlert.js');

    await tile('beds', async () => {
      const [free, total, icuFree, icuTotal] = await Promise.all([
        Bed.countDocuments({ status: 'Available', ...hf }),
        Bed.countDocuments({ ...hf }),
        Bed.countDocuments({ status: 'Available', ward: 'ICU', ...hf }),
        Bed.countDocuments({ ward: 'ICU', ...hf }),
      ]);
      return { free, total, icuFree, icuTotal, occupancyPct: total ? Math.round(((total - free) / total) * 100) : 0 };
    });
    await tile('erActive', () => Emergency.countDocuments({ status: { $in: ['Pending', 'Assigned', 'Under Treatment'] }, ...hf }));
    await tile('otToday', () => OperationTheatre.countDocuments({ scheduledDate: { $gte: today }, status: { $nin: ['Cancelled'] }, ...hf }));
    await tile('activeIpd', () => Admission.countDocuments({ status: 'Admitted', ...hf }));
    await tile('pendingLab', () => LabOrder.countDocuments({ status: { $nin: ['Completed', 'Verified', 'Report Delivered'] }, ...hf }));
    await tile('criticalLabs', () => LabOrder.countDocuments({ 'tests.isCritical': true, status: { $nin: ['Verified', 'Report Delivered'] }, ...hf }));
    await tile('pendingRx', () => Prescription.countDocuments({ ...hf }));
    await tile('ambulancesOnDuty', () => Ambulance.countDocuments({ isOnDuty: true, ...hf }));
    await tile('staffOnLeave', () => LeaveRequest.countDocuments({ status: 'Approved', ...hf }));
    await tile('opdQueue', async () => {
      const waiting = await Token.countDocuments({ status: 'Waiting', createdAt: { $gte: today }, ...hf });
      return { waiting };
    });
    await tile('dischargesPending', () => DischargeWorkflow.countDocuments({
      state: { $in: ['Initiated', 'DoctorApproved', 'NursingClear', 'PharmacyClear', 'BillingClear'] }, ...hf,
    }));
    await tile('money', async () => {
      const [out, coll] = await Promise.all([
        Billing.aggregate([{ $match: { ...hf } }, { $group: { _id: null, outstanding: { $sum: '$balance' }, billed: { $sum: '$amount' } } }]),
        Billing.aggregate([{ $match: { ...hf, createdAt: { $gte: today } } }, { $group: { _id: null, collected: { $sum: '$paid' } } }]),
      ]);
      return {
        outstanding: out[0]?.outstanding || 0, billed: out[0]?.billed || 0,
        collectedToday: coll[0]?.collected || 0,
      };
    });
    await tile('alerts', () => DashboardAlert.countDocuments({ status: 'open', ...hf }));
    res.json({ data, errors, at: new Date() });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 09 §02 §6: revenue split by source / payment mode + A/R ageing.
router.get('/revenue', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const { from, to } = req.query;
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    const match = { ...hf, ...(Object.keys(range).length ? { createdAt: range } : {}) };
    const [bySource, byMethod, ageing] = await Promise.all([
      Billing.aggregate([{ $match: match }, { $group: { _id: '$source', billed: { $sum: '$amount' }, collected: { $sum: '$paid' } } }]),
      Billing.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', collected: { $sum: '$paid' } } }]),
      Billing.aggregate([
        { $match: { ...hf, balance: { $gt: 0 } } },
        {
          $bucket: {
            groupBy: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] },
            boundaries: [0, 30, 60, 90, 100000],
            default: '90+',
            output: { total: { $sum: '$balance' }, count: { $sum: 1 } },
          },
        },
      ]),
    ]);
    res.json({ bySource, byMethod, ageing });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 09 §02: alert center list + ack/snooze (audit-logged).
router.get('/alerts', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { default: DashboardAlert } = await import('../models/DashboardAlert.js');
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const { status, severity } = req.query;
    const filter = { ...hf };
    if (status) filter.status = status;
    else filter.status = { $in: ['open', 'snoozed'] };
    if (severity) filter.severity = severity;
    const rows = await DashboardAlert.find(filter).sort({ severity: -1, createdAt: -1 }).limit(200).lean();
    return res.json({ alerts: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/alerts/:id/ack', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { default: DashboardAlert } = await import('../models/DashboardAlert.js');
    const { auditLog } = await import('../middleware/audit.js');
    const a = await DashboardAlert.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Not found' });
    const { action, snoozeUntil } = req.body || {};
    if (action === 'snooze') {
      a.status = 'snoozed';
      a.snoozeUntil = snoozeUntil ? new Date(snoozeUntil) : new Date(Date.now() + 4 * 3600e3);
    } else if (action === 'resolve') {
      a.status = 'resolved';
      a.resolvedAt = new Date();
    } else {
      a.status = 'acked';
      a.ackedBy = req.user._id;
      a.ackedAt = new Date();
    }
    await a.save();
    await auditLog('dashboard_alert_ack', req.user._id, { alertId: a._id, action: action || 'ack', ip: req.ip });
    return res.json({ id: String(a._id), status: a.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 09 §02 §7: bed heatmap by ward + ALOS.
router.get('/beds/heatmap', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { default: Bed } = await import('../models/Bed.js');
    const { default: Admission } = await import('../models/Admission.js');
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const [byWard, alos] = await Promise.all([
      Bed.aggregate([
        { $match: hf },
        { $group: { _id: { ward: '$ward', status: '$status' }, count: { $sum: 1 } } },
      ]),
      Admission.aggregate([
        { $match: { ...hf, status: 'Discharged', dischargedAt: { $exists: true } } },
        { $group: { _id: null, avgDays: { $avg: { $divide: [{ $subtract: ['$dischargedAt', '$createdAt'] }, 86400000] } }, n: { $sum: 1 } } },
      ]),
    ]);
    return res.json({ wards: byWard, alosDays: alos[0] ? +alos[0].avgDays.toFixed(1) : 0, discharges: alos[0]?.n || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 09 §02 §9: staff on-duty snapshot.
router.get('/staff/on-duty', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { default: Staff } = await import('../models/Staff.js');
    const { default: LeaveRequest } = await import('../models/LeaveRequest.js');
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const today = new Date().toISOString().slice(0, 10);
    const [byRole, onLeave] = await Promise.all([
      Staff.aggregate([{ $match: { ...hf, status: 'Active' } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
      LeaveRequest.countDocuments({ status: 'Approved', startDate: { $lte: today }, endDate: { $gte: today }, ...hf }),
    ]);
    return res.json({ byRole, onLeave });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role !== 'superadmin' && !req.user.hospitalId) {
      return res.status(403).json({ message: 'No hospital linked' });
    }
    const today = getISTDateString();

    const hospitalFilter = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const billingMatch = { $match: hospitalFilter };
    const appointmentMatch = { $match: { ...hospitalFilter, date: today } };

    const last7 = [...Array(7)].map((_, i) =>
      new Date(Date.now() + 5.5 * 3600e3 - i * 864e5).toISOString().slice(0, 10)).reverse();

    const [totalPatients, totalDoctors, todayAppointments, billing, mtdBilling, recentAppointments] = await Promise.all([
      User.countDocuments({ role: 'patient', ...hospitalFilter }),
      User.countDocuments({ role: 'doctor', ...hospitalFilter }),
      Appointment.countDocuments({ date: today, ...hospitalFilter }),
      Billing.aggregate([billingMatch, { $group: { _id: null, revenue: { $sum: '$paid' } } }]),
      Billing.aggregate([{ $match: { ...hospitalFilter, createdAt: { $gte: monthStart } } }, { $group: { _id: null, revenue: { $sum: '$paid' } } }]),
      Appointment.find({ ...hospitalFilter }).sort({ createdAt: -1 }).limit(5),
    ]);

    // Weekly appointments: last 7 IST dates by Appointment.date string
    const weeklyRaw = await Appointment.aggregate([
      { $match: { ...hospitalFilter, date: { $in: last7 } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
    ]);
    const weeklyMap = {};
    weeklyRaw.forEach(r => { weeklyMap[r._id] = r.count; });
    const weeklyAppointments = last7.map((ds) => {
      const d = new Date(`${ds}T00:00:00+05:30`);
      const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      return { day, date: ds, count: weeklyMap[ds] || 0 };
    });

    // Monthly revenue: last 6 months, year-aware
    const monthlyRevenue = await Billing.aggregate([
      { $match: { ...hospitalFilter, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, revenue: { $sum: '$paid' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revenueData = monthlyRevenue.map(r => ({ month: months[r._id.m - 1], revenue: r.revenue }));

    // Department distribution
    const deptRaw = await Appointment.aggregate([
      { $match: hospitalFilter },
      { $group: { _id: '$department', value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: 5 },
    ]);
    const departmentData = deptRaw.map(d => ({ name: d._id, value: d.value }));

    res.json({
      stats: {
        totalPatients,
        totalDoctors,
        todayAppointments,
        revenue: billing[0]?.revenue || 0,
        revenueMTD: mtdBilling[0]?.revenue || 0,
      },
      weeklyAppointments,
      revenueData,
      departmentData,
      recentAppointments,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 22 P0-7: KPI overview with previous-period compare + daily sparkline.
// ?from=YYYY-MM-DD&to=YYYY-MM-DD&compare=1 (compare defaults on).
// authz: role (hospital_admin/superadmin, same as /operations).
router.get('/overview', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const { getISTDateString } = await import('../utils/dateUtils.js');
    const todayStr = getISTDateString();
    const from = String(req.query.from || todayStr);
    const to = String(req.query.to || todayStr);
    const wantCompare = String(req.query.compare ?? '1') !== '0';
    const dayMs = 86400000;
    const spanDays = Math.max(1, Math.round((new Date(to) - new Date(from)) / dayMs) + 1);
    const prevTo = new Date(new Date(from).getTime() - dayMs).toISOString().slice(0, 10);
    const prevFrom = new Date(new Date(from).getTime() - spanDays * dayMs).toISOString().slice(0, 10);

    const { default: Admission } = await import('../models/Admission.js');
    const sumPaid = async (a, b) => {
      const r = await Billing.aggregate([
        { $match: { ...hf, date: { $gte: a, $lte: b } } },
        { $group: { _id: null, paid: { $sum: '$paid' }, billed: { $sum: '$amount' } } },
      ]);
      return { paid: r[0]?.paid || 0, billed: r[0]?.billed || 0 };
    };
    const countAppts = (a, b) => Appointment.countDocuments({ ...hf, date: { $gte: a, $lte: b } });
    const countAdm = (a, b) => Admission.countDocuments({ ...hf, createdAt: { $gte: new Date(a), $lte: new Date(`${b}T23:59:59Z`) } });

    const [cur, prev] = await Promise.all([
      (async () => ({
        rev: await sumPaid(from, to),
        appts: await countAppts(from, to),
        adm: await countAdm(from, to),
      }))(),
      wantCompare ? (async () => ({
        rev: await sumPaid(prevFrom, prevTo),
        appts: await countAppts(prevFrom, prevTo),
        adm: await countAdm(prevFrom, prevTo),
      }))() : null,
    ]);

    // Daily sparkline for the window (collected per day).
    const sparkRaw = await Billing.aggregate([
      { $match: { ...hf, date: { $gte: from, $lte: to } } },
      { $group: { _id: '$date', paid: { $sum: '$paid' }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const sparkMap = Object.fromEntries(sparkRaw.map((r) => [r._id, r]));
    const spark = [];
    for (let d = new Date(from); d <= new Date(to); d = new Date(d.getTime() + dayMs)) {
      const ds = d.toISOString().slice(0, 10);
      spark.push({ date: ds, paid: sparkMap[ds]?.paid || 0, bills: sparkMap[ds]?.n || 0 });
    }

    const delta = (c, p) => (p > 0 ? +(((c - p) / p) * 100).toFixed(1) : null);
    return res.json({
      from, to, spanDays,
      kpis: {
        collected: { value: cur.rev.paid, prev: prev?.rev.paid ?? null, deltaPct: prev ? delta(cur.rev.paid, prev.rev.paid) : null },
        billed: { value: cur.rev.billed, prev: prev?.rev.billed ?? null, deltaPct: prev ? delta(cur.rev.billed, prev.rev.billed) : null },
        appointments: { value: cur.appts, prev: prev?.appts ?? null, deltaPct: prev ? delta(cur.appts, prev.appts) : null },
        admissions: { value: cur.adm, prev: prev?.adm ?? null, deltaPct: prev ? delta(cur.adm, prev.adm) : null },
      },
      spark,
      prevWindow: prev ? { from: prevFrom, to: prevTo } : null,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 22 P0-7: live OPD queue snapshot (today's In-Queue appointments by
// department + longest waiter). authz: role (queue-reading staff).
router.get('/queue', protect, async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin', 'doctor', 'nurse', 'receptionist'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const { getISTDateString } = await import('../utils/dateUtils.js');
    const rows = await Appointment.find({ ...hf, date: getISTDateString(), status: 'In Queue' })
      .select('department doctor patient tokenNo checkedInAt queuePosition').sort({ checkedInAt: 1 }).limit(200).lean();
    const now = Date.now();
    const byDept = {};
    let longestMin = 0;
    for (const r of rows) {
      const d = r.department || 'General';
      byDept[d] = byDept[d] || { waiting: 0, longestMin: 0 };
      byDept[d].waiting += 1;
      const waitMin = r.checkedInAt ? Math.round((now - new Date(r.checkedInAt).getTime()) / 60000) : 0;
      byDept[d].longestMin = Math.max(byDept[d].longestMin, waitMin);
      longestMin = Math.max(longestMin, waitMin);
    }
    return res.json({
      total: rows.length, longestMin,
      departments: Object.entries(byDept).map(([dept, v]) => ({ dept, ...v })),
      sample: rows.slice(0, 20),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
