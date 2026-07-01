import express from 'express';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const hospitalFilter = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const billingMatch = { $match: hospitalFilter };
    const appointmentMatch = { $match: { ...hospitalFilter, date: today } };

    const [totalPatients, totalDoctors, todayAppointments, billing, recentAppointments] = await Promise.all([
      User.countDocuments({ role: 'patient', ...hospitalFilter }),
      User.countDocuments({ role: 'doctor', ...hospitalFilter }),
      Appointment.countDocuments({ date: today, ...hospitalFilter }),
      Billing.aggregate([billingMatch, { $group: { _id: null, revenue: { $sum: '$paid' } } }]),
      Appointment.find({ ...hospitalFilter }).sort({ createdAt: -1 }).limit(5),
    ]);

    // Weekly appointments for chart
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const weeklyRaw = await Appointment.aggregate([
      { $match: hospitalFilter },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
    ]);
    const weeklyMap = {};
    weeklyRaw.forEach(r => { weeklyMap[r._id] = r.count; });
    const weeklyAppointments = days.map((day, i) => ({ day, count: weeklyMap[i + 1] || 0 }));

    // Monthly revenue
    const monthlyRevenue = await Billing.aggregate([
      billingMatch,
      { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$paid' } } },
      { $sort: { '_id': 1 } },
      { $limit: 6 },
    ]);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revenueData = monthlyRevenue.map(r => ({ month: months[r._id - 1], revenue: r.revenue }));

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
      },
      weeklyAppointments,
      revenueData,
      departmentData,
      recentAppointments,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
