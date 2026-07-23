import express from 'express';
import { z } from 'zod';
import Housekeeping from '../models/Housekeeping.js';
import Admission from '../models/Admission.js';
import Bed from '../models/Bed.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createHousekeepingSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';

const hkAutoCreateSchema = z.object({ admissionId: z.string().min(1), bedNumber: z.string().min(1), ward: z.string().optional(), room: z.string().optional(), isInfectionCase: z.boolean().optional() });
const hkAssignSchema = z.object({ assignedTo: z.string().optional(), assignedById: z.string().optional() });
const hkCompleteSchema = z.object({ checklistNotes: z.string().optional(), photo: z.string().optional(), checklist: z.any().optional() });
const hkChecklistSchema = z.object({ checklist: z.any() });

const router = express.Router();

const genId = () => `HSK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Auto-create housekeeping task when patient is discharged
router.post('/auto-create-on-discharge', protect, adminOnly, validate(hkAutoCreateSchema), async (req, res) => {
  try {
    const { admissionId, bedNumber, ward, room, isInfectionCase } = req.body;
    if (!admissionId || !bedNumber) {
      return res.status(400).json({ message: 'Admission ID and bed number required' });
    }

    const taskId = genId();
    const taskType = isInfectionCase ? 'Terminal Cleaning (Infection)' : 'Routine Cleaning';
    
const task = await Housekeeping.create({
      taskId,
      admissionId,
      bedNumber,
      ward,
      room: room || bedNumber,
      hospitalId: req.user.hospitalId || undefined,
      type: taskType,
      priority: isInfectionCase ? 'High' : 'Normal',
      status: 'Pending',
      checklist: {
        bedStrip: false,
        mattressClean: false,
        pillowClean: false,
        blanketChange: false,
        mopFloor: false,
        disinfectSurfaces: false,
        bathroomClean: false,
        curtainsWash: isInfectionCase,
        wasteDisposal: false,
        finalInspection: false,
      },
      isInfectionCase: isInfectionCase || false,
      createdBy: req.user._id,
    });

    await auditLog('create_housekeeping_task', req.user._id, { recordId: task._id, ip: req.ip, userAgent: req.get('user-agent') });
    // Notify housekeeping staff
    const housekeepingStaff = await Notification.insertMany([{
      title: 'New Housekeeping Task',
      message: `Room ${room || bedNumber} requires cleaning - ${taskType}`,
      type: 'housekeeping',
      priority: isInfectionCase ? 'high' : 'normal',
      userId: req.user._id.toString(),
    }]);

    res.status(201).json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/tasks', protect, adminOnly, validate(createHousekeepingSchema), async (req, res) => {
  try {
    const { room, bedNumber, ward, type, priority, checklist } = req.body;
    if (!room || !type) return res.status(400).json({ message: 'Room and type required' });
    const taskId = genId();
const task = await Housekeeping.create({
      taskId,
      room,
      bedNumber,
      ward,
      type,
      priority: priority || 'Normal',
      checklist: checklist || {},
      hospitalId: req.user.hospitalId || undefined,
      createdBy: req.user._id
    });
    await auditLog('create_housekeeping_task', req.user._id, { recordId: task._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/tasks', protect, async (req, res) => {
  try {
    const { status, ward, type, assignedTo, date } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (ward && ward !== 'All') filter.ward = ward;
    if (type && type !== 'All') filter.type = type;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }
    
    const tasks = await Housekeeping.find(filter).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/tasks/:id', protect, async (req, res) => {
  try {
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && task.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/tasks/:id/assign', protect, validate(hkAssignSchema), async (req, res) => {
  try {
    const { assignedTo, assignedById } = req.body;
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && task.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    task.assignedTo = assignedTo;
    task.assignedById = req.user._id;
    task.status = 'In Progress';
    task.startedAt = new Date();
    await task.save();
     await auditLog('assign_housekeeping_task', req.user._id, { recordId: task._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/tasks/:id/complete', protect, validate(hkCompleteSchema), async (req, res) => {
  try {
    const { checklistNotes, photo, checklist } = req.body;
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && task.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Validate mandatory checklist items for infection cases
    if (task.isInfectionCase) {
      const mandatory = ['bedStrip', 'mattressClean', 'pillowClean', 'blanketChange', 'mopFloor', 'disinfectSurfaces', 'bathroomClean', 'curtainsWash', 'wasteDisposal'];
      const missing = mandatory.filter(item => !checklist?.[item]);
      if (missing.length > 0) {
        return res.status(400).json({ message: `Mandatory checklist items missing for infection case: ${missing.join(', ')}` });
      }
    }
    
    task.status = 'Completed';
    task.completedAt = new Date();
    if (checklistNotes) task.checklistNotes = checklistNotes;
    if (photo) task.photo = photo;
    if (checklist) task.checklist = { ...task.checklist, ...checklist };
    await task.save();
     await auditLog('complete_housekeeping_task', req.user._id, { recordId: task._id, ip: req.ip, userAgent: req.get('user-agent') });
    
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/tasks/:id/verify', protect, async (req, res) => {
  try {
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && task.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
task.status = 'Verified';
    task.verifiedBy = req.user.name;
    task.verifiedAt = new Date();
    await task.save();
     await auditLog('verify_housekeeping_task', req.user._id, { recordId: task._id, ip: req.ip, userAgent: req.get('user-agent') });
    
    // Update bed status to available if it was a discharge cleaning
    if (task.bedNumber && task.type.includes('Cleaning')) {
      await Bed.findOneAndUpdate(
        { bedNumber: task.bedNumber },
        { status: 'Available' }
      );
    }
    
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/tasks/:id/checklist', protect, validate(hkChecklistSchema), async (req, res) => {
  try {
    const { checklist } = req.body;
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && task.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    task.checklist = { ...task.checklist, ...checklist };
    await task.save();
    await auditLog('update_housekeeping_checklist', req.user._id, { recordId: task._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const pending = await Housekeeping.countDocuments({ status: 'Pending', ...hFilter });
    const inProgress = await Housekeeping.countDocuments({ status: 'In Progress', ...hFilter });
    const completed = await Housekeeping.countDocuments({ status: 'Completed', ...hFilter });
    const verified = await Housekeeping.countDocuments({ status: 'Verified', ...hFilter });
    const infectionCases = await Housekeeping.countDocuments({ isInfectionCase: true, ...hFilter });
    res.json({ pending, inProgress, completed, verified, infectionCases });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;