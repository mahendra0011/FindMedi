import express from 'express';
import User from '../models/User.js';
import Billing from '../models/Billing.js';
import Appointment from '../models/Appointment.js';
import Hospital from '../models/Hospital.js';
import { getISTDateString } from '../utils/dateUtils.js';
import AuditLog from '../models/AuditLog.js';
import { protect, superadminOnly } from '../middleware/auth.js';

const toCSV = (data, fields) => {
  const header = fields.map(f => `"${f}"`).join(',');
  const rows = data.map(row => fields.map(f => {
    const val = row[f];
    if (val === null || val === undefined) return '';
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(','));
  return [header, ...rows].join('\n');
};

const router = express.Router();

router.get('/users', protect, superadminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    const csv = toCSV(users, ['name', 'email', 'role', 'phone', 'status', 'isVerified', 'approvalStatus', 'createdAt']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/revenue', protect, superadminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const bills = await Billing.find(filter).populate('patientId', 'name email').lean();
    const data = bills.map(b => ({ id: b._id, patient: b.patientId?.name || '', email: b.patientId?.email || '', amount: b.amount, paid: b.paid, due: b.due, status: b.status, createdAt: b.createdAt }));
    const csv = toCSV(data, ['id', 'patient', 'email', 'amount', 'paid', 'due', 'status', 'createdAt']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/bookings', protect, superadminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const appointments = await Appointment.find(filter).populate('patientId', 'name').populate('doctorId', 'name').lean();
    const data = appointments.map(a => ({ id: a._id, patient: a.patientId?.name || '', doctor: a.doctorId?.name || '', date: a.date, time: a.timeSlot, status: a.status, type: a.type || 'appointment', createdAt: a.createdAt }));
    const csv = toCSV(data, ['id', 'patient', 'doctor', 'date', 'time', 'status', 'type', 'createdAt']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/facilities', protect, superadminOnly, async (req, res) => {
  try {
    const hospitals = await Hospital.find({}).lean();
    const data = hospitals.map(h => ({ id: h._id, name: h.name, type: 'hospital', email: h.email, phone: h.phone, city: h.city, status: h.status, plan: h.plan, createdAt: h.createdAt }));
    const csv = toCSV(data, ['id', 'name', 'type', 'email', 'phone', 'city', 'status', 'plan', 'createdAt']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="facilities-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/audit', protect, superadminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
      if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
    }
    const logs = await AuditLog.find(filter).populate('userId', 'name email').sort({ timestamp: -1 }).limit(5000).lean();
    const data = logs.map(l => ({ action: l.action, user: l.userId?.name || '', email: l.userId?.email || '', details: JSON.stringify(l.details), ip: l.ip, timestamp: l.timestamp }));
    const csv = toCSV(data, ['action', 'user', 'email', 'details', 'ip', 'timestamp']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
