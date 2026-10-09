import express from 'express';
import { z } from 'zod';
import Bed from '../models/Bed.js';
import Admission from '../models/Admission.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, clinicalStaffOnly, authorize } from '../middleware/auth.js';
import { validate, createAdmissionSchema } from '../utils/validate.js';
import { generateAdmissionId, generate16DigitId } from '../utils/idGenerator.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const ipdBedSchema = z.object({
  bedNumber: z.string().trim().min(1).max(40).optional(),
  ward: z.string().trim().max(80).optional(),
  room: z.string().trim().max(80).optional(),
  type: z.string().trim().max(80).optional(),
  status: z.enum(['Available', 'Occupied', 'Maintenance', 'Reserved']).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();
const ipdDischargeSchema = z.object({ dischargeSummary: z.string().optional(), isInfectionCase: z.boolean().optional() });
const ipdClinicalSchema = z.object({
  vitals: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  notes: z.string().trim().max(4000).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
}).strict();

const router = express.Router();

// ─── Bed Management ────────────────────────────────────────────────────────
router.get('/beds', protect, async (req, res) => {
  try {
    const { ward, status } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (ward && ward !== 'All') filter.ward = ward;
    if (status && status !== 'All') filter.status = status;
    const beds = await Bed.find(filter).sort({ bedNumber: 1 });
    res.json({ beds });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/beds', protect, adminOnly, validate(ipdBedSchema), async (req, res) => {
  try {
    // §13.8: validated schema is already strict — still pick explicitly so a
    // future field addition cannot smuggle hospitalId/status/tenant keys.
    const { pickBody } = await import('../utils/pick.js');
    const bed = await Bed.create({
      ...pickBody(req.body, ['bedNumber', 'ward', 'room', 'type', 'status', 'notes']),
      hospitalId: req.user.hospitalId || undefined,
    });
    res.status(201).json(bed);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/beds/:id', protect, validate(ipdBedSchema), async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.id);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && bed.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // AUTH-030: allowlisted fields only — bedNumber/occupancy/tenant linkage immutable here.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(bed, pickBody(req.body, ['ward', 'bedType', 'dailyRate', 'floor', 'isAC']));
    await bed.save();
    res.json(bed);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Admission ─────────────────────────────────────────────────────────────
router.post('/admissions', protect, adminOnly, validate(createAdmissionSchema), async (req, res) => {
  try {
    // RIDE-B-17 (partial): the bed scope below was `{ hospitalId: undefined }`
    // for a tenant-less caller, which Mongoose strips — degrading to a GLOBAL
    // bed lookup. A non-superadmin with no linked hospital is refused outright.
    if (req.user.role !== 'superadmin' && !req.user.hospitalId) {
      return res.status(403).json({ message: 'No hospital linked to this account' });
    }
    const { patientId, patientName, bedId: reqBedId, primaryDiagnosis, source, attendantName, attendantPhone, estimatedStay, admissionNotes, priority } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });

    const admissionId = generateAdmissionId();
    let bedData = null;
    let bedId = reqBedId;

    // Auto-assign bed based on priority/severity if not provided
    if (!bedId && priority) {
      // RIDE-B-17: this auto-assign query was GLOBAL (first available bed anywhere),
      // so a patient of hospital A could be admitted into - and block - a bed of
      // hospital B. Bed lookup is scoped to the caller's hospital now.
      const bedScope = req.user.role === 'superadmin' ? {} : { hospitalId: req.user.hospitalId };
      const priorityBed = await Bed.findOne({
        ...bedScope,
        status: 'Available',
        ward: priority === 'Critical' || priority === 'Emergency' ? 'ICU' : 
              priority === 'Urgent' ? { $in: ['Private', 'Semi-Private'] } : 
              { $ne: 'ICU' }
      }).sort({ bedNumber: 1 });
      if (priorityBed) {
        bedData = priorityBed;
        bedId = priorityBed._id;
      }
    }

    if (bedId && !bedData) {
      // RIDE-B-17: a client-supplied bedId must belong to the caller's hospital.
      bedData = req.user.role === 'superadmin'
        ? await Bed.findById(bedId)
        : await Bed.findOne({ _id: bedId, hospitalId: req.user.hospitalId });
      if (!bedData || bedData.status !== 'Available') return res.status(400).json({ message: 'Bed not available' });
    }

    const admission = await Admission.create({
      admissionId, patientId, patientName,
      bedId: bedData?._id, bedNumber: bedData?.bedNumber, ward: bedData?.ward,
      hospitalId: req.user.hospitalId || undefined,
      admittedBy: req.user._id, admittingDoctor: req.user.name,
      primaryDiagnosis: primaryDiagnosis || '', source: source || 'OPD',
      attendantName: attendantName || '', attendantPhone: attendantPhone || '',
      estimatedStay: estimatedStay || 0, admissionNotes: admissionNotes || '',
      status: 'Admitted',
    });

    if (bedData) {
      bedData.status = 'Occupied';
      bedData.currentPatientId = patientId;
      bedData.currentPatientName = patientName;
      bedData.admissionId = admission._id;
      bedData.occupiedSince = new Date();
      await bedData.save();
    }

    res.status(201).json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/admissions', protect, async (req, res) => {
  try {
    const { status, search, patientId } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (patientId) {
      filter.patientId = patientId;
    }
    if (search) {
      filter.$or = [
        { admissionId: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { admittingDoctor: new RegExp(escapeRegex(capSearch(search)), 'i') },
      ];
    }
    const admissions = await Admission.find(filter).populate('patientId', 'name email phone').sort({ createdAt: -1 });
    res.json({ admissions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/admissions/:id', protect, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id).populate('patientId', 'name email phone');
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(admission);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Discharge ─────────────────────────────────────────────────────────────
router.put('/admissions/:id/discharge', protect, adminOnly, validate(ipdDischargeSchema), async (req, res) => {
  try {
    const { dischargeSummary, isInfectionCase } = req.body;
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    admission.status = 'Discharged';
    admission.dischargeSummary = dischargeSummary || '';
    admission.dischargedAt = new Date();
    admission.dischargedBy = req.user._id;
    await admission.save();

    // Free bed
    if (admission.bedId) {
      await Bed.findByIdAndUpdate(admission.bedId, {
        status: 'Under Cleaning', currentPatientId: null, currentPatientName: null,
        admissionId: null, occupiedSince: null,
      });
    }

    // Auto-create housekeeping task on discharge
    const Housekeeping = (await import('../models/Housekeeping.js')).default;
    const taskType = isInfectionCase ? 'Terminal Cleaning (Infection)' : 'Routine Cleaning';
    const taskId = `HSK-${generate16DigitId()}`;
    await Housekeeping.create({
      taskId,
      admissionId: admission._id,
      bedNumber: admission.bedNumber,
      ward: admission.ward,
      room: admission.bedNumber,
      hospitalId: admission.hospitalId || undefined,
      type: taskType,
      priority: isInfectionCase ? 'High' : 'Normal',
      status: 'Pending',
      checklist: {
        bedStrip: false, mattressClean: false, pillowClean: false, blanketChange: false,
        mopFloor: false, disinfectSurfaces: false, bathroomClean: false,
        curtainsWash: isInfectionCase || false, wasteDisposal: false, finalInspection: false,
      },
      isInfectionCase: isInfectionCase || false,
    });

    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Clinical Charting ─────────────────────────────────────────────────────
router.post('/admissions/:id/vitals', protect, clinicalStaffOnly, validate(ipdClinicalSchema), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    admission.vitals.push({ ...req.body, recordedBy: req.user.name });
    await admission.save();
    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/admissions/:id/mar', protect, clinicalStaffOnly, validate(ipdClinicalSchema), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    admission.mar.push({ ...req.body, administeredBy: req.user.name });
    await admission.save();
    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/admissions/:id/io', protect, clinicalStaffOnly, validate(ipdClinicalSchema), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    admission.ioChart.push({ ...req.body, recordedBy: req.user.name });
    await admission.save();
    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/admissions/:id/nursing-notes', protect, clinicalStaffOnly, validate(ipdClinicalSchema), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    admission.nursingNotes.push({ ...req.body, nurseName: req.user.name });
    await admission.save();
    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// F10: doctor-notes was adminOnly — doctors must be able to write them.
const clinicianOnly = (req, res, next) => {
  if (!['superadmin', 'hospital_admin', 'doctor', 'clinic_doctor'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Clinician access required' });
  }
  return next();
};

router.post('/admissions/:id/doctor-notes', protect, clinicianOnly, validate(ipdClinicalSchema), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    admission.doctorNotes.push({ ...req.body, doctorName: req.user.name });
    await admission.save();
    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/admissions/:id/wound-care', protect, clinicalStaffOnly, validate(ipdClinicalSchema), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    admission.woundCare.push({ ...req.body, performedBy: req.user.name });
    await admission.save();
    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Deposits (F2/IPD advance ledger) ───────────────────────────────────────
router.get('/admissions/:id/deposits', protect, authorize('billing:read'), async (req, res) => {
  try {
    const { default: IpdDeposit } = await import('../models/IpdDeposit.js');
    const rows = await IpdDeposit.find({ admissionId: req.params.id }).sort({ createdAt: 1 }).lean();
    const balance = rows.reduce((s, d) => s + (d.type === 'Receive' ? d.amount : -d.amount), 0);
    res.json({ deposits: rows, balance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/admissions/:id/deposits', protect, adminOnly, async (req, res) => {
  try {
    const { type, amount, mode, remarks, receiptNo } = req.body || {};
    if (!['Receive', 'Adjust', 'Refund'].includes(type) || !(Number(amount) > 0)) {
      return res.status(400).json({ message: 'type=Receive|Adjust|Refund + amount>0 required' });
    }
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { default: IpdDeposit } = await import('../models/IpdDeposit.js');
    const row = await IpdDeposit.create({
      admissionId: admission._id, patientId: admission.patientId, hospitalId: admission.hospitalId,
      type, amount: Number(amount), mode: mode || 'Cash', remarks: String(remarks || '').slice(0, 500),
      receiptNo: receiptNo || `RCPT-${Date.now().toString(36).toUpperCase()}`,
      createdBy: req.user._id,
    });
    res.status(201).json(row);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Bed transfer (F8) ──────────────────────────────────────────────────────
router.post('/admissions/:id/transfer', protect, adminOnly, async (req, res) => {
  try {
    const { toBedId, reason } = req.body || {};
    if (!toBedId) return res.status(400).json({ message: 'toBedId required' });
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const toBed = await Bed.findById(toBedId);
    if (!toBed || toBed.status !== 'Available') {
      return res.status(409).json({ message: 'Target bed is not available' });
    }
    const { default: BedTransfer } = await import('../models/BedTransfer.js');
    await BedTransfer.create({
      admissionId: admission._id, patientId: admission.patientId, hospitalId: admission.hospitalId,
      fromBedId: admission.bedId || null, toBedId: toBed._id,
      fromWard: admission.ward || '', toWard: toBed.ward || '',
      reason: String(reason || '').slice(0, 500), orderedBy: req.user._id,
    });
    if (admission.bedId) {
      await Bed.findByIdAndUpdate(admission.bedId, { status: 'Under Cleaning', currentPatientId: null, admissionId: null });
    }
    admission.bedId = toBed._id;
    admission.bedNumber = toBed.bedNumber;
    admission.ward = toBed.ward;
    admission.status = 'Transferred';
    await admission.save();
    toBed.status = 'Occupied';
    toBed.currentPatientId = admission.patientId;
    toBed.admissionId = admission._id;
    await toBed.save();
    res.json(admission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Running bill (pending charges + deposit balance) ───────────────────────
router.get('/admissions/:id/running-bill', protect, authorize('billing:read'), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const [{ default: ChargeItem }, { default: IpdDeposit }] = await Promise.all([
      import('../models/ChargeItem.js'), import('../models/IpdDeposit.js'),
    ]);
    const [charges, deposits] = await Promise.all([
      ChargeItem.find({ admissionId: admission._id, status: 'Pending' }).lean(),
      IpdDeposit.find({ admissionId: admission._id }).lean(),
    ]);
    const charged = charges.reduce((s, c) => s + (c.amount || 0), 0);
    const deposited = deposits.reduce((s, d) => s + (d.type === 'Receive' ? d.amount : -d.amount), 0);
    res.json({ admissionId: admission._id, charges, charged, deposited, balance: +(charged - deposited).toFixed(2) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Discharge workflow (F1/F3/F4 state machine) ────────────────────────────
const dischargeTenantCheck = async (req, admission) => {
  if (!admission) return 'Admission not found';
  if (req.user.hospitalId && req.user.role !== 'superadmin' && admission.hospitalId?.toString() !== req.user.hospitalId.toString()) {
    return 'Access denied';
  }
  return null;
};

router.post('/admissions/:id/discharge/initiate', protect, clinicianOnly, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    const { default: DischargeWorkflow } = await import('../models/DischargeWorkflow.js');
    let flow = await DischargeWorkflow.findOne({ admissionId: admission._id });
    if (flow && !['Cancelled'].includes(flow.state)) {
      return res.status(409).json({ message: `Discharge already ${flow.state}` });
    }
    const { type, summary } = req.body || {};
    flow = await DischargeWorkflow.findOneAndUpdate(
      { admissionId: admission._id },
      {
        $set: {
          patientId: admission.patientId, hospitalId: admission.hospitalId,
          state: 'Initiated', type: type || 'Normal', summary: summary || {},
        },
        $push: { approvals: { stage: 'Initiated', by: req.user._id, at: new Date(), remarks: '' } },
      },
      { new: true, upsert: true },
    );
    res.status(201).json(flow);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/admissions/:id/discharge/approve', protect, clinicianOnly, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    const { default: DischargeWorkflow, DISCHARGE_TRANSITIONS } = await import('../models/DischargeWorkflow.js');
    const flow = await DischargeWorkflow.findOne({ admissionId: admission._id });
    if (!flow) return res.status(404).json({ message: 'Discharge not initiated' });
    if (!DISCHARGE_TRANSITIONS[flow.state].includes('DoctorApproved')) {
      return res.status(409).json({ message: `Cannot approve from ${flow.state}` });
    }
    flow.state = 'DoctorApproved';
    flow.approvals.push({ stage: 'DoctorApproved', by: req.user._id, at: new Date(), remarks: String(req.body?.remarks || '') });
    await flow.save();
    res.json(flow);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/admissions/:id/discharge/clear/:stage', protect, async (req, res) => {
  try {
    const { stage } = req.params;
    const map = { nursing: 'NursingClear', pharmacy: 'PharmacyClear', billing: 'BillingClear' };
    if (!map[stage]) return res.status(400).json({ message: 'stage must be nursing|pharmacy|billing' });
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    const { default: DischargeWorkflow, DISCHARGE_TRANSITIONS } = await import('../models/DischargeWorkflow.js');
    const flow = await DischargeWorkflow.findOne({ admissionId: admission._id });
    if (!flow) return res.status(404).json({ message: 'Discharge not initiated' });
    if (!DISCHARGE_TRANSITIONS[flow.state].includes(map[stage])) {
      return res.status(409).json({ message: `Cannot clear ${stage} from ${flow.state}` });
    }
    flow.state = map[stage];
    flow.approvals.push({ stage: map[stage], by: req.user._id, at: new Date(), remarks: String(req.body?.remarks || '') });
    await flow.save();
    res.json(flow);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/admissions/:id/discharge/finalize', protect, adminOnly, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    const [{ default: DischargeWorkflow }, { default: ChargeItem }, { default: IpdDeposit }, { default: Billing }] = await Promise.all([
      import('../models/DischargeWorkflow.js'), import('../models/ChargeItem.js'),
      import('../models/IpdDeposit.js'), import('../models/Billing.js'),
    ]);
    const flow = await DischargeWorkflow.findOne({ admissionId: admission._id });
    if (!flow || flow.state !== 'BillingClear') {
      return res.status(409).json({ message: `Discharge must reach BillingClear first (now: ${flow?.state || 'none'})` });
    }
    const [charges, deposits] = await Promise.all([
      ChargeItem.find({ admissionId: admission._id, status: 'Pending' }),
      IpdDeposit.find({ admissionId: admission._id }),
    ]);
    const total = +charges.reduce((s, c) => s + (c.amount || 0), 0).toFixed(2);
    const deposited = deposits.reduce((s, d) => s + (d.type === 'Receive' ? d.amount : -d.amount), 0);
    const balance = +(total - deposited).toFixed(2);
    // Invariant: finalize fails if balance > 0 unless an approved waiver/credit covers it.
    const waiver = Number(req.body?.waiverAmount || 0);
    if (balance - waiver > 0.009) {
      return res.status(409).json({ message: `Outstanding balance ₹${balance}: collect, adjust deposit, or pass waiverAmount`, balance });
    }
    const bill = await Billing.create({
      invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`,
      patient: admission.patientName, patientId: admission.patientId,
      service: 'IPD Final Bill', source: 'ipd',
      services: charges.map((c) => ({ name: c.description, price: c.amount, quantity: c.qty || 1 })),
      hospitalId: admission.hospitalId,
      admissionId: admission._id, encounterId: admission.encounterId || undefined,
      billType: 'Final', amount: total, paid: deposited, balance: Math.max(0, balance),
      date: new Date().toISOString().slice(0, 10),
    });
    await ChargeItem.updateMany({ admissionId: admission._id, status: 'Pending' }, { $set: { status: 'Billed', billId: bill._id } });
    flow.state = 'Discharged';
    flow.finalBillId = bill._id;
    flow.approvals.push({ stage: 'Discharged', by: req.user._id, at: new Date(), remarks: '' });
    await flow.save();
    admission.status = 'Discharged';
    admission.dischargeSummary = flow.summary?.course || admission.dischargeSummary || '';
    admission.dischargedAt = new Date();
    admission.dischargedBy = req.user._id;
    await admission.save();
    if (admission.bedId) {
      await Bed.findByIdAndUpdate(admission.bedId, {
        status: 'Under Cleaning', currentPatientId: null, currentPatientName: null,
        admissionId: null, occupiedSince: null,
      });
    }
    const Housekeeping = (await import('../models/Housekeeping.js')).default;
    await Housekeeping.create({
      taskId: `HSK-${generate16DigitId()}`,
      admissionId: admission._id, bedNumber: admission.bedNumber, ward: admission.ward,
      room: admission.bedNumber, hospitalId: admission.hospitalId || undefined,
      type: 'Routine Cleaning', priority: 'Normal', status: 'Pending',
      checklist: { bedStrip: false, mattressClean: false, pillowClean: false, blanketChange: false, mopFloor: false, disinfectSurfaces: false, bathroomClean: false, curtainsWash: false, wasteDisposal: false, finalInspection: false },
      isInfectionCase: false,
    });
    res.json({ flow, bill, balance: Math.max(0, balance) });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Interim bill (bill-on-demand, admission stays open) ────────────────────
router.post('/admissions/:id/bills/interim', protect, authorize('billing:write'), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    if (admission.status !== 'Admitted' && admission.status !== 'Transferred') {
      return res.status(409).json({ message: `Admission is ${admission.status}` });
    }
    const [{ default: ChargeItem }, { default: Billing }] = await Promise.all([
      import('../models/ChargeItem.js'), import('../models/Billing.js'),
    ]);
    const charges = await ChargeItem.find({ admissionId: admission._id, status: 'Pending' });
    if (!charges.length) return res.status(409).json({ message: 'No pending charges' });
    const total = +charges.reduce((s, c) => s + (c.amount || 0), 0).toFixed(2);
    const bill = await Billing.create({
      invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`,
      patient: admission.patientName, patientId: admission.patientId,
      service: 'IPD Interim Bill', source: 'ipd',
      services: charges.map((c) => ({ name: c.description, price: c.amount, quantity: c.qty || 1 })),
      hospitalId: admission.hospitalId,
      admissionId: admission._id, encounterId: admission.encounterId || undefined,
      billType: 'Interim', amount: total, paid: 0, balance: total,
      date: new Date().toISOString().slice(0, 10),
    });
    await ChargeItem.updateMany({ admissionId: admission._id, status: 'Pending' }, { $set: { status: 'Billed', billId: bill._id } });
    res.status(201).json({ id: String(bill._id), amount: total });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Discharge summary PDF (from the structured workflow summary) ──────────
router.get('/admissions/:id/discharge/summary-pdf', protect, authorize('billing:read'), async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    const [{ default: DischargeWorkflow }, { generateDischargeSummaryPDF }] = await Promise.all([
      import('../models/DischargeWorkflow.js'), import('../services/pdfService.js'),
    ]);
    const flow = await DischargeWorkflow.findOne({ admissionId: admission._id }).lean();
    const s = flow?.summary || {};
    const pdf = await generateDischargeSummaryPDF({
      admissionId: admission.admissionId,
      dischargeDate: admission.dischargedAt || new Date(),
      admissionDate: admission.createdAt,
      patient: { name: admission.patientName },
      doctor: { name: admission.admittingDoctor },
      chiefComplaints: s.course || '',
      diagnosis: (s.diagnosis || []).join(', '),
      procedures: (s.procedures || []).join(', '),
      medications: (s.medicines || []).map((m) => `${m.drug || ''} ${m.dose || ''} ${m.freq || ''}`),
      advice: s.advice || '',
      followUp: s.followUp?.date || '',
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="discharge-${admission.admissionId}.pdf"`);
    res.send(pdf);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Ward rounds ────────────────────────────────────────────────────────────
router.post('/admissions/:id/rounds', protect, clinicianOnly, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    const { default: WardRound } = await import('../models/WardRound.js');
    const { soap, orders } = req.body || {};
    const round = await WardRound.create({
      admissionId: admission._id, patientId: admission.patientId, hospitalId: admission.hospitalId,
      doctorId: req.user._id, soap: soap || {}, orders: Array.isArray(orders) ? orders.slice(0, 50) : [],
    });
    res.status(201).json(round);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Shift handover (SBAR) ──────────────────────────────────────────────────
router.post('/handovers', protect, clinicalStaffOnly, async (req, res) => {
  try {
    const { wardId, shift, toNurse, sbar } = req.body || {};
    if (!['Morning', 'Evening', 'Night'].includes(shift)) {
      return res.status(400).json({ message: 'shift must be Morning|Evening|Night' });
    }
    const { default: ShiftHandover } = await import('../models/ShiftHandover.js');
    const h = await ShiftHandover.create({
      hospitalId: req.user.hospitalId, wardId: wardId || '', shift,
      fromNurse: req.user._id, toNurse: toNurse || null,
      sbar: Array.isArray(sbar) ? sbar.slice(0, 200) : [],
      createdBy: req.user._id,
    });
    res.status(201).json({ id: String(h._id) });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/handovers/:id/ack', protect, clinicalStaffOnly, async (req, res) => {
  try {
    const { default: ShiftHandover } = await import('../models/ShiftHandover.js');
    const h = await ShiftHandover.findById(req.params.id);
    if (!h) return res.status(404).json({ message: 'Not found' });
    h.ackAt = new Date();
    if (!h.toNurse) h.toNurse = req.user._id;
    await h.save();
    res.json({ id: String(h._id), ackAt: h.ackAt });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Consent forms ──────────────────────────────────────────────────────────
router.post('/admissions/:id/consents', protect, clinicianOnly, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    const denied = await dischargeTenantCheck(req, admission);
    if (denied) return res.status(denied === 'Access denied' ? 403 : 404).json({ message: denied });
    const { templateId, language, content, signedBy, signerName, witness, signatureImg } = req.body || {};
    const { default: ConsentForm } = await import('../models/ConsentForm.js');
    const c = await ConsentForm.create({
      hospitalId: admission.hospitalId, admissionId: admission._id, patientId: admission.patientId,
      templateId: templateId || 'other', language: language || 'en',
      content: String(content || '').slice(0, 10000),
      signedBy: signedBy === 'guardian' ? 'guardian' : 'patient',
      signerName: signerName || '', witness: witness || '', signatureImg: signatureImg || '',
      signedAt: signatureImg || signerName ? new Date() : null,
      createdBy: req.user._id,
    });
    res.status(201).json({ id: String(c._id) });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/consents/:id/revoke', protect, clinicianOnly, async (req, res) => {
  try {
    const { default: ConsentForm } = await import('../models/ConsentForm.js');
    const c = await ConsentForm.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });
    c.revokedAt = new Date();
    await c.save();
    res.json({ id: String(c._id), revokedAt: c.revokedAt });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Bed-charge accrual trigger (daily job; manual run for catch-up) ───────
router.post('/jobs/accrue-bed-charges', protect, adminOnly, async (req, res) => {
  try {
    const { runBedChargeAccrualOnce } = await import('../jobs/bedChargeAccrual.job.js');
    const result = await runBedChargeAccrualOnce({
      date: req.body?.date ? new Date(req.body.date) : new Date(),
      postedBy: req.user._id,
    });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const bedFilter = {};
    const admissionFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') {
      bedFilter.hospitalId = req.user.hospitalId;
      admissionFilter.hospitalId = req.user.hospitalId;
    }
    const totalBeds = await Bed.countDocuments(bedFilter);
    const available = await Bed.countDocuments({ status: 'Available', ...bedFilter });
    const occupied = await Bed.countDocuments({ status: 'Occupied', ...bedFilter });
    const cleaning = await Bed.countDocuments({ status: 'Under Cleaning', ...bedFilter });
    const maintenance = await Bed.countDocuments({ status: 'Maintenance', ...bedFilter });
    const totalAdmissions = await Admission.countDocuments(admissionFilter);
    const activePatients = await Admission.countDocuments({ status: 'Admitted', ...admissionFilter });
    res.json({ totalBeds, available, occupied, cleaning, maintenance, totalAdmissions, activePatients });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
