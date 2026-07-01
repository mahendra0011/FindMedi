import express from 'express';
import Housekeeping from '../models/Housekeeping.js';
import Admission from '../models/Admission.js';
import Bed from '../models/Bed.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const genId = async () => { const c = await Housekeeping.countDocuments(); return `HSK-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };

// Auto-create housekeeping task when patient is discharged
router.post('/auto-create-on-discharge', protect, async (req, res) => {
  try {
    const { admissionId, bedNumber, ward, room, isInfectionCase } = req.body;
    if (!admissionId || !bedNumber) {
      return res.status(400).json({ message: 'Admission ID and bed number required' });
    }

    const taskId = await genId();
    const taskType = isInfectionCase ? 'Terminal Cleaning (Infection)' : 'Routine Cleaning';
    
    const task = await Housekeeping.create({
      taskId,
      admissionId,
      bedNumber,
      ward,
      room: room || bedNumber,
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

router.post('/tasks', protect, async (req, res) => {
  try {
    const { room, bedNumber, ward, type, priority, checklist } = req.body;
    if (!room || !type) return res.status(400).json({ message: 'Room and type required' });
    const taskId = await genId();
    const task = await Housekeeping.create({ 
      taskId, 
      room, 
      bedNumber, 
      ward, 
      type, 
      priority: priority || 'Normal',
      checklist: checklist || {},
      createdBy: req.user._id 
    });
    res.status(201).json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/tasks', protect, async (req, res) => {
  try {
    const { status, ward, type, assignedTo, date } = req.query;
    const filter = {};
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
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/tasks/:id/assign', protect, async (req, res) => {
  try {
    const { assignedTo, assignedById } = req.body;
    const task = await Housekeeping.findByIdAndUpdate(
      req.params.id, 
      { assignedTo, assignedById: req.user._id, status: 'In Progress', startedAt: new Date() }, 
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/tasks/:id/complete', protect, async (req, res) => {
  try {
    const { checklistNotes, photo, checklist } = req.body;
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    
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
    
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/tasks/:id/verify', protect, async (req, res) => {
  try {
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    
    task.status = 'Verified';
    task.verifiedBy = req.user.name;
    task.verifiedAt = new Date();
    await task.save();
    
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

router.put('/tasks/:id/checklist', protect, async (req, res) => {
  try {
    const { checklist } = req.body;
    const task = await Housekeeping.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    task.checklist = { ...task.checklist, ...checklist };
    await task.save();
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const pending = await Housekeeping.countDocuments({ status: 'Pending' });
    const inProgress = await Housekeeping.countDocuments({ status: 'In Progress' });
    const completed = await Housekeeping.countDocuments({ status: 'Completed' });
    const verified = await Housekeeping.countDocuments({ status: 'Verified' });
    const infectionCases = await Housekeeping.countDocuments({ isInfectionCase: true });
    res.json({ pending, inProgress, completed, verified, infectionCases });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;