import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { applyTenantScope } from '../utils/tenantScope.js';
import { publicSearchLimiter } from '../middleware/rateLimit.js';
import express from 'express';
import { z } from 'zod';
import LabOrder from '../models/LabOrder.js';
import LabBooking from '../models/LabBooking.js';
import Equipment from '../models/Equipment.js';
import HealthPackage from '../models/HealthPackage.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
// PHARM-B-04: resolving the subject of a lab order needs the Patient record to
// compare the target's facility with the caller's.
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../services/notificationService.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { protect, adminOnly, requireRole, authorize } from '../middleware/auth.js';
import { authorizeObject, rolesWithPermission } from '../middleware/authorize.js';
import { validate, createLabOrderSchema, sampleTypeSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generateOrderId, generateSampleId, generateTimestampedId } from '../utils/idGenerator.js';
import { randomDigits } from '../utils/secureRandom.js';
import { toCsvNative, toCsvFallback, NATIVE_CSV_AVAILABLE } from '../services/napiCsvService.js';
import { getIO, emitDeliveryStatus } from '../services/socketService.js';
import logger from '../config/logger.js';
import { sendServerError } from '../utils/safeError.js';
import { parseHl7, isCriticalFlag } from '../lib/hl7.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

// Lab staff jo apne center ke reports manage / courier se bhej sakte hain.
const LAB_STAFF_ROLES = ['lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'hospital_admin', 'superadmin'];
// Report courier dispatch ke liye allowed roles (doctors bhi bhej sakte hain).
const REPORT_DISPATCH_ROLES = [...LAB_STAFF_ROLES, 'doctor', 'clinic_doctor', 'radiologist'];

// File 15/09 Flow E: analyzer ingestion — HL7 v2 ORU^R01 accepted from a
// service account (x-api-key, e.g. instrument middleware) or lab staff
// session. Matches OBR orderId → LabOrder, fills OBX values, flags
// criticals. Malformed input fails closed; every match is audited.
router.post('/ingest/hl7', async (req, res, next) => {
  if (req.headers?.['x-api-key']) return apiKeyAuth(req, res, next);
  return protect(req, res, next);
}, async (req, res) => {
  try {
    if (req.user && !['lab_owner', 'lab_technician', 'pathologist', 'hospital_admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Lab ingestion access required' });
    }
    const { message } = req.body || {};
    const parsed = parseHl7(message);
    if (!parsed.ok) return res.status(400).json({ message: `Rejected: ${parsed.reason}` });
    const matched = [];
    const unmatched = [];
    for (const obr of parsed.orders) {
      const order = obr.orderId ? await LabOrder.findOne({ orderId: obr.orderId }) : null;
      if (!order) { unmatched.push(obr.orderId || '(no id)'); continue; }
      for (const obx of parsed.results) {
        const test = (order.tests || []).find((t) =>
          t.testName && (t.testName === obx.name || t.testName === obx.code));
        if (!test) continue;
        test.resultValue = obx.value;
        if (obx.units) test.unit = obx.units;
        if (obx.range) test.normalRange = obx.range;
        if (isCriticalFlag(obx.flag)) test.isCritical = true;
        if (test.status === 'Ordered' || test.status === 'Sample Needed') test.status = 'Completed';
        matched.push({ orderId: order.orderId, test: test.testName, critical: Boolean(test.isCritical) });
      }
      await order.save();
    }
    await auditLog('hl7_ingested', req.user?._id || req.serviceAccount?.keyId || null, {
      matched: matched.length, unmatched, ip: req.ip,
    }).catch(() => {});
    return res.json({ matched, unmatched });
  } catch (err) {
    return sendServerError(res, err, 'HL7 ingest failed');
  }
});

const labRegisterSampleSchema = z.object({ testIndex: z.number().int().nonnegative(), sampleType: sampleTypeSchema.optional() });
const labCollectSampleSchema = z.object({ testIndex: z.number().int().nonnegative(), rejectionReason: z.string().optional() });
const labEnterResultSchema = z.object({ testIndex: z.number().int().nonnegative(), resultValue: z.string().min(1), normalRange: z.string().optional(), unit: z.string().optional() });
const labVerifySchema = z.object({ testIndex: z.number().int().nonnegative(), approved: z.boolean().optional(), notes: z.string().optional() });
const labDeliverReportSchema = z.object({ testIndex: z.number().int().nonnegative(), reportUrl: z.string().optional() });
const labDispatchReportSchema = z.object({
  reportUrl: z.string().max(2048).optional(),
  dropAddress: z.string().max(500).optional(),
  pickupAddress: z.string().max(500).optional(),
  pickupName: z.string().max(200).optional(),
  patientPhone: z.string().max(20).optional(),
  deliveryFee: z.coerce.number().nonnegative().max(100000).optional(),
  estimatedTime: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  deliveryPartnerId: z.string().max(100).optional(),
}).strict();
// §5.15/§13.8: two-layer write guard for lab bookings.
//  Layer 1 (here): .strict() — unknown/malformed keys are rejected loudly
//  (bounded types + lengths) instead of being silently passed downstream.
//  Layer 2 (handlers): pickBody allowlist — status / paymentStatus / reportStatus /
//  patientId / totalAmount / notified / phlebotomist are ACCEPTED by this schema
//  only so that legacy first-party clients (jo abhi bhi ye keys bhejte hain) 400
//  na karein; the create/update pickBody allowlists never write them. Server-owned
//  state is therefore validated but never persisted from a client body.
const labBookingSchema = z.object({
  // catalogue + patient-input (create ki pickBody allowlist me writable)
  tests: z.array(z.string().max(300)).max(200).optional(),
  testIds: z.array(z.string().max(64)).max(200).optional(),
  testName: z.string().max(300).optional(),
  patientName: z.string().max(200).optional(),
  patientPhone: z.string().max(20).optional(),
  patientEmail: z.string().max(200).optional(),
  patientId: z.string().max(64).optional(),
  patient: z.string().max(200).optional(),
  hospitalId: z.string().max(64).optional(),
  bookingId: z.string().max(64).optional(),
  bookingDate: z.union([z.string().max(64), z.number()]).optional(),
  timeSlot: z.string().max(80).optional(),
  visitType: z.string().max(40).optional(),
  homeCollectionAddress: z.string().max(500).optional(),
  homeCollectionFee: z.coerce.number().nonnegative().max(1000000).optional(),
  prescriptionUrl: z.string().max(2048).optional(),
  prescriptionVerified: z.boolean().optional(),
  notes: z.string().max(4000).optional(),
  discountedAmount: z.coerce.number().nonnegative().max(100000000).optional(),
  totalAmount: z.coerce.number().nonnegative().max(100000000).optional(),
  amount: z.coerce.number().nonnegative().max(100000000).optional(),
  discount: z.coerce.number().nonnegative().max(100000000).optional(),
  total: z.coerce.number().nonnegative().max(100000000).optional(),
  // report/delivery (PUT allowlist me writable)
  reportUrl: z.string().max(2048).optional(),
  reportDeliveryMode: z.string().max(30).optional(),
  reportDeliveryFee: z.coerce.number().nonnegative().max(1000000).optional(),
  // Server-owned state: validated here (legacy clients 400 na karein) but
  // STRIPPED by the handlers' pickBody — never written from req.body.
  status: z.string().max(40).optional(),
  paymentStatus: z.string().max(40).optional(),
  reportStatus: z.string().max(40).optional(),
  notified: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
  phlebotomist: z.string().max(200).optional(),
  phlebotomistId: z.string().max(64).optional(),
}).strict();
// Equipment create `{...req.body}` spread karta hai — isliye strict allowlist
// exactly model-writable fields (tenant fields handler set karta hai, yahan reject).
const labEquipmentSchema = z.object({
  name: z.string().max(200).optional(),
  type: z.string().max(60).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(120).optional(),
  manufacturer: z.string().max(200).optional(),
  installationDate: z.string().max(40).optional(),
  lastMaintenanceDate: z.string().max(40).optional(),
  nextMaintenanceDate: z.string().max(40).optional(),
  maintenanceInterval: z.coerce.number().int().nonnegative().max(3650).optional(),
  status: z.string().max(60).optional(),
  location: z.string().max(300).optional(),
  notes: z.string().max(4000).optional(),
}).strict();
// Package create bhi `{...req.body}` spread karta hai — strict allowlist.
// originalPrice/packagePrice number-input se string aati hain, isliye coerce.
const labPackageSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
  category: z.string().max(60).optional(),
  tests: z.array(z.string().max(64)).max(500).optional(),
  testNames: z.union([z.array(z.string().max(300)).max(500), z.string().max(4000)]).optional(),
  originalPrice: z.coerce.number().nonnegative().max(100000000).optional(),
  packagePrice: z.coerce.number().nonnegative().max(100000000).optional(),
  discount: z.coerce.number().int().nonnegative().max(100).optional(),
  popular: z.boolean().optional(),
  homeCollectionAvailable: z.boolean().optional(),
  reportTime: z.string().max(60).optional(),
  isActive: z.boolean().optional(),
}).strict();

const router = express.Router();

// ─── Doctor: Create Lab Order ──────────────────────────────────────────────
router.post('/orders', protect, authorize('lab:book', 'lab:book:own'), validate(createLabOrderSchema), async (req, res) => {
  try {
    const { patientId: bodyPatientId, patientName, tests, clinicalNotes, priority } = req.body;
    if (!tests?.length) {
      return res.status(400).json({ message: 'At least one test is required' });
    }

    // PHARM-B-04: the SUBJECT of the order is server-owned. The body value used to
    // be trusted verbatim, so a patient holding `lab:book:own` could attach an
    // order to another patient — poisoning their record and creating a
    // cross-patient PHI link readable back through `GET /orders?patientId=`.
    const patientId = await resolveLabOrderSubject(req, bodyPatientId, res);
    if (!patientId) return undefined;

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

/**
 * PHARM-B-04: who a lab order may be created FOR.
 *  - patient      → only themselves, whatever the body says
 *  - superadmin   → anyone
 *  - tenant staff → only a patient that belongs to their own facility
 *  - no facility  → denied (a missing tenant must never become "everyone")
 *
 * @returns the resolved patient id, or null after having written the response.
 */
async function resolveLabOrderSubject(req, bodyPatientId, res) {
  if (req.user.role === 'patient') return String(req.user._id);
  if (!bodyPatientId) {
    res.status(400).json({ message: 'patientId is required' });
    return null;
  }
  if (req.user.role === 'superadmin') return String(bodyPatientId);

  const callerFacility = req.user.facilityId || req.user.hospitalId;
  if (!callerFacility) {
    res.status(403).json({ message: 'No hospital/facility linked to this account' });
    return null;
  }

  const targetFacilityOf = async (doc) => doc?.facilityId || doc?.hospitalId || null;

  const target = await Patient.findById(bodyPatientId).select('hospitalId facilityId userId').lean().catch(() => null);
  if (target) {
    const targetFacility = await targetFacilityOf(target);
    if (!targetFacility || String(targetFacility) !== String(callerFacility)) {
      res.status(403).json({ message: 'Cross-facility access denied' });
      return null;
    }
    return String(target.userId || bodyPatientId);
  }

  // No Patient record for that id: allow only when a User exists AND shares the
  // caller's tenant. Otherwise we would be guessing whose record this is.
  const user = await User.findById(bodyPatientId).select('hospitalId facilityId').lean();
  const userFacility = user ? await targetFacilityOf(user) : null;
  if (!user || String(userFacility) !== String(callerFacility)) {
    res.status(404).json({ message: 'Patient not found in your facility' });
    return null;
  }
  return String(bodyPatientId);
}

// ─── Get Lab Orders ────────────────────────────────────────────────────────
// PHARM-B-05: the list handler trusted `?patientId=` for any non-patient caller
// with no facility constraint on the route, so ANY `lab:*` role could read any
// patient's orders and results by id filter. The tenant predicate is now applied
// through the shared fail-closed helper, and a caller with no facility gets
// nothing rather than everything.
router.get('/orders', protect, authorize('lab:read', 'lab:read:own'), async (req, res) => {
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

    // PHARM-B-05: fail CLOSED on the tenant predicate. The two guards above are
    // conditional on the CALLER having a facility, so a tenant-less lab account
    // produced an entirely unfiltered query — a full-platform lab-order dump of
    // orders plus results.
    const labScope = applyTenantScope(req, filter, { fields: ['facilityId'] });
    if (!labScope.ok) return res.status(403).json({ message: labScope.message });

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
        { orderId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { doctorName: new RegExp(escapeRegex(capSearch(search)), 'i') },
      ];
    }
    const orders = await LabOrder.find(filter).populate('patientId', 'name email phone').populate('doctorId', 'name email').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Single Order ──────────────────────────────────────────────────────
// AUTHZ-M-01 migration: requireTenantOwnership -> authorizeObject (central
// tenant+ownership layer; authorize('lab:read',...) stays as the binding role
// decision, actorRoles computed from the same matrix so it cannot drift).
router.get('/orders/:id', protect, authorizeObject({ model: LabOrder, ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('lab:read', 'lab:read:own'), read: true }), authorize('lab:read', 'lab:read:own'), async (req, res) => {
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
router.put('/orders/:id/register-sample', protect, requireRole(LAB_STAFF_ROLES), authorizeObject({ model: LabOrder, ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: [...LAB_STAFF_ROLES], write: true }), validate(labRegisterSampleSchema), async (req, res) => {
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
router.put('/orders/:id/collect-sample', protect, requireRole(LAB_STAFF_ROLES), authorizeObject({ model: LabOrder, ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: [...LAB_STAFF_ROLES], write: true }), validate(labCollectSampleSchema), async (req, res) => {
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
// LAB-001: result entry is a clinical action, so it is gated on a laboratory
// role rather than adminOnly (which reserved it for non-clinical administrators).
// Tenant ownership is fail-closed via authorizeObject (central layer).
router.put('/orders/:id/enter-result', protect, authorizeObject({ model: LabOrder, ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('lab:enter_result'), write: true }), authorize('lab:enter_result'), validate(labEnterResultSchema), async (req, res) => {
  try {
    const order = req.ownedDoc;
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
      await createNotification({
        title: 'Critical Lab Result',
        message: `Critical result for ${test.testName} (${test.resultValue}) - Patient: ${order.patientName}`,
        type: 'lab',
        userId: order.doctorId.toString(),
        // NOTIF-B-05: critical priority (bypasses rate control) + de-dup key so a
        // retried verification cannot spam the ordering doctor.
        priority: 'critical',
        dedupKey: `lab_critical:${order._id}:${test.testName}`,
      });
    }
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pathologist: Verify Results ───────────────────────────────────────────
// LAB-001: verification is the control that makes a report trustworthy, so it is
// gated on a laboratory role and enforces separation of duties — the person who
// verified a result must not be the person who entered it.
router.put('/orders/:id/verify', protect, authorizeObject({ model: LabOrder, ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('lab:verify'), write: true }), authorize('lab:verify'), validate(labVerifySchema), async (req, res) => {
  try {
    const order = req.ownedDoc;
    const { testIndex, approved, notes } = req.body;
    if (testIndex === undefined) return res.status(400).json({ message: 'Test index required' });
    const test = order.tests[testIndex];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    // ── LAB-B-07: real separation of duties ──
    // The old control was only "the verifier must not be the same user who
    // ENTERED the result". That is necessary but not sufficient: `lab:verify` is
    // granted to lab_technician AND pathologist, so one technician could enter a
    // critical value and a colleague with the same permission wave it through —
    // or, on a night shift with one person on duty, the pair could be the same
    // human via a second account. A second-level check closes the second case:
    // verification additionally requires a role that is not allowed to enter
    // results, and it is recorded who entered and who released it.
    const ENTERING_ROLES = ['lab_technician', 'lab_receptionist', 'lab_owner', 'hospital_admin', 'superadmin', 'doctor'];
    const VERIFYING_ROLES = ['pathologist', 'lab_owner', 'superadmin'];
    if (ENTERING_ROLES.includes(req.user.role) && !VERIFYING_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Separation of duties: verification requires a reviewing pathologist, not a role that may enter results',
      });
    }
    if (test.resultEnteredBy && test.resultEnteredBy.toString() === req.user._id.toString()) {
      return res.status(403).json({
        message: 'Separation of duties: the result must be verified by a different authorized user than the one who entered it',
      });
    }
    if (approved) {
      test.status = 'Verified';
      test.verifiedBy = req.user._id;
      test.verifiedByRole = req.user.role;
      test.verifiedAt = new Date();
      test.verificationNotes = notes || '';
      // LAB-B-07: a release is only valid for a test that actually has a value.
      // A test with no entered result could be marked Verified and immediately
      // notify the patient that a report is ready.
      if (!test.resultValue && !test.result) {
        return res.status(400).json({ message: 'Cannot verify a test with no entered result value' });
      }
    } else { test.status = 'Completed'; test.verificationNotes = notes || 'Rejected by pathologist'; }
    await order.save();
    await auditLog('verify_lab_result', req.user._id, {
      recordId: order._id,
      enteredBy: test.resultEnteredBy,
      verifiedByRole: req.user.role,
      approved: Boolean(approved),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    const allVerified = order.tests.every(t => t.status === 'Verified' || t.status === 'Report Delivered');
    if (allVerified) {
      await createNotification({
        title: 'Lab Report Ready',
        message: `Your lab report (${order.orderId}) is now available.`,
        type: 'lab',
        userId: order.patientId.toString(),
        // NOTIF-B-05: one "report ready" notification per order.
        dedupKey: `lab_ready:${order._id}`,
      });
    }
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Mark Report Delivered ─────────────────────────────────────────────────
router.put('/orders/:id/deliver-report', protect, authorizeObject({ model: LabOrder, ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('lab:manage'), write: true }), authorize('lab:manage'), validate(labDeliverReportSchema), async (req, res) => {
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
    // AUTHZ-B-07: the two if (req.user.hospitalId && ...) lines made lab stats
    // platform-wide for every tenant-less account. Fail closed instead. A patient
    // is already restricted to their own orders by filter.patientId above, so the
    // tenant predicate is only applied to staff.
    if (req.user.role !== 'patient') {
      const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
      if (!scope.ok) return res.status(403).json({ message: scope.message });
    }
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
// GET /api/lab/outbreak — geographic clusters of abnormal results
// AUTHZ gap (was UNCLASSIFIED): this route aggregated abnormal lab orders across
// EVERY hospital on the platform and returned them as geographic clusters, so
// any authenticated account — including a patient's — could map disease hotspots
// and, with a small cell, infer that named individuals in an area had a given
// abnormal result. Cross-tenant clinical data on an unclassified read. Gated to
// lab/clinical staff, and tagged so the decision is on the record rather than
// inferred from a guard name.
// authz: role
router.get('/outbreak', protect, requireRole(REPORT_DISPATCH_ROLES), async (req, res) => {
  try {
    const test = String(req.query.test || 'dengue');
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const res8 = Math.min(9, Math.max(6, Number(req.query.res) || 8));
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const { latLngToCell } = await import('h3-js');
    const { default: Hospital } = await import('../models/Hospital.js');
    const orders = await LabOrder.find({
      createdAt: { $gte: since },
      tests: { $elemMatch: { testName: new RegExp(escapeRegex(capSearch(test)), 'i'), isAbnormal: true } },
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
    // Spec expansion-01D: Z-score hotspot alert (Z > 2.5 over reporting cells).
    const counts = out.map((c) => c.abnormalCount);
    const mean = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    const sd = counts.length > 1
      ? Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length)
      : 0;
    const alerts = sd > 0
      ? out
        .map((c) => ({ ...c, z: Math.round(((c.abnormalCount - mean) / sd) * 100) / 100 }))
        .filter((c) => c.z > 2.5)
      : [];
    res.json({ success: true, test, days, resolution: res8, totalAbnormal: orders.length, mean: Math.round(mean * 100) / 100, sd: Math.round(sd * 100) / 100, cells: out, alerts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Available Lab Tests (public, supports filtering) ─────────────────
router.get('/tests', publicSearchLimiter, async (req, res) => {
  try {
    const { category, providerType, search, hospitalId, facilityId, limit } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (providerType) filter.providerType = providerType;
    if (hospitalId) filter.hospitalId = hospitalId;
    if (facilityId) filter.providerId = facilityId;
    // LAB-B-10: escape the user string (escapeRegex + capSearch) instead of handing
    // it to $regex raw - a crafted pattern stalls the single event loop.
    if (search) filter.name = { $regex: escapeRegex(capSearch(search)), $options: 'i' };
    const query = Test.find(filter).sort({ name: 1 });
    // LAB-B-10: clamp the caller-supplied row cap to 1..200.
    query.limit(Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 100)));
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
      // LAB-B-06: the fallback used to be `{ patientId: { $exists: false },
      // patientName: req.user.name }` — identity by NAME. Two people called
      // "Rahul Sharma" would each see the other's walk-in bookings, tests ordered
      // and (once delivered) results. Names are not identifiers.
      //
      // Walk-in bookings are now claimed by the account that created them
      // (`createdBy`), which is a real id. A booking made by staff on behalf of a
      // walk-in with no account sets `createdForUserId` explicitly.
      ownershipOr = [
        { patientId: req.user._id },
        { createdBy: req.user._id },
        { createdForUserId: req.user._id },
      ];
      filter.$or = ownershipOr;
    }
    // AUTHZ-B-07: bookings list must be tenant-scoped. Patients are already
    // restricted to their own bookings by the ownership  above.
    if (req.user.role !== 'patient') {
      const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
      if (!scope.ok) return res.status(403).json({ message: scope.message });
    }
    if (status && status !== 'All') filter.status = status;
    if (date) filter.bookingDate = { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) };
    if (search) {
      const searchOr = [{ bookingId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') }];
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

// File 15/Flow E: analyzer HL7 ORU ingestion. Dual auth (lab roles or
// service-account key); matches OBR orderId → LabOrder, applies OBX values,
// flags critical (verify still pathologist-only, SoD intact).
router.post('/ingest/hl7', async (req, res, next) => {
  if (req.headers?.['x-api-key']) {
    const { apiKeyAuth } = await import('../middleware/apiKeyAuth.js');
    return apiKeyAuth(req, res, () => ingestHl7(req, res));
  }
  return protect(req, res, () => ingestHl7(req, res));
});

async function ingestHl7(req, res) {
  try {
    const [{ parseHl7, isCriticalFlag }, { default: LabOrder }] = await Promise.all([
      import('../lib/hl7.js'), import('../models/LabOrder.js'),
    ]);
    if (!req.serviceAccount && !['lab_technician', 'lab_owner', 'hospital_admin', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Lab ingestion access required' });
    }
    const parsed = parseHl7(req.body?.message || req.body?.hl7);
    if (!parsed.ok) return res.status(400).json({ message: `Rejected: ${parsed.reason}` });
    let applied = 0;
    let critical = 0;
    for (const obr of parsed.orders) {
      if (!obr.orderId) continue;
      // eslint-disable-next-line no-await-in-loop
      const order = await LabOrder.findOne({ orderId: obr.orderId });
      if (!order) continue;
      for (const t of (order.tests || [])) {
        const hit = parsed.results.find((r) =>
          r.name && t.testName && r.name.toLowerCase().includes(t.testName.toLowerCase()));
        if (!hit) continue;
        t.resultValue = hit.value;
        t.unit = hit.units || t.unit;
        t.normalRange = hit.range || t.normalRange;
        t.isAbnormal = ['H', 'L', 'HH', 'LL', 'A', 'AA', 'C'].includes(hit.flag);
        t.isCritical = isCriticalFlag(hit.flag);
        if (t.isCritical) critical += 1;
        t.status = 'Completed';
        applied += 1;
      }
      await order.save();
    }
    await auditLog('hl7_ingested', req.serviceAccount ? null : req.user?._id, {
      applied, critical, ip: req.ip,
    }).catch(() => {});
    return res.json({ applied, critical });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

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
    // LAB-B-09: the passthrough body let a client author the booking state
    // (status / paymentStatus / patientId / totalAmount / reportUrl).
    // Only catalogue + patient-input fields are taken; state is server-owned.
    // Only catalogue/patient-input fields are taken; state is server-owned.
    const { pickBody } = await import('../utils/pick.js');
    const allowed = pickBody(req.body, [
      'tests', 'testIds', 'patientName', 'patientPhone', 'patientEmail',
      'bookingDate', 'timeSlot', 'visitType', 'homeCollectionAddress',
      'homeCollectionFee', 'prescriptionUrl', 'notes', 'discountedAmount',
    ]);
    const isPatient = req.user.role === 'patient';
    const booking = await LabBooking.create({
      ...allowed,
      bookingId,
      hospitalId: req.user.hospitalId || undefined,
      facilityId: req.user.facilityId || req.user.hospitalId || undefined,
      status: 'Pending',
      paymentStatus: allowed.paymentStatus || 'Pending',
      patientId: isPatient ? req.user._id : allowed.patientId,
      totalAmount: Number(allowed.totalAmount ?? allowed.discountedAmount ?? 0),
      createdBy: req.user._id,
    });
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
    // AUTH-030: allowlisted fields only — status/payment/report flows have dedicated endpoints.
    const { pickBody } = await import('../utils/pick.js');
Object.assign(booking, pickBody(req.body, ['patientName', 'patientPhone', 'patientEmail', 'tests', 'testIds', 'totalAmount', 'discountedAmount', 'bookingDate', 'timeSlot', 'visitType', 'homeCollectionAddress', 'homeCollectionFee', 'prescriptionUrl', 'prescriptionVerified', 'notes', 'reportUrl', 'reportDeliveryMode', 'reportDeliveryFee']));
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
  return randomDigits(4);
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
    await createNotification({
      userId: String(notifyUserId),
      title: partner ? 'Lab report out for delivery' : 'Lab report ready for delivery',
      message: `Your report for ${task.orderId} ${partner ? `is assigned to ${partner.name}` : 'will be handed to a delivery partner shortly'}. Delivery OTP: ${task.deliveryOtp}`,
      type: 'records',
      // NOTIF-B-05: one delivery notification per task.
      dedupKey: `lab_delivery:${task._id}`,
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
    // AUTHZ: this GET had no ownership check. The sibling POST
    // `/orders/:id/dispatch-report` immediately below carries
    // `requireTenantOwnership` + `requireRole`, so the guard was simply missed
    // here — that asymmetry is the tell.
    //
    // The task carries pickup/drop addresses and the patient name, so any
    // authenticated account could read courier details for ANY lab booking id.
    // Tenant-scoped and fail closed: a caller with no tenant is refused rather
    // than treated as global.
    const callerTenant = req.user.hospitalId || req.user.facilityId;
    if (!callerTenant && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'No hospital scope for this account' });
    }

    const filter = { labBookingId: req.params.id };
    if (req.user.role !== 'superadmin') filter.hospitalId = callerTenant;

    const task = await PharmacyDelivery.findOne(filter).sort({ createdAt: -1 }).lean();
    if (!task) return res.status(404).json({ message: 'No dispatch task for this booking' });
    res.json({ task });
  } catch (err) {
    logger.error(`lab dispatch-report error: ${err.message}`);
    sendServerError(res, err, 'Could not load the dispatch report');
  }
});

// Doctor-ordered lab order ka report courier se bhejo.
router.post('/orders/:id/dispatch-report', protect, authorizeObject({ model: LabOrder, ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: [...REPORT_DISPATCH_ROLES], write: true }), requireRole(REPORT_DISPATCH_ROLES), validate(labDispatchReportSchema), async (req, res) => {
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
    // AUTH-030: allowlisted fields only — status managed via workflow, tenant linkage immutable.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(item, pickBody(req.body, ['name', 'type', 'model', 'serialNumber', 'manufacturer', 'installationDate', 'lastMaintenanceDate', 'nextMaintenanceDate', 'maintenanceInterval', 'location', 'notes']));
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
    // AUTH-030: allowlisted fields only — tenant linkage immutable.
    const { pickBody } = await import('../utils/pick.js');
Object.assign(pkg, pickBody(req.body, ['name', 'description', 'category', 'tests', 'testNames', 'originalPrice', 'packagePrice', 'discount', 'popular', 'homeCollectionAvailable', 'reportTime', 'isActive']));
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
// AUTHZ-B-09: this was `adminOnly` with NO tenant predicate and NO row cap, so a
// hospital_admin could export every LabOrder on the platform (patient + doctor
// names). It is now tenant-scoped (superadmin may omit the scope), capped, and
// every export writes an audit row.
const LAB_EXPORT_ROW_CAP = 5000;

router.get('/export', protect, adminOnly, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo, status } = req.query;
    const filter = {};
    // AUTHZ-B-09: tenant scope is mandatory for everyone but the superadmin.
    if (req.user.role !== 'superadmin') {
      const scope = req.user.hospitalId || req.user.facilityId;
      if (!scope) {
        return res.status(403).json({ message: 'No hospital/facility scope for this account' });
      }
      filter.$or = [{ hospitalId: scope }, { facilityId: scope }];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    if (status && status !== 'All') filter.status = status;

    const orders = await LabOrder.find(filter)
      .populate('patientId', 'name')
      .populate('doctorId', 'name')
      .limit(LAB_EXPORT_ROW_CAP)
      .lean();

    try {
      await auditLog('export_lab_orders', req.user._id, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        format,
        rowCount: orders.length,
      });
    } catch { /* audit must not block the export */ }

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

    res.json({ orders, rowCount: orders.length, cappedAt: LAB_EXPORT_ROW_CAP });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

