import express from 'express';
import { z } from 'zod';
import LabOrder from '../models/LabOrder.js';
import LabBooking from '../models/LabBooking.js';
import Equipment from '../models/Equipment.js';
import HealthPackage from '../models/HealthPackage.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createLabOrderSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';

const labRegisterSampleSchema = z.object({ testIndex: z.number().int().nonnegative(), sampleType: z.string().optional() });
const labCollectSampleSchema = z.object({ testIndex: z.number().int().nonnegative(), rejectionReason: z.string().optional() });
const labEnterResultSchema = z.object({ testIndex: z.number().int().nonnegative(), resultValue: z.string().min(1), normalRange: z.string().optional(), unit: z.string().optional() });
const labVerifySchema = z.object({ testIndex: z.number().int().nonnegative(), approved: z.boolean().optional(), notes: z.string().optional() });
const labDeliverReportSchema = z.object({ testIndex: z.number().int().nonnegative(), reportUrl: z.string().optional() });
const labBookingSchema = z.object({}).passthrough();
const labEquipmentSchema = z.object({}).passthrough();
const labPackageSchema = z.object({}).passthrough();

const router = express.Router();

const generateOrderId = () => `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const generateSampleId = () => `SMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// ─── Doctor: Create Lab Order ──────────────────────────────────────────────
router.post('/orders', protect, validate(createLabOrderSchema), async (req, res) => {
  try {
    const { patientId, patientName, tests, clinicalNotes, priority } = req.body;
    if (!patientId || !tests?.length) {
      return res.status(400).json({ message: 'Patient and at least one test required' });
    }

const orderId = generateOrderId();
    const order = await LabOrder.create({
      orderId, patientId, patientName,
      doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId || undefined, facilityId: req.user.facilityId || req.user.hospitalId || undefined,
      tests: tests.map(t => ({
        testName: t.testName, category: t.category || 'Blood',
        priority: t.priority || priority || 'Routine', status: 'Ordered',
      })),
      clinicalNotes: clinicalNotes || '', priority: priority || 'Routine', createdBy: req.user._id,
    });

    await auditLog('create_lab_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    const labStaff = await User.find({ role: { $in: ['lab_receptionist', 'lab_technician', 'admin'] }, status: 'active' }).select('_id');
    await Notification.insertMany(labStaff.map(staff => ({
      title: 'New Lab Order', message: `Dr. ${req.user.name} ordered ${tests.length} test(s) for ${patientName}`,
      type: 'lab', userId: staff._id.toString(),
    })));

    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Get Lab Orders ────────────────────────────────────────────────────────
router.get('/orders', protect, async (req, res) => {
  try {
    const { status, priority, patientId, doctorId, search } = req.query;
    const filter = {};
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (patientId) {
      filter.patientId = patientId;
    }
    if (req.user.role === 'doctor') {
      filter.doctorId = req.user.doctorProfileId;
    } else if (doctorId) {
      filter.doctorId = doctorId;
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;

    // Handle order-level status filter with proper mapping
    if (status && status !== 'All') {
      const orderStatusMap = {
        'Ordered': { $in: ['Ordered', 'Sample Pending'] },
        'Processing': { $in: ['Processing', 'Under Verification'] },
        'Completed': 'Completed',
        'Partially Completed': 'Partially Completed',
        'Cancelled': 'Cancelled',
      };
      filter.status = orderStatusMap[status] || status;
    }

    // Handle priority filter
    if (priority && priority !== 'All') filter.priority = priority;
    if (search) {
      filter.$or = [
        { orderId: new RegExp(search, 'i') }, { patientName: new RegExp(search, 'i') },
        { doctorName: new RegExp(search, 'i') },
      ];
    }
    const orders = await LabOrder.find(filter).populate('patientId', 'name email phone').populate('doctorId', 'name email').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Single Order ──────────────────────────────────────────────────────
router.get('/orders/:id', protect, async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id).populate('patientId', 'name email phone').populate('doctorId', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Lab Receptionist: Register Sample ─────────────────────────────────────
router.put('/orders/:id/register-sample', protect, validate(labRegisterSampleSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { testIndex, sampleType } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.sampleId = generateSampleId();
    test.sampleType = sampleType || 'Blood';
    test.status = 'Sample Needed';
    if (!order.sampleIds.includes(test.sampleId)) order.sampleIds.push(test.sampleId);
    await order.save();
    await auditLog('register_sample', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Phlebotomist: Collect Sample ──────────────────────────────────────────
router.put('/orders/:id/collect-sample', protect, validate(labCollectSampleSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { testIndex, rejectionReason } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (rejectionReason) { test.status = 'Ordered'; test.rejectionReason = rejectionReason; }
    else { test.status = 'Sample Collected'; test.sampleCollectedAt = new Date(); test.collectedBy = req.user.name; }
    await order.save();
    await auditLog('collect_sample', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Lab Technician: Enter Results ─────────────────────────────────────────
router.put('/orders/:id/enter-result', protect, adminOnly, validate(labEnterResultSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { testIndex, resultValue, normalRange, unit } = req.body;
    if (testIndex === undefined || !resultValue) return res.status(400).json({ message: 'Test index and result value required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.resultValue = resultValue;
    test.normalRange = normalRange || test.normalRange;
    test.unit = unit || test.unit;
    test.status = 'Completed';
    test.resultEnteredBy = req.user._id;
    test.resultEnteredAt = new Date();
    if (normalRange) {
      const rangeMatch = normalRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      if (rangeMatch) {
        const val = parseFloat(resultValue), low = parseFloat(rangeMatch[1]), high = parseFloat(rangeMatch[2]);
        if (!isNaN(val) && !isNaN(low) && !isNaN(high)) {
          test.isAbnormal = val < low || val > high;
          test.isCritical = val < low * 0.5 || val > high * 1.5;
        }
      }
    }
await order.save();
    await auditLog('enter_lab_result', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    if (test.isCritical) {
      await Notification.create({ title: 'Critical Lab Result', message: `Critical result for ${test.testName} (${test.resultValue}) - Patient: ${order.patientName}`, type: 'lab', userId: order.doctorId.toString() });
    }
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pathologist: Verify Results ───────────────────────────────────────────
router.put('/orders/:id/verify', protect, adminOnly, validate(labVerifySchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { testIndex, approved, notes } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (approved) { test.status = 'Verified'; test.verifiedBy = req.user._id; test.verifiedAt = new Date(); test.verificationNotes = notes || ''; }
    else { test.status = 'Completed'; test.verificationNotes = notes || 'Rejected by pathologist'; }
await order.save();
    await auditLog('verify_lab_result', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    const allVerified = order.tests.every(t => t.status === 'Verified' || t.status === 'Report Delivered');
    if (allVerified) {
      await Notification.create({ title: 'Lab Report Ready', message: `Your lab report (${order.orderId}) is now available.`, type: 'lab', userId: order.patientId.toString() });
    }
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Mark Report Delivered ─────────────────────────────────────────────────
router.put('/orders/:id/deliver-report', protect, validate(labDeliverReportSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { testIndex, reportUrl } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.status = 'Report Delivered';
    if (reportUrl) order.reportUrl = reportUrl;
    await order.save();
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Get Lab Stats ─────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'doctor') filter.doctorId = req.user.doctorProfileId;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    const total = await LabOrder.countDocuments(filter);
    const pending = await LabOrder.countDocuments({ ...filter, status: { $in: ['Ordered', 'Sample Pending'] } });
    const processing = await LabOrder.countDocuments({ ...filter, status: { $in: ['Processing', 'Under Verification'] } });
    const completed = await LabOrder.countDocuments({ ...filter, status: 'Completed' });
    const critical = await LabOrder.countDocuments({ ...filter, 'tests.isCritical': true });
    res.json({ total, pending, processing, completed, critical });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Available Lab Tests (public, supports filtering) ─────────────────
router.get('/tests', async (req, res) => {
  try {
    const { category, providerType, search, hospitalId, facilityId, limit } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (providerType) filter.providerType = providerType;
    if (hospitalId) filter.hospitalId = hospitalId;
    if (facilityId) filter.providerId = facilityId;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const query = Test.find(filter).sort({ name: 1 });
    if (limit) query.limit(parseInt(limit));
    const tests = await query;
    res.json({ tests: tests.length ? tests : [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Lab Bookings ──────────────────────────────────────────────────────────
router.get('/bookings', protect, async (req, res) => {
  try {
    const { status, date, search } = req.query;
    const filter = {};
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (date) filter.bookingDate = { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) };
    if (search) filter.$or = [{ bookingId: new RegExp(search, 'i') }, { patientName: new RegExp(search, 'i') }];
    const bookings = await LabBooking.find(filter).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/bookings', protect, validate(labBookingSchema), async (req, res) => {
  try {
    const { testIds, tests, prescriptionUrl } = req.body;
    const requestedTests = testIds || (tests || []).map(t => t._id || t.id || t.name).filter(Boolean);
    if (requestedTests.length) {
      const rxTests = await Test.find({ _id: { $in: requestedTests }, prescriptionReq: true }).select('_id name');
      if (rxTests.length && !prescriptionUrl) {
        return res.status(400).json({ message: `Prescription required for test(s): ${rxTests.map(t => t.name).join(', ')}` });
      }
    }
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const booking = await LabBooking.create({ ...req.body, bookingId, hospitalId: req.user.hospitalId || undefined, facilityId: req.user.facilityId || req.user.hospitalId || undefined, createdBy: req.user._id });
    await auditLog('create_lab_booking', req.user._id, { recordId: booking._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(booking);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/bookings/:id', protect, adminOnly, validate(labBookingSchema), async (req, res) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && booking.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
Object.assign(booking, req.body);
    await booking.save();
    await auditLog('update_lab_booking', req.user._id, { recordId: booking._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(booking);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/bookings/:id', protect, adminOnly, async (req, res) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && booking.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
await LabBooking.findByIdAndDelete(req.params.id);
    await auditLog('delete_lab_booking', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Equipment ─────────────────────────────────────────────────────────────
router.get('/equipment', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    const equipment = await Equipment.find(filter).sort({ name: 1 });
    res.json({ equipment });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/equipment', protect, validate(labEquipmentSchema), async (req, res) => {
  try {
    const item = await Equipment.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_lab_equipment', req.user._id, { recordId: item._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/equipment/:id', protect, adminOnly, validate(labEquipmentSchema), async (req, res) => {
  try {
    const item = await Equipment.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Equipment not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && item.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(item, req.body);
    await item.save();
     await auditLog('update_lab_equipment', req.user._id, { recordId: item._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/equipment/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Equipment.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Equipment not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && item.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
await Equipment.findByIdAndDelete(req.params.id);
    await auditLog('delete_lab_equipment', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Health Packages (public endpoint for browsing) ───────────────────────
router.get('/packages/public', async (req, res) => {
  try {
    const { hospitalId, facilityId } = req.query;
    const filter = {};
    if (hospitalId) filter.hospitalId = hospitalId;
    if (facilityId) filter.facilityId = facilityId;
    const packages = await HealthPackage.find(filter).sort({ createdAt: -1 });
    res.json({ packages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Health Packages (authenticated, scoped to user's facility) ───────────
router.get('/packages', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    const packages = await HealthPackage.find(filter).sort({ createdAt: -1 });
    res.json({ packages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/packages', protect, validate(labPackageSchema), async (req, res) => {
  try {
    const pkg = await HealthPackage.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_lab_package', req.user._id, { recordId: pkg._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(pkg);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/packages/:id', protect, adminOnly, validate(labPackageSchema), async (req, res) => {
  try {
    const pkg = await HealthPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && pkg.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
Object.assign(pkg, req.body);
    await pkg.save();
    await auditLog('update_lab_package', req.user._id, { recordId: pkg._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(pkg);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/packages/:id', protect, adminOnly, async (req, res) => {
  try {
    const pkg = await HealthPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && pkg.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
await HealthPackage.findByIdAndDelete(req.params.id);
    await auditLog('delete_lab_package', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Lab Export Endpoints ─────────────────────────────────────────────────────
router.get('/export', protect, adminOnly, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo, status } = req.query;
    const filter = {};
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    if (status && status !== 'All') filter.status = status;

    const orders = await LabOrder.find(filter).populate('patientId', 'name').populate('doctorId', 'name');

    if (format === 'csv') {
      const header = 'orderId,patient,doctor,tests,status,amount,createdAt\n';
      const rows = orders.map(o => `${o.orderId},${o.patientName},${o.doctorName},${o.tests?.length || 0},${o.status},${o.amount || 0},${o.createdAt?.toISOString()?.split('T')[0]}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=lab-orders.csv');
      return res.send(header + rows);
    }

    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

