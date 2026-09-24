import express from 'express';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';
import { protect } from '../middleware/auth.js';
import { getISTDateString } from '../utils/dateUtils.js';

const router = express.Router();

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

export default router;
