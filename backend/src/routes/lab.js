import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { applyTenantScope, callerOwnsTenant } from '../utils/tenantScope.js';
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
import {
  validate, createLabOrderSchema, sampleTypeSchema,
  LAB_SECTIONS, LAB_REJECTION_REASONS, LAB_OUTSOURCE_STATUSES, LAB_BOOKING_STATUSES,
  LAB_ORDER_STATUSES,
  labOrderStatusSchema, labOrderCancelSchema, labAddTestSchema, labReceiveSchema,
  labRejectSampleSchema, labOutsourceStatusSchema, labOutsourceResultSchema,
  labCorrectReportSchema, labVisitSchema,
} from '../utils/validate.js';
import { roleHasPermission } from '../config/permissions.js';
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
// PATHOLOGY/LAB §9: department-scoped roles join the staff pool — a
// hematology tech must be able to register/collect samples like any technician.
const LAB_DEPT_ROLES = [
  'lab_supervisor', 'lab_receiving', 'biochem_tech', 'hematology_tech',
  'clinical_pathology_tech', 'microbiology_tech', 'histopathology_tech',
  'cytology_tech', 'serology_tech', 'molecular_tech', 'report_coordinator',
];
// Home-collection runners keep their own narrow guard (lab:visit) rather than
// joining every staff-only route below; it_admin has no lab write surface.
const LAB_STAFF_ROLES = ['lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'hospital_admin', 'superadmin', ...LAB_DEPT_ROLES];
// Report courier dispatch ke liye allowed roles (doctors bhi bhej sakte hain).
const REPORT_DISPATCH_ROLES = [...LAB_STAFF_ROLES, 'doctor', 'clinic_doctor', 'radiologist'];

// §1–§7: fail-closed tenant predicate for the new lab list routes.
// `applyTenantScope` derives its staff roster from TENANT_STAFF_ROLES, which
// does not list the §9 department roles yet (utils/tenantScope.js is shared by
// every module, so it is a separate follow-up) — scoping by hospitalId here
// keeps those roles working while an account with no hospital still sees only
// tenant-less rows instead of the whole platform.
function labScope(req, filter = {}) {
  if (req.user.role === 'superadmin') return filter;
  filter.hospitalId = req.user.hospitalId || { $in: [null] };
  return filter;
}

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
    const { patientId: bodyPatientId, patientName, tests, clinicalNotes, priority, encounterId } = req.body;
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
      orderId, accessionNo: `ACC-${Date.now().toString(36).toUpperCase()}`, patientId, patientName,
      doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId || undefined, facilityId: req.user.facilityId || req.user.hospitalId || undefined,
      encounterId: encounterId || undefined,
      tests: tests.map(t => ({
        testName: t.testName, category: t.category || 'Blood',
        priority: t.priority || priority || 'Routine', status: 'Ordered',
      })),
      clinicalNotes: clinicalNotes || '', priority: priority || 'Routine', createdBy: req.user._id,
    });

    await auditLog('create_lab_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });

    // File 22 P0-4: post one Pending charge per test (Test-master price;
    // unpriced tests post ₹0 lines, never invented amounts). Idempotent per
    // order so retries cannot double-bill.
    try {
      const { default: Test } = await import('../models/Test.js');
      const { postCharge, openAdmissionFor } = await import('../lib/charges.js');
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const stay = await safeFirst(openAdmissionFor(order.hospitalId, order.patientId));
      if (stay) {
        order.admissionId = stay._id;
        await order.save();
      }
      let billed = 0;
      const names = [];
      for (const t of order.tests) {
        // File 22 P1-11: copy master refs AND price in one lookup.
        const master = await safeFirst(Test.findOne({
          hospitalId: order.hospitalId, name: t.testName,
        }).select('price refLow refHigh criticalLow criticalHigh unit').lean());
        if (master) {
          t.refLow = master.refLow ?? t.refLow ?? null;
          t.refHigh = master.refHigh ?? t.refHigh ?? null;
          t.criticalLow = master.criticalLow ?? null;
          t.criticalHigh = master.criticalHigh ?? null;
          if (master.unit && !t.unit) t.unit = master.unit;
        }
        const price = Number(master?.price || 0);
        billed += price;
        names.push(t.testName);
      }
      await order.save();
      // One Pending line per order (idempotent on the order ref).
      await postCharge({
        hospitalId: order.hospitalId, patientId: order.patientId,
        encounterId: order.encounterId, admissionId: stay?._id || null,
        source: 'lab', sourceRef: { model: 'LabOrder', id: order._id },
        description: `Lab: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` +${names.length - 5} more` : ''}`,
        qty: order.tests.length, unitPrice: order.tests.length ? billed / order.tests.length : 0,
        postedBy: req.user._id ?? req.user.id,
      }).catch(() => null);
      order.billAmount = billed;
      await order.save();
    } catch (e) {
      const { default: labLogger } = await import('../config/logger.js');
      labLogger.warn(`lab charge posting failed: ${e.message}`);
    }
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

  const { safeFirst } = await import('../lib/approvalWiring.js');
  const target = await safeFirst(Patient.findById(bodyPatientId).select('hospitalId facilityId userId').lean());
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
    // File 22 P1-11: structured H/L/HH/LL flags (master refs first, string
    // parse as fallback) + delta check against the last verified result.
    const val = parseFloat(resultValue);
    const lo = test.refLow ?? null;
    const hi = test.refHigh ?? null;
    if (!Number.isNaN(val) && lo != null && hi != null) {
      test.isAbnormal = val < lo || val > hi;
      const cLo = test.criticalLow ?? lo * 0.5;
      const cHi = test.criticalHigh ?? hi * 1.5;
      test.isCritical = val < cLo || val > cHi;
      test.flag = val < cLo || (test.criticalLow != null && val < test.criticalLow) ? 'LL'
        : val > cHi || (test.criticalHigh != null && val > test.criticalHigh) ? 'HH'
        : val < lo ? 'L' : val > hi ? 'H' : '';
    } else if (normalRange) {
      const rangeMatch = normalRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      if (rangeMatch) {
        const low = parseFloat(rangeMatch[1]), high = parseFloat(rangeMatch[2]);
        if (!isNaN(val) && !isNaN(low) && !isNaN(high)) {
          test.isAbnormal = val < low || val > high;
          test.isCritical = val < low * 0.5 || val > high * 1.5;
          test.flag = val < low ? 'L' : val > high ? 'H' : '';
        }
      }
    }
    if (!Number.isNaN(val)) {
      try {
        const prev = await LabOrder.findOne({
          patientId: order.patientId, _id: { $ne: order._id },
          tests: { $elemMatch: { testName: test.testName, status: { $in: ['Verified', 'Report Delivered'] } } },
        }).select('tests').sort({ updatedAt: -1 }).lean();
        const prevTest = (prev?.tests || []).find((t) => t.testName === test.testName && t.resultValue);
        const prevVal = prevTest ? parseFloat(prevTest.resultValue) : NaN;
        if (!Number.isNaN(prevVal) && prevVal !== 0) {
          test.prevValue = String(prevTest.resultValue);
          test.deltaPct = +(((val - prevVal) / Math.abs(prevVal)) * 100).toFixed(1);
          test.deltaFlag = Math.abs(test.deltaPct) > 50;
        }
      } catch { /* delta lookup must never block result entry */ }
    }
    // Receiving/collection statuses are EXPLICIT (the pre-save derivation skips
    // them), so a result landing must release the lock or the order would stay
    // 'Received' forever instead of advancing to Processing -> verify.
    if (order.status === 'Collected' || order.status === 'Received') order.status = 'Processing';
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
    const ENTERING_ROLES = ['lab_technician', 'lab_receptionist', 'lab_owner', 'hospital_admin', 'superadmin', 'doctor', ...LAB_DEPT_ROLES.filter(r => r !== 'lab_supervisor')];
    const VERIFYING_ROLES = ['pathologist', 'lab_owner', 'superadmin', 'lab_supervisor'];
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
    // Verification releases every intermediate explicit status so the pre-save
    // derivation can compute Completed/Partially Completed; terminal or
    // operator-set statuses (Finalized, Report Delivered, Cancelled, Draft,
    // Payment Pending) are left alone.
    if (!['Finalized', 'Report Delivered', 'Cancelled', 'Draft', 'Payment Pending'].includes(order.status)) order.status = 'Processing';
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

// File 22 P1-11: sample reject → recollect cycle (reason + count tracked).
// PATHOLOGY/LAB §3: the reason is an 11-value controlled vocabulary (lab.js
// schema above) — free text let every site spell the same defect differently,
// which made rejection analytics useless. `Other` keeps an escape hatch.
router.put('/orders/:id/tests/:index/reject', protect, authorize('lab:enter_result'), validate(labRejectSampleSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const test = order.tests[Number(req.params.index)];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!req.body?.reason || !LAB_REJECTION_REASONS.includes(req.body.reason)) {
      return res.status(400).json({ message: `Reject reason must be one of: ${LAB_REJECTION_REASONS.join(', ')}` });
    }
    const detail = req.body.detail ? String(req.body.detail).slice(0, 500) : '';
    test.status = 'Rejected';
    test.rejectionReason = req.body.reason;
    test.recollectReason = detail ? `${req.body.reason}: ${detail}` : req.body.reason;
    test.recollectCount = Number(test.recollectCount || 0) + 1;
    await order.save();
    await auditLog('lab_sample_rejected', req.user._id, { recordId: order._id, reason: test.recollectReason, ip: req.ip });
    return res.json({ id: String(order._id), status: test.status, reason: test.rejectionReason });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id/tests/:index/recollect', protect, authorize('lab:enter_result'), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const test = order.tests[Number(req.params.index)];
    if (!test || test.status !== 'Rejected') return res.status(409).json({ message: 'Only rejected samples can be recollected' });
    test.status = 'Sample Needed';
    test.resultValue = '';
    test.flag = '';
    await order.save();
    await auditLog('lab_sample_recollect', req.user._id, { recordId: order._id, ip: req.ip });
    return res.json({ id: String(order._id), status: test.status });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// File 22 P1-11: outsourced test hand-off (sent → received).
// PATHOLOGY/LAB §7: courier tracking + reference-lab handoff details ride the
// extended `outsourced` subdoc, and the lifecycle status starts at Dispatched.
router.put('/orders/:id/tests/:index/outsource', protect, authorize('lab:manage', 'lab:assign'), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const test = order.tests[Number(req.params.index)];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    const { lab, received, courierName, trackingNo, outsourceCost, vendorInvoiceNo } = req.body || {};
    test.outsourced = test.outsourced || {};
    if (lab) {
      test.outsourced.lab = String(lab).slice(0, 200);
      test.outsourced.sentAt = new Date();
      test.outsourced.dispatchAt = new Date();
      if (!test.outsourced.status) test.outsourced.status = 'Dispatched';
    }
    if (courierName !== undefined) test.outsourced.courierName = String(courierName).slice(0, 200);
    if (trackingNo !== undefined) test.outsourced.trackingNo = String(trackingNo).slice(0, 120);
    if (outsourceCost !== undefined && outsourceCost !== null && outsourceCost !== '') test.outsourced.outsourceCost = Number(outsourceCost);
    if (vendorInvoiceNo !== undefined) test.outsourced.vendorInvoiceNo = String(vendorInvoiceNo).slice(0, 120);
    if (received) {
      test.outsourced.receivedAt = new Date();
      test.outsourced.deliveredAt = new Date();
      if (LAB_OUTSOURCE_STATUSES.indexOf(test.outsourced.status || '') < LAB_OUTSOURCE_STATUSES.indexOf('Result Received')) {
        test.outsourced.status = 'Result Received';
      }
    }
    await order.save();
    await auditLog('lab_outsource_updated', req.user._id, { recordId: order._id, testIndex: Number(req.params.index), ip: req.ip });
    return res.json({ id: String(order._id), outsourced: test.outsourced });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// §7: forward-only status chain for an outsourced test (never rewinds).
router.put('/orders/:id/tests/:index/outsource/status', protect, authorize('lab:manage', 'lab:assign'), validate(labOutsourceStatusSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    const test = order.tests[Number(req.params.index)];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.outsourced?.lab) return res.status(409).json({ message: 'Test is not outsourced' });
    const { status } = req.body;
    const current = test.outsourced.status || '';
    if (current && LAB_OUTSOURCE_STATUSES.indexOf(status) <= LAB_OUTSOURCE_STATUSES.indexOf(current)) {
      return res.status(409).json({ message: `Outsource status only moves forward (now: ${current}, asked: ${status})` });
    }
    test.outsourced.status = status;
    if (status === 'Dispatched') {
      test.outsourced.sentAt = test.outsourced.sentAt || new Date();
      test.outsourced.dispatchAt = test.outsourced.dispatchAt || new Date();
    }
    if (status === 'Received by Reference Lab') test.outsourced.deliveredAt = new Date();
    if (status === 'Result Received') test.outsourced.receivedAt = test.outsourced.receivedAt || new Date();
    await order.save();
    await auditLog('lab_outsource_status', req.user._id, { recordId: order._id, testIndex: Number(req.params.index), from: current, to: status, ip: req.ip });
    return res.json({ id: String(order._id), status: test.outsourced.status });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// §7: reference-lab result landing (external report refs + result value).
router.put('/orders/:id/tests/:index/outsource/result', protect, authorize('lab:enter_result', 'lab:manage'), validate(labOutsourceResultSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    const test = order.tests[Number(req.params.index)];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.outsourced?.lab) return res.status(409).json({ message: 'Test is not outsourced' });
    const b = req.body || {};
    if (b.externalResultUrl !== undefined) test.outsourced.externalResultUrl = String(b.externalResultUrl).slice(0, 2048);
    if (b.externalReportNo !== undefined) test.outsourced.externalReportNo = String(b.externalReportNo).slice(0, 120);
    if (b.outsourceCost !== undefined) test.outsourced.outsourceCost = Number(b.outsourceCost);
    if (b.vendorInvoiceNo !== undefined) test.outsourced.vendorInvoiceNo = String(b.vendorInvoiceNo).slice(0, 120);
    test.outsourced.receivedAt = test.outsourced.receivedAt || new Date();
    test.outsourced.status = 'Result Received';
    if (b.resultValue) {
      test.resultValue = String(b.resultValue).slice(0, 4000);
      test.normalRange = b.normalRange || test.normalRange;
      test.unit = b.unit || test.unit;
      test.resultEnteredBy = req.user._id;
      test.resultEnteredAt = new Date();
      // The value still needs an in-house release: park it at Result Pending so
      // the verify gate (separation of duties) is never bypassed by an import.
      if (!['Verified', 'Report Delivered'].includes(test.status)) test.status = 'Result Pending';
      if (order.status === 'Collected' || order.status === 'Received') order.status = 'Processing';
    }
    await order.save();
    await auditLog('lab_outsource_result', req.user._id, { recordId: order._id, testIndex: Number(req.params.index), ip: req.ip });
    return res.json({ id: String(order._id), outsourced: test.outsourced, status: test.status });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// §7: every test currently sitting with a reference lab (tenant-scoped).
router.get('/outsourced', protect, authorize('lab:read'), async (req, res) => {
  try {
    const filter = { 'tests.outsourced.lab': { $ne: '' } };
    labScope(req, filter);
    const orders = await LabOrder.find(filter).select('orderId patientName doctorName priority status tests createdAt').sort({ updatedAt: -1 }).limit(200).lean();
    const rows = [];
    for (const o of orders) {
      (o.tests || []).forEach((t, i) => {
        if (!t.outsourced?.lab) return;
        rows.push({
          orderId: o._id, orderNo: o.orderId, patientName: o.patientName,
          testName: t.testName, section: t.section, testStatus: t.status,
          testIndex: i, priority: o.priority, ...t.outsourced,
        });
      });
    }
    res.json({ outsourced: rows, total: rows.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 22 P1-11: critical-result call-back log (who was told, when).
router.post('/orders/:id/callback', protect, authorize('lab:verify'), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { testName, calledTo, notes } = req.body || {};
    if (!testName || !calledTo) return res.status(400).json({ message: 'testName + calledTo required' });
    order.criticalCallbacks.push({
      testName: String(testName).slice(0, 200), calledTo: String(calledTo).slice(0, 200),
      calledBy: req.user._id, at: new Date(), notes: String(notes || '').slice(0, 500),
    });
    await order.save();
    await auditLog('lab_callback_logged', req.user._id, { recordId: order._id, testName, ip: req.ip });
    return res.status(201).json({ id: String(order._id), callbacks: order.criticalCallbacks.length });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// File 22 P1-11: TAT dashboard (STAT 2h / Urgent 6h / Routine 24h).
router.get('/tat', protect, authorize('lab:read'), async (req, res) => {
  try {
    const hf = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
    const SLA_H = { STAT: 2, Urgent: 6, Routine: 24 };
    const orders = await LabOrder.find({ ...hf }).select('tests createdAt priority').sort({ createdAt: -1 }).limit(500).lean();
    const byPriority = {};
    let breached = 0;
    for (const o of orders) {
      for (const t of (o.tests || [])) {
        const end = t.verifiedAt || t.resultEnteredAt;
        if (!end) continue;
        const hrs = (new Date(end) - new Date(o.createdAt)) / 3600000;
        const p = t.priority || o.priority || 'Routine';
        const sla = SLA_H[p] || 24;
        byPriority[p] = byPriority[p] || { n: 0, totalHrs: 0, breached: 0 };
        byPriority[p].n += 1;
        byPriority[p].totalHrs += hrs;
        if (hrs > sla) {
          byPriority[p].breached += 1;
          breached += 1;
        }
      }
    }
    for (const p of Object.keys(byPriority)) {
      byPriority[p].avgHrs = +(byPriority[p].totalHrs / byPriority[p].n).toFixed(1);
      delete byPriority[p].totalHrs;
    }
    return res.json({ byPriority, breached, slaHours: SLA_H });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 22 P1-11: QC runs + Levey-Jennings chart data (last 30 + violations).
router.post('/qc', protect, authorize('lab:enter_result'), async (req, res) => {
  try {
    const { default: QcRun } = await import('../models/QcRun.js');
    const { analyzer, testName, controlLevel, mean, sd, value } = req.body || {};
    if (!testName || !(Number(mean) > 0) || !(Number(sd) >= 0) || value == null) {
      return res.status(400).json({ message: 'testName + mean>0 + sd>=0 + value required' });
    }
    const row = await QcRun.create({
      hospitalId: req.user.hospitalId || undefined, analyzer: analyzer || '',
      testName, controlLevel: controlLevel || 'L1',
      mean: Number(mean), sd: Number(sd), value: Number(value), runBy: req.user._id,
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/qc/chart', protect, authorize('lab:read'), async (req, res) => {
  try {
    const { default: QcRun, westgardFlags } = await import('../models/QcRun.js');
    const { analyzer, testName } = req.query;
    if (!testName) return res.status(400).json({ message: 'testName required' });
    const filter = { testName };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (analyzer) filter.analyzer = analyzer;
    const rows = await QcRun.find(filter).sort({ at: -1 }).limit(30).lean();
    const asc = [...rows].reverse();
    const points = asc.map((r, i) => ({
      at: r.at, value: r.value, mean: r.mean, sd: r.sd,
      flags: westgardFlags(r.value, r.mean, r.sd, i > 0 ? asc[i - 1].value : null),
    }));
    return res.json({ points, violations: points.filter((p) => p.flags.length).length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 22 P1-11: ASTM ingest (analyzer → results), mirroring the HL7 route.
router.post('/ingest/astm', async (req, res, next) => {
  try {
    if (req.headers?.['x-api-key']) return apiKeyAuth(req, res, next);
    return protect(req, res, next);
  } catch (err) { return res.status(500).json({ message: err.message }); }
}, async (req, res) => {
  try {
    const { parseAstmFrame } = await import('../lib/astm.js');
    const frame = typeof req.body === 'string' ? req.body : req.body?.frame;
    if (!frame) return res.status(400).json({ message: 'ASTM frame required' });
    const parsed = parseAstmFrame(frame);
    const tenantId = req.serviceAccount?.tenantId || req.user?.hospitalId || req.user?.facilityId;
    const tenantFilter = tenantId ? { hospitalId: tenantId } : {};
    let matched = 0;
    for (const r of parsed.results) {
      const order = await LabOrder.findOne({
        ...tenantFilter,
        $or: [{ accessionNo: r.sampleId }, { orderId: r.sampleId }, { 'tests.sampleId': r.sampleId }],
      });
      if (!order) continue;
      const test = order.tests.find((t) => t.testName === r.testCode || t.sampleId === r.sampleId) || order.tests[0];
      if (!test || test.status === 'Verified') continue;
      test.resultValue = r.value;
      if (r.refRange) test.normalRange = r.refRange;
      if (r.flag) test.flag = /H/i.test(r.flag) ? 'H' : /L/i.test(r.flag) ? 'L' : test.flag;
      test.status = 'Completed';
      test.resultEnteredAt = new Date();
      // eslint-disable-next-line no-await-in-loop
      await order.save();
      matched += 1;
    }
    await auditLog('astm_ingest', req.user?._id, { matched, errors: parsed.errors, ip: req.ip });
    return res.json({ matched, errors: parsed.errors });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Analyzer Emulator (LIS bridge test drive) ──────────────────────────────
// Generates a realistic ASTM E1394 / HL7 v2.5 ORU^R01 packet from a named
// analyzer and previews it through the real parsers, so integrators can test
// the ingest pipeline without hardware. The returned rawPacket can then be
// POSTed to /ingest/astm or /ingest/hl7 for full end-to-end ingestion.
const ANALYZER_PROFILES = {
  'biochem-xl-640': { model: 'Erba Lachema XL-640', protocol: 'ASTM', panel: [
    ['GLU', 'Glucose', '5.9', 'mmol/L', '3.9-5.5', 'H'],
    ['UREA', 'Urea', '4.2', 'mmol/L', '2.5-7.1', 'N'],
    ['CREA', 'Creatinine', '88', 'umol/L', '62-106', 'N'],
  ] },
  'hematology-xn-1000': { model: 'Sysmex XN-1000', protocol: 'HL7', panel: [
    ['WBC', 'White Blood Count', '8.5', '10*3/uL', '4.0-11.0', 'N'],
    ['RBC', 'Red Blood Count', '4.8', '10*6/uL', '4.2-5.4', 'N'],
    ['HGB', 'Hemoglobin', '11.2', 'g/dL', '12.0-16.0', 'L'],
  ] },
  'immunoassay-access-2': { model: 'Bio-Rad Access 2', protocol: 'HL7', panel: [
    ['TSH', 'Thyroid Stimulating Hormone', '5.6', 'mIU/L', '0.4-4.0', 'H'],
    ['FT4', 'Free Thyroxine', '12.1', 'pmol/L', '12-22', 'N'],
  ] },
};

function buildAstmPacket(profile, sampleId) {
  const seq = (ch, n, body) => `${n}${ch}|${body}`;
  const lines = [
    seq('H', 1, '^@\\^&|||||||LIS|||||20261012000000'),
    seq('P', 2, `1|||${sampleId}||DOE^JOHN|M|19800101`),
    seq('O', 3, `1|${sampleId}||^^^BIOCHEM^PANEL|||||||||||||||||||20261012`),
  ];
  profile.panel.forEach((p, i) => {
    lines.push(seq('R', 4 + i, `${i + 1}|^^^${p[0]}|${p[2]}|${p[3]}|${p[4]}|${p[5]}||F`));
  });
  lines.push(seq('L', 99, '1|N'));
  return lines.join('\r');
}

function buildHl7Packet(profile, sampleId) {
  const now = new Date();
  const ts = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  const segs = [
    `MSH|^~\\&|ANALYZER|${profile.model}|FINDMEDI_LIS|LAB|${ts}||ORU^R01|MSG${Date.now()}|P|2.5`,
    `PID|1||${sampleId}||DOE^JOHN||19800101|M`,
    `OBR|1|${sampleId}|${sampleId}|^^^PANEL|||${ts}`,
  ];
  profile.panel.forEach((p, i) => {
    segs.push(`OBX|${i + 1}|NM|${p[0]}^${p[1]}^LN||${p[2]}|${p[3]}|${p[4]}|${p[5]}|F|||F`);
  });
  return segs.join('\r');
}

// Inline role allowlist inside the handler runs before any parse/write; no route-line guard.
// authz: role
router.post('/ingest/emulate', protect, async (req, res) => {
  try {
    if (!['lab_technician', 'lab_owner', 'hospital_admin', 'superadmin', 'pathologist'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Lab access required' });
    }
    const { analyzer = 'biochem-xl-640', protocol, sampleId } = req.body || {};
    const profile = ANALYZER_PROFILES[analyzer];
    if (!profile) return res.status(400).json({ message: `Unknown analyzer. Available: ${Object.keys(ANALYZER_PROFILES).join(', ')}` });

    const sid = String(sampleId || '').trim() || `ACC${Date.now().toString().slice(-8)}`;
    const proto = String(protocol || profile.protocol).toUpperCase() === 'HL7' ? 'HL7' : 'ASTM';
    const rawPacket = proto === 'HL7' ? buildHl7Packet(profile, sid) : buildAstmPacket(profile, sid);

    const { parseAstmPacket, parseHl7OruR01Packet } = await import('../services/lisAnalyzerDriver.js');
    const preview = proto === 'HL7' ? parseHl7OruR01Packet(rawPacket) : parseAstmPacket(rawPacket);

    await auditLog('analyzer_emulated', req.user?._id, { analyzer, protocol: proto, sampleId: sid, ip: req.ip }).catch(() => {});

    return res.json({
      analyzerId: analyzer,
      analyzerModel: profile.model,
      protocol: proto,
      sampleId: sid,
      rawPacket,
      preview,
      ingestEndpoint: proto === 'HL7' ? '/api/lab/ingest/hl7' : '/api/lab/ingest/astm',
      note: 'Dry run — rawPacket not ingested yet. POST it to ingestEndpoint for full ingestion.',
    });
  } catch (err) { return res.status(500).json({ message: err.message }); }
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
    // §12: the first delivered report opens version 1 with a snapshot, so a
    // later correction has something to be diffed against.
    if (!order.reportVersions.length) {
      order.reportVersions.push({
        version: order.reportVersion || 1, status: 'Report Delivered', correctedBy: req.user._id,
        reason: 'Initial report', content: orderReportSnapshot(order), createdAt: new Date(),
      });
    }
    if (order.tests.length && order.tests.every(t => t.status === 'Report Delivered')) {
      order.status = 'Report Delivered';
    }
    await order.save();
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── §1: explicit order-status lifecycle ───────────────────────────────────
// The model derives status from test statuses on save(); these routes are the
// places a status is set DELIBERATELY (the pre-save hook leaves the extended
// chain alone — see EXPLICIT_STATUSES in models/LabOrder.js).
router.put('/orders/:id/status', protect, authorize('lab:manage', 'lab:receive'), validate(labOrderStatusSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    const { status, notes } = req.body;
    if (status === 'Cancelled') return res.status(409).json({ message: 'Use PUT /orders/:id/cancel — cancelling carries a reason' });
    if (order.status === 'Cancelled') return res.status(409).json({ message: 'Cancelled orders are immutable' });
    const from = order.status;
    order.status = status;
    if (notes) order.clinicalNotes = [order.clinicalNotes, `[${new Date().toISOString()}] ${notes}`].filter(Boolean).join('\n');
    await order.save();
    await auditLog('lab_order_status', req.user._id, { recordId: order._id, from, to: status, ip: req.ip });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id/cancel', protect, authorize('lab:cancel', 'lab:manage'), validate(labOrderCancelSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    if (order.status === 'Cancelled') return res.status(409).json({ message: 'Order is already cancelled' });
    if (['Completed', 'Finalized', 'Report Delivered'].includes(order.status)) {
      return res.status(409).json({ message: 'A released report cannot be cancelled — issue a correction instead' });
    }
    const from = order.status;
    order.status = 'Cancelled';
    order.clinicalNotes = [order.clinicalNotes, `[${new Date().toISOString()}] Cancelled: ${req.body.reason}`].filter(Boolean).join('\n');
    await order.save();
    await auditLog('lab_order_cancelled', req.user._id, { recordId: order._id, from, reason: req.body.reason, ip: req.ip });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// §12: release step. Every test verified → the order is Finalized, and the
// first snapshot is recorded so a later amendment can be diffed against it.
router.put('/orders/:id/finalize', protect, authorize('lab:finalize', 'lab:manage'), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    if (order.status === 'Cancelled') return res.status(409).json({ message: 'Cancelled order cannot be finalized' });
    if (!order.tests.length) return res.status(400).json({ message: 'Order has no tests' });
    const unreleased = order.tests.filter(t => !['Verified', 'Report Delivered'].includes(t.status));
    if (unreleased.length) {
      return res.status(409).json({ message: `${unreleased.length} test(s) not verified yet`, tests: unreleased.map(t => t.testName) });
    }
    order.status = 'Finalized';
    if (!order.reportVersions.length) {
      order.reportVersions.push({
        version: order.reportVersion || 1, status: 'Finalized', correctedBy: req.user._id,
        reason: 'Initial release', content: orderReportSnapshot(order), createdAt: new Date(),
      });
    }
    await order.save();
    await auditLog('lab_order_finalized', req.user._id, { recordId: order._id, version: order.reportVersion, ip: req.ip });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// §3: add a test to an existing order — same order-number lineage (one
// orderId/accession for the whole collection set, the new line starts Ordered).
router.post('/orders/:id/tests', protect, authorize('lab:order', 'lab:manage'), validate(labAddTestSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    if (order.status === 'Cancelled') return res.status(409).json({ message: 'Cannot add a test to a cancelled order' });
    const b = req.body;
    let master = null;
    if (b.testId) {
      master = await Test.findById(b.testId);
      if (!master) return res.status(404).json({ message: 'Test master not found' });
      if (master.hospitalId && order.hospitalId && master.hospitalId.toString() !== order.hospitalId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (b.testName) {
      master = await Test.findOne({ name: new RegExp(`^${escapeRegex(b.testName)}$`, 'i') }).sort({ hospitalId: -1 });
    }
    const ORDER_CATEGORIES = ['Blood', 'Urine', 'Stool', 'Imaging', 'Cardiac', 'Other'];
    const section = b.section || (master && LAB_SECTIONS.includes(master.category) ? master.category : '');
    order.tests.push({
      testName: master?.name || b.testName,
      category: master && ORDER_CATEGORIES.includes(master.category) ? master.category : 'Other',
      priority: b.priority || order.priority,
      status: 'Ordered',
      section,
      sampleType: b.sampleType || master?.sampleType || undefined,
      refLow: master?.refLow ?? null,
      refHigh: master?.refHigh ?? null,
      criticalLow: master?.criticalLow ?? null,
      criticalHigh: master?.criticalHigh ?? null,
      unit: master?.unit || '',
      normalRange: master && master.refLow != null && master.refHigh != null ? `${master.refLow} - ${master.refHigh}` : undefined,
    });
    await order.save();
    await auditLog('lab_order_test_added', req.user._id, {
      recordId: order._id, orderId: order.orderId, testIndex: order.tests.length - 1,
      testName: order.tests[order.tests.length - 1].testName, ip: req.ip,
    });
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── §2: sample receiving + section worklists ──────────────────────────────
// Intake list: orders whose samples have not landed at the bench yet.
router.get('/receiving', protect, authorize('lab:read', 'lab:receive'), async (req, res) => {
  try {
    const filter = {
      status: { $in: ['Ordered', 'Collection Pending', 'Out for Collection', 'Collected', 'Sample Pending'] },
      'tests.receivedAt': null,
      'tests.status': { $in: ['Ordered', 'Sample Needed', 'Sample Collected'] },
    };
    labScope(req, filter);
    if (req.query.status) {
      if (!LAB_ORDER_STATUSES.includes(String(req.query.status))) return res.status(400).json({ message: 'Unknown status' });
      filter.status = { $in: [String(req.query.status)] };
    }
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const orders = await LabOrder.find(filter)
      .select('orderId patientName doctorName priority status createdAt tests sampleIds')
      .sort({ priority: -1, createdAt: -1 }).limit(limit).lean();
    const shaped = orders.map(o => ({
      ...o,
      pendingTests: (o.tests || [])
        .map((t, i) => ({ ...t, testIndex: i }))
        .filter(t => !t.receivedAt && ['Ordered', 'Sample Needed', 'Sample Collected'].includes(t.status)),
    }));
    res.json({ orders: shaped, total: shaped.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// §2: per-section load (the pathology dashboard's section tiles).
router.get('/sections', protect, authorize('lab:read'), async (req, res) => {
  try {
    const filter = {};
    labScope(req, filter);
    const orders = await LabOrder.find(filter).select('tests.section tests.status').limit(2000).lean();
    const rows = new Map(LAB_SECTIONS.map(s => [s, { section: s, tests: 0, pending: 0, verified: 0, rejected: 0 }]));
    rows.set('Unsectioned', { section: 'Unsectioned', tests: 0, pending: 0, verified: 0, rejected: 0 });
    for (const o of orders) {
      for (const t of (o.tests || [])) {
        const key = LAB_SECTIONS.includes(t.section) ? t.section : 'Unsectioned';
        const row = rows.get(key);
        row.tests += 1;
        if (['Verified', 'Report Delivered'].includes(t.status)) row.verified += 1;
        else if (t.status === 'Rejected') row.rejected += 1;
        else row.pending += 1;
      }
    }
    const sections = [...rows.values()].filter(r => r.section !== 'Unsectioned' || r.tests > 0);
    res.json({ sections, total: sections.reduce((a, r) => a + r.tests, 0) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// §2: bench worklist — one row per test line, filterable by section/status.
router.get('/worklist', protect, authorize('lab:read'), async (req, res) => {
  try {
    const { section, status } = req.query;
    if (section && !LAB_SECTIONS.includes(String(section))) return res.status(400).json({ message: 'Unknown section' });
    const filter = {};
    labScope(req, filter);
    if (section) filter['tests.section'] = String(section);
    if (status) filter['tests.status'] = String(status);
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const orders = await LabOrder.find(filter).select('orderId patientName doctorName priority status tests updatedAt').sort({ updatedAt: -1 }).limit(limit).lean();
    const rows = [];
    for (const o of orders) {
      (o.tests || []).forEach((t, i) => {
        if (section && t.section !== section) return;
        if (status && t.status !== status) return;
        rows.push({
          orderId: o._id, orderNo: o.orderId, patientName: o.patientName,
          doctorName: o.doctorName, orderStatus: o.status, priority: o.priority,
          testIndex: i, testName: t.testName, section: t.section, status: t.status,
          sampleId: t.sampleId || '', sampleNo: t.sampleNo || '',
          receivedAt: t.receivedAt || null, resultEnteredAt: t.resultEnteredAt || null,
          verifiedAt: t.verifiedAt || null, outsourced: Boolean(t.outsourced?.lab),
        });
      });
    }
    res.json({ worklist: rows, total: rows.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// §2: intake. Marks the selected lines received; the order lands on `Received`.
router.post('/orders/:id/receive', protect, authorize('lab:receive', 'lab:manage'), validate(labReceiveSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    const b = req.body || {};
    const now = new Date();
    const targets = Array.isArray(b.testIndexes) && b.testIndexes.length
      ? b.testIndexes
      : order.tests.map((t, i) => (t.receivedAt ? null : i)).filter(i => i !== null);
    if (!targets.length) return res.status(400).json({ message: 'No sample lines to receive on this order' });
    const received = [];
    for (let n = 0; n < targets.length; n += 1) {
      const idx = targets[n];
      const test = order.tests[idx];
      if (!test) return res.status(404).json({ message: `Test index ${idx} not found` });
      if (['Verified', 'Report Delivered'].includes(test.status)) {
        return res.status(409).json({ message: `${test.testName} is already released — nothing to receive` });
      }
      test.receivedAt = now;
      test.receivedBy = req.user._id;
      test.sampleNo = b.sampleNos?.[n] || b.sampleNo || test.sampleNo || test.sampleId || '';
      test.sampleCondition = b.condition || test.sampleCondition || (b.accepted === false ? 'Rejected at intake' : 'Accepted');
      if (b.accepted === false) {
        test.status = 'Rejected';
        test.rejectionReason = test.rejectionReason || 'Other';
        test.recollectReason = b.condition ? String(b.condition).slice(0, 500) : 'Sample rejected at intake';
      } else if (['Ordered', 'Sample Needed'].includes(test.status)) {
        test.status = 'Sample Collected';
      }
      received.push(idx);
    }
    if (b.accepted !== false) order.status = 'Received';
    await order.save();
    await auditLog('lab_sample_received', req.user._id, { recordId: order._id, received, accepted: b.accepted !== false, ip: req.ip });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// §2: single-line intake verdict (accept after reject/recollect, or plain QC).
router.put('/orders/:id/tests/:index/accept', protect, authorize('lab:receive', 'lab:manage'), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    const test = order.tests[Number(req.params.index)];
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (['Verified', 'Report Delivered'].includes(test.status)) return res.status(409).json({ message: 'Released test cannot be re-accepted' });
    const now = new Date();
    test.receivedAt = test.receivedAt || now;
    test.receivedBy = test.receivedBy || req.user._id;
    test.sampleCondition = 'Accepted';
    test.rejectionReason = '';
    if (['Ordered', 'Sample Needed', 'Rejected'].includes(test.status)) test.status = 'Sample Collected';
    if (['Ordered', 'Collection Pending', 'Out for Collection', 'Collected', 'Sample Pending'].includes(order.status)) order.status = 'Received';
    await order.save();
    await auditLog('lab_sample_accepted', req.user._id, { recordId: order._id, testIndex: Number(req.params.index), ip: req.ip });
    res.json({ id: String(order._id), status: test.status, orderStatus: order.status });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── §12: report versioning + amendment ────────────────────────────────────
// Sanitised snapshot of what the report said at a version boundary.
function orderReportSnapshot(order) {
  return (order.tests || []).map(t => ({
    testName: t.testName, status: t.status, resultValue: t.resultValue || '',
    flag: t.flag || '', normalRange: t.normalRange || '', unit: t.unit || '',
    verifiedAt: t.verifiedAt || null, verifiedByRole: t.verifiedByRole || '',
  }));
}

router.get('/orders/:id/report/versions', protect, authorize('lab:read'), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    res.json({ reportVersion: order.reportVersion, versions: order.reportVersions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Amended report: the released snapshot is kept, reportVersion increments, and
// (when a line is corrected) that line goes back to Result Pending so the fix
// passes the same verify gate the original did — never a silent overwrite.
router.post('/orders/:id/correct-report', protect, authorize('lab:correct', 'lab:manage'), validate(labCorrectReportSchema), async (req, res) => {
  try {
    const order = await LabOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!callerOwnsTenant(req.user, order)) return res.status(403).json({ message: 'Access denied' });
    if (order.status === 'Cancelled') return res.status(409).json({ message: 'Cancelled order cannot be corrected' });
    const b = req.body;
    const previousVersion = order.reportVersion || 1;
    order.reportVersions.push({
      version: previousVersion, status: order.status, correctedBy: req.user._id,
      reason: b.reason, content: orderReportSnapshot(order), createdAt: new Date(),
    });
    order.reportVersion = previousVersion + 1;
    let correctedTest = null;
    if (b.testIndex !== undefined) {
      const test = order.tests[b.testIndex];
      if (!test) return res.status(404).json({ message: 'Test not found' });
      if (b.resultValue !== undefined) {
        test.prevValue = test.resultValue || '';
        test.resultValue = String(b.resultValue).slice(0, 4000);
        test.resultEnteredBy = req.user._id;
        test.resultEnteredAt = new Date();
        test.verificationNotes = b.notes || `Corrected: ${b.reason}`;
        test.verifiedAt = null;
        test.verifiedBy = null;
        test.status = 'Result Pending';
        correctedTest = test.testName;
      }
    }
    if (correctedTest) order.status = 'Verification Pending';
    await order.save();
    await auditLog('lab_report_corrected', req.user._id, {
      recordId: order._id, fromVersion: previousVersion, toVersion: order.reportVersion,
      correctedTest, reason: b.reason, ip: req.ip,
    });
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
      // §9 department roles are not in utils/tenantScope.js TENANT_STAFF_ROLES
      // yet (shared file, separate follow-up) — applyTenantScope would scope
      // them to tenant-less rows only, i.e. a permanently empty dashboard.
      // They get the same fail-closed hospitalId scope the new lab lists use.
      if ([...LAB_DEPT_ROLES, 'home_collection_staff'].includes(req.user.role)) {
        labScope(req, filter);
      } else {
        const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
        if (!scope.ok) return res.status(403).json({ message: scope.message });
      }
    }
    // §1: counters follow the widened lifecycle — the legacy three keep their
    // names and now cover the collection/verification chain too.
    const total = await LabOrder.countDocuments(filter);
    const pending = await LabOrder.countDocuments({ ...filter, status: { $in: ['Ordered', 'Sample Pending', 'Draft', 'Payment Pending', 'Collection Pending', 'Out for Collection', 'Collected'] } });
    const processing = await LabOrder.countDocuments({ ...filter, status: { $in: ['Processing', 'Under Verification', 'Received', 'Result Pending', 'Verification Pending', 'Partially Completed'] } });
    const completed = await LabOrder.countDocuments({ ...filter, status: { $in: ['Completed', 'Finalized', 'Report Delivered'] } });
    const critical = await LabOrder.countDocuments({ ...filter, 'tests.isCritical': true });
    // §2/§5/§7: intake + verification + reference-lab queues, and the
    // prescription-verdict KPIs the lab dashboard reads after a reload.
    const awaitingIntake = await LabOrder.countDocuments({ ...filter, status: { $in: ['Collection Pending', 'Out for Collection', 'Collected'] } });
    const awaitingVerification = await LabOrder.countDocuments({ ...filter, status: { $in: ['Under Verification', 'Verification Pending'] } });
    const outsourced = await LabOrder.countDocuments({ ...filter, 'tests.outsourced.lab': { $ne: '' }, 'tests.outsourced.status': { $nin: ['Finalized'] } });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const bookingScope = labScope(req, {});
    const [verifiedToday, rejectedToday] = await Promise.all([
      LabBooking.countDocuments({ ...bookingScope, status: 'Verified', createdAt: { $gte: startOfDay } }),
      LabBooking.countDocuments({ ...bookingScope, status: 'Rejected', createdAt: { $gte: startOfDay } }),
    ]);
    res.json({
      total, pending, processing, completed, critical,
      awaitingIntake, awaitingVerification, outsourced,
      verifiedToday, rejectedToday,
    });
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
// Phlebotomists (home-collection dispatch roster) — replaces the hardcoded
// collector list the sample-collection UI used to ship with.
router.get('/phlebotomists', protect, requireRole([...LAB_STAFF_ROLES, 'phlebotomist']), async (req, res) => {
  try {
    const filter = { role: 'phlebotomist', status: 'active' };
    if (req.user.hospitalId && req.user.role !== 'superadmin') {
      filter.$or = [{ hospitalId: req.user.hospitalId }, { hospitalId: { $exists: false } }];
    }
    const list = await User.find(filter).select('name email phone role').sort({ name: 1 }).limit(200).lean();
    res.json({ phlebotomists: list });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

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
    const tenantId = req.serviceAccount?.tenantId || req.user?.hospitalId || req.user?.facilityId;
    const tenantFilter = tenantId ? { hospitalId: tenantId } : {};
    for (const obr of parsed.orders) {
      if (!obr.orderId) continue;
      // eslint-disable-next-line no-await-in-loop
      const order = await LabOrder.findOne({ ...tenantFilter, orderId: obr.orderId });
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

router.put('/bookings/:id', protect, requireRole([...LAB_STAFF_ROLES, 'phlebotomist']), validate(labBookingSchema), async (req, res) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && booking.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // AUTH-030: allowlisted fields only — payment/report flows have dedicated
    // endpoints. `status` + `phlebotomist` are the home-collection dispatch
    // flow (Request → Assign → Collect → Receive): the UI was writing them but
    // pickBody silently dropped both (values constrained by the model enum).
    const { pickBody } = await import('../utils/pick.js');
    const patch = pickBody(req.body, ['patientName', 'patientPhone', 'patientEmail', 'tests', 'testIds', 'totalAmount', 'discountedAmount', 'bookingDate', 'timeSlot', 'visitType', 'homeCollectionAddress', 'homeCollectionFee', 'prescriptionUrl', 'prescriptionVerified', 'notes', 'reportUrl', 'reportDeliveryMode', 'reportDeliveryFee', 'status', 'phlebotomist', 'phlebotomistId']);
    // §1: prescription verdict. The queue screen counts "Verified Today" /
    // "Rejected Today" from `status`, and a reload re-reads it — so the verdict
    // must live on status (now in the model enum) AND flip prescriptionVerified,
    // or the KPI stays frozen after refresh. Unknown statuses fail loudly here
    // instead of surfacing as a mongoose enum error.
    if (patch.status !== undefined) {
      if (!LAB_BOOKING_STATUSES.includes(patch.status)) {
        return res.status(400).json({ message: `Unknown booking status: ${patch.status}` });
      }
      if (patch.status === 'Verified') {
        patch.prescriptionVerified = true;
        if (req.body.prescriptionUrl) patch.prescriptionUrl = req.body.prescriptionUrl;
      } else if (patch.status === 'Rejected') {
        patch.prescriptionVerified = false;
      }
    }
    Object.assign(booking, patch);
    await booking.save();
    await auditLog('update_lab_booking', req.user._id, { recordId: booking._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(booking);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// §4: home-collection visit workflow — Assigned → On Route → Collected →
// Submitted, with an explicit fail path. Guard is permission-based (lab:visit)
// so the phlebotomist role (whose pinned permission set cannot change) reaches
// it through lab:book, and the §9 home_collection_staff role through lab:visit.
router.put('/bookings/:id/visit', protect, authorize('lab:visit', 'lab:book', 'lab:manage'), validate(labVisitSchema), async (req, res) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!callerOwnsTenant(req.user, booking)) return res.status(403).json({ message: 'Access denied' });
    if (booking.visitType !== 'Home Collection') return res.status(409).json({ message: 'Visit workflow applies to home-collection bookings only' });
    const { action, reason } = req.body;
    const now = new Date();
    if (action === 'start') {
      if (!['Assigned', 'Confirmed', 'Pending'].includes(booking.status)) {
        return res.status(409).json({ message: `Cannot start from status ${booking.status}` });
      }
      booking.status = 'On Route';
      booking.visitStartedAt = now;
      if (!booking.phlebotomistId && roleHasPermission(req.user.role, 'lab:visit')) {
        booking.phlebotomist = req.user.name;
        booking.phlebotomistId = req.user._id;
      }
    } else if (action === 'complete') {
      if (!['Assigned', 'Confirmed', 'Pending', 'On Route'].includes(booking.status)) {
        return res.status(409).json({ message: `Cannot complete from status ${booking.status}` });
      }
      booking.status = 'Collected';
      booking.visitEndedAt = now;
    } else if (action === 'handover') {
      if (!['Collected', 'On Route'].includes(booking.status)) {
        return res.status(409).json({ message: `Cannot hand over from status ${booking.status}` });
      }
      booking.status = 'Submitted';
      booking.handoverAt = now;
      booking.visitEndedAt = booking.visitEndedAt || now;
    } else if (action === 'fail') {
      if (!['Assigned', 'Confirmed', 'Pending', 'On Route'].includes(booking.status)) {
        return res.status(409).json({ message: `Cannot fail from status ${booking.status}` });
      }
      if (!reason) return res.status(400).json({ message: 'Failure reason required' });
      booking.status = 'Failed';
      booking.failedReason = String(reason).slice(0, 500);
      booking.visitEndedAt = now;
    }
    await booking.save();
    await auditLog(`lab_home_visit_${action}`, req.user._id, { recordId: booking._id, status: booking.status, ip: req.ip });
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
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const patientUser = await safeFirst(User.findById(patientId).select('address city state pincode').lean());
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

// =========================================================================
// LIS AUTO-ANALYZER INGEST ENGINE (ASTM E1381/E1394 & HL7 v2.5 ORU^R01)
// =========================================================================
router.post('/analyzer-upload', protect, requireRole(...LAB_STAFF_ROLES), async (req, res) => {
  try {
    const { rawPayload, protocol = 'auto', deviceModel, orderId } = req.body;
    if (!rawPayload || typeof rawPayload !== 'string') {
      return res.status(400).json({ success: false, message: 'rawPayload string is required (ASTM or HL7 packet)' });
    }

    const { processAnalyzerResultUpload } = await import('../services/lisAnalyzerDriver.js');
    const result = await processAnalyzerResultUpload({
      rawPayload,
      protocol,
      deviceModel,
      orderId,
      facilityId: req.user.facilityId,
      uploadedBy: req.user._id
    });

    res.json(result);
  } catch (err) {
    logger.error('Analyzer upload failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

