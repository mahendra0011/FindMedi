import express from 'express';
import LeaveRequest from '../models/LeaveRequest.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';
import { validate, createLeaveRequestSchema, updateLeaveStatusSchema } from '../utils/validate.js';
import logger from '../config/logger.js';

const createNotification = async (userId, title, message, type = 'system') => {
  try {
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.create({ userId, title, message, type });
  } catch (e) { logger.error('Notification error:', e); }
};

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    let balance = null;
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ email: req.user.email });
      if (doctor) {
        filter.doctorId = doctor._id;
        const used = await LeaveRequest.aggregate([
          { $match: { doctorId: doctor._id, status: { $ne: 'Rejected' } } },
          { $group: { _id: '$leaveType', count: { $sum: 1 } } },
        ]);
        const usedMap = {};
        used.forEach(u => { usedMap[u._id] = u.count; });
        balance = {
          sick: { total: doctor.leaveBalance?.sick || 12, used: usedMap['Sick Leave'] || 0 },
          casual: { total: doctor.leaveBalance?.casual || 15, used: usedMap['Casual Leave'] || 0 },
          earned: { total: doctor.leaveBalance?.earned || 20, used: usedMap['Earned Leave'] || 0 },
          personal: { total: doctor.leaveBalance?.personal || 10, used: usedMap['Personal Leave'] || 0 },
          maternity: { total: doctor.leaveBalance?.maternity || 90, used: usedMap['Maternity/Paternity Leave'] || 0 },
        };
      }
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const leaves = await LeaveRequest.find(filter).sort({ createdAt: -1 });
    res.json({ leaves, balance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createLeaveRequestSchema), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ email: req.user.email });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

    const leave = await LeaveRequest.create({
      ...req.body,
      doctorId: doctor._id,
      doctorName: req.user.name,
      doctorEmail: req.user.email,
      hospitalId: req.user.hospitalId || doctor.hospitalId,
      status: 'Pending',
    });

    const dates = [];
    let d = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    while (d <= end) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    await Doctor.findByIdAndUpdate(doctor._id, { $addToSet: { leaves: { $each: dates } } });

    await createNotification(req.user._id.toString(), 'Leave Request Submitted', `${req.user.name} requested ${req.body.leaveType} from ${req.body.startDate} to ${req.body.endDate}`, 'system');

    res.status(201).json(leave);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/status', protect, validate(updateLeaveStatusSchema), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    if (status === 'Rejected') {
      const doctor = await Doctor.findById(leave.doctorId);
      if (doctor) {
        const dates = [];
        let d = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        while (d <= end) {
          dates.push(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
        await Doctor.findByIdAndUpdate(leave.doctorId, { $pullAll: { leaves: dates } });
      }
    }

    const doctor = await Doctor.findById(leave.doctorId);
    if (doctor) {
      const userModel = (await import('../models/User.js')).default;
      const user = await userModel.findOne({ email: doctor.email });
      if (user) {
        await createNotification(user._id.toString(), 'Leave Request Update', `Your ${leave.leaveType} request has been ${status}${adminNotes ? ': ' + adminNotes : ''}`, 'system');
      }
    }

    res.json(leave);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/pending', protect, async (req, res) => {
  try {
    const filter = { status: 'Pending' };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const leaves = await LeaveRequest.find(filter).populate('doctorId', 'name email specialization').sort({ createdAt: 1 });
    res.json({ leaves });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
