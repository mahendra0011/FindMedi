import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Staff from '../models/Staff.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
// AUTHZ-M-03 (F7): updateStaffSchema carries `role` - a role change is the
// privilege-escalation action, so it re-proves with a fresh factor.
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { validate, createStaffSchema, updateStaffSchema } from '../utils/validate.js';
import { generateTimestampedId } from '../utils/idGenerator.js';

const attendanceSchema = z.object({ staffId: z.string().min(1), date: z.string().optional(), status: z.string().optional() });
const bulkAttendanceSchema = z.object({ date: z.string().min(1), attendance: z.array(z.object({ staffId: z.string().min(1), status: z.string().optional() })).min(1) });
const shiftSchema = z.object({ staffId: z.string().min(1), date: z.string().optional(), shift: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional() });
const payrollSchema = z.object({ staffId: z.string().min(1), month: z.string().optional(), year: z.string().optional(), overtimeHours: z.number().optional(), overtimeRate: z.number().optional(), allowances: z.number().optional(), deductions: z.number().optional() });
const overtimeSchema = z.object({ staffId: z.string().min(1), date: z.string().optional(), hours: z.number().optional(), reason: z.string().optional() });

const router = express.Router();

const genId = () => generateTimestampedId('EMP');

// ==============================================================================
// ADM-B-02/03/04: payroll is the most sensitive HR surface in the product and
// this module had NO tenant predicate on the attendance/shift/overtime paths.
//
// Three distinct bugs, one root cause — every handler resolved its target with a
// bare `Staff.findById(...)` on the raw param or `Staff.findOne({})`:
//   ADM-B-02 reads   : /attendance with no staffId returned the FIRST staff
//                      document in the collection (salary, bank fields), and
//                      /shifts returned every staff of every tenant.
//   ADM-B-03 writes  : /attendance, /attendance/bulk, /shifts, /overtime and
//                      /payroll/calculate accepted any staffId, so a hospital
//                      admin edited hospital B's attendance and read its payroll.
//   ADM-B-04 create  : POST / accepted a client-chosen hospitalId.
//
// These two helpers make the rule explicit and deny-by-default:
//   staffScopeFilter(req)  — the tenant predicate for every list/count
//   resolveStaff(req, id)  — a scoped single-document lookup, or null
// ==============================================================================

/**
 * The hospital a caller acts within, or null when they have none.
 * A missing tenant is a DENY, never "all tenants".
 */
const callerHospitalId = (req) => {
  if (req.user?.role === 'superadmin') return null; // deliberate: platform-wide
  const id = req.user?.hospitalId || req.user?.facilityId;
  return id ? String(id) : null;
};

/** Fail closed: a caller with no hospital gets an unmodifiable scope. */
const staffScopeFilter = (req) => {
  const hospitalId = callerHospitalId(req);
  return hospitalId === null ? {} : { hospitalId };
};

/** Respond 403 when the caller has no tenant of their own. */
const denyIfTenantless = (req, res) => {
  if (req.user?.role === 'superadmin') return false;
  if (callerHospitalId(req) === null) {
    res.status(403).json({ message: 'No hospital linked to this account' });
    return true;
  }
  return false;
};

/**
 * Resolve a staff document the caller is allowed to touch.
 * @returns the document, or null after having written 404/403.
 */
const resolveStaff = async (req, staffId) => {
  if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) return null;
  const filter = staffScopeFilter(req);
  filter._id = staffId;
  return Staff.findOne(filter);
};

router.post('/', protect, authorize('staff:manage'), adminOnly, validate(createStaffSchema), async (req, res) => {
  try {
    const { name, role, department } = req.body;
    if (!name || !role) return res.status(400).json({ message: 'Name and role required' });
    const employeeId = genId();
    // ADM-B-07: the tenant comes from the session. A superadmin may pass an
    // explicit ?hospitalId= for support work; a tenant admin can never.
    const requestedHospital = req.user.role === 'superadmin' ? req.query?.hospitalId : null;
    const targetHospId = requestedHospital || req.user.hospitalId || undefined;
    const staff = await Staff.create({ employeeId, name, role, department, joinDate: new Date(), hospitalId: targetHospId, createdBy: req.user._id });
    res.status(201).json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/', protect, authorize('staff:manage'), async (req, res) => {
  try {
    const { role, department } = req.query;
    // ADM-B-02: the previous `if (req.user.hospitalId && …)` predicate was skipped
    // for a tenant-less account, so such a caller listed EVERY staff in the
    // platform — including salary and bank fields. `staffScopeFilter` never skips.
    const filter = staffScopeFilter(req);
    if (role && role !== 'All') filter.role = role;
    if (department && department !== 'All') filter.department = department;
    const staff = await Staff.find(filter).sort({ createdAt: -1 });
    res.json({ staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, authorize('staff:manage'), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const staff = await Staff.findOne(filter);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, authorize('staff:manage'), adminOnly, validate(updateStaffSchema), requireStepUp('users:role-change'), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const staff = await Staff.findOneAndUpdate(filter, req.body, { new: true });
    if (!staff) return res.status(404).json({ message: 'Not found' });
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, authorize('staff:manage'), adminOnly, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const staff = await Staff.findOneAndDelete(filter);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json({ message: 'Staff deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, authorize('staff:manage'), async (req, res) => {
  // ADM-B-02: headcount per department is tenant data.
  if (denyIfTenantless(req, res)) return;
  const filter = { status: 'Active', ...staffScopeFilter(req) };
  const total = await Staff.countDocuments(filter);
  const onLeave = await Staff.countDocuments({ ...filter, status: 'On Leave' });
  const byDepartment = await Staff.aggregate([
    { $match: filter },
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  res.json({ total, onLeave, byDepartment });
});

// ─── Attendance ───────────────────────────────────────────────────────────────
router.post('/attendance', protect, authorize('staff:manage'), adminOnly, validate(attendanceSchema), async (req, res) => {
  try {
    const { staffId, date, status } = req.body;
    if (denyIfTenantless(req, res)) return;
    const staff = await resolveStaff(req, staffId);
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

router.post('/attendance/bulk', protect, authorize('staff:manage'), adminOnly, validate(bulkAttendanceSchema), async (req, res) => {
  try {
    const { date, attendance } = req.body; // attendance: [{ staffId, status }]
    if (!date || !attendance?.length) {
      return res.status(400).json({ message: 'Date and attendance list required' });
    }
    // ADM-B-03: a bulk write used to accept ANY staffId list, so one call could
    // mark attendance (and thus payroll) for another hospital's entire staff list.
    if (denyIfTenantless(req, res)) return;

    const foreign = [];
    for (const record of attendance) {
      const staff = await resolveStaff(req, record.staffId);
      if (!staff) {
        foreign.push(record.staffId);
        continue;
      }
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

    // ADM-B-03: a partial success is reported as such. Silently skipping foreign
    // ids would leave the caller believing another hospital's payroll was updated.
    if (foreign.length) {
      return res.status(403).json({
        message: 'Some staff records are outside your hospital and were not modified',
        rejectedStaffIds: foreign,
        updated: attendance.length - foreign.length,
      });
    }

    res.json({ message: 'Attendance marked successfully', updated: attendance.length });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/attendance', protect, authorize('staff:manage'), async (req, res) => {
  try {
    if (denyIfTenantless(req, res)) return;
    const { staffId, month, year } = req.query;
    // ADM-B-02: `filter = {}` + `Staff.findOne({})` returned the FIRST staff
    // document in the COLLECTION when no staffId was supplied — i.e. any logged-in
    // user with `staff:manage` got an arbitrary person's salary and attendance.
    // A staffId is now required, and it is resolved inside the caller's tenant.
    if (!staffId) {
      return res.status(400).json({ message: 'staffId is required' });
    }
    const staff = await resolveStaff(req, staffId);
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
router.post('/shifts', protect, authorize('staff:manage'), adminOnly, validate(shiftSchema), async (req, res) => {
  try {
    const { staffId, date, shift, startTime, endTime } = req.body;
    if (denyIfTenantless(req, res)) return;
    const staff = await resolveStaff(req, staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    
    staff.shift = shift || staff.shift;
    if (startTime) staff.shiftStartTime = startTime;
    if (endTime) staff.shiftEndTime = endTime;
    
    await staff.save();
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/shifts', protect, authorize('staff:manage'), async (req, res) => {
  try {
    // ADM-B-02: `Staff.find({})` returned every staff of every tenant. The schedule
    // roster is operational data but reveals headcount and shift patterns per site.
    if (denyIfTenantless(req, res)) return;
    const { department, date } = req.query;
    const filter = staffScopeFilter(req);
    if (department && department !== 'All') filter.department = department;

    const staff = await Staff.find(filter);
    res.json({ staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Payroll Calculation ──────────────────────────────────────────────────────
router.post('/payroll/calculate', protect, authorize('staff:manage'), adminOnly, validate(payrollSchema), async (req, res) => {
  try {
    const { staffId, month, year, overtimeHours, overtimeRate } = req.body;
    if (denyIfTenantless(req, res)) return;
    const staff = await resolveStaff(req, staffId);
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

router.get('/payroll/history', protect, authorize('staff:manage', 'billing:read'), async (req, res) => {
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
router.post('/overtime', protect, authorize('staff:manage'), adminOnly, validate(overtimeSchema), async (req, res) => {
  try {
    const { staffId, date, hours, reason } = req.body;
    if (denyIfTenantless(req, res)) return;
    const staff = await resolveStaff(req, staffId);
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

router.get('/overtime', protect, authorize('staff:manage'), async (req, res) => {
  try {
    // ADM-B-02: same "findOne({}) with no id" shape as /attendance.
    if (denyIfTenantless(req, res)) return;
    const { staffId, month, year } = req.query;
    if (!staffId) return res.status(400).json({ message: 'staffId is required' });
    const staff = await resolveStaff(req, staffId);
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