import express from 'express';
import { z } from 'zod';
import Bed from '../models/Bed.js';
import Admission from '../models/Admission.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createAdmissionSchema } from '../utils/validate.js';

const ipdBedSchema = z.object({}).passthrough();
const ipdDischargeSchema = z.object({ dischargeSummary: z.string().optional(), isInfectionCase: z.boolean().optional() });
const ipdClinicalSchema = z.object({}).passthrough();

const router = express.Router();

const generateAdmissionId = async () => {
  const count = await Admission.countDocuments();
  return `IPD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

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
    const bed = await Bed.create({ ...req.body, hospitalId: req.user.hospitalId || undefined });
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
    Object.assign(bed, req.body);
    await bed.save();
    res.json(bed);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Admission ─────────────────────────────────────────────────────────────
router.post('/admissions', protect, adminOnly, validate(createAdmissionSchema), async (req, res) => {
  try {
    const { patientId, patientName, bedId, primaryDiagnosis, source, attendantName, attendantPhone, estimatedStay, admissionNotes, priority } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });

    const admissionId = await generateAdmissionId();
    let bedData = null;

    // Auto-assign bed based on priority/severity if not provided
    if (!bedId && priority) {
      const priorityBed = await Bed.findOne({
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
      bedData = await Bed.findById(bedId);
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
        { admissionId: new RegExp(search, 'i') },
        { patientName: new RegExp(search, 'i') },
        { admittingDoctor: new RegExp(search, 'i') },
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
    const genId = async () => {
      const c = await Housekeeping.countDocuments();
      return `HSK-${new Date().getFullYear()}-${String(c + 1).padStart(5, '0')}`;
    };
    const taskId = await genId();
    const taskType = isInfectionCase ? 'Terminal Cleaning (Infection)' : 'Routine Cleaning';
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
router.post('/admissions/:id/vitals', protect, validate(ipdClinicalSchema), async (req, res) => {
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

router.post('/admissions/:id/mar', protect, validate(ipdClinicalSchema), async (req, res) => {
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

router.post('/admissions/:id/io', protect, validate(ipdClinicalSchema), async (req, res) => {
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

router.post('/admissions/:id/nursing-notes', protect, validate(ipdClinicalSchema), async (req, res) => {
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

router.post('/admissions/:id/doctor-notes', protect, adminOnly, validate(ipdClinicalSchema), async (req, res) => {
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

router.post('/admissions/:id/wound-care', protect, validate(ipdClinicalSchema), async (req, res) => {
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