import express from 'express';
import { z } from 'zod';
import { BloodUnit, BloodRequest } from '../models/BloodBank.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createBloodUnitSchema, createBloodRequestSchema } from '../utils/validate.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import logger from '../config/logger.js';
import { sendServerError } from '../utils/safeError.js';

const bloodIssueSchema = z.object({ unitIds: z.array(z.string()).optional() });
const bloodTransfuseSchema = z.object({ endTime: z.string().optional(), vitals: z.any().optional() });
const bloodStartTransfusionSchema = z.object({ startTime: z.string().optional(), nurseName: z.string().optional(), preBp: z.string().optional(), prePulse: z.number().optional(), preTemp: z.number().optional() });
const bloodReactionSchema = z.object({ reactionType: z.string().optional(), severity: z.string().optional(), symptoms: z.string().optional(), actionTaken: z.string().optional(), stopped: z.boolean().optional() });
const bloodCrossmatchSchema = z.object({ unitIds: z.array(z.string()).optional(), crossMatchResult: z.string().optional(), technician: z.string().optional(), patientGroup: z.string().optional(), donorUnitId: z.string().optional() });

const router = express.Router();

const genUnitId = () => generateTimestampedId('BLD');
const genReqId = () => generateTimestampedId('BRQ');

router.get('/units', protect, async (req, res) => {
  try {
    const { bloodGroup, status } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (bloodGroup && bloodGroup !== 'All') filter.bloodGroup = bloodGroup;
    if (status && status !== 'All') filter.status = status;
    const units = await BloodUnit.find(filter).sort({ createdAt: -1 });
    res.json({ units });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/units', protect, adminOnly, validate(createBloodUnitSchema), async (req, res) => {
  try {
    const unitId = genUnitId();
    const unit = await BloodUnit.create({ ...req.body, unitId, hospitalId: req.user.hospitalId || undefined });
    res.status(201).json(unit);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/requests', protect, validate(createBloodRequestSchema), async (req, res) => {
  try {
    const { patientId, patientName, bloodGroup, unitsRequired, reason, priority } = req.body;
    if (!patientId || !bloodGroup) return res.status(400).json({ message: 'Patient and blood group required' });
    const requestId = genReqId();
    const request = await BloodRequest.create({ requestId, patientId, patientName, doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name, bloodGroup, unitsRequired: unitsRequired || 1, reason, priority: priority || 'Routine', hospitalId: req.user.hospitalId || undefined, createdBy: req.user._id });
    res.status(201).json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/requests', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [{ requestId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') }, { bloodGroup: new RegExp(escapeRegex(capSearch(search)), 'i') }];
    const requests = await BloodRequest.find(filter).populate('patientId','name').sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/requests/:id/issue', protect, adminOnly, validate(bloodIssueSchema), async (req, res) => {
  try {
    const { unitIds } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.status = 'Issued';
    request.issuedUnits = unitIds || [];
    await request.save();
    if (unitIds) {
      await BloodUnit.updateMany({ _id: { $in: unitIds } }, { status: 'Issued', issuedTo: request.patientName, issuedAt: new Date(), issuedBy: req.user.name, requestId: request._id });
    }
    // Tech 04: atomic Redis guard — seed from Mongo count, then DECRBY. On
    // shortfall the Mongo issue above stands (source of truth) but ops gets
    // the inter-bank transfer signal from the warn log.
    try {
      const { seedBloodStock, reserveBloodUnits } = await import('../lib/clinicalState.js');
      const bank = String(request.hospitalId || req.user.hospitalId || 'default');
      const available = await BloodUnit.countDocuments({ status: 'Available', bloodGroup: request.bloodGroup });
      await seedBloodStock(bank, request.bloodGroup, available);
      await reserveBloodUnits(bank, request.bloodGroup, request.unitsRequired || (unitIds ? unitIds.length : 1));
    } catch {}
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/requests/:id/transfuse', protect, adminOnly, validate(bloodTransfuseSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.status = 'Completed';
    request.transfusionEndedAt = req.body.endTime ? new Date(req.body.endTime) : new Date();
    request.transfusionCompleteTime = request.transfusionEndedAt;
    if (req.body.vitals) request.reactionNotes = req.body.vitals;
    await request.save();
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Start Transfusion ──────────────────────────────────────────────────────
router.put('/requests/:id/start-transfusion', protect, adminOnly, validate(bloodStartTransfusionSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.status = 'Transfusing';
    request.transfusionStartedAt = req.body.startTime ? new Date(req.body.startTime) : new Date();
    request.transfusionNurse = req.body.nurseName || '';
    request.preTransfusionVitals = {
      bp: req.body.preBp || '',
      hr: req.body.prePulse ? Number(req.body.prePulse) : undefined,
      temp: req.body.preTemp ? Number(req.body.preTemp) : undefined,
    };
    await request.save();
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Report Transfusion Reaction ─────────────────────────────────────────────
router.put('/requests/:id/reaction', protect, adminOnly, validate(bloodReactionSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.reaction = true;
    request.reactionReported = true;
    request.reactionType = req.body.reactionType || 'Other';
    request.reactionSeverity = req.body.severity || 'Mild';
    request.reactionSymptoms = req.body.symptoms || '';
    request.reactionActionTaken = req.body.actionTaken || '';
    request.reactionStopped = req.body.stopped || false;
    request.status = 'Reaction';
    await request.save();
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Crossmatch Blood ───────────────────────────────────────────────────────
router.put('/requests/:id/crossmatch', protect, adminOnly, validate(bloodCrossmatchSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { unitIds, crossMatchResult, technician, patientGroup, donorUnitId } = req.body;
    
    // Compatibility validation
    if (unitIds && unitIds.length > 0) {
      const units = await BloodUnit.find({ _id: { $in: unitIds } });
      const incompatibleUnits = units.filter(u => {
        const patientGroup = request.bloodGroup;
        const unitGroup = u.bloodGroup;
        const compatibility = {
          'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
          'O+': ['O+', 'A+', 'B+', 'AB+'],
          'A-': ['A-', 'A+', 'AB-', 'AB+'],
          'A+': ['A+', 'AB+'],
          'B-': ['B-', 'B+', 'AB-', 'AB+'],
          'B+': ['B+', 'AB+'],
          'AB-': ['AB-', 'AB+'],
          'AB+': ['AB+'],
        };
        return !compatibility[unitGroup]?.includes(patientGroup);
      });
      if (incompatibleUnits.length > 0) {
        return res.status(400).json({ message: `Incompatible blood units detected: ${incompatibleUnits.map(u => u.unitId).join(', ')}` });
      }
    }
    
    request.status = 'Crossmatching';
    request.crossMatchResult = crossMatchResult || 'Compatible';
    request.crossMatchTechnician = technician || '';
    request.patientBloodGroup = patientGroup || request.bloodGroup;
    if (unitIds) request.issuedUnits = unitIds;
    await request.save();
    
    if (unitIds) {
      await BloodUnit.updateMany({ _id: { $in: unitIds } }, { crossMatchPatient: request.patientName, crossMatchResult: crossMatchResult || 'Compatible' });
    }
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const total = await BloodUnit.countDocuments(hFilter);
    const available = await BloodUnit.countDocuments({ status: 'Available', ...hFilter });
    const expired = await BloodUnit.countDocuments({ status: 'Expired', ...hFilter });
    const crossMatching = await BloodRequest.countDocuments({ status: 'Crossmatching', ...hFilter });
    const pending = await BloodRequest.countDocuments({ status: { $in: ['Pending','Crossmatching'] }, ...hFilter });
    const issued = await BloodRequest.countDocuments({ status: 'Issued', ...hFilter });
    const groups = await BloodUnit.aggregate([{ $match: { status: 'Available', ...hFilter } }, { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }]);
    res.json({ total, available, expired, crossMatching, pending, issued, groups });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Donor-directory opt-in ───
// Consent must be explicit, revocable, and scoped to the caller's OWN record.
// The directory route above now requires `isBloodDonor: true`, so without this
// endpoint there is no way to join it — the guard would simply make the feature
// dead. Self-only, so a caller cannot opt somebody else in.
router.put('/donor-opt-in', protect, async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const optIn = req.body?.optIn !== false;

    // Opting in without a usable blood group would create an unmatchable
    // directory entry, so the prerequisite is stated rather than silently
    // producing a donor nobody can find.
    if (optIn) {
      const me = await User.findById(req.user.id ?? req.user._id).select('bloodGroup').lean();
      if (!me?.bloodGroup) {
        return res.status(400).json({
          message: 'Set your blood group before joining the donor directory',
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id ?? req.user._id,
      {
        isBloodDonor: optIn,
        donorOptInAt: optIn ? new Date() : null,
      },
      { new: true }
    ).select('isBloodDonor donorOptInAt bloodGroup');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      isBloodDonor: user.isBloodDonor,
      donorOptInAt: user.donorOptInAt,
      bloodGroup: user.bloodGroup,
    });
  } catch (err) {
    logger.error(`Donor opt-in error: ${err.message}`);
    sendServerError(res, err, 'Could not update donor consent');
  }
});

// ─── H3 Resolution 7: Urgent Rare Blood Donor Search ───
// Finds certified donors radiating outward from patient/hospital H3 cell
router.get('/donors/nearby-h3', protect, async (req, res) => {
  try {
    const { lat, lng, bloodGroup, maxRings = 3 } = req.query;
    if (!lat || !lng || !bloodGroup) {
      return res.status(400).json({ message: 'lat, lng, and bloodGroup are required' });
    }

    const { latLngToCell, gridDisk } = await import('h3-js');
    const { calculateDistanceKm } = await import('../lib/geoUtils.js');
    const User = (await import('../models/User.js')).default;

    // Spec expansion-01A: real H3 k-ring filter (res 7, ~1.2km cells).
    const centerH3 = latLngToCell(Number(lat), Number(lng), 7);
    const k = Math.min(10, Math.max(0, Number(maxRings) || 3));
    const ringCells = new Set(k === 0 ? [centerH3] : gridDisk(centerH3, k));

    // Candidate donors: matching group, known live location (bounded scan).
    //
    // AUTHZ: `isBloodDonor: true` is REQUIRED, and it is the one predicate that
    // made this route safe. Without it the filter was `bloodGroup` +
    // `currentLocation` - two fields a patient record happens to carry - so the
    // response published the name, blood group and live GPS coordinates of any
    // signed-in user, to any caller, with no consent and no way to opt out.
    // Blood-group data is sensitive (it is a quasi-identifier), and pairing it
    // with a precise location is a targeting profile.
    //
    // This is also why `phone` is no longer selected below: it was fetched on
    // every candidate and never returned.
    const candidates = await User.find({
      isBloodDonor: true,
      bloodGroup: String(bloodGroup).trim(),
      'currentLocation.lat': { $ne: null },
      'currentLocation.lng': { $ne: null },
    })
      .select('name bloodGroup currentLocation loyalty')
      .limit(200)
      .lean();

    const donors = [];
    for (const d of candidates) {
      const dLat = Number(d.currentLocation?.lat);
      const dLng = Number(d.currentLocation?.lng);
      if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) continue;
      let cell = null;
      try {
        cell = latLngToCell(dLat, dLng, 7);
      } catch { continue; }
      if (!ringCells.has(cell)) continue;
      donors.push({
        id: d._id,
        name: d.name,
        bloodGroup: d.bloodGroup,
        tier: d.loyalty?.tier || 'Bronze',
        coordinates: { lat: dLat, lng: dLng },
        h3Index7: cell,
        distanceKm: Math.round(calculateDistanceKm(Number(lat), Number(lng), dLat, dLng) * 10) / 10,
      });
      if (donors.length >= 30) break;
    }
    donors.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      centerH3,
      bloodGroup,
      kRingsQueried: ringCells.size,
      donorsCount: donors.length,
      donors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;