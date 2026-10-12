import express from 'express';
import { z } from 'zod';
import JobOpening from '../models/JobOpening.js';
import Candidate from '../models/Candidate.js';
import OnboardingTask from '../models/OnboardingTask.js';
import Staff from '../models/Staff.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

const createJobSchema = z.object({
  title: z.string().min(3).max(200),
  department: z.string().min(2).max(100),
  designation: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  requirements: z.array(z.string().max(500)).optional(),
  qualifications: z.array(z.string().max(200)).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  salaryRange: z.object({ min: z.number().min(0), max: z.number().min(0) }).optional(),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Intern', 'Visiting']).optional(),
  openings: z.number().min(1).optional(),
  closingDate: z.string().optional(),
  tags: z.array(z.string().max(50)).optional(),
});

const createCandidateSchema = z.object({
  jobOpeningId: z.string().min(1),
  name: z.string().min(2).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(8).max(20),
  qualifications: z.array(z.object({
    degree: z.string().max(200),
    year: z.number().optional(),
    institute: z.string().max(200).optional(),
  })).optional(),
  experienceYears: z.number().min(0).optional(),
  currentEmployer: z.string().max(200).optional(),
  expectedSalary: z.number().min(0).optional(),
  resumeUrl: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

// ─── Job Openings CRUD ──────────────────────────────────────────────────────
router.get('/jobs', authorize('staff:manage', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.department) filter.department = req.query.department;
    const jobs = await JobOpening.find(filter).sort({ postedDate: -1 }).limit(100).lean();
    return res.json({ total: jobs.length, jobs });
  } catch (err) {
    logger.error(`Job list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/jobs', authorize('staff:manage'), validate(createJobSchema), async (req, res) => {
  try {
    const job = await JobOpening.create({
      ...req.body,
      hospitalId: req.user.hospitalId,
      postedBy: actorId(req),
    });
    await auditLog(req, 'job.create', { jobId: job._id, title: job.title });
    return res.status(201).json(job);
  } catch (err) {
    logger.error(`Job create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.put('/jobs/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const job = await JobOpening.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      req.body,
      { new: true }
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await auditLog(req, 'job.update', { jobId: job._id });
    return res.json(job);
  } catch (err) {
    logger.error(`Job update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Candidates / Applicant Tracking ────────────────────────────────────────
router.get('/candidates', authorize('staff:manage', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.stage) filter.stage = req.query.stage;
    if (req.query.jobOpeningId) filter.jobOpeningId = req.query.jobOpeningId;
    const candidates = await Candidate.find(filter)
      .populate('jobOpeningId', 'title department')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ total: candidates.length, candidates });
  } catch (err) {
    logger.error(`Candidate list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/candidates', authorize('staff:manage', 'admin:manage'), validate(createCandidateSchema), async (req, res) => {
  try {
    const candidate = await Candidate.create({
      ...req.body,
      hospitalId: req.user.hospitalId,
    });
    await auditLog(req, 'candidate.create', { candidateId: candidate._id, name: candidate.name });
    return res.status(201).json(candidate);
  } catch (err) {
    logger.error(`Candidate create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/candidates/:id/stage', authorize('staff:manage'), async (req, res) => {
  try {
    const { stage, notes } = req.body || {};
    const validStages = ['Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
      'Interviewed', 'Offer Released', 'Offer Accepted', 'Offer Rejected',
      'Background Check', 'Onboarding', 'Hired', 'Rejected', 'Withdrawn'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: 'Invalid stage' });
    }
    const candidate = await Candidate.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const fromStage = candidate.stage;
    candidate.stage = stage;
    candidate.stageHistory.push({
      fromStage,
      toStage: stage,
      changedBy: actorId(req),
      changedAt: new Date(),
      notes: notes || '',
    });
    await candidate.save();
    await auditLog(req, 'candidate.stage', { candidateId: candidate._id, from: fromStage, to: stage });
    return res.json(candidate);
  } catch (err) {
    logger.error(`Candidate stage error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Onboarding Tasks ───────────────────────────────────────────────────────
router.get('/onboarding', authorize('staff:manage', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.staffId) filter.staffId = req.query.staffId;
    if (req.query.status) filter.status = req.query.status;
    const tasks = await OnboardingTask.find(filter)
      .populate('staffId', 'name employeeId role department')
      .sort({ dueDate: 1 })
      .limit(200)
      .lean();
    return res.json({ total: tasks.length, tasks });
  } catch (err) {
    logger.error(`Onboarding list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/onboarding', authorize('staff:manage'), async (req, res) => {
  try {
    const { staffId, taskName, taskType, dueDate, priority, assignedTo, checklistItems } = req.body || {};
    if (!staffId || !taskName) {
      return res.status(400).json({ message: 'staffId and taskName required' });
    }
    const task = await OnboardingTask.create({
      hospitalId: req.user.hospitalId,
      staffId,
      taskName,
      taskType: taskType || 'Other',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || 'Medium',
      assignedTo,
      checklistItems: checklistItems || [],
    });
    await auditLog(req, 'onboarding.create', { taskId: task._id, staffId });
    return res.status(201).json(task);
  } catch (err) {
    logger.error(`Onboarding create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/onboarding/:id/complete', authorize('staff:manage'), async (req, res) => {
  try {
    const task = await OnboardingTask.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { status: 'Completed', completedAt: new Date() },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await auditLog(req, 'onboarding.complete', { taskId: task._id });
    return res.json(task);
  } catch (err) {
    logger.error(`Onboarding complete error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Dashboard Stats ────────────────────────────────────────────────────────
router.get('/stats', authorize('staff:manage', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    const [openJobs, totalCandidates, shortlisted, hired, pendingOnboarding] = await Promise.all([
      JobOpening.countDocuments({ ...filter, status: 'Open' }),
      Candidate.countDocuments(filter),
      Candidate.countDocuments({ ...filter, stage: { $in: ['Shortlisted', 'Interview Scheduled', 'Interviewed'] } }),
      Candidate.countDocuments({ ...filter, stage: 'Hired' }),
      OnboardingTask.countDocuments({ ...filter, status: { $in: ['Pending', 'In Progress'] } }),
    ]);
    return res.json({ openJobs, totalCandidates, shortlisted, hired, pendingOnboarding });
  } catch (err) {
    logger.error(`Recruitment stats error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
