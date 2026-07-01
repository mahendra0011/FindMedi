import express from 'express';
import LabOrder from '../models/LabOrder.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateOrderId = async () => {
  const count = await LabOrder.countDocuments();
  return `LAB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

const generateSampleId = () => `SMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// ─── Doctor: Create Lab Order ──────────────────────────────────────────────
router.post('/orders', protect, async (req, res) => {
  try {
    const { patientId, patientName, tests, clinicalNotes, priority } = req.body;
    if (!patientId || !tests?.length) {
      return res.status(400).json({ message: 'Patient and at least one test required' });
    }

    const orderId = await generateOrderId();
    const order = await LabOrder.create({
      orderId, patientId, patientName,
      doctorId: req.user._id, doctorName: req.user.name,
      tests: tests.map(t => ({
        testName: t.testName, category: t.category || 'Blood',
        priority: t.priority || priority || 'Routine', status: 'Ordered',
      })),
      clinicalNotes: clinicalNotes || '', priority: priority || 'Routine', createdBy: req.user._id,
    });

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
    if (req.user.role === 'doctor') filter.doctorId = req.user._id;
    if (req.user.role === 'patient') filter.patientId = req.user._id;

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
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
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
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Lab Receptionist: Register Sample ─────────────────────────────────────
router.put('/orders/:id/register-sample', protect, async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { testIndex, sampleType } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.sampleId = generateSampleId();
    test.sampleType = sampleType || 'Blood';
    test.status = 'Sample Needed';
    if (!order.sampleIds.includes(test.sampleId)) order.sampleIds.push(test.sampleId);
    await order.save();
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Phlebotomist: Collect Sample ──────────────────────────────────────────
router.put('/orders/:id/collect-sample', protect, async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { testIndex, rejectionReason } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (rejectionReason) { test.status = 'Ordered'; test.rejectionReason = rejectionReason; }
    else { test.status = 'Sample Collected'; test.sampleCollectedAt = new Date(); test.collectedBy = req.user.name; }
    await order.save();
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Lab Technician: Enter Results ─────────────────────────────────────────
router.put('/orders/:id/enter-result', protect, async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
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
    if (test.isCritical) {
      await Notification.create({ title: 'Critical Lab Result', message: `Critical result for ${test.testName} (${test.resultValue}) - Patient: ${order.patientName}`, type: 'lab', userId: order.doctorId.toString() });
    }
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pathologist: Verify Results ───────────────────────────────────────────
router.put('/orders/:id/verify', protect, async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { testIndex, approved, notes } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (approved) { test.status = 'Verified'; test.verifiedBy = req.user._id; test.verifiedAt = new Date(); test.verificationNotes = notes || ''; }
    else { test.status = 'Completed'; test.verificationNotes = notes || 'Rejected by pathologist'; }
    await order.save();
    const allVerified = order.tests.every(t => t.status === 'Verified' || t.status === 'Report Delivered');
    if (allVerified) {
      await Notification.create({ title: 'Lab Report Ready', message: `Your lab report (${order.orderId}) is now available.`, type: 'lab', userId: order.patientId.toString() });
    }
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Mark Report Delivered ─────────────────────────────────────────────────
router.put('/orders/:id/deliver-report', protect, async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
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
    if (req.user.role === 'doctor') filter.doctorId = req.user._id;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    const total = await LabOrder.countDocuments(filter);
    const pending = await LabOrder.countDocuments({ ...filter, status: { $in: ['Ordered', 'Sample Pending'] } });
    const processing = await LabOrder.countDocuments({ ...filter, status: { $in: ['Processing', 'Under Verification'] } });
    const completed = await LabOrder.countDocuments({ ...filter, status: 'Completed' });
    const critical = await LabOrder.countDocuments({ ...filter, 'tests.isCritical': true });
    res.json({ total, pending, processing, completed, critical });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Available Lab Tests ───────────────────────────────────────────────
router.get('/tests', protect, (req, res) => {
  const labTests = [
    { name: 'Complete Blood Count (CBC)', category: 'Blood', normalRange: '4.5-11.0', unit: '10^3/µL' },
    { name: 'Hemoglobin (Hb)', category: 'Blood', normalRange: '13.5-17.5', unit: 'g/dL' },
    { name: 'White Blood Cells (WBC)', category: 'Blood', normalRange: '4.5-11.0', unit: '10^3/µL' },
    { name: 'Platelet Count', category: 'Blood', normalRange: '150-450', unit: '10^3/µL' },
    { name: 'Blood Sugar (Fasting)', category: 'Blood', normalRange: '70-100', unit: 'mg/dL' },
    { name: 'Blood Sugar (Random)', category: 'Blood', normalRange: '70-140', unit: 'mg/dL' },
    { name: 'HbA1c', category: 'Blood', normalRange: '4.0-5.6', unit: '%' },
    { name: 'Liver Function Test (LFT)', category: 'Blood', normalRange: '10-40', unit: 'U/L' },
    { name: 'Kidney Function Test (KFT)', category: 'Blood', normalRange: '0.6-1.2', unit: 'mg/dL' },
    { name: 'Serum Creatinine', category: 'Blood', normalRange: '0.6-1.2', unit: 'mg/dL' },
    { name: 'Blood Urea Nitrogen (BUN)', category: 'Blood', normalRange: '7-20', unit: 'mg/dL' },
    { name: 'Uric Acid', category: 'Blood', normalRange: '3.5-7.2', unit: 'mg/dL' },
    { name: 'Cholesterol Total', category: 'Blood', normalRange: '125-200', unit: 'mg/dL' },
    { name: 'HDL Cholesterol', category: 'Blood', normalRange: '40-60', unit: 'mg/dL' },
    { name: 'LDL Cholesterol', category: 'Blood', normalRange: '<100', unit: 'mg/dL' },
    { name: 'Triglycerides', category: 'Blood', normalRange: '<150', unit: 'mg/dL' },
    { name: 'Thyroid (TSH)', category: 'Blood', normalRange: '0.4-4.0', unit: 'mIU/L' },
    { name: 'Vitamin D', category: 'Blood', normalRange: '30-100', unit: 'ng/mL' },
    { name: 'Vitamin B12', category: 'Blood', normalRange: '200-900', unit: 'pg/mL' },
    { name: 'Iron Studies', category: 'Blood', normalRange: '60-170', unit: 'µg/dL' },
    { name: 'Urine Routine', category: 'Urine', normalRange: 'Normal', unit: '' },
    { name: 'Urine Culture', category: 'Urine', normalRange: 'No Growth', unit: '' },
    { name: 'Urine Microalbumin', category: 'Urine', normalRange: '<30', unit: 'mg/L' },
    { name: 'Troponin I', category: 'Cardiac', normalRange: '<0.04', unit: 'ng/mL' },
    { name: 'CK-MB', category: 'Cardiac', normalRange: '<25', unit: 'U/L' },
    { name: 'NT-proBNP', category: 'Cardiac', normalRange: '<125', unit: 'pg/mL' },
    { name: 'Chest X-Ray', category: 'Imaging', normalRange: 'Normal', unit: '' },
    { name: 'ECG', category: 'Cardiac', normalRange: 'Normal Sinus Rhythm', unit: '' },
    { name: 'Ultrasound Abdomen', category: 'Imaging', normalRange: 'Normal', unit: '' },
  ];
  res.json({ tests: labTests });
});

export default router;