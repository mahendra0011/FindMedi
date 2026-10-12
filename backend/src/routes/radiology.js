import express from 'express';
import { z } from 'zod';
import Radiology from '../models/Radiology.js';
import ImagingModality from '../models/ImagingModality.js';
import ImagingAppointment from '../models/ImagingAppointment.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createRadiologyOrderSchema } from '../utils/validate.js';
import { generateOrderId, generateTimestampedId } from '../utils/idGenerator.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const radScheduleSchema = z.object({ scheduledAt: z.string().optional(), modalityId: z.string().optional() });
const radCompleteSchema = z.object({ imageUrls: z.array(z.string()).optional(), performedBy: z.string().optional() });
const radReportSchema = z.object({
  findings: z.string().optional(),
  impression: z.string().optional(),
  recommendation: z.string().optional(),
  reportUrl: z.string().optional(),
  amendmentReason: z.string().optional(),
  criticalFinding: z.object({
    isCritical: z.boolean().optional(),
    findingDetails: z.string().optional(),
    urgencyLevel: z.string().optional(),
  }).optional(),
});

// §5: cancellation, generic transitions and pre-imaging modification.
const radCancelSchema = z.object({ reason: z.string().min(1, 'Cancellation reason is required').max(1000) });
const RAD_STATUS_VALUES = [
  'Draft', 'Ordered', 'Authorization Pending', 'Payment Pending',
  'Scheduling Pending', 'Scheduled', 'Appointment Confirmed', 'Patient Arrived',
  'Preparation Pending', 'Ready for Imaging', 'In Progress', 'Completed',
  'Study Completed', 'Reporting Pending', 'Reported', 'Report Finalized',
  'Report Released', 'Delivered', 'On Hold', 'Cancelled',
];
const radStatusSchema = z.object({
  status: z.enum(RAD_STATUS_VALUES),
  reason: z.string().max(1000).optional(),
});
const radModifySchema = z.object({
  bodyPart: z.string().min(1).optional(),
  priority: z.enum(['Routine', 'Urgent', 'STAT']).optional(),
  clinicalIndication: z.string().max(4000).optional(),
  clinicalHistory: z.string().max(4000).optional(),
  prepInstructions: z.string().max(4000).optional(),
});

// §7: imaging appointment booking / reschedule.
const radAppointmentCreateSchema = z.object({
  radiologyOrderId: z.string().max(40).optional(),
  patientId: z.string().min(1, 'Patient is required'),
  modalityType: z.string().min(1, 'Modality type is required'),
  machineId: z.string().max(40).optional(),
  room: z.string().max(40).optional(),
  scheduledStart: z.string().min(1, 'scheduledStart is required'),
  slotMinutes: z.number().min(5).max(480).optional(),
  technicianId: z.string().max(40).optional(),
  radiologistId: z.string().max(40).optional(),
  slotType: z.enum(['Regular', 'Emergency', 'Maintenance Block']).optional(),
  waitlistRank: z.number().optional(),
  notes: z.string().max(2000).optional(),
});
const radAppointmentUpdateSchema = z.object({
  scheduledStart: z.string().optional(),
  slotMinutes: z.number().min(5).max(480).optional(),
  technicianId: z.string().max(40).optional(),
  radiologistId: z.string().max(40).optional(),
  room: z.string().max(40).optional(),
  status: z.enum(['Booked', 'Confirmed', 'Arrived', 'No Show', 'Cancelled', 'Rescheduled', 'Completed']).optional(),
  notes: z.string().max(2000).optional(),
  reason: z.string().max(1000).optional(),
});

// §15 / §10 / §21 / §19 route payloads.
const radPreparationSchema = z.object({
  checklist: z.array(z.object({
    item: z.string().min(1).max(300),
    done: z.boolean().optional(),
  })).optional(),
  missingInfo: z.array(z.string().max(300)).optional(),
  consentTaken: z.boolean().optional(),
  hold: z.boolean().optional(),
  holdReason: z.string().max(1000).optional(),
  ready: z.boolean().optional(),
});
const radContrastSchema = z.object({
  agent: z.string().max(200).optional(),
  volumeMl: z.number().min(0).max(2000).optional(),
  route: z.string().max(120).optional(),
  givenAt: z.string().optional(),
  reaction: z.string().max(2000).optional(),
});
const radCriticalEscalateSchema = z.object({
  escalatedTo: z.string().min(1, 'escalatedTo is required').max(300),
  note: z.string().max(2000).optional(),
});
const radCriticalCloseSchema = z.object({
  outcome: z.string().min(1, 'outcome is required').max(2000),
});
const radDicomLinkSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  studyUid: z.string().min(1, 'studyUid is required').max(256),
  seriesCount: z.number().min(0).optional(),
});
const radDicomRetrySchema = z.object({ orderId: z.string().min(1, 'orderId is required') });

// §6 modality master payloads (name/code/modalityType required on create).
const modalityWorkingHoursSchema = z.object({
  open: z.string().max(8).optional(),
  close: z.string().max(8).optional(),
  days: z.array(z.string().max(10)).max(7).optional(),
});
const radModalityCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z.string().min(1, 'Code is required').max(40),
  modalityType: z.string().min(1, 'Modality type is required'),
  roomNumber: z.string().max(40).optional(),
  machineModel: z.string().max(120).optional(),
  manufacturer: z.string().max(120).optional(),
  dicomAETitle: z.string().max(30).optional(),
  dicomPort: z.number().optional(),
  slotDurationMinutes: z.number().min(5).max(480).optional(),
  requiresContrastScreening: z.boolean().optional(),
  requiresImplantCheck: z.boolean().optional(),
  status: z.enum(['Available', 'In Use', 'Under Maintenance', 'Out of Service']).optional(),
  supportedStudies: z.array(z.string().max(200)).max(50).optional(),
  prepRules: z.array(z.string().max(500)).max(50).optional(),
  reportTemplates: z.array(z.string().max(200)).max(50).optional(),
  price: z.number().min(0).optional(),
  insuranceRate: z.number().min(0).max(100).optional(),
  workingHours: modalityWorkingHoursSchema.optional(),
  maintenanceScheduleDays: z.number().min(1).max(3650).optional(),
  assignedStaff: z.array(z.string().max(40)).max(50).optional(),
  assignedEquipment: z.string().max(40).optional(),
});
const radModalityUpdateSchema = radModalityCreateSchema.partial();

// §5: the generic status-transition map. An edge absent here is a 400 —
// the workflow is deliberately explicit so no client can jump
// Ordered → Delivered or resurrect a Cancelled order.
const RAD_STATUS_TRANSITIONS = {
  'Draft': ['Ordered', 'Cancelled'],
  'Ordered': ['Authorization Pending', 'Payment Pending', 'Scheduling Pending', 'Cancelled'],
  'Authorization Pending': ['Payment Pending', 'Scheduling Pending', 'Ordered', 'Cancelled'],
  'Payment Pending': ['Scheduling Pending', 'Ordered', 'Cancelled'],
  'Scheduling Pending': ['Appointment Confirmed', 'Scheduled', 'Cancelled'],
  'Scheduled': ['Appointment Confirmed', 'Patient Arrived', 'Preparation Pending', 'Ready for Imaging', 'Cancelled'],
  'Appointment Confirmed': ['Patient Arrived', 'Cancelled'],
  'Patient Arrived': ['Preparation Pending', 'Ready for Imaging', 'On Hold'],
  'Preparation Pending': ['Ready for Imaging', 'On Hold', 'Patient Arrived', 'Cancelled'],
  'On Hold': ['Preparation Pending', 'Ready for Imaging', 'Cancelled'],
  'Ready for Imaging': ['In Progress', 'On Hold'],
  'In Progress': ['Study Completed'],
  'Study Completed': ['Reporting Pending', 'Completed'],
  'Completed': ['Reporting Pending', 'Reported'],
  'Reporting Pending': ['Report Finalized'],
  'Report Finalized': ['Report Released'],
  'Report Released': ['Delivered'],
  'Delivered': [],
  'Cancelled': [],
};
// Reporting-phase statuses: orders here are past the point of no return for
// cancel/modify (the report is the legal record).
const RAD_REPORTING_STATUSES = ['Study Completed', 'Reporting Pending', 'Reported', 'Report Finalized', 'Report Released', 'Delivered'];

const router = express.Router();

// ─── Create Radiology Order ────────────────────────────────────────────────
// Create: radiology:write (radiologist/admin) or radiology:order (CPOE
// ordering by doctor/dentist/surgeon — was adminOnly, so no clinician could
// ever place an imaging order).
router.post('/orders', protect, authorize('radiology:write', 'radiology:order'), validate(createRadiologyOrderSchema), async (req, res) => {
  try {
    const { patientId, patientName, modality, bodyPart, clinicalHistory, priority, encounterId, admissionId } = req.body;
    if (!patientId || !modality || !bodyPart) {
      return res.status(400).json({ message: 'Patient, modality, and body part required' });
    }
    const orderId = generateOrderId('RAD');
    const order = await Radiology.create({
      orderId, patientId, patientName,
      doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId || undefined,
      modality, bodyPart, clinicalHistory: clinicalHistory || '',
      priority: priority || 'Routine', createdBy: req.user._id,
      // §22: consult/admission lineage from the caller (front-desk/CPOE) so the
      // charge lands on the right encounter/stay.
      encounterId: encounterId || null,
      admissionId: admissionId || null,
      studyNumber: generateTimestampedId('STU'),
    });
    // File 22 P0-4: post one Pending charge (ServicePrice RAD-<MODALITY>;
    // no tariff → ₹0 line, never an invented amount). Idempotent per order.
    try {
      const { default: ServicePrice } = await import('../models/ServicePrice.js');
      const { postCharge, openAdmissionFor } = await import('../lib/charges.js');
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const stay = await safeFirst(openAdmissionFor(order.hospitalId, order.patientId));
      if (stay && !order.admissionId) {
        order.admissionId = stay._id;
        await order.save();
      }
      const code = `RAD-${String(modality).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
      const tariff = await safeFirst(ServicePrice.findOne({
        hospitalId: order.hospitalId, code, active: true,
      }).lean());
      const cash = (tariff?.prices || []).find((p) => (p.payerClass || 'cash') === 'cash');
      await postCharge({
        hospitalId: order.hospitalId, patientId: order.patientId,
        encounterId: order.encounterId, admissionId: order.admissionId || stay?._id || null,
        source: 'radiology', sourceRef: { model: 'Radiology', id: order._id },
        serviceCode: code, description: `${modality} — ${bodyPart}`,
        qty: 1, unitPrice: Number(cash?.amount || 0),
        postedBy: req.user._id ?? req.user.id,
      }).catch(() => null);
    } catch (e) {
      const { default: radLogger } = await import('../config/logger.js');
      radLogger.warn(`radiology charge posting failed: ${e.message}`);
    }
    // Notify radiology staff (via the controlled writer: dedup + daily cap).
    const { createNotification } = await import('../services/notificationService.js');
    const staff = await User.find({ role: { $in: ['radiologist', 'hospital_admin', 'radiology_manager'] }, status: 'active' }).select('_id');
    await Promise.all(staff.map((s) => createNotification({
      userId: s._id.toString(),
      title: 'New Radiology Order', message: `Dr. ${req.user.name} ordered ${modality} for ${patientName}`,
      type: 'radiology',
      dedupKey: `rad-order:${orderId}:${s._id.toString()}`,
    }).catch(() => null)));
    await auditLog('radiology_order_created', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId, modality, bodyPart, priority: priority || 'Routine',
    });
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── List Orders ──────────────────────────────────────────────────────────
router.get('/orders', protect, async (req, res) => {
  try {
    const { status, modality, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.user.role === 'doctor') filter.doctorId = req.user.doctorProfileId;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (status && status !== 'All') filter.status = status;
    if (modality && modality !== 'All') filter.modality = modality;
    if (search) {
      filter.$or = [
        { orderId: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { bodyPart: new RegExp(escapeRegex(capSearch(search)), 'i') },
      ];
    }
    const orders = await Radiology.find(filter).populate('patientId', 'name email phone').populate('doctorId', 'name email').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Single Order ──────────────────────────────────────────────────────
router.get('/orders/:id', protect, async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id).populate('patientId', 'name email phone').populate('doctorId', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // radiology:read:own — a patient reaches only their own studies.
    const owner = order.patientId?._id || order.patientId;
    if (req.user.role === 'patient' && owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Cancel Order (§5) ─────────────────────────────────────────────────────
// Blocked once the report phase starts (Reported/Report Finalized/Report
// Released/Delivered) — the report is the legal record; a paid order gets
// refundFlag so billing can raise the credit note.
router.put('/orders/:id/cancel', protect, authorize('radiology:cancel'), validate(radCancelSchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (['Reported', 'Report Finalized', 'Report Released', 'Delivered'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order in status '${order.status}'` });
    }
    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }
    const oldStatus = order.status;
    // Refund flag only when the radiology charge was actually billed.
    let paid = false;
    try {
      const { default: ChargeItem } = await import('../models/ChargeItem.js');
      paid = Boolean(await ChargeItem.exists({
        hospitalId: order.hospitalId, source: 'radiology',
        'sourceRef.model': 'Radiology', 'sourceRef.id': order._id,
        status: { $in: ['Billed', 'Waived'] },
      }));
    } catch { /* charge lookup is best-effort; cancel must not fail on it */ }
    order.status = 'Cancelled';
    order.cancellationReason = req.body.reason;
    order.refundFlag = paid;
    await order.save();
    // Cancel any open appointment linked to this order.
    await ImagingAppointment.updateMany(
      { radiologyOrderId: order._id, status: { $in: ['Booked', 'Confirmed'] } },
      { $set: { status: 'Cancelled' } },
    ).catch(() => null);
    await auditLog('radiology_order_cancelled', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
      oldStatus, newStatus: 'Cancelled', reason: req.body.reason, refundFlag: paid,
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Generic Status Transition (§5) ────────────────────────────────────────
// The transition map is the single source of truth for the 20-state
// workflow; anything not listed is a 400.
router.put('/orders/:id/status', protect, authorize('radiology:write'), validate(radStatusSchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { status: nextStatus, reason } = req.body;
    if (nextStatus === order.status) return res.json(order);
    const allowed = RAD_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({
        message: `Invalid transition: '${order.status}' → '${nextStatus}'`,
        allowed,
      });
    }
    const oldStatus = order.status;
    order.status = nextStatus;
    if (nextStatus === 'In Progress') {
      order.performedAt = new Date();
      order.performedBy = req.user.name;
    }
    if (reason && nextStatus === 'Cancelled') order.cancellationReason = reason;
    await order.save();
    await auditLog('radiology_order_status_changed', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
      oldStatus, newStatus: nextStatus, reason: reason || undefined,
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Modify Order (§5, before In Progress) ─────────────────────────────────
router.put('/orders/:id/modify', protect, authorize('radiology:write'), validate(radModifySchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (['In Progress', ...RAD_REPORTING_STATUSES, 'Cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot modify an order in status '${order.status}'` });
    }
    const before = {
      bodyPart: order.bodyPart, priority: order.priority,
      clinicalHistory: order.clinicalHistory, prepInstructions: order.prepInstructions,
    };
    const { bodyPart, priority, clinicalIndication, clinicalHistory, prepInstructions } = req.body;
    if (bodyPart) order.bodyPart = bodyPart;
    if (priority) order.priority = priority;
    if (clinicalIndication !== undefined) order.clinicalHistory = clinicalIndication;
    else if (clinicalHistory !== undefined) order.clinicalHistory = clinicalHistory;
    if (prepInstructions !== undefined) order.prepInstructions = prepInstructions;
    await order.save();
    await auditLog('radiology_order_modified', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
      before, after: {
        bodyPart: order.bodyPart, priority: order.priority,
        clinicalHistory: order.clinicalHistory, prepInstructions: order.prepInstructions,
      },
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Schedule Scan ─────────────────────────────────────────────────────────
router.put('/orders/:id/schedule', protect, validate(radScheduleSchema), async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    const existing = await Radiology.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && existing.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    existing.status = 'Scheduled';
    existing.scheduledAt = scheduledAt;
    await existing.save();
    res.json(existing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Start Scan (Technician) ───────────────────────────────────────────────
router.put('/orders/:id/start', protect, async (req, res) => {
  try {
    const existing = await Radiology.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && existing.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    existing.status = 'In Progress';
    existing.performedAt = new Date();
    existing.performedBy = req.user.name;
    await existing.save();
    res.json(existing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Complete Scan ─────────────────────────────────────────────────────────
router.put('/orders/:id/complete', protect, validate(radCompleteSchema), async (req, res) => {
  try {
    const { imageUrls } = req.body;
    const existing = await Radiology.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && existing.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    existing.status = 'Completed';
    existing.imageUrls = imageUrls || [];
    await existing.save();
    res.json(existing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Safety Screening & Patient Prep (MRI / CT Contrast / Renal) ─────────
router.put('/orders/:id/screening', protect, authorize('radiology:read', 'radiology:write'), async (req, res) => {
  try {
    const {
      hasPacemakerOrMetalImplant,
      hasRenalImpairment,
      serumCreatinine,
      eGfr,
      contrastAllergyHistory,
      isPregnant,
      clearedForScan,
      clearanceNotes,
    } = req.body;
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    order.safetyScreening = {
      isScreened: true,
      screenedBy: req.user._id,
      screenedAt: new Date(),
      hasPacemakerOrMetalImplant: Boolean(hasPacemakerOrMetalImplant),
      hasRenalImpairment: Boolean(hasRenalImpairment),
      serumCreatinine: serumCreatinine ? Number(serumCreatinine) : undefined,
      eGfr: eGfr ? Number(eGfr) : undefined,
      contrastAllergyHistory: Boolean(contrastAllergyHistory),
      isPregnant: Boolean(isPregnant),
      clearedForScan: Boolean(clearedForScan),
      clearanceNotes: clearanceNotes || '',
    };
    if (clearedForScan) {
      order.status = 'Ready for Imaging';
    } else {
      order.status = 'Preparation Pending';
    }
    await order.save();
    await auditLog('radiology_safety_screened', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId, clearedForScan,
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Submit / Amend Report (Radiologist with Versioning & Critical Alerts) ─
router.put('/orders/:id/report', protect, authorize('radiology:write', 'radiology:amend'), validate(radReportSchema), async (req, res) => {
  try {
    const { findings, impression, recommendation, reportUrl, amendmentReason, criticalFinding } = req.body;
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Archive previous version if report already existed (Preserve audit history)
    if (order.findings || order.impression) {
      order.reportVersions = order.reportVersions || [];
      order.reportVersions.push({
        versionNumber: (order.reportVersions.length || 0) + 1,
        findings: order.findings,
        impression: order.impression,
        recommendation: order.recommendation,
        amendmentReason: amendmentReason || 'Report updated/amended',
        signedBy: order.reportedBy || req.user._id,
        signedAt: order.reportedAt || new Date(),
      });
    }

    order.status = 'Reported';
    order.findings = findings;
    order.impression = impression;
    order.recommendation = recommendation;
    if (reportUrl) order.reportUrl = reportUrl;
    order.reportedBy = req.user._id;
    order.reportedAt = new Date();
    // §32 search: first signature stamps the human-readable report number.
    if (!order.reportNumber) order.reportNumber = generateTimestampedId('RPT');

    // Critical finding alert & urgent communication workflow
    const { createNotification } = await import('../services/notificationService.js');
    if (criticalFinding && criticalFinding.isCritical) {
      order.criticalFinding = {
        isCritical: true,
        findingDetails: criticalFinding.findingDetails || impression || findings || '',
        urgencyLevel: criticalFinding.urgencyLevel || 'Orange - Urgent 1hr',
        communicatedToDoctor: true,
        communicatedAt: new Date(),
        acknowledgedByDoctor: false,
      };

      // Notify ordering doctor STAT (critical priority bypasses the daily cap;
      // 'radiology' is the valid Notification.type — 'clinical_alert'/'high'
      // were not enum values and made this create throw).
      await createNotification({
        userId: order.doctorId.toString(),
        title: 'CRITICAL RADIOLOGY FINDING',
        message: `CRITICAL ALERT: ${order.modality} (${order.bodyPart}) for ${order.patientName}: ${order.criticalFinding.findingDetails}`,
        type: 'radiology',
        priority: 'critical',
        dedupKey: `rad-critical:${String(order._id)}`,
      }).catch(() => null);
    }

    await order.save();
    await auditLog('radiology_report_signed', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId, modality: order.modality,
      isCritical: Boolean(order.criticalFinding?.isCritical),
      versionsCount: order.reportVersions?.length || 1,
    });

    // Notify doctor regular report ready
    await createNotification({
      title: 'Radiology Report Ready', message: `${order.modality} report for ${order.patientName} is ready`,
      type: 'radiology', userId: order.doctorId.toString(),
      dedupKey: `rad-report:${String(order._id)}`,
    }).catch(() => null);
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Acknowledge Critical Finding (Ordering Doctor) ────────────────────────
router.put('/orders/:id/acknowledge-critical', protect, async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.criticalFinding?.isCritical) {
      return res.status(400).json({ message: 'No critical finding on this study' });
    }
    order.criticalFinding.acknowledgedByDoctor = true;
    order.criticalFinding.acknowledgedAt = new Date();
    await order.save();
    await auditLog('radiology_critical_acknowledged', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
    });
    res.json({ message: 'Critical finding acknowledged', order });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Escalate Critical Finding (§21) ───────────────────────────────────────
router.put('/orders/:id/critical/escalate', protect, authorize('radiology:write'), validate(radCriticalEscalateSchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.criticalFinding?.isCritical) {
      return res.status(400).json({ message: 'No critical finding on this study' });
    }
    order.criticalFinding.escalatedAt = new Date();
    order.criticalFinding.escalatedTo = req.body.escalatedTo;
    if (req.body.note) {
      order.criticalFinding.escalationNotes = [order.criticalFinding.escalationNotes, req.body.note].filter(Boolean).join('\n');
    }
    await order.save();
    await auditLog('radiology_critical_escalated', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
      escalatedTo: req.body.escalatedTo,
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Close Critical Finding (§21) ──────────────────────────────────────────
router.put('/orders/:id/critical/close', protect, authorize('radiology:write'), validate(radCriticalCloseSchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.criticalFinding?.isCritical) {
      return res.status(400).json({ message: 'No critical finding on this study' });
    }
    order.criticalFinding.closedAt = new Date();
    order.criticalFinding.closedBy = req.user._id;
    order.criticalFinding.outcome = req.body.outcome;
    await order.save();
    await auditLog('radiology_critical_closed', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
      outcome: req.body.outcome,
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Critical Findings Queue (§21) ─────────────────────────────────────────
// Open work = critical studies still awaiting doctor acknowledgement, OR
// un-escalated ones communicated >30 min ago (nobody has been paged yet).
router.get('/critical', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const filter = { 'criticalFinding.isCritical': true };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const rows = await Radiology.find(filter)
      .populate('patientId', 'name phone')
      .populate('doctorId', 'name')
      .sort({ 'criticalFinding.communicatedAt': -1 })
      .limit(200);
    const items = rows.filter((o) => {
      const cf = o.criticalFinding || {};
      if (cf.closedAt) return false;
      if (!cf.acknowledgedByDoctor) return true;
      return !cf.escalatedAt && cf.communicatedAt && new Date(cf.communicatedAt) < cutoff;
    });
    res.json({ critical: items, count: items.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Preparation Checklist Queue (§15) ─────────────────────────────────────
router.get('/preparation', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const filter = { status: { $in: ['Preparation Pending', 'Patient Arrived', 'On Hold'] } };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    const orders = await Radiology.find(filter)
      .populate('patientId', 'name phone')
      .sort({ createdAt: 1 })
      .limit(300);
    res.json({ orders, count: orders.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Update Preparation Checklist (§15) ────────────────────────────────────
router.put('/orders/:id/preparation', protect, authorize('radiology:write'), validate(radPreparationSchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const b = req.body;
    const prep = order.preparation || {};
    if (b.checklist) {
      const prev = new Map((prep.checklist || []).map((c) => [c.item, c]));
      prep.checklist = b.checklist.map((c) => {
        const old = prev.get(c.item);
        if (c.done && (!old || !old.done)) {
          return { item: c.item, done: true, doneAt: new Date(), doneBy: req.user._id };
        }
        return old || { item: c.item, done: Boolean(c.done), doneAt: c.done ? new Date() : undefined, doneBy: c.done ? req.user._id : undefined };
      });
    }
    if (b.missingInfo !== undefined) prep.missingInfo = b.missingInfo;
    if (b.consentTaken !== undefined) prep.consentTaken = b.consentTaken;
    if (b.hold !== undefined) {
      prep.hold = b.hold;
      prep.holdReason = b.hold ? (b.holdReason || '') : '';
    } else if (b.holdReason !== undefined) prep.holdReason = b.holdReason;
    if (b.ready !== undefined) {
      prep.ready = b.ready;
      prep.readyAt = b.ready ? new Date() : undefined;
    }
    order.preparation = prep;
    // ready:true promotes the order into the imaging queue (unless it is
    // already past preparation); hold:true pauses it.
    if (b.ready === true && !['In Progress', ...RAD_REPORTING_STATUSES, 'Cancelled'].includes(order.status)) {
      order.status = 'Ready for Imaging';
    } else if (b.hold === true && !['In Progress', ...RAD_REPORTING_STATUSES, 'Cancelled'].includes(order.status)) {
      order.status = 'On Hold';
    }
    await order.save();
    await auditLog('radiology_preparation_updated', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
      ready: Boolean(prep.ready), hold: Boolean(prep.hold),
      consentTaken: Boolean(prep.consentTaken),
      missingInfoCount: (prep.missingInfo || []).length,
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Contrast Administration Record (§10 CT) ───────────────────────────────
router.put('/orders/:id/contrast', protect, authorize('radiology:write'), validate(radContrastSchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const b = req.body;
    order.contrast = {
      agent: b.agent ?? order.contrast?.agent ?? '',
      volumeMl: b.volumeMl ?? order.contrast?.volumeMl,
      route: b.route ?? order.contrast?.route ?? '',
      givenAt: b.givenAt ? new Date(b.givenAt) : (order.contrast?.givenAt || new Date()),
      givenBy: req.user._id,
      reaction: b.reaction ?? order.contrast?.reaction ?? '',
    };
    await order.save();
    await auditLog('radiology_contrast_recorded', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
      agent: order.contrast.agent, volumeMl: order.contrast.volumeMl, route: order.contrast.route,
    });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Modality Master (MRI, CT, X-Ray Machines & Rooms) ────────────────────
router.get('/modalities', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const modalities = await ImagingModality.find(filter).sort({ modalityType: 1, name: 1 });
    res.json({ modalities });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/modalities/:id', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const item = await ImagingModality.findOne(filter)
      .populate('assignedStaff', 'name email role')
      .populate('assignedEquipment', 'name type serialNumber');
    if (!item) return res.status(404).json({ message: 'Modality not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/modalities', protect, authorize('radiology:write'), validate(radModalityCreateSchema), async (req, res) => {
  try {
    const b = req.body;
    const item = await ImagingModality.create({
      hospitalId: req.user.hospitalId || undefined,
      name: b.name, code: b.code, modalityType: b.modalityType,
      roomNumber: b.roomNumber, machineModel: b.machineModel, manufacturer: b.manufacturer,
      dicomAETitle: b.dicomAETitle, dicomPort: b.dicomPort, slotDurationMinutes: b.slotDurationMinutes,
      requiresContrastScreening: b.requiresContrastScreening, requiresImplantCheck: b.requiresImplantCheck,
      status: b.status,
      supportedStudies: b.supportedStudies, prepRules: b.prepRules, reportTemplates: b.reportTemplates,
      price: b.price, insuranceRate: b.insuranceRate, workingHours: b.workingHours,
      maintenanceScheduleDays: b.maintenanceScheduleDays,
      assignedStaff: b.assignedStaff, assignedEquipment: b.assignedEquipment || null,
    });
    await auditLog('imaging_modality_created', req.user._id, { modalityId: String(item._id), code: b.code, name: b.name });
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/modalities/:id', protect, authorize('radiology:write'), validate(radModalityUpdateSchema), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const item = await ImagingModality.findOne(filter);
    if (!item) return res.status(404).json({ message: 'Modality not found' });
    if (item.status === 'Inactive') {
      return res.status(400).json({ message: 'Cannot update a deleted modality' });
    }
    const allowedKeys = [
      'name', 'code', 'modalityType', 'roomNumber', 'machineModel', 'manufacturer',
      'dicomAETitle', 'dicomPort', 'slotDurationMinutes', 'requiresContrastScreening',
      'requiresImplantCheck', 'status', 'supportedStudies', 'prepRules', 'reportTemplates',
      'price', 'insuranceRate', 'workingHours', 'maintenanceScheduleDays',
      'assignedStaff', 'assignedEquipment', 'isActive', 'dailyCapacity',
    ];
    const before = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        before[key] = item.get(key);
        item.set(key, key === 'assignedEquipment' ? (req.body[key] || null) : req.body[key]);
      }
    }
    await item.save();
    await auditLog('imaging_modality_updated', req.user._id, {
      modalityId: String(item._id), code: item.code, name: item.name,
      before, after: req.body,
    });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Soft delete: master rows are referenced by studies/appointments, so they
// are retired (status='Inactive') rather than dropped.
router.delete('/modalities/:id', protect, authorize('radiology:write'), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const item = await ImagingModality.findOne(filter);
    if (!item) return res.status(404).json({ message: 'Modality not found' });
    if (item.status !== 'Inactive') {
      item.status = 'Inactive';
      item.isActive = false;
      await item.save();
    }
    await auditLog('imaging_modality_deleted', req.user._id, {
      modalityId: String(item._id), code: item.code, name: item.name, soft: true,
    });
    res.json({ message: 'Modality deactivated', modality: item });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Imaging Appointments (§7 scheduling) ──────────────────────────────────
// authorize() is permission-based (no role-name args), so reception/front-desk
// reach these once their roles carry radiology:read / radiology:write.
const RAD_APPT_ACTIVE = ['Booked', 'Confirmed', 'Arrived'];

router.get('/appointments', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (req.query.from || req.query.to) {
      filter.scheduledStart = {};
      if (req.query.from) filter.scheduledStart.$gte = new Date(req.query.from);
      if (req.query.to) filter.scheduledStart.$lte = new Date(req.query.to);
    }
    if (req.query.modalityType && req.query.modalityType !== 'All') filter.modalityType = req.query.modalityType;
    if (req.query.machineId) filter.machineId = req.query.machineId;
    if (req.query.status && req.query.status !== 'All') filter.status = req.query.status;
    const appointments = await ImagingAppointment.find(filter)
      .populate('patientId', 'name phone')
      .populate('machineId', 'name code roomNumber')
      .populate('technicianId', 'name')
      .populate('radiologistId', 'name')
      .sort({ scheduledStart: 1 })
      .limit(500);
    res.json({ appointments });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/appointments', protect, authorize('radiology:write'), validate(radAppointmentCreateSchema), async (req, res) => {
  try {
    const b = req.body;
    const hospitalId = req.user.hospitalId || undefined;
    let machine = null;
    if (b.machineId) {
      machine = await ImagingModality.findById(b.machineId);
      if (!machine) return res.status(404).json({ message: 'Machine not found' });
    }
    const slotMinutes = Number(b.slotMinutes || machine?.slotDurationMinutes || 30);
    const start = new Date(b.scheduledStart);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid scheduledStart' });
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);
    // Double-booking guard: same machine, overlapping active slot → 409.
    if (b.machineId) {
      const clash = await ImagingAppointment.findOne({
        machineId: b.machineId,
        status: { $in: RAD_APPT_ACTIVE },
        scheduledStart: { $lt: end },
        scheduledEnd: { $gt: start },
      });
      if (clash) {
        return res.status(409).json({
          message: `Machine already booked ${clash.appointmentNo ? `(${clash.appointmentNo}) ` : ''}from ${clash.scheduledStart.toISOString()} to ${clash.scheduledEnd.toISOString()}`,
          conflict: { appointmentNo: clash.appointmentNo, scheduledStart: clash.scheduledStart, scheduledEnd: clash.scheduledEnd },
        });
      }
    }
    const appointment = await ImagingAppointment.create({
      hospitalId,
      appointmentNo: generateTimestampedId('IMG'),
      radiologyOrderId: b.radiologyOrderId || null,
      patientId: b.patientId,
      modalityType: b.modalityType,
      machineId: b.machineId || null,
      room: b.room || machine?.roomNumber || '',
      scheduledStart: start,
      scheduledEnd: end,
      slotMinutes,
      technicianId: b.technicianId || null,
      radiologistId: b.radiologistId || null,
      slotType: b.slotType || 'Regular',
      waitlistRank: b.waitlistRank ?? null,
      notes: b.notes || '',
      createdBy: req.user._id,
    });
    // Reflect the booking on the linked order (front-desk books before the
    // technologist touches it; never yank an In Progress order backwards).
    if (b.radiologyOrderId) {
      await Radiology.updateOne(
        { _id: b.radiologyOrderId, status: { $nin: ['In Progress', 'Study Completed', 'Completed', 'Reporting Pending', 'Reported', 'Report Finalized', 'Report Released', 'Delivered', 'Cancelled'] } },
        { $set: { scheduledAt: start, status: 'Scheduled' } },
      ).catch(() => null);
    }
    await auditLog('radiology_appointment_booked', req.user._id, {
      resourceType: 'ImagingAppointment', resourceId: String(appointment._id),
      appointmentNo: appointment.appointmentNo, modalityType: appointment.modalityType,
      machineId: b.machineId || null, scheduledStart: start, scheduledEnd: end,
    });
    res.status(201).json(appointment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/appointments/:id', protect, authorize('radiology:write'), validate(radAppointmentUpdateSchema), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const appointment = await ImagingAppointment.findOne(filter);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const b = req.body;
    const before = { scheduledStart: appointment.scheduledStart, status: appointment.status };
    if (b.status) appointment.status = b.status;
    if (b.scheduledStart) {
      const start = new Date(b.scheduledStart);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid scheduledStart' });
      const slotMinutes = Number(b.slotMinutes || appointment.slotMinutes || 30);
      const end = new Date(start.getTime() + slotMinutes * 60 * 1000);
      if (appointment.machineId) {
        const clash = await ImagingAppointment.findOne({
          _id: { $ne: appointment._id },
          machineId: appointment.machineId,
          status: { $in: RAD_APPT_ACTIVE },
          scheduledStart: { $lt: end },
          scheduledEnd: { $gt: start },
        });
        if (clash) {
          return res.status(409).json({
            message: `Machine already booked ${clash.appointmentNo ? `(${clash.appointmentNo}) ` : ''}from ${clash.scheduledStart.toISOString()} to ${clash.scheduledEnd.toISOString()}`,
          });
        }
      }
      appointment.scheduledStart = start;
      appointment.scheduledEnd = end;
      if (b.slotMinutes) appointment.slotMinutes = slotMinutes;
      if (appointment.status === 'Booked' && !b.status) appointment.status = 'Rescheduled';
    } else if (b.slotMinutes) {
      appointment.slotMinutes = b.slotMinutes;
      appointment.scheduledEnd = new Date(appointment.scheduledStart.getTime() + b.slotMinutes * 60 * 1000);
    }
    if (b.technicianId !== undefined) appointment.technicianId = b.technicianId || null;
    if (b.radiologistId !== undefined) appointment.radiologistId = b.radiologistId || null;
    if (b.room !== undefined) appointment.room = b.room;
    if (b.notes !== undefined) appointment.notes = b.notes;
    await appointment.save();
    await auditLog(
      appointment.status === 'Cancelled' ? 'radiology_appointment_cancelled' : 'radiology_appointment_rescheduled',
      req.user._id,
      {
        resourceType: 'ImagingAppointment', resourceId: String(appointment._id),
        appointmentNo: appointment.appointmentNo, before,
        after: { scheduledStart: appointment.scheduledStart, status: appointment.status },
        reason: b.reason || undefined,
      },
    );
    res.json(appointment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Check-in (patient arrived at the modality desk) ───────────────────────
router.put('/appointments/:id/checkin', protect, authorize('radiology:write'), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const appointment = await ImagingAppointment.findOne(filter);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (['Cancelled', 'No Show', 'Completed'].includes(appointment.status)) {
      return res.status(400).json({ message: `Cannot check in an appointment in status '${appointment.status}'` });
    }
    appointment.status = 'Arrived';
    await appointment.save();
    if (appointment.radiologyOrderId) {
      await Radiology.updateOne(
        { _id: appointment.radiologyOrderId, status: { $in: ['Scheduled', 'Appointment Confirmed', 'Scheduling Pending'] } },
        { $set: { status: 'Patient Arrived' } },
      ).catch(() => null);
    }
    await auditLog('radiology_appointment_checked_in', req.user._id, {
      resourceType: 'ImagingAppointment', resourceId: String(appointment._id),
      appointmentNo: appointment.appointmentNo, patientId: String(appointment.patientId),
    });
    res.json(appointment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Availability for a day (§7): per-machine busy ranges ─────────────────
router.get('/schedule/availability', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const { modalityType, date, machineId } = req.query;
    if (!date) return res.status(400).json({ message: 'date (YYYY-MM-DD) is required' });
    const day = new Date(date);
    if (Number.isNaN(day.getTime())) return res.status(400).json({ message: 'Invalid date' });
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const machineFilter = { status: { $ne: 'Inactive' } };
    if (req.user.hospitalId && req.user.role !== 'superadmin') machineFilter.hospitalId = req.user.hospitalId;
    if (modalityType && modalityType !== 'All') machineFilter.modalityType = modalityType;
    if (machineId) machineFilter._id = machineId;
    const machines = await ImagingModality.find(machineFilter)
      .select('name code modalityType roomNumber slotDurationMinutes operatingHours workingHours status')
      .sort({ name: 1 });
    const apptFilter = { scheduledStart: { $gte: dayStart, $lte: dayEnd }, status: { $in: RAD_APPT_ACTIVE } };
    if (req.user.hospitalId && req.user.role !== 'superadmin') apptFilter.hospitalId = req.user.hospitalId;
    if (machineId) apptFilter.machineId = machineId;
    else if (modalityType && modalityType !== 'All') apptFilter.modalityType = modalityType;
    const appts = await ImagingAppointment.find(apptFilter)
      .select('machineId appointmentNo scheduledStart scheduledEnd slotMinutes status slotType patientId')
      .sort({ scheduledStart: 1 });
    const byMachine = {};
    for (const m of machines) {
      byMachine[String(m._id)] = {
        machineId: String(m._id), name: m.name, code: m.code, modalityType: m.modalityType,
        room: m.roomNumber, status: m.status,
        slotDurationMinutes: m.slotDurationMinutes,
        operatingHours: m.operatingHours, workingHours: m.workingHours,
        busy: [],
      };
    }
    for (const a of appts) {
      const key = String(a.machineId);
      if (!byMachine[key]) {
        byMachine[key] = { machineId: key, name: '', code: '', modalityType: a.modalityType, room: '', status: '', slotDurationMinutes: a.slotMinutes, busy: [] };
      }
      byMachine[key].busy.push({
        appointmentNo: a.appointmentNo, start: a.scheduledStart, end: a.scheduledEnd,
        slotMinutes: a.slotMinutes, status: a.status, slotType: a.slotType,
      });
    }
    return res.json({ date: dayStart.toISOString().slice(0, 10), machines: Object.values(byMachine) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// ─── Deliver Report ────────────────────────────────────────────────────────
router.put('/orders/:id/deliver', protect, async (req, res) => {
  try {
    const order = await Radiology.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    order.status = 'Delivered';
    await order.save();
    await auditLog('radiology_report_delivered', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId, modality: order.modality,
    });
    // Notify patient (controlled writer: dedup + cap + preference fanout)
    const { createNotification } = await import('../services/notificationService.js');
    await createNotification({
      title: 'Radiology Report Available', message: `Your ${order.modality} report is now available.`,
      type: 'radiology', userId: order.patientId.toString(),
      dedupKey: `rad-delivered:${String(order._id)}`,
    }).catch(() => null);
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.user.role === 'doctor') filter.doctorId = req.user.doctorProfileId;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    const total = await Radiology.countDocuments(filter);
    const pending = await Radiology.countDocuments({ ...filter, status: { $in: ['Ordered', 'Scheduled'] } });
    const inProgress = await Radiology.countDocuments({ ...filter, status: 'In Progress' });
    const completed = await Radiology.countDocuments({ ...filter, status: { $in: ['Completed', 'Reported', 'Delivered'] } });
    const reported = await Radiology.countDocuments({ ...filter, status: { $in: ['Reported', 'Delivered'] } });
    res.json({ total, pending, inProgress, completed, reported });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── File 22 P2-29: DICOM/PACS integration + radiation dose log ────────────
// The DicomClient speaks DIMSE over TCP to a local Orthanc (or any PACS).
// All network calls carry an 8s timeout inside the client, so a dead PACS
// degrades to a 503 here rather than hanging the RIS UI.

const dicomConfig = () => ({
  host: process.env.ORTHANC_HOST || 'localhost',
  port: Number(process.env.ORTHANC_PORT || 4242),
  aeTitle: process.env.ORTHANC_AE || 'RIS_AE',
  calledAe: process.env.ORTHANC_CALLED_AE || 'PACS_AE',
});

// C-ECHO: "is the PACS alive?" — powers the RIS connectivity badge.
// authz: role
router.get('/dicom/ping', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const { DicomClient } = await import('../lib/dicom.js');
    const client = new DicomClient(dicomConfig());
    const ok = await client.ping();
    return res.json({ reachable: ok, host: dicomConfig().host, port: dicomConfig().port });
  } catch (err) {
    return res.json({ reachable: false, error: err.message });
  }
});

// C-FIND worklist: studies waiting to be read (patient/accession filters).
// AUTHZ-B-06: this was the one route in the file carrying `protect` with no
// authorization decision (the coverage manifest's last `unclassified` gap).
// A worklist exposes patient identifiers, so the gate is the imaging
// permission (radiology:read — hospital_admin, radiologist, technician,
// doctor), not a bare auth. adminOnly previously locked every real
// radiologist out of their own worklist.
// authz: role
router.get('/dicom/worklist', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const { DicomClient } = await import('../lib/dicom.js');
    const client = new DicomClient(dicomConfig());
    const reachable = await client.ping();
    if (!reachable) return res.status(503).json({ message: 'PACS unreachable', studies: [] });
    const studies = await client.find({
      patientId: req.query.patientId || '',
      accessionNumber: req.query.accessionNumber || '',
      studyDate: req.query.studyDate || '',
    });
    return res.json({ studies, count: studies.length });
  } catch (err) {
    return res.status(502).json({ message: err.message, studies: [] });
  }
});

// Dose log: append-only (modality feed or manual entry for old devices).
// authz: role
// entering doses manually at the modality console).
router.post('/dose', protect, authorize('radiology:write', 'equipment:read'), async (req, res) => {
  try {
    const { default: DoseLog } = await import('../models/DoseLog.js');
    const b = req.body || {};
    // A dose field the modality sent as junk must land as null, not NaN:
    // NaN would poison the aggregate sums downstream.
    const num = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const row = await DoseLog.create({
      hospitalId: req.user.hospitalId || undefined,
      orderId: String(b.orderId || '').slice(0, 40),
      studyUid: String(b.studyUid || '').slice(0, 128),
      accessionNo: String(b.accessionNo || '').slice(0, 40),
      patientId: b.patientId || null,
      modality: String(b.modality || '').slice(0, 12),
      bodyPart: String(b.bodyPart || '').slice(0, 80),
      dapGycm2: num(b.dapGycm2),
      doseGy: num(b.doseGy),
      dlpMgycm: num(b.dlpMgycm),
      exposureMs: num(b.exposureMs),
      ctvolCm3: num(b.ctvolCm3),
      deviceAe: String(b.deviceAe || '').slice(0, 16),
      operatorId: req.user._id,
      at: b.at ? new Date(b.at) : new Date(),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// Dose audit over a period: total events + per-modality exposure.
// authz: role
router.get('/dose', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const { default: DoseLog } = await import('../models/DoseLog.js');
    const match = {};
    if (req.user.hospitalId) match.hospitalId = req.user.hospitalId;
    if (req.query.from || req.query.to) {
      match.at = {};
      if (req.query.from) match.at.$gte = new Date(req.query.from);
      if (req.query.to) match.at.$lte = new Date(req.query.to);
    }
    if (req.query.modality) match.modality = String(req.query.modality).toUpperCase();
    const rows = await DoseLog.find(match).sort({ at: -1 }).limit(500).lean();
    const byModality = {};
    let totalDap = 0;
    let totalDlp = 0;
    for (const r of rows) {
      const k = r.modality || 'unknown';
      byModality[k] = (byModality[k] || 0) + 1;
      if (r.dapGycm2 != null) totalDap += r.dapGycm2;
      if (r.dlpMgycm != null) totalDlp += r.dlpMgycm;
    }
    return res.json({
      count: rows.length, byModality,
      totals: { dapGycm2: Math.round(totalDap * 100) / 100, dlpMgycm: Math.round(totalDlp * 100) / 100 },
      rows,
    });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// PACS viewer integration (Orthanc + OHIF/Cornerstone stub): returns a ready
// viewer deep-link for a study. The actual pixel-render lives in OHIF (a
// separate deploy) — the RIS's job is to hand the radiologist a URL that
// opens the exact study, so this endpoint only BUILDS that URL and reports
// which viewer flavour is configured. When no OHIF base is configured it
// falls back to Orthanc's built-in viewer, so a single-PACS small hospital
// still gets a working link without an OHIF stack.
// authz: role
router.get('/dicom/viewer-url', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const studyUid = String(req.query.studyUid || '').trim();
    if (!studyUid) return res.status(400).json({ message: 'studyUid is required' });
    const ohifBase = (process.env.OHIF_URL || '').replace(/\/+$/, '');
    const orthancBase = (process.env.ORTHANC_HTTP_URL || `http://${dicomConfig().host}:${process.env.ORTHANC_HTTP_PORT || 8042}`).replace(/\/+$/, '');
    if (ohifBase) {
      return res.json({ viewer: 'ohif', url: `${ohifBase}/viewer?StudyInstanceUIDs=${encodeURIComponent(studyUid)}` });
    }
    return res.json({
      viewer: 'orthanc',
      url: `${orthancBase}/viewer?StudyInstanceUID=${encodeURIComponent(studyUid)}`,
      note: 'OHIF_URL not configured — using Orthanc built-in viewer',
    });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// ─── DICOM study info for an order (§19, frontend RIS list) ────────────────
// Reports what the RIS knows about the PACS study linked to an order; when no
// study was ever linked it falls back to the uploaded imageUrls so the UI can
// still render a row instead of an empty state.
router.get('/dicom/studies', protect, authorize('radiology:read'), async (req, res) => {
  try {
    const orderId = String(req.query.orderId || '').trim();
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });
    const order = await Radiology.findById(orderId).select('orderId studyNumber studyUid dicomStudy imageUrls modality bodyPart status patientName');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const ds = order.dicomStudy || {};
    const studyUid = order.studyUid || ds.studyUid || '';
    const imageCount = (order.imageUrls || []).length;
    return res.json({
      orderId: order._id, orderNumber: order.orderId, studyNumber: order.studyNumber,
      modality: order.modality, bodyPart: order.bodyPart, status: order.status,
      studyUid,
      seriesCount: ds.seriesCount || (imageCount ? imageCount : 0),
      imageCount,
      transferStatus: ds.transferStatus || (studyUid ? 'Completed' : ''),
      storageStatus: ds.storageStatus || '',
      linkedAt: ds.linkedAt || null,
    });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// ─── Link a PACS study to an order (§19) ───────────────────────────────────
router.post('/dicom/link', protect, authorize('radiology:write'), validate(radDicomLinkSchema), async (req, res) => {
  try {
    const { orderId, studyUid, seriesCount } = req.body;
    const order = await Radiology.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    order.studyUid = studyUid;
    order.dicomStudy = {
      ...(order.dicomStudy?.toObject?.() || order.dicomStudy || {}),
      studyUid,
      seriesCount: seriesCount ?? order.dicomStudy?.seriesCount ?? (order.imageUrls?.length || 0),
      transferStatus: order.dicomStudy?.transferStatus || 'Pending',
      storageStatus: order.dicomStudy?.storageStatus || '',
      linkedAt: new Date(),
      linkedBy: req.user._id,
    };
    await order.save();
    await auditLog('radiology_dicom_linked', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId, studyUid,
    });
    res.json(order);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// ─── Retry a failed transfer (§19): flip transferStatus back to Pending ────
router.post('/dicom/retry', protect, authorize('radiology:write'), validate(radDicomRetrySchema), async (req, res) => {
  try {
    const order = await Radiology.findById(req.body.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!order.studyUid && !order.dicomStudy?.studyUid) {
      return res.status(400).json({ message: 'No study linked to this order — link a study first' });
    }
    order.dicomStudy = {
      ...(order.dicomStudy?.toObject?.() || order.dicomStudy || {}),
      studyUid: order.dicomStudy?.studyUid || order.studyUid,
      transferStatus: 'Pending',
    };
    await order.save();
    await auditLog('radiology_dicom_retry', req.user._id, {
      resourceType: 'Radiology', resourceId: String(order._id), orderId: order.orderId,
    });
    res.json(order);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

export default router;