import express from 'express';
import Staff from '../models/Staff.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const genId = async () => { const c = await Staff.countDocuments(); return `EMP-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };

router.post('/', protect, async (req, res) => {
  try {
    const { name, role, department } = req.body;
    if (!name || !role) return res.status(400).json({ message: 'Name and role required' });
    const employeeId = await genId();
    const staff = await Staff.create({ employeeId, name, role, department, joinDate: new Date(), hospitalId: req.user.hospitalId || undefined, createdBy: req.user._id });
    res.status(201).json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/', protect, async (req, res) => {
  try {
    const { role, department } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (role && role !== 'All') filter.role = role;
    if (department && department !== 'All') filter.department = department;
    const staff = await Staff.find(filter).sort({ createdAt: -1 });
    res.json({ staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const staff = await Staff.findOne(filter);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const staff = await Staff.findOneAndUpdate(filter, req.body, { new: true });
    if (!staff) return res.status(404).json({ message: 'Not found' });
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  const filter = { status: 'Active' };
  if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
  const total = await Staff.countDocuments(filter);
  const onLeave = await Staff.countDocuments({ ...filter, status: 'On Leave' });
  const byDepartment = await Staff.aggregate([
    { $match: filter },
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  res.json({ total, onLeave, byDepartment });
});

// ─── Attendance ───────────────────────────────────────────────────────────────
router.post('/attendance', protect, async (req, res) => {
  try {
    const { staffId, date, status } = req.body;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    
    // Check if attendance already marked for the date
    const existingIndex = staff.attendance.findIndex(a => 
      new Date(a.date).toDateString() === new Date(date).toDateString()
    );
    
    const attendanceRecord = { date: date || new Date(), status: status || 'Present' };
    
    if (existingIndex >= 0) {
      staff.attendance[existingIndex] = attendanceRecord;
    } else {
      staff.attendance.push(attendanceRecord);
    }
    
    await staff.save();
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/attendance/bulk', protect, async (req, res) => {
  try {
    const { date, attendance } = req.body; // attendance: [{ staffId, status }]
    if (!date || !attendance?.length) {
      return res.status(400).json({ message: 'Date and attendance list required' });
    }
    
    for (const record of attendance) {
      const staff = await Staff.findById(record.staffId);
      if (staff) {
        const existingIndex = staff.attendance.findIndex(a =>
          new Date(a.date).toDateString() === new Date(date).toDateString()
        );
        
        const attendanceRecord = { date, status: record.status || 'Present' };
        
        if (existingIndex >= 0) {
          staff.attendance[existingIndex] = attendanceRecord;
        } else {
          staff.attendance.push(attendanceRecord);
        }
        
        await staff.save();
      }
    }
    
    res.json({ message: 'Attendance marked successfully' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/attendance', protect, async (req, res) => {
  try {
    const { staffId, month, year } = req.query;
    const filter = {};
    if (staffId) filter._id = staffId;
    
    const staff = await Staff.findOne(filter);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    
    let attendance = staff.attendance;
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      attendance = attendance.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() + 1 === m && d.getFullYear() === y;
      });
    }
    
    res.json({ attendance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Shift Scheduling ─────────────────────────────────────────────────────────
router.post('/shifts', protect, async (req, res) => {
  try {
    const { staffId, date, shift, startTime, endTime } = req.body;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    
    staff.shift = shift || staff.shift;
    if (startTime) staff.shiftStartTime = startTime;
    if (endTime) staff.shiftEndTime = endTime;
    
    await staff.save();
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/shifts', protect, async (req, res) => {
  try {
    const { department, date } = req.query;
    const filter = {};
    if (department && department !== 'All') filter.department = department;
    
    const staff = await Staff.find(filter);
    res.json({ staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Payroll Calculation ──────────────────────────────────────────────────────
router.post('/payroll/calculate', protect, async (req, res) => {
  try {
    const { staffId, month, year, overtimeHours, overtimeRate } = req.body;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    
    if (!staff.salary) {
      return res.status(400).json({ message: 'Salary not set for this staff' });
    }
    
    const baseSalary = staff.salary;
    const overtimeAmount = (overtimeHours || 0) * (overtimeRate || (baseSalary / 30 / 8)); // per hour rate
    const allowances = req.body.allowances || 0;
    const deductions = req.body.deductions || 0;
    
    const grossSalary = baseSalary + overtimeAmount + allowances;
    const netSalary = grossSalary - deductions;
    
    const payroll = {
      staffId: staff._id,
      employeeId: staff.employeeId,
      staffName: staff.name,
      role: staff.role,
      department: staff.department,
      month,
      year,
      baseSalary,
      overtimeHours: overtimeHours || 0,
      overtimeRate: overtimeRate || (baseSalary / 30 / 8),
      overtimeAmount,
      allowances,
      deductions,
      grossSalary,
      netSalary,
      calculatedBy: req.user.name,
      calculatedAt: new Date()
    };
    
    res.json(payroll);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/payroll/history', protect, async (req, res) => {
  try {
    const { staffId, month, year } = req.query;
    // For demo, return calculated data from request
    res.json({ 
      message: 'Payroll history endpoint - integrate with payroll model',
      staffId,
      month,
      year
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Overtime Tracking ────────────────────────────────────────────────────────
router.post('/overtime', protect, async (req, res) => {
  try {
    const { staffId, date, hours, reason } = req.body;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    
    const overtimeRecord = {
      date: date || new Date(),
      hours: hours || 0,
      reason: reason || '',
      approvedBy: req.user.name,
      approvedAt: new Date()
    };
    
    staff.overtime = staff.overtime || [];
    staff.overtime.push(overtimeRecord);
    
    await staff.save();
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/overtime', protect, async (req, res) => {
  try {
    const { staffId, month, year } = req.query;
    const filter = {};
    if (staffId) filter._id = staffId;
    
    const staff = await Staff.findOne(filter);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    
    let overtime = staff.overtime || [];
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      overtime = overtime.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() + 1 === m && d.getFullYear() === y;
      });
    }
    
    const totalHours = overtime.reduce((sum, o) => sum + (o.hours || 0), 0);
    
    res.json({ overtime, totalHours });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;