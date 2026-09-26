import express from 'express';
import { z } from 'zod';
import LabOrder from '../models/LabOrder.js';
import LabBooking from '../models/LabBooking.js';
import Equipment from '../models/Equipment.js';
import HealthPackage from '../models/HealthPackage.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { protect, adminOnly, requireRole } from '../middleware/auth.js';
import { validate, createLabOrderSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generateOrderId, generateSampleId, generateTimestampedId } from '../utils/idGenerator.js';
import { toCsvNative, toCsvFallback, NATIVE_CSV_AVAILABLE } from '../services/napiCsvService.js';
import { getIO, emitDeliveryStatus } from '../services/socketService.js';

// Lab staff jo apne center ke reports manage / courier se bhej sakte hain.
const LAB_STAFF_ROLES = ['lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'hospital_admin', 'superadmin'];
// Report courier dispatch ke liye allowed roles (doctors bhi bhej sakte hain).
const REPORT_DISPATCH_ROLES = [...LAB_STAFF_ROLES, 'doctor', 'clinic_doctor', 'radiologist'];

const labRegisterSampleSchema = z.object({ testIndex: z.number().int().nonnegative(), sampleType: z.string().optional() });
const labCollectSampleSchema = z.object({ testIndex: z.number().int().nonnegative(), rejectionReason: z.string().optional() });
const labEnterResultSchema = z.object({ testIndex: z.number().int().nonnegative(), resultValue: z.string().min(1), normalRange: z.string().optional(), unit: z.string().optional() });
const labVerifySchema = z.object({ testIndex: z.number().int().nonnegative(), approved: z.boolean().optional(), notes: z.string().optional() });
const labDeliverReportSchema = z.object({ testIndex: z.number().int().nonnegative(), reportUrl: z.string().optional() });
const labDispatchReportSchema = z.object({
  reportUrl: z.string().optional(),
  dropAddress: z.string().optional(),
  pickupAddress: z.string().optional(),
  pickupName: z.string().optional(),
  patientPhone: z.string().optional(),
  deliveryFee: z.coerce.number().nonnegative().optional(),
  estimatedTime: z.string().optional(),
  notes: z.string().optional(),
  deliveryPartnerId: z.string().optional(),
}).passthrough();
const labBookingSchema = z.object({}).passthrough();
const labEquipmentSchema = z.object({}).passthrough();
const labPackageSchema = z.object({}).passthrough();

const router = express.Router();

// ─── Doctor: Create Lab Order ──────────────────────────────────────────────
router.post('/orders', protect, validate(createLabOrderSchema), async (req, res) => {
  try {
    const { patientId, patientName, tests, clinicalNotes, priority } = req.body;
    if (!patientId || !tests?.length) {
      return res.status(400).json({ message: 'Patient and at least one test required' });
    }

const orderId = generateOrderId('LAB');
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
    const labStaff = await User.find({ role: { $in: ['lab_receptionist', 'lab_technician', 'hospital_admin'] }, status: 'active' }).select('_id');
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
    if (req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') {
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
    if (req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') filter.doctorId = req.user.doctorProfileId;
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

// ─── GET /api/lab/outbreak?test=dengue&days=30&res=8 ────────────────────────
// Spec expansion-01D: abnormal lab results binned into H3 hexagons for
// outbreak surveillance (hospital location → res-8 cell → counts).
router.get('/outbreak', protect, async (req, res) => {
  try {
    const test = String(req.query.test || 'dengue');
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const res8 = Math.min(9, Math.max(6, Number(req.query.res) || 8));
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const { latLngToCell } = await import('h3-js');
    const { default: Hospital } = await import('../models/Hospital.js');
    const orders = await LabOrder.find({
      createdAt: { $gte: since },
      tests: { $elemMatch: { testName: new RegExp(test, 'i'), isAbnormal: true } },
    }).select('hospitalId createdAt').lean();
    const hospIds = [...new Set(orders.map((o) => String(o.hospitalId)).filter(Boolean))];
    const hospitals = await Hospital.find({ _id: { $in: hospIds } }).select('location').lean();
    const locById = new Map(hospitals.map((h) => [String(h._id), h.location?.coordinates]));
    const cells = {};
    for (const o of orders) {
      const coords = locById.get(String(o.hospitalId));
      if (!coords || coords.length < 2) continue;
      const cell = latLngToCell(coords[1], coords[0], res8);
      if (!cells[cell]) cells[cell] = { h3Cell: cell, resolution: res8, abnormalCount: 0, hospitals: 0, _hosp: new Set() };
      cells[cell].abnormalCount += 1;
      cells[cell]._hosp.add(String(o.hospitalId));
    }
    const out = Object.values(cells).map(({ _hosp, ...c }) => ({ ...c, hospitals: _hosp.size }));
    out.sort((a, b) => b.abnormalCount - a.abnormalCount);
    res.json({ success: true, test, days, resolution: res8, totalAbnormal: orders.length, cells: out });
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
    let ownershipOr = null;
    if (req.user.role === 'patient') {
      ownershipOr = [
        { patientId: req.user._id },
        { patientId: { $exists: false }, patientName: req.user.name },
      ];
      filter.$or = ownershipOr;
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (date) filter.bookingDate = { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) };
    if (search) {
      const searchOr = [{ bookingId: new RegExp(search, 'i') }, { patientName: new RegExp(search, 'i') }];
      if (ownershipOr) {
        filter.$and = [{ $or: ownershipOr }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }
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
    const bookingId = generateTimestampedId('BK');
    const booking = await LabBooking.create({ ...req.body, bookingId, hospitalId: req.user.hospitalId || undefined, facilityId: req.user.facilityId || req.user.hospitalId || undefined, createdBy: req.user._id });
    await auditLog('create_lab_booking', req.user._id, { recordId: booking._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(booking);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/bookings/:id', protect, requireRole(LAB_STAFF_ROLES), validate(labBookingSchema), async (req, res) => {
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

router.delete('/bookings/:id', protect, requireRole(LAB_STAFF_ROLES), async (req, res) => {
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
// ─── Report Courier Delivery (delivery boy fleet: medicines + lab reports) ────
function generateDeliveryOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Shared helper: lab report ko courier delivery task bana ke delivery partner fleet me daal deta hai.
async function createReportDeliveryTask({ req, res, booking, order }) {
  const body = req.body || {};
  const isBooking = Boolean(booking);
  const record = booking || order;

  // Report URL ke bina courier ke paas bhejne ke liye kuch nahi hota.
  const reportUrl = body.reportUrl || record.reportUrl;
  if (!reportUrl) {
    return res.status(400).json({ message: 'Report is not uploaded yet. Upload the report first or pass reportUrl.' });
  }

  // Drop address resolution: request body -> home collection address -> patient profile address.
  let dropAddress = String(body.dropAddress || '').trim();
  if (!dropAddress && isBooking) dropAddress = String(booking.homeCollectionAddress || '').trim();
  if (!dropAddress) {
    const patientId = isBooking ? booking.patientId : order.patientId;
    if (patientId) {
      const patientUser = await User.findById(patientId).select('address city state pincode').lean().catch(() => null);
      if (patientUser) {
        dropAddress = [patientUser.address, patientUser.city, patientUser.state, patientUser.pincode]
          .filter(Boolean)
          .join(', ');
      }
    }
  }
  if (!dropAddress) {
    return res.status(400).json({ message: 'Delivery address required — patient has no home-collection address on file.' });
  }

  const pickupName = body.pickupName || 'FindMedi Diagnostic Center';
  const pickupAddress = body.pickupAddress || pickupName;
  const deliveryFee = Number(body.deliveryFee ?? (isBooking ? booking.reportDeliveryFee : 0) ?? 0) || 0;

  const task = await PharmacyDelivery.create({
    serviceType: 'lab_report',
    orderId: isBooking ? booking.bookingId : order.orderId,
    labBookingId: isBooking ? booking._id : undefined,
    labOrderId: isBooking ? undefined : order._id,
    status: 'Pending Assignment',
    pickupName,
    pickupAddress,
    dropAddress,
    patientName: isBooking ? booking.patientName : order.patientName,
    patientPhone: body.patientPhone || (isBooking ? booking.patientPhone : '') || '',
    deliveryFee,
    notes: body.notes,
    estimatedTime: body.estimatedTime,
    deliveryOtp: generateDeliveryOtp(),
    hospitalId: req.user.hospitalId || record.hospitalId,
    facilityId: req.user.facilityId || record.facilityId,
  });

  // Report metadata update (booking me mode + task link save karo).
  if (isBooking) {
    booking.reportUrl = reportUrl;
    booking.reportReadyAt = booking.reportReadyAt || new Date();
    if (!booking.reportStatus || booking.reportStatus === 'Pending Upload') booking.reportStatus = 'Uploaded';
    booking.reportDeliveryMode = 'Courier';
    booking.reportDeliveryFee = deliveryFee;
    booking.reportDeliveryTaskId = task._id;
    await booking.save();
  } else if (!order.reportUrl) {
    order.reportUrl = reportUrl;
    await order.save();
  }

  // Optional turant assignment — deliveryPartnerId diya gaya ho to seedha assign karo.
  let partner = null;
  const partnerId = body.deliveryPartnerId;
  if (partnerId) {
    const found = await DeliveryPartner.findById(partnerId);
    if (found && found.status === 'approved') {
      partner = found;
      task.deliveryPartnerId = partner._id;
      task.status = 'Assigned';
      task.assignedAt = new Date();
      await task.save();
      await DeliveryPartner.findByIdAndUpdate(partner._id, { isAvailable: false });
    }
  }

  await auditLog('dispatch_lab_report', req.user._id, {
    recordId: record._id, ip: req.ip, userAgent: req.get('user-agent'),
  });

  // Patient ko notify karo (report ready + courier status + delivery OTP).
  const notifyUserId = isBooking ? booking.patientId : order.patientId;
  if (notifyUserId) {
    await Notification.create({
      userId: String(notifyUserId),
      title: partner ? 'Lab report out for delivery' : 'Lab report ready for delivery',
      message: `Your report for ${task.orderId} ${partner ? `is assigned to ${partner.name}` : 'will be handed to a delivery partner shortly'}. Delivery OTP: ${task.deliveryOtp}`,
      type: 'records',
    }).catch(() => {});
  }

  // Delivery partner ke socket room me assignment event (incoming-call modal).
  if (partner) {
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${partner.userId}`).emit('delivery:new_assignment', {
          deliveryId: task._id,
          delivery: task,
          serviceType: 'lab_report',
        });
      }
    } catch { /* socket optional — REST refresh se bhi data aa jata hai */ }
  }
  emitDeliveryStatus(task.orderId, task.status);

  return { task, partner };
}

// Send a booking's report by courier (delivery partner).
router.post('/bookings/:id/dispatch-report', protect, requireRole(REPORT_DISPATCH_ROLES), validate(labDispatchReportSchema), async (req, res) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && booking.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { task, partner } = await createReportDeliveryTask({ req, res, booking });
    return res.status(201).json({ task, assignedTo: partner ? { _id: partner._id, name: partner.name } : null });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Latest courier task for a booking (Reports tab me live status dikhane ke liye).
router.get('/bookings/:id/dispatch-report', protect, async (req, res) => {
  try {
    const task = await PharmacyDelivery.findOne({ labBookingId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ task });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Doctor-ordered lab order ka report courier se bhejo.
router.post('/orders/:id/dispatch-report', protect, requireRole(REPORT_DISPATCH_ROLES), validate(labDispatchReportSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { task, partner } = await createReportDeliveryTask({ req, res, order });
    return res.status(201).json({ task, assignedTo: partner ? { _id: partner._id, name: partner.name } : null });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Lab ke saare courier report tasks (dispatch board / status tracking).
router.get('/report-deliveries', protect, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = { serviceType: 'lab_report' };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') {
      filter.facilityId = req.user.facilityId || req.user.hospitalId;
    }
    if (status && status !== 'All') filter.status = status;
    const deliveries = await PharmacyDelivery.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .populate('labBookingId', 'bookingId patientName tests reportUrl visitType')
      .lean();
    res.json({ deliveries });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

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
      const labFields = ['orderId', 'patient', 'doctor', 'tests', 'status', 'amount', 'createdAt'];
      const labData = orders.map(o => ({
        orderId: o.orderId,
        patient: o.patientName,
        doctor: o.doctorName,
        tests: o.tests?.length || 0,
        status: o.status,
        amount: o.amount || 0,
        createdAt: o.createdAt?.toISOString()?.split('T')[0],
      }));
      const csv = NATIVE_CSV_AVAILABLE ? toCsvNative(labData, labFields) : toCsvFallback(labData, labFields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=lab-orders.csv`);
      return res.send(csv);
    }

    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

