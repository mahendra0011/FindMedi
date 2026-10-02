import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { applyTenantScope } from '../utils/tenantScope.js';
import express from 'express';
import { z } from 'zod';
import Medicine from '../models/Medicine.js';
import Billing from '../models/Billing.js';
import Prescription from '../models/Prescription.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import PharmacyOffer from '../models/PharmacyOffer.js';
import PharmacyReturn from '../models/PharmacyReturn.js';
import PharmacyStaff from '../models/PharmacyStaff.js';
import Facility from '../models/Facility.js';
import { latLngToCell } from 'h3-js';
import { calculateDistanceKm } from '../lib/geoUtils.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { authorizeObject, rolesWithPermission } from '../middleware/authorize.js';
// AUTHZ-M-01 migration: lazy model resolvers keep the existing dynamic-import
// shape (no new static model edges); every site below keeps its chain role
// gate, with actorRoles computed from the same permission matrix.
const lazyModel = (path) => () => import(path).then((m) => m.default);
import { publicSearchLimiter } from '../middleware/rateLimit.js';
import { validate, createMedicineSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generatePrescriptionId, generateTimestampedId } from '../utils/idGenerator.js';
import { paginatedResults } from '../utils/pagination.js';
// PAY-B-05: the order-refund route is a money mutation and opts into the replay
// guard, so a double-clicked "Refund" cannot issue two refunds.
import { idempotencyGuard } from '../middleware/idempotency.js';

const medicineUpdateSchema = z.object({}).passthrough();
const pharmacyStockSchema = z.object({ quantity: z.number(), type: z.enum(['add', 'deduct']) });
const prescriptionSchema = z.object({}).passthrough();
const pharmacyOrderSchema = z.object({}).passthrough();
const pharmacyDeliverySchema = z.object({}).passthrough();
const pharmacyOfferSchema = z.object({}).passthrough();
const pharmacyReturnSchema = z.object({}).passthrough();
const pharmacyStaffSchema = z.object({}).passthrough();
const pharmacyDispenseSchema = z.object({ medicineIndex: z.number().int().nonnegative() });

const router = express.Router();

// ─── Public Store Medicines (no auth required) ─────────────────────────────
// PHARMA-002: this stays public (it feeds the anonymous search funnel) but is
// rate-limited and returns a deliberately minimal projection — no stock
// quantities, no internal ids, no cost/price fields. Store-level *inventory
// counts* require auth and live behind the authenticated routes below.
router.get('/medicines/store/:storeId', publicSearchLimiter, async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = { facilityId: req.params.storeId, isActive: true };
    if (search) filter.$or = [
      { name: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { genericName: new RegExp(escapeRegex(capSearch(search)), 'i') },
    ];
    if (category && category !== 'All') filter.category = category;
    // Hard cap: an anonymous caller must not be able to page the whole catalogue.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const { data: rows, total, totalPages } = await paginatedResults(
      Medicine, filter, { page, limit, sort: { name: 1 } }
    );
    const medicines = rows.map((m) => ({
      id: m._id,
      name: m.name,
      genericName: m.genericName,
      category: m.category,
      // Availability as a boolean, never the exact stock count.
      available: Number(m.currentStock || 0) > 0,
    }));
    res.json({ medicines, page, limit, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Nearby Pharmacy Stores (H3 discovery, spec expansion-01C) ─────────────
// Approved pharmacy facilities within radiusKm, each with live in-stock
// medicine count + H3 res-8 cell (no new model: Facility + Medicine already link).
router.get('/stores/near', publicSearchLimiter, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Math.min(50, Math.max(1, Number(req.query.radiusKm) || 5));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'lat and lng required' });
    }
    const stores = await Facility.find({
      type: 'pharmacy',
      status: 'approved',
      location: { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6371] } },
    }).select('name address city phone rating location').lean();

    const out = [];
    for (const s of stores) {
      const coords = s.location?.coordinates;
      if (!coords || coords.length < 2) continue;
      const distanceKm = Math.round(calculateDistanceKm(lat, lng, coords[1], coords[0]) * 10) / 10;
      if (distanceKm > radiusKm) continue;
      const inStock = await Medicine.countDocuments({ facilityId: s._id, isActive: true, currentStock: { $gt: 0 } });
      out.push({
        storeId: s._id,
        name: s.name,
        address: s.address,
        city: s.city,
        phone: s.phone,
        rating: s.rating,
        distanceKm,
        h3Index8: latLngToCell(coords[1], coords[0], 8),
        inStockMedicines: inStock,
      });
    }
    out.sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ success: true, radiusKm, stores: out });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Medicine search across nearby stores (15-min delivery discovery) ──────
// Finds which nearby pharmacies stock the named medicine right now.
router.get('/search-medicine', publicSearchLimiter, async (req, res) => {
  try {
    const q = String(req.query.name || '').trim();
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Math.min(50, Math.max(1, Number(req.query.radiusKm) || 8));
    if (!q) return res.status(400).json({ message: 'name query required' });
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'lat and lng required' });
    }
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const stores = await Facility.find({
      type: 'pharmacy',
      status: 'approved',
      location: { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6371] } },
    }).select('name address city phone rating location').lean();

    const out = [];
    for (const s of stores) {
      const coords = s.location?.coordinates;
      if (!coords || coords.length < 2) continue;
      const distanceKm = Math.round(calculateDistanceKm(lat, lng, coords[1], coords[0]) * 10) / 10;
      if (distanceKm > radiusKm) continue;
      const medicines = await Medicine.find({
        facilityId: s._id,
        isActive: true,
        currentStock: { $gt: 0 },
        $or: [{ name: rx }, { genericName: rx }],
      }).select('name genericName form sellingPrice currentStock manufacturer prescriptionReq').limit(10).lean();
      if (!medicines.length) continue;
      out.push({
        storeId: s._id,
        name: s.name,
        address: s.address,
        city: s.city,
        phone: s.phone,
        distanceKm,
        h3Index8: latLngToCell(coords[1], coords[0], 8),
        medicines,
      });
    }
    out.sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ success: true, query: q, radiusKm, stores: out });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Medicine CRUD ─────────────────────────────────────────────────────────
router.get('/medicines', protect, async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    const filter = {};
    // AUTHZ-B-07: fail closed. The old pair of if (req.user.hospitalId && ...) lines
    // left the query UNFILTERED for any account without a hospital/facility.
    const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    if (search) filter.$or = [
      { name: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { genericName: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { manufacturer: new RegExp(escapeRegex(capSearch(search)), 'i') },
    ];
    if (category && category !== 'All') filter.category = category;
    if (lowStock === 'true') {
      // Filter in the QUERY (not in memory) and cap the result: the previous
      // version fetched the entire catalog and filtered in JS, which grows
      // unbounded with the medicine catalog (audit: pagination gap).
      const cap = Math.min(parseInt(req.query.limit, 10) || 200, 500);
      const medicines = await Medicine.find({
        ...filter,
        $expr: { $lte: ['$currentStock', '$reorderLevel'] },
      }).sort({ name: 1 }).limit(cap);
      return res.json({ medicines });
    }
    const { page = 1, limit = 50 } = req.query;
    const { data: medicines, total, totalPages, page: p, limit: l } = await paginatedResults(Medicine, filter, { page, limit, sort: { name: 1 } });
    res.json({ medicines, page: p, limit: l, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Export medicine alerts (low stock / expiring)
router.get('/medicines/export-alerts', protect, async (req, res) => {
  try {
    const filter = { isActive: true };
    // AUTHZ-B-07: tenant-scoped, fail closed.
    const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    const medicines = await Medicine.find({
      ...filter,
      $or: [
        { $expr: { $lte: ['$currentStock', '$reorderLevel'] } },
        { expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } }
      ]
    })
      .sort({ name: 1 })
      // Export payload — bounded so a single request can never stream an
      // unbounded catalog (audit: pagination gap). Override via ?limit= up to 5000.
      .limit(Math.min(parseInt(req.query.limit, 10) || 2000, 5000));
    res.json({ medicines });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/medicines', protect, authorize('pharmacy:manage'), validate(createMedicineSchema), async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_medicine', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    try {
      const { indexDrugDoc } = await import('../services/opensearchIndexer.js');
      await indexDrugDoc(medicine);
    } catch {}
    res.status(201).json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/medicines/:id', protect, authorizeObject({ model: lazyModel('../models/Medicine.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), validate(medicineUpdateSchema), async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // AUTH-030: allowlisted fields only — stock has dedicated endpoint, tenant linkage immutable.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(medicine, pickBody(req.body, ['name', 'genericName', 'category', 'form', 'manufacturer', 'batchNumber', 'expiryDate', 'purchasePrice', 'sellingPrice', 'currentStock', 'reorderLevel', 'prescriptionReq', 'rackLocation', 'interactions', 'contraindications', 'isActive']));
    await medicine.save();
    await auditLog('update_medicine', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    try {
      const { indexDrugDoc } = await import('../services/opensearchIndexer.js');
      await indexDrugDoc(medicine);
    } catch {}
    res.json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/medicines/:id', protect, authorizeObject({ model: lazyModel('../models/Medicine.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Medicine.findByIdAndDelete(req.params.id);
    await auditLog('delete_medicine', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Medicine removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Stock Management ──────────────────────────────────────────────────────
router.put('/medicines/:id/stock', protect, authorizeObject({ model: lazyModel('../models/Medicine.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), validate(pharmacyStockSchema), async (req, res) => {
  try {
    const { quantity, type } = req.body; // type: 'add' | 'deduct'
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (type === 'add') medicine.currentStock += quantity;
    else if (type === 'deduct') medicine.currentStock = Math.max(0, medicine.currentStock - quantity);
    await medicine.save();
    await auditLog('update_medicine_stock', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Prescription CRUD ─────────────────────────────────────────────────────
const PRESCRIBER_ROLES = ['doctor', 'clinic_doctor', 'counsellor', 'psychiatrist'];
router.post('/prescriptions', protect, authorize('prescriptions:write'), (req, res, next) => {
  // PHARM-B-10: prescribing is a clinical act - a patient/rider/assistant token
  // must not be able to mint a prescription attributed to itself as the doctor.
  if (!PRESCRIBER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Only a registered clinician can issue a prescription' });
  }
  next();
}, validate(prescriptionSchema), async (req, res) => {
  try {
    const { patientId, patientName, medicines, diagnosis, clinicalNotes, isEmergency } = req.body;
    if (!patientId || !medicines?.length) {
      return res.status(400).json({ message: 'Patient and at least one medicine required' });
    }
const prescriptionId = generatePrescriptionId();
    const prescription = await Prescription.create({
      prescriptionId, patientId, patientName,
      doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined,
      medicines: medicines.map(m => ({
        medicineId: m.medicineId, medicineName: m.medicineName,
        dosage: m.dosage, frequency: m.frequency, duration: m.duration,
        route: m.route || 'Oral', instructions: m.instructions || '',
        quantity: m.quantity, isDispensed: false,
      })),
      diagnosis: diagnosis || '', clinicalNotes: clinicalNotes || '',
      isEmergency: isEmergency || false, createdBy: req.user._id,
    });

    // REC-M-05: seal the clinical content before it is ever exposed. The token
    // goes into the printed QR; `integrity` makes later tampering detectable.
    // `sealPrescription` returns null when no signing secret is configured, so an
    // unconfigured deployment issues an unsigned-but-working prescription rather
    // than failing to prescribe.
    let verifyToken = null;
    try {
      const sealed = sealPrescription(prescription);
      if (sealed) {
        const issued = issueToken(prescription);
        verifyToken = issued.token;
        prescription.integrity.nonceHash = crypto.createHash('sha256').update(issued.nonce).digest('hex');
        await prescription.save();
      }
    } catch (e) {
      // Never block prescribing on an integrity failure. Log loudly and issue the
      // prescription unsigned - an unsigned prescription is still valid care,
      // and a refused prescription is a patient with no medication.
      logger.error(`[prescription] integrity seal failed for ${prescriptionId}: ${e.message}`);
    }

    await auditLog('create_prescription', req.user._id, { recordId: prescription._id, ip: req.ip, userAgent: req.get('user-agent') });
    // Notify pharmacy
    // PHARM-B-10: the fan-out used to notify EVERY pharmacist / hospital admin
    // on the platform for each forged prescription. Tenant-scoped now.
    const tenantOr = [];
    if (prescription.facilityId) tenantOr.push({ facilityId: prescription.facilityId });
    if (prescription.hospitalId) tenantOr.push({ hospitalId: prescription.hospitalId });
    const notifyQuery = {
      role: { $in: ['pharmacist', 'hospital_admin', 'pharmacy_owner'] },
      status: 'active',
      ...(tenantOr.length ? { $or: tenantOr } : {}),
    };
    const pharmacists = await User.find(notifyQuery).select('_id');
    await Notification.insertMany(pharmacists.map(p => ({
      title: 'New Prescription', message: `Dr. ${req.user.name} prescribed ${medicines.length} medicine(s) for ${patientName}`,
      type: 'pharmacy', userId: p._id.toString(),
    })));
    res.status(201).json({ ...prescription.toObject(), verifyToken });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

/**
 * REC-M-05: public prescription verification.
 *
 * Deliberately UNAUTHENTICATED. A pharmacist checking a paper prescription is
 * not going to create a FindMedi account first; requiring a login would make the
 * verification feature unusable and the forgery it exists to catch would simply
 * go unchallenged.
 *
 * That makes this the platform's most exposed unauthenticated endpoint, so it
 * returns the MINIMUM that answers the question a pharmacist is actually asking
 * - "is this genuine, and is it still valid?" - and never the patient, the
 * medicines or the diagnosis. A verify endpoint that echoed a patient's name for
 * any token would be a patient lookup service with a URL.
 *
 * Every failure returns the SAME shape. Distinguishing 'malformed' from 'not
 * found' from 'bad signature' would let a caller enumerate prescription ids.
 */
router.get('/prescriptions/verify/:token', async (req, res) => {
  try {
    const result = await verifyToken(req.params.token);

    if (!result.valid) {
      return res.status(200).json({
        valid: false,
        // A single neutral message for every failure mode, for the oracle reason
        // above. The specific reason is logged, not returned.
        message: 'This prescription could not be verified. Treat it as unverified and contact the prescriber.',
      });
    }

    res.json({
      valid: true,
      issuedAt: result.issuedAt,
      prescriberActive: result.prescriberActive,
      prescriberRoleIsClinical: result.prescriberRoleIsClinical,
      medicineCount: result.medicineCount,
      message: result.prescriberActive
        ? 'Signature verified. This prescription was issued by FindMedi and has not been altered since.'
        : 'Signature verified, but the prescriber account is no longer active. Confirm before dispensing.',
    });
  } catch (err) {
    // A verification endpoint that 500s tells an attacker which tokens are real.
    logger.error(`[prescription-verify] ${err.message}`);
    res.status(200).json({ valid: false, message: 'This prescription could not be verified.' });
  }
});

router.get('/prescriptions', protect, async (req, res) => {
  try {
     const { status, patientId, doctorId, search, verificationStatus } = req.query;
     const filter = {};
     // PHARM-B-09: keep the ownership clause aside so the search branch can
     // merge it with $and instead of REPLACING filter.$or (which returned other
     // patients' prescriptions to a patient who merely searched).
     let ownershipOr = null;
     if (req.user.role === 'patient') {
       ownershipOr = [
         { patientId: req.user._id },
         { patientId: { $exists: false }, patientName: req.user.name },
       ];
       filter.$or = ownershipOr;
     } else if (patientId) {
       filter.patientId = patientId;
     }
     if (req.user.role === 'doctor') {
       filter.doctorId = req.user.doctorProfileId;
     } else if (doctorId) {
       filter.doctorId = doctorId;
     }
     // PHARM-B-09: fail closed - a staff account with no tenant gets nothing
     // instead of an unfiltered platform-wide prescription dump.
     const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
     if (!scope.ok) return res.status(403).json({ message: scope.message });
     if (status && status !== 'All') filter.status = status;
     if (verificationStatus && verificationStatus !== 'All') filter.verificationStatus = verificationStatus;
     if (search) {
      const searchOr = [
        { prescriptionId: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { doctorName: new RegExp(escapeRegex(capSearch(search)), 'i') },
      ];
      // PHARM-B-09: the search terms are ANDed with the ownership clause instead
      // of overwriting it.
      if (ownershipOr) {
        filter.$and = [{ $or: ownershipOr }];
        delete filter.$or;
      }
      filter.$and = [...(filter.$and || []), { $or: searchOr }];
    }
    const { page = 1, limit = 50 } = req.query;
    const { data: prescriptions, total, totalPages, page: p, limit: l } = await paginatedResults(Prescription, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [{ path: 'patientId', select: 'name email phone' }, { path: 'doctorId', select: 'name email' }],
    });
    res.json({ prescriptions, page: p, limit: l, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PHARM-B-01: this read had `protect` only, so ANY authenticated account (a rider,
// a delivery boy, another patient) could fetch `/prescriptions/<id>` and receive
// the full prescription — medicines, dosage, doctor name, patient contact — plus
// controlled-substance history. The old inline check only compared hospitalId and
// only when the CALLER had one, so any tenant-less account bypassed it entirely.
//
// Ownership is now explicit and fail-closed via `authorizeObject`, which also
// answers 404 (not 403) so the id cannot be probed for existence.
router.get('/prescriptions/:id', protect, authorize('pharmacy:read', 'pharmacy:read:own'), authorizeObject({
  model: Prescription,
  ownerField: 'patientId',
  tenantFields: ['hospitalId', 'facilityId'],
  actorRoles: ['pharmacist', 'pharmacy_owner', 'pharmacy_staff', 'doctor', 'hospital_admin'],
  read: true,
}), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email');
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    res.json(prescription);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Pharmacist: Dispense Medicine ─────────────────────────────────────────
// PHARM-B-08: `pharmacy:dispense` alone let a pharmacist dispense ANY prescription
// that had not been marked `isDispensed`, including one the pharmacist had just
// written themselves, one still awaiting clinical verification, and one whose
// validity window had lapsed. Dispensing is the step where a control-substance
// leaves the building, so the gate is explicit and fail-closed.
const DISPENSING_ROLES = ['pharmacist', 'pharmacy_owner'];

router.put('/prescriptions/:id/dispense', protect, authorize('pharmacy:dispense'), validate(pharmacyDispenseSchema), async (req, res) => {
  try {
    const { medicineIndex } = req.body;
    if (medicineIndex === undefined) return res.status(400).json({ message: 'Medicine index required' });

    // Self-dispensing is a conflict of interest, not a capability.
    if (!DISPENSING_ROLES.includes(req.user.role) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        message: 'Only a pharmacist or pharmacy owner may dispense',
      });
    }

    const prescription = await Prescription.findById(req.params.id).populate('patientId', 'allergies');
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && prescription.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // PHARM-B-08: the dispensing gate.
    //   1. separation of duties — the prescriber must not dispense their own script
    //   2. clinical verification — an unverified script cannot leave the pharmacy
    //   3. validity — an expired script cannot be filled
    const prescriberId = prescription.doctorId?.toString?.() || prescription.prescribedBy?.toString?.();
    if (prescriberId && prescriberId === req.user._id.toString()) {
      return res.status(403).json({
        message: 'Separation of duties: the prescribing doctor may not dispense their own prescription',
      });
    }
    if (prescription.verificationStatus && prescription.verificationStatus !== 'verified') {
      return res.status(409).json({
        message: `Prescription is ${prescription.verificationStatus}; it must be clinically verified before dispensing`,
        code: 'PRESCRIPTION_NOT_VERIFIED',
      });
    }
    const validUntil = prescription.validUntil || prescription.expiryDate;
    if (validUntil && new Date(validUntil) < new Date()) {
      return res.status(409).json({
        message: 'Prescription has expired and cannot be dispensed',
        code: 'PRESCRIPTION_EXPIRED',
      });
    }
    if (prescription.status === 'Cancelled' || prescription.status === 'Expired') {
      return res.status(409).json({ message: `Prescription is ${prescription.status}` });
    }

    const med = prescription.medicines[medicineIndex];
    if (!med) return res.status(404).json({ message: 'Medicine not found in prescription' });
    if (med.isDispensed) return res.status(400).json({ message: 'Already dispensed' });

    // Check allergies
    if (prescription.patientId?.allergies?.length > 0) {
      const allergicMatch = prescription.patientId.allergies.find(a => 
        a.allergen?.toLowerCase()?.includes(med.medicineName?.toLowerCase()) ||
        med.medicineName?.toLowerCase()?.includes(a.allergen?.toLowerCase())
      );
      if (allergicMatch) {
        return res.status(400).json({ 
          message: `Patient is allergic to ${med.medicineName}. Reaction: ${allergicMatch.reaction || 'Unknown'}` 
        });
      }
    }

    // Check for drug interactions with already dispensed medicines in this prescription
    const dispensedMedicines = prescription.medicines
      .filter(m => m.isDispensed && m.medicineId)
      .map(m => m.medicineName?.toLowerCase());

    const medicineDoc = await Medicine.findById(med.medicineId);
    if (medicineDoc?.interactions && dispensedMedicines.length > 0) {
      for (const interaction of medicineDoc.interactions) {
        if (dispensedMedicines.includes(interaction?.toLowerCase())) {
          return res.status(400).json({ 
            message: `Drug interaction warning: ${med.medicineName} interacts with ${interaction}` 
          });
        }
      }
    }

    // PHARM-M-01: FEFO — reject dispensing if the medicine has expired.
    if (medicineDoc?.expiryDate && new Date() > new Date(medicineDoc.expiryDate)) {
      return res.status(409).json({ message: `Medicine has expired (expiry: ${medicineDoc.expiryDate.toISOString().split('T')[0]}) and cannot be dispensed` });
    }

    // Deduct stock
    let dispensedMedicineId = med.medicineId ? String(med.medicineId) : '';
    let dispensedFacility = '';
    if (med.medicineId) {
      const medicine = await Medicine.findById(med.medicineId);
      if (medicine) {
        if (medicine.currentStock < med.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${med.medicineName}. Available: ${medicine.currentStock}` });
        }
        medicine.currentStock -= med.quantity;
        await medicine.save();
        dispensedMedicineId = String(medicine._id);
        dispensedFacility = String(medicine.facilityId || medicine.hospitalId || '');
      }
    }
    med.isDispensed = true;
    med.dispensedAt = new Date();
    med.dispensedBy = req.user.name;
    await prescription.save();
    await auditLog('dispense_prescription', req.user._id, { recordId: prescription._id, ip: req.ip, userAgent: req.get('user-agent') });
    // Tech 03-D: inventory-delta spine (decrement already applied above; consumer
    // owns reorder-point → auto-PO so concurrent dispenses can't miss it).
    try {
      const { emitPharmacyInventoryEvent } = await import('../lib/kafkaProducer.js');
      await emitPharmacyInventoryEvent(
        String(dispensedFacility || prescription.hospitalId || 'default'),
        'medicine.dispensed',
        {
          medicineId: dispensedMedicineId,
          quantity: med.quantity,
          createdBy: String(req.user._id),
        }
      );
    } catch {}
    res.json(prescription);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Admin: Verify Prescription ─────────────────────────────────────────────
const prescriptionVerifySchema = z.object({
  action: z.enum(['verify', 'reject']),
  notes: z.string().optional(),
});

router.put('/prescriptions/:id/verify', protect, adminOnly, authorize('pharmacy:manage'), validate(prescriptionVerifySchema), async (req, res) => {
  try {
    const { action, notes } = req.body;
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name email phone allergies')
      .populate('doctorId', 'name email');
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && prescription.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (action === 'verify') {
      prescription.verificationStatus = 'verified';
      prescription.verifiedBy = req.user._id;
      prescription.verifiedAt = new Date();
      prescription.verificationNotes = notes || '';
    } else {
      prescription.verificationStatus = 'rejected';
      prescription.verifiedBy = req.user._id;
      prescription.verifiedAt = new Date();
      prescription.verificationNotes = notes || '';
      prescription.status = 'Cancelled';
    }

    await prescription.save();
    await auditLog(action === 'verify' ? 'verify_prescription' : 'reject_prescription', req.user._id, { recordId: prescription._id, ip: req.ip, userAgent: req.get('user-agent') });

    // Notify patient
    const patientId = prescription.patientId?._id || prescription.patientId;
    if (patientId) {
      await Notification.create({
        title: action === 'verify' ? 'Prescription Verified' : 'Prescription Rejected',
        message: action === 'verify'
          ? `Your prescription #${prescription.prescriptionId} has been verified and is ready for dispensing.`
          : `Your prescription #${prescription.prescriptionId} has been rejected. Reason: ${notes || 'No reason provided'}`,
        type: 'prescription',
        userId: patientId.toString(),
      });
    }

    res.json(prescription);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pharmacy Stats ────────────────────────────────────────────────────────
// PHARM-B-02: pharmacy stats are tenant numbers, not a self-service read.
// `protect` alone let a patient (or any tenant-less account) reach them — and
// `applyTenantScope(..., allowSharedRowsForNonStaff:false)` reduces such a caller
// to "shared rows only", which is not "denied". So the role gate is explicit.
router.get('/stats', protect, authorize('pharmacy:read', 'inventory:manage', 'reports:read'), async (req, res) => {
  try {
    const medFilter = {};
    // AUTHZ-B-07: pharmacy stats are tenant numbers - fail closed.
    const medScope = applyTenantScope(req, medFilter, { fields: ['facilityId'], allowSharedRowsForNonStaff: false });
    if (!medScope.ok) return res.status(403).json({ message: medScope.message });
    const rxFilter = { ...medFilter };
    const totalMedicines = await Medicine.countDocuments({ isActive: true, ...medFilter });
    const lowStock = await Medicine.countDocuments({ 
      isActive: true, ...medFilter,
      $expr: { $lte: ['$currentStock', '$reorderLevel'] } 
    });
    const expiringSoon = await Medicine.countDocuments({ ...medFilter, expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, isActive: true });
    const totalPrescriptions = await Prescription.countDocuments(rxFilter);
    const pendingDispense = await Prescription.countDocuments({ ...rxFilter, status: { $in: ['Active', 'Partially Dispensed'] } });
    const totalOrders = await PharmacyOrder.countDocuments(medFilter);
    const pendingReturns = await PharmacyReturn.countDocuments({ ...medFilter, status: 'Pending' });
    const revenue = await PharmacyOrder.aggregate([
      { $match: { paymentStatus: 'Paid', ...(medFilter.hospitalId ? { hospitalId: medFilter.hospitalId } : {}) } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    res.json({ totalMedicines, lowStock, expiringSoon, totalPrescriptions, pendingDispense, totalOrders, pendingReturns, revenue: revenue[0]?.total || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PHARM-B-03: a billing export is a bulk PHI read (patients, prices, delivery
// addresses). It was `protect`-only, so any logged-in account could pull the
// pharmacy billing table. Now: an explicit billing permission, the tenant filter,
// a hard row cap, and an audit row so the export itself is reviewable.
router.get('/billing/export', protect, authorize('billing:read', 'reports:read'), async (req, res) => {
  try {
    const filter = {};
    // AUTHZ-B-07: billing export is tenant-scoped, fail closed + capped.
    const scope = applyTenantScope(req, filter, { fields: ['hospitalId', 'facilityId'], allowSharedRowsForNonStaff: false });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    // A patient reaches this line only if the permission matrix grants it; if it
    // somehow does, the tenant filter above still pins them to shared rows.
    if (req.user.role === 'patient') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    const EXPORT_ROW_CAP = 5000;
    const requested = Number(req.query.limit) || EXPORT_ROW_CAP;
    const limit = Math.min(Math.max(1, requested), EXPORT_ROW_CAP);
    const bills = await Billing.find({ ...filter, source: 'pharmacy' }).sort({ createdAt: -1 }).limit(limit);
    await auditLog('export_pharmacy_billing', req.user._id, {
      rowCount: bills.length, limit, ip: req.ip, userAgent: req.get('user-agent'),
    });
    res.json({ count: bills.length, cappedAt: EXPORT_ROW_CAP, bills });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Orders ────────────────────────────────────────────────────────────────
router.get('/orders', protect, async (req, res) => {
  try {
    const { status, search, orderId } = req.query;
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
    if (orderId) filter.orderId = orderId;
    if (search) {
      const searchOr = [{ orderId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') }];
      if (ownershipOr) {
        filter.$and = [{ $or: ownershipOr }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }
    let populate;
    if (orderId) populate = { path: 'items.medicineId', select: 'name form' };
    const { page = 1, limit = 50 } = req.query;
    const { data: orders, total, totalPages, page: p, limit: l } = await paginatedResults(PharmacyOrder, filter, { page, limit, sort: { orderDate: -1 }, populate });
    res.json({ orders, page: p, limit: l, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/orders', protect, authorize('pharmacy:read', 'pharmacy:read:own'), validate(pharmacyOrderSchema), async (req, res) => {
  try {
    const orderId = generateTimestampedId('ORD');
    // PHARM-B-11: ...req.body mass-assigned the whole request (the schema is a
    // passthrough), so a client could create an order already marked
    // Paid/Confirmed, attributed to another patient, or parented to a foreign
    // facility. Only the catalogue fields are taken from the body; order state and
    // patient linkage are server-derived.
    const { pickBody } = await import('../utils/pick.js');
    const allowed = pickBody(req.body, [
      'items', 'total', 'subTotal', 'discount', 'couponCode', 'note',
      'deliveryAddress', 'deliveryMode', 'deliverySlot', 'deliveryFee',
      'paymentMethod', 'prescriptionId', 'prescriptionUrl',
    ]);
    const isPatient = req.user.role === 'patient';
    const facilityId = req.user.facilityId || req.user.hospitalId || undefined;
    const order = await PharmacyOrder.create({
      ...allowed,
      orderId,
      hospitalId: req.user.hospitalId,
      facilityId,
      // Server-owned state + linkage.
      status: 'Pending',
      paymentStatus: 'Pending',
      patientId: isPatient ? req.user._id : (allowed.patientId || req.user._id),
      patientName: isPatient ? req.user.name : (allowed.patientName || req.user.name),
      createdBy: req.user._id,
    });
    await auditLog('create_pharmacy_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// AUTHZ-B-08: the tenant-ownership check used to run BEFORE authorize(), so a
// patient (facilityId null) was rejected by ownership before the
// `pharmacy:order:own` grant could ever fire. The order is now
// protect -> authorize -> ownership.
router.put('/orders/:id', protect, authorize('pharmacy:manage', 'pharmacy:order:own'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage', 'pharmacy:order:own'), write: true }), validate(pharmacyOrderSchema), async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    // AUTH-030: allowlisted fields only — status/refund/reject have dedicated endpoints.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(order, pickBody(req.body, ['patientName', 'phone', 'deliveryAddress', 'items', 'total', 'note', 'prescriptionUrl', 'rejectionReason', 'deliveryFee', 'deliveryMode', 'deliverySlot', 'paymentMethod', 'discount', 'couponCode', 'platformFee', 'gst']));
    await order.save();
    await auditLog('update_pharmacy_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/orders/:id', protect, authorize('pharmacy:manage'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  try {
    await PharmacyOrder.findByIdAndDelete(req.params.id);
    await auditLog('delete_pharmacy_order', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/orders/:id/forward', protect, authorize('pharmacy:manage'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  try {
    const original = await PharmacyOrder.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Order not found' });
    const { facilityId } = req.body;
    if (!facilityId) return res.status(400).json({ message: 'facilityId (new pharmacy) is required' });
    const newOrderId = generateTimestampedId('ORD');
    const newOrder = await PharmacyOrder.create({
      patientId: original.patientId,
      patientName: original.patientName,
      phone: original.phone,
      deliveryAddress: original.deliveryAddress,
      items: original.items,
      total: original.total,
      note: original.note,
      orderId: newOrderId,
      hospitalId: original.hospitalId,
      facilityId,
      createdBy: req.user._id,
      prescriptionUrl: original.prescriptionUrl,
      deliveryFee: original.deliveryFee,
      deliveryMode: original.deliveryMode,
      deliverySlot: original.deliverySlot,
      paymentMethod: original.paymentMethod,
      discount: original.discount,
    });
    await auditLog('forward_pharmacy_order', req.user._id, { recordId: newOrder._id, ip: req.ip, userAgent: req.get('user-agent') });
    original.status = 'Cancelled';
    await original.save();
    res.status(201).json({ newOrder, cancelledOrder: original });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id/reject', protect, authorize('pharmacy:manage'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { reason } = req.body;
    order.prescriptionStatus = 'rejected';
    if (reason) order.rejectionReason = reason;
    order.note = order.note + (order.note ? ' | ' : '') + `Rejected: ${reason || 'No reason given'}`;
    await order.save();
    await auditLog('reject_pharmacy_prescription', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Deliveries ────────────────────────────────────────────────────────────
router.get('/deliveries', protect, async (req, res) => {
  try {
    const filter = {};
    // AUTHZ-B-07: fail closed. The old pair of if (req.user.hospitalId && ...) lines
    // left the query UNFILTERED for any account without a hospital/facility.
    const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    const { page = 1, limit = 50 } = req.query;
    const { data: deliveries, total, totalPages, page: p, limit: l } = await paginatedResults(PharmacyDelivery, filter, { page, limit, sort: { assignedAt: -1 } });
    res.json({ deliveries, page: p, limit: l, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/deliveries', protect, authorize('pharmacy:manage'), validate(pharmacyDeliverySchema), async (req, res) => {
  try {
    const delivery = await PharmacyDelivery.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_delivery', req.user._id, { recordId: delivery._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(delivery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/deliveries/:id', protect, authorizeObject({ model: lazyModel('../models/PharmacyDelivery.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), validate(pharmacyDeliverySchema), async (req, res) => {
    try {
      const delivery = await PharmacyDelivery.findById(req.params.id);
      if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
      if (req.body.tracking) delivery.trackingHistory.push({ location: req.body.tracking, time: new Date() });
      const { pickBody } = await import('../utils/pick.js');
      const allowed = pickBody(req.body, ['pickupName', 'pickupAddress', 'pickupLocation', 'dropAddress', 'dropLocation', 'patientName', 'patientPhone', 'deliveryFee', 'notes', 'estimatedTime', 'deliveryProofPhoto', 'deliveryOtp', 'otpVerified', 'status']);
      Object.assign(delivery, allowed);
      // PHARM-M-04: enforce proof-of-delivery capture — if status is Delivered and no proof photo exists, require it.
      if (delivery.status === 'Delivered' && !delivery.deliveryProofPhoto) {
        return res.status(400).json({ message: 'Delivery proof photo required to mark delivery as completed' });
      }
      // PHARM-M-04: OTP-at-door handoff — if a new OTP is provided, mark it verified and transition to Delivered if appropriate.
      if (req.body.deliveryOtp && !delivery.otpVerified) {
        delivery.otpVerified = true;
      }
      // PHARM-M-04: status timeline — enforce valid transitions
      const validTransitions = {
        'Pending Assignment': ['Assigned'],
        'Assigned': ['Picked Up', 'Cancelled'],
        'Picked Up': ['Out for Delivery', 'Cancelled'],
        'Out for Delivery': ['Delivered', 'Failed'],
        'Delivered': [], // terminal
        'Failed': [], // terminal
        'Cancelled': [], // terminal
      };
      const currentIndex = validTransitions[delivery.status] || [];
      if (allowed.status && !validTransitions[delivery.status].includes(allowed.status)) {
        return res.status(409).json({ message: `Invalid status transition from ${delivery.status} to ${allowed.status}` });
      }
      await delivery.save();
      res.json(delivery);
    } catch (err) { res.status(500).json({ message: err.message }); }
  });

// ─── Offers ────────────────────────────────────────────────────────────────
router.get('/offers', protect, async (req, res) => {
  try {
    const filter = {};
    // AUTHZ-B-07: fail closed. The old pair of if (req.user.hospitalId && ...) lines
    // left the query UNFILTERED for any account without a hospital/facility.
    const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    const { page = 1, limit = 50 } = req.query;
    const { data: offers, total, totalPages, page: p, limit: l } = await paginatedResults(PharmacyOffer, filter, { page, limit, sort: { createdAt: -1 } });
    res.json({ offers, page: p, limit: l, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/offers', protect, authorize('pharmacy:manage'), validate(pharmacyOfferSchema), async (req, res) => {
  try {
    const offer = await PharmacyOffer.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_offer', req.user._id, { recordId: offer._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(offer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/offers/:id', protect, authorizeObject({ model: lazyModel('../models/PharmacyOffer.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), validate(pharmacyOfferSchema), async (req, res) => {
  try {
    const offer = await PharmacyOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    // AUTH-030: allowlisted fields only — code/usage counters immutable here.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(offer, pickBody(req.body, ['title', 'discount', 'type', 'minPurchase', 'maxDiscount', 'validTill', 'usageLimit', 'isActive']));
    await offer.save();
    await auditLog('update_pharmacy_offer', req.user._id, { recordId: offer._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(offer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/offers/:id', protect, authorize('pharmacy:manage'), authorizeObject({ model: lazyModel('../models/PharmacyOffer.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), async (req, res) => {
   try { await PharmacyOffer.findByIdAndDelete(req.params.id); await auditLog('delete_pharmacy_offer', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') }); res.json({ message: 'Deleted' }); }
   catch (err) { res.status(500).json({ message: err.message }); }
 });

// ─── Returns ───────────────────────────────────────────────────────────────
router.get('/returns', protect, async (req, res) => {
  try {
    const filter = {};
    // AUTHZ-B-07: fail closed. The old pair of if (req.user.hospitalId && ...) lines
    // left the query UNFILTERED for any account without a hospital/facility.
    const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    const { page = 1, limit = 50 } = req.query;
    const { data: returns, total, totalPages, page: p, limit: l } = await paginatedResults(PharmacyReturn, filter, { page, limit, sort: { initiatedAt: -1 } });
    res.json({ returns, page: p, limit: l, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/returns', protect, authorize('pharmacy:manage'), validate(pharmacyReturnSchema), async (req, res) => {
  try {
    const returnId = generateTimestampedId('RET');
    const ret = await PharmacyReturn.create({ ...req.body, returnId, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_return', req.user._id, { recordId: ret._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(ret);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/returns/:id', protect, authorizeObject({ model: lazyModel('../models/PharmacyReturn.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), validate(pharmacyReturnSchema), async (req, res) => {
  try {
    const ret = await PharmacyReturn.findById(req.params.id);
    if (!ret) return res.status(404).json({ message: 'Return not found' });
    if (req.body.status === 'Approved' || req.body.status === 'Refunded') ret.completedAt = new Date();
    // AUTH-030: allowlisted fields only — returnId/patient/tenant linkage immutable.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(ret, pickBody(req.body, ['orderId', 'orderRef', 'patientName', 'items', 'total', 'status']));
    await ret.save();
    await auditLog('update_pharmacy_return', req.user._id, { recordId: ret._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(ret);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Staff ─────────────────────────────────────────────────────────────────
router.get('/staff', protect, async (req, res) => {
  try {
    const filter = {};
    // AUTHZ-B-07: fail closed. The old pair of if (req.user.hospitalId && ...) lines
    // left the query UNFILTERED for any account without a hospital/facility.
    const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    const { page = 1, limit = 50 } = req.query;
    const { data: staff, total, totalPages, page: p, limit: l } = await paginatedResults(PharmacyStaff, filter, { page, limit, sort: { joinedAt: -1 } });
    res.json({ staff, page: p, limit: l, total, totalPages });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/staff', protect, validate(pharmacyStaffSchema), async (req, res) => {
  try {
    const member = await PharmacyStaff.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_staff', req.user._id, { recordId: member._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/staff/:id', protect, validate(pharmacyStaffSchema), async (req, res) => {
  try {
    const member = await PharmacyStaff.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Staff not found' });
    // AUTH-030: allowlisted fields only — tenant linkage immutable.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(member, pickBody(req.body, ['name', 'role', 'email', 'phone', 'licenseNumber', 'experience', 'shift', 'isActive']));
    await member.save();
    await auditLog('update_pharmacy_staff', req.user._id, { recordId: member._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/staff/:id', protect, authorize('pharmacy:manage'), async (req, res) => {
  try {
    await PharmacyStaff.findByIdAndDelete(req.params.id);
    await auditLog('delete_pharmacy_staff', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Coupon Validation ─────────────────────────────────────────────────────
// authz: self
router.post('/coupons/validate', protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required' });
    const offer = await PharmacyOffer.findOne({ code: code.toUpperCase(), isActive: true });
    if (!offer) return res.status(404).json({ valid: false, message: 'Coupon not found or expired' });
    res.json({ valid: true, code: offer.code, discount: offer.discount, title: offer.title });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Prescription Verification ───────────────────────────────────────────────
router.post('/orders/verify-prescriptions', protect, authorize('pharmacy:manage', 'pharmacy:dispense'), async (req, res) => {
  try {
    const { entries, file } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ verified: false, reason: 'No medicines provided for verification' });
    }

    // Load the cart medicines to run real checks
    const ids = entries.map(e => e.medicineId).filter(Boolean);
    const medicines = ids.length ? await Medicine.find({ _id: { $in: ids }, isActive: true }) : [];
    const medMap = new Map(medicines.map(m => [m._id.toString(), m]));
    const names = entries.map(e => (e.medicineName || medMap.get(String(e.medicineId))?.name || '').toLowerCase());

    for (const entry of entries) {
      const med = medMap.get(String(entry.medicineId));
      if (!med) {
        return res.json({ verified: false, reason: `${entry.medicineName || 'This medicine'} is not available at this pharmacy` });
      }
      const qty = Number(entry.quantity) || 1;
      if (med.currentStock < qty) {
        return res.json({ verified: false, reason: `Insufficient stock for ${med.name}. Available: ${med.currentStock}` });
      }
      for (const interaction of med.interactions || []) {
        if (names.includes(interaction?.toLowerCase())) {
          return res.json({ verified: false, reason: `Drug interaction warning: ${med.name} interacts with ${interaction}` });
        }
      }
      for (const allergy of req.user.allergies || []) {
        if (allergy?.allergen && med.name.toLowerCase().includes(allergy.allergen.toLowerCase())) {
          return res.json({ verified: false, reason: `Patient is allergic to ${med.name}. Reaction: ${allergy.reaction || 'Unknown'}` });
        }
      }
    }

    // All automated checks passed → persist so it lands in the pharmacist queue
    const prescriptionId = generatePrescriptionId();
    const facilityId = req.body.facilityId || req.user.facilityId || req.user.hospitalId || undefined;
    const prescription = await Prescription.create({
      prescriptionId,
      patientId: req.user._id,
      patientName: req.user.name,
      doctorId: req.user._id,
      doctorName: 'Patient Uploaded',
      medicines: entries.map(e => {
        const med = medMap.get(String(e.medicineId));
        return {
          medicineId: med?._id,
          medicineName: e.medicineName || med?.name || 'Medicine',
          dosage: 'As per uploaded prescription',
          frequency: 'As per uploaded prescription',
          duration: 'As per uploaded prescription',
          quantity: Number(e.quantity) || 1,
          isDispensed: false,
        };
      }),
      status: 'Active',
      verificationStatus: 'verified',
      verificationNotes: 'Auto-verified (stock, interactions, allergies)',
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      isEmergency: false,
      hospitalId: req.user.hospitalId,
      facilityId,
      prescriptionFile: file || '',
      clinicalNotes: 'Uploaded by patient during checkout',
      createdBy: req.user._id,
    });
    await auditLog('verify_prescription', req.user._id, { recordId: prescription._id, ip: req.ip, userAgent: req.get('user-agent') });

    // Notify pharmacy staff
    // PHARM-B-10: the fan-out used to notify EVERY pharmacist / hospital admin
    // on the platform for each forged prescription. Tenant-scoped now.
    const tenantOr = [];
    if (prescription.facilityId) tenantOr.push({ facilityId: prescription.facilityId });
    if (prescription.hospitalId) tenantOr.push({ hospitalId: prescription.hospitalId });
    const notifyQuery = {
      role: { $in: ['pharmacist', 'hospital_admin', 'pharmacy_owner'] },
      status: 'active',
      ...(tenantOr.length ? { $or: tenantOr } : {}),
    };
    const pharmacists = await User.find(notifyQuery).select('_id');
    await Notification.insertMany(pharmacists.map(p => ({
      title: 'New Prescription',
      message: `${req.user.name} uploaded a prescription (${entries.length} medicine(s)) — auto-verified, ready for dispensing`,
      type: 'pharmacy',
      userId: p._id.toString(),
    })));

    res.json({ verified: true, prescription: { _id: prescription._id, prescriptionId } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Refund Endpoint ───────────────────────────────────────────────────────
// AUTHZ-B-08: this had NO permission gate (tenant ownership only) and accepted an
// arbitrary `amount` from the body, so any same-facility account could mark an
// order refunded for an arbitrary value. Permission is now required and the refund
// amount is validated and capped by the order total.
router.post('/orders/:id/refund', protect, authorize('pharmacy:manage'), idempotencyGuard({ prefix: 'pharm-refund', failClosed: true }), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { reason, items } = req.body;
    const rawAmount = Number(req.body?.amount);
    if (!Number.isFinite(rawAmount) || rawAmount < 0) {
      return res.status(400).json({ message: 'A non-negative refund amount is required' });
    }
    const orderTotal = Number(order.totalAmount ?? order.total ?? order.amount ?? 0);
    if (orderTotal > 0 && rawAmount > orderTotal) {
      return res.status(400).json({ message: `Refund cannot exceed the order total (${orderTotal})` });
    }
    if (order.refunded) {
      return res.status(409).json({ message: 'Order is already refunded' });
    }
    order.refunded = true;
    order.refundAmount = rawAmount;
    order.refundReason = reason || '';
    order.refundDate = new Date();
    await order.save();
    await auditLog('process_pharmacy_refund', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Refund processed', order });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;

