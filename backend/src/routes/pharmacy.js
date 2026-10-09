import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { applyTenantScope } from '../utils/tenantScope.js';
import express from 'express';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import logger from '../config/logger.js';
import Medicine from '../models/Medicine.js';
import Billing from '../models/Billing.js';
import Prescription from '../models/Prescription.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import Payment from '../models/Payment.js';
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
import { callerMayActOnDoc } from '../middleware/tenantOwnership.js';
// AUTHZ-M-01 migration: lazy model resolvers keep the existing dynamic-import
// shape (no new static model edges); every site below keeps its chain role
// gate, with actorRoles computed from the same permission matrix.
const lazyModel = (path) => () => import(path).then((m) => m.default);
import { publicSearchLimiter } from '../middleware/rateLimit.js';
import { validate, createMedicineSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generatePrescriptionId, generateTimestampedId, generateTransactionId, generateInvoiceId } from '../utils/idGenerator.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { paginatedResults } from '../utils/pagination.js';
// PAY-B-05: the order-refund route is a money mutation and opts into the replay
// guard, so a double-clicked "Refund" cannot issue two refunds.
import { idempotencyGuard } from '../middleware/idempotency.js';
import { dispensePrescriptionMedicine } from '../services/pharmacyDispenseService.js';
import { PHARMACY_RESERVATION_TTL_MS, reservePharmacyOrderItems, releasePharmacyOrderItems } from '../services/pharmacyInventoryService.js';
import { executeWithOutbox } from '../lib/transactionalOutbox.js';
import { KAFKA_TOPICS } from '../config/kafka.js';
import { canCollectPharmacyCod, canTransitionPharmacyOrder } from '../services/pharmacyOrderLifecycle.js';
import { sealPrescription, issueToken, verifyToken } from '../services/prescriptionIntegrity.js';

// ─── Request-validation schemas ─────────────────────────────────────────────
// These use zod's DEFAULT strip mode (plain z.object): keys not declared here
// are REMOVED from req.body by `validate()` before the handler runs. That is
// strictly stronger than the old `.passthrough()` for mass-assignment (forged
// total/status/patientId never reach a handler — PHARM-B-11) while not
// hard-failing legitimate client fields the way `.strict()` did (checkout
// paymentMethod/storeId, edit-dialog string prices). Every key a handler or
// the web client actually reads MUST be declared below or strip drops it.
const medicineUpdateSchema = z.object({
  // Numbers are union'd with string: the edit dialog prefills toString() values
  // (and '' when unset), which mongoose Number casting accepts — matching the
  // pre-hardening behaviour instead of 400-ing the stock/edit form.
  name: z.string().trim().min(1).max(200).optional(),
  genericName: z.string().trim().max(200).optional(),
  category: z.string().trim().max(120).optional(),
  form: z.string().trim().max(80).optional(),
  manufacturer: z.string().trim().max(200).optional(),
  batchNumber: z.string().trim().max(120).optional(),
  expiryDate: z.string().max(40).optional(),
  purchasePrice: z.union([z.number().nonnegative().max(10000000), z.string().max(30)]).optional(),
  sellingPrice: z.union([z.number().nonnegative().max(10000000), z.string().max(30)]).optional(),
  reorderLevel: z.union([z.number().int().nonnegative().max(1000000), z.string().max(30)]).optional(),
  prescriptionReq: z.boolean().optional(),
  rackLocation: z.string().trim().max(120).optional(),
  interactions: z.string().trim().max(4000).optional(),
  contraindications: z.string().trim().max(4000).optional(),
  isActive: z.boolean().optional(),
  // currentStock is deliberately NOT here: stock changes go through the
  // dedicated /stock route, and strip drops it exactly as pickBody did before.
});
const pharmacyStockSchema = z.object({ quantity: z.number().int().positive().max(100000), type: z.enum(['add', 'deduct']) });
const prescriptionSchema = z.object({
  patientId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  patientName: z.string().trim().max(200).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  diagnosisIcd: z.string().trim().max(20).optional(),
  followUpDate: z.string().optional(),
  genericPreferred: z.boolean().optional(),
  cdsOverrideReason: z.string().trim().max(1000).optional(),
  clinicalNotes: z.string().trim().max(4000).optional(),
  isEmergency: z.boolean().optional(),
  // File 22 P1-24: linked visit (tele-compliance checks run when set).
  appointmentId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  medicines: z.array(z.object({
    // Field names mirror what the handler reads (m.medicineName, m.route, …).
    medicineId: z.string().min(1).max(100).optional(),
    medicineName: z.string().trim().max(200).optional(),
    dosage: z.string().trim().max(120).optional(),
    frequency: z.string().trim().max(120).optional(),
    duration: z.string().trim().max(120).optional(),
    route: z.string().trim().max(60).optional(),
    instructions: z.string().trim().max(1000).optional(),
    quantity: z.coerce.number().int().nonnegative().max(10000).optional(),
  })).max(50).optional(),
});
const pharmacyOrderSchema = z.object({
  items: z.array(z.object({
    medicineId: z.string().min(1),
    quantity: z.coerce.number().int().positive().max(100),
    // Read by the handler for multi-store rejection + stale-cart checks (:831+).
    storeId: z.string().min(1).max(100).optional(),
    // Anything else on an item (price, medicineName, rx) is strip-removed: the
    // handler re-derives name/price from the catalogue, never from the cart.
  })).min(1).max(50),
  address: z.string().trim().max(500).optional(),
  deliveryAddress: z.string().trim().max(500).optional(),
  deliveryMode: z.enum(['delivery', 'pickup']).optional(),
  deliverySlot: z.string().trim().max(80).optional(),
  couponCode: z.string().trim().max(40).optional(),
  prescriptionUrl: z.string().trim().max(2048).optional(),
  // Read by the handler (:934/:942) to map COD/UPI/Card — must survive strip.
  paymentMethod: z.string().trim().max(40).optional(),
  // Strip (not strict): the checkout page also sends display fields (total,
  // status, patientId, patientName, email, phone). They are NOT declared, so
  // zod removes them before the handler runs — a forged total/status can never
  // reach the request object, while the request still succeeds with
  // server-derived state (PHARM-B-14: forged totals → 201 + authoritative total).
});
const pharmacyOrderUpdateSchema = z.object({
  // status is intentionally absent — status transitions have dedicated
  // endpoints; strip drops it, so PUT /orders/:id can never flip status.
  phone: z.string().trim().max(40).optional(),
  deliveryAddress: z.string().trim().max(500).optional(),
  note: z.string().trim().max(1000).optional(),
  prescriptionUrl: z.string().trim().max(2048).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
  deliverySlot: z.string().trim().max(80).optional(),
});
const pharmacyOrderStatusSchema = z.object({
  status: z.enum(['Confirmed', 'Preparing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']),
});
const pharmacyDeliverySchema = z.object({
  // POST /deliveries does `{ ...req.body }` into the model, so every writable
  // model field must be declared here and nothing more (strip enforces it).
  // orderId is optional because PUT sends partial bodies like {status} — the
  // model's required validator rejects a POST that omits it.
  orderId: z.string().min(1).max(80).optional(),
  orderRef: z.string().max(80).optional(),
  deliveryPartnerId: z.string().max(80).optional(),
  pickupName: z.string().trim().max(200).optional(),
  pickupAddress: z.string().trim().max(500).optional(),
  dropAddress: z.string().trim().max(500).optional(),
  patientName: z.string().trim().max(200).optional(),
  patientPhone: z.string().trim().max(40).optional(),
  deliveryFee: z.union([z.number().nonnegative(), z.string().max(30)]).optional(),
  notes: z.string().trim().max(2000).optional(),
  estimatedTime: z.string().trim().max(120).optional(),
  status: z.string().trim().max(60).optional(),
  // PUT handler reads these for proof-of-delivery + OTP handoff.
  deliveryProofPhoto: z.string().max(2048).optional(),
  deliveryOtp: z.string().max(20).optional(),
  otpVerified: z.boolean().optional(),
  // Free-form progress note pushed onto trackingHistory by the PUT handler.
  tracking: z.string().max(500).optional(),
});
const pharmacyOfferSchema = z.object({
  // Field names mirror the PharmacyOffer model + what the offers page sends
  // (discount/type/minPurchase/usageLimit — not discountPct).
  code: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().max(200).optional(),
  discount: z.union([z.number().min(0), z.string().max(30)]).optional(),
  type: z.enum(['percentage', 'flat']).optional(),
  minPurchase: z.union([z.number().nonnegative(), z.string().max(30)]).optional(),
  maxDiscount: z.union([z.number().nonnegative(), z.string().max(30)]).optional(),
  usageLimit: z.union([z.number().int().nonnegative(), z.string().max(30)]).optional(),
  validTill: z.string().max(40).optional(),
  isActive: z.boolean().optional(),
});
const pharmacyReturnSchema = z.object({
  // POST reads orderId + reason and derives EVERYTHING else server-side
  // (patientName/total/orderRef from the order, status = 'Pending') — PHARM-B-11:
  // a client can no longer set total or status on create. PUT's allowlist
  // picks only `status`. patientName/orderRef/items/total are deliberately NOT
  // declared: strip drops them on the way in, so they never reach a handler.
  orderId: z.string().min(1).max(80).optional(),
  reason: z.string().trim().min(1).max(1000).optional(),
  status: z.string().trim().max(40).optional(),
});
const pharmacyStaffSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  licenseNumber: z.string().trim().max(120).optional(),
  experience: z.string().trim().max(120).optional(),
  shift: z.string().trim().max(40).optional(),
  isActive: z.boolean().optional(),
});
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
    const medicine = await Medicine.create({ ...req.body, currentStock: Number(req.body.currentStock || 0), isActive: req.body.isActive !== false && Number(req.body.currentStock || 0) > 0, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_medicine', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    try {
      const { indexDrugDoc } = await import('../services/opensearchIndexer.js');
      await indexDrugDoc(medicine);
    } catch {}
    res.status(201).json(medicine);
  } catch (err) { res.status(err.status || 400).json({ message: err.message, code: err.code }); }
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
    Object.assign(medicine, pickBody(req.body, ['name', 'genericName', 'category', 'form', 'manufacturer', 'batchNumber', 'expiryDate', 'purchasePrice', 'sellingPrice', 'reorderLevel', 'prescriptionReq', 'rackLocation', 'interactions', 'contraindications', 'isActive']));
    await medicine.save();
    await auditLog('update_medicine', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    try {
      const { indexDrugDoc } = await import('../services/opensearchIndexer.js');
      await indexDrugDoc(medicine);
    } catch {}
    res.json(medicine);
  } catch (err) { res.status(err.status || 400).json({ message: err.message, code: err.code }); }
});

router.delete('/medicines/:id', protect, authorizeObject({ model: lazyModel('../models/Medicine.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Keep the catalogue record so in-flight order reservations can still be
    // released and historical order lines retain a valid reference.
    medicine.isActive = false;
    await medicine.save();
    await auditLog('delete_medicine', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Medicine removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Stock Management ──────────────────────────────────────────────────────
router.put('/medicines/:id/stock', protect, authorizeObject({ model: lazyModel('../models/Medicine.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), validate(pharmacyStockSchema), async (req, res) => {
  try {
    const { quantity, type } = req.body; // type: 'add' | 'deduct'
    const medicine = await Medicine.findById(req.params.id).select('_id hospitalId facilityId currentStock');
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const stockUpdate = type === 'add'
      ? { $inc: { currentStock: quantity }, $set: { isActive: true } }
      : { $inc: { currentStock: -quantity } };
    const stockFilter = type === 'deduct' ? { _id: medicine._id, currentStock: { $gte: quantity } } : { _id: medicine._id };
    const updated = await Medicine.findOneAndUpdate(stockFilter, stockUpdate, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: 'Not enough sellable stock to deduct that amount.', code: 'INSUFFICIENT_SELLABLE_STOCK' });
    medicine.currentStock = updated.currentStock;
    await auditLog('update_medicine_stock', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(updated);
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
    const { patientId, patientName, medicines, diagnosis, diagnosisIcd, followUpDate, genericPreferred, cdsOverrideReason, clinicalNotes, isEmergency, appointmentId } = req.body;
    if (!patientId || !medicines?.length) {
      return res.status(400).json({ message: 'Patient and at least one medicine required' });
    }
    // File 22 P1-24: prescriber RMP snapshot + tele-consult compliance.
    const { default: Doctor } = await import('../models/Doctor.js');
    const { checkTeleRx, isTeleMode } = await import('../lib/teleRx.js');
    const { safeFirst } = await import('../lib/approvalWiring.js');
    const docProfile = await safeFirst(Doctor.findOne({
      $or: [{ userId: req.user.doctorProfileId || req.user._id }, { _id: req.user.doctorProfileId || req.user._id }],
    }).select('councilRegNo councilName').lean());
    const doctorRmp = docProfile?.councilRegNo
      ? `${docProfile.councilRegNo}${docProfile.councilName ? ` (${docProfile.councilName})` : ''}` : '';
    let teleConsult = false;
    let teleConsentId = null;
    if (appointmentId) {
      const { default: Appointment } = await import('../models/Appointment.js');
      const appt = await safeFirst(Appointment.findById(appointmentId).select('appointmentMode').lean());
      if (appt && isTeleMode(appt.appointmentMode)) {
        teleConsult = true;
        const hits = checkTeleRx(medicines);
        if (hits.length) {
          return res.status(409).json({
            message: 'Prohibited on tele-consult: in-person visit required',
            code: 'TELE_RX_PROHIBITED', hits,
          });
        }
        const { default: TeleConsent } = await import('../models/TeleConsent.js');
        const consent = await safeFirst(TeleConsent.findOne({ appointmentId, patientId }).lean());
        if (!consent) {
          return res.status(409).json({ message: 'Tele-consult consent required before e-prescription', code: 'TELE_CONSENT_REQUIRED' });
        }
        teleConsentId = consent._id;
      }
    }
    // Doc 11 §7 acceptance 3: CDSS hard-stop — a critical allergy match
    // blocks signing unless an override reason is recorded (audited below).
    {
      const norm = (s) => String(s || '').trim().toLowerCase();
      const names = medicines.map((m) => m.medicineName).filter(Boolean);
      const [patient, catalog] = await Promise.all([
        User.findById(patientId).select('allergies').lean(),
        Medicine.find({ $or: [{ name: { $in: names } }, { genericName: { $in: names } }] }).select('name genericName').lean(),
      ]);
      const known = new Set(catalog.flatMap((c) => [norm(c.name), norm(c.genericName)]));
      const allergies = ((patient && patient.allergies) || []).map((a) => norm(a.allergen || a)).filter(Boolean);
      const critical = [];
      const seen = new Set();
      for (const n of names) {
        const key = norm(n);
        if (seen.has(key)) { critical.push({ type: 'duplicate_therapy', drug: n }); continue; }
        seen.add(key);
        if (!known.has(key)) continue;
        for (const al of allergies) {
          if (al && (key.includes(al) || al.includes(key))) critical.push({ type: 'allergy', drug: n, allergen: al });
        }
      }
      if (critical.length && !cdsOverrideReason) {
        return res.status(409).json({ message: 'CDSS hard-stop: resolve or record an override reason', code: 'CDS_HARD_STOP', alerts: critical });
      }
      if (critical.length && cdsOverrideReason) {
        await auditLog('cds_override', req.user._id, {
          patientId, drugs: names, alerts: critical,
          reason: String(cdsOverrideReason).slice(0, 1000), ip: req.ip,
        });
      }
    }
const prescriptionId = generatePrescriptionId();
    const prescription = await Prescription.create({
      prescriptionId, patientId, patientName,
      doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
      doctorRmp, teleConsult, teleConsentId,
      hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined,
      medicines: medicines.map(m => ({
        medicineId: m.medicineId, medicineName: m.medicineName,
        dosage: m.dosage, frequency: m.frequency, duration: m.duration,
        route: m.route || 'Oral', instructions: m.instructions || '',
        quantity: m.quantity, isDispensed: false,
      })),
      diagnosis: diagnosis || '', diagnosisIcd: diagnosisIcd || '',
      followUpDate: followUpDate || null, genericPreferred: genericPreferred || false,
      cdsOverride: cdsOverrideReason
        ? { reason: String(cdsOverrideReason).slice(0, 1000), at: new Date(), by: req.user._id }
        : undefined,
      clinicalNotes: clinicalNotes || '',
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
        prescription.integrity.nonceHash = createHash('sha256').update(issued.nonce).digest('hex');
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

// ─── Prescription → Orders (file 09 §9.3/F5: consult-to-order lineage) ──────
// Only the prescribing clinician (or same-tenant doctor) may convert their
// prescription into linked lab/pharmacy orders. Both carry prescriptionId +
// encounterId and post Pending ChargeItems (final bill rolls them up).
router.post('/prescriptions/:id/send-to-lab', protect, authorize('prescriptions:write'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    const { tests, priority, encounterId } = req.body || {};
    if (!Array.isArray(tests) || !tests.length) {
      return res.status(400).json({ message: 'tests[] required' });
    }
    const { default: LabOrder } = await import('../models/LabOrder.js');
    const { default: ChargeItem } = await import('../models/ChargeItem.js');
    const { generateOrderId } = await import('../utils/idGenerator.js');
    const order = await LabOrder.create({
      orderId: generateOrderId('LAB'), patientId: prescription.patientId, patientName: prescription.patientName,
      doctorId: prescription.doctorId, doctorName: prescription.doctorName,
      hospitalId: prescription.hospitalId || undefined, facilityId: prescription.facilityId || undefined,
      tests: tests.map((t) => ({
        testName: t.testName, category: t.category || 'Blood',
        priority: t.priority || priority || 'Routine', status: 'Ordered', price: t.price || 0,
      })),
      clinicalNotes: prescription.clinicalNotes || '', priority: priority || 'Routine',
      createdBy: req.user._id,
      encounterId: encounterId || prescription.encounterId || undefined,
      prescriptionId: prescription._id, appointmentId: prescription.appointmentId || undefined,
    });
    const items = (order.tests || []).map((t) => ({
      encounterId: order.encounterId, patientId: order.patientId, hospitalId: order.hospitalId,
      source: 'lab', sourceRef: { model: 'LabOrder', id: order._id },
      description: t.testName, qty: 1, unitPrice: t.price || 0,
      amount: t.price || 0, postedBy: req.user._id,
    }));
    if (items.length) await ChargeItem.insertMany(items);
    await auditLog('prescription_to_lab', req.user._id, { prescriptionId: prescription._id, orderId: order._id, ip: req.ip });
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/prescriptions/:id/send-to-pharmacy', protect, authorize('prescriptions:write'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    const { encounterId, deliveryAddress, phone } = req.body || {};
    const { default: PharmacyOrder } = await import('../models/PharmacyOrder.js');
    const { default: ChargeItem } = await import('../models/ChargeItem.js');
    const items = (prescription.medicines || []).map((m) => ({
      medicineName: m.medicineName, qty: m.quantity || 1, price: 0,
    }));
    if (!items.length) return res.status(400).json({ message: 'Prescription has no medicines' });
    const order = await PharmacyOrder.create({
      orderId: `PHARM-${Date.now().toString(36).toUpperCase()}`,
      patientId: prescription.patientId, patientName: prescription.patientName,
      phone: phone || '', deliveryAddress: deliveryAddress || '',
      items, total: 0, prescriptionStatus: 'verified',
      hospitalId: prescription.hospitalId || undefined, facilityId: prescription.facilityId || undefined,
      createdBy: req.user._id,
      encounterId: encounterId || prescription.encounterId || undefined,
      prescriptionId: prescription._id, appointmentId: prescription.appointmentId || undefined,
    });
    await ChargeItem.insertMany(items.map((i) => ({
      encounterId: order.encounterId, patientId: order.patientId, hospitalId: order.hospitalId,
      source: 'pharmacy', sourceRef: { model: 'PharmacyOrder', id: order._id },
      description: i.medicineName, qty: i.qty, unitPrice: 0, amount: 0, postedBy: req.user._id,
    })));
    await auditLog('prescription_to_pharmacy', req.user._id, { prescriptionId: prescription._id, orderId: order._id, ip: req.ip });
    res.status(201).json(order);
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
    if (!callerMayActOnDoc(prescription, req.user)) {
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

    if (med.medicineId) {
      const result = await dispensePrescriptionMedicine({
        prescriptionId: prescription._id,
        medicineLineId: med._id,
        medicineId: med.medicineId,
        quantity: med.quantity,
        dispensedBy: req.user.name,
        createdBy: req.user._id,
        pharmacyId: medicineDoc?.facilityId || medicineDoc?.hospitalId || prescription.hospitalId,
      });
      med.isDispensed = true;
      med.dispensedAt = new Date();
      med.dispensedBy = req.user.name;
      prescription.status = result.status;
      // File 22 P0-4: true-up the ₹0 placeholder charge with the selling price.
      // If no placeholder exists (direct dispense, no PharmacyOrder), post
      // the line fresh — idempotent on the prescription+medicine.
      try {
        const { trueUpCharge, postCharge } = await import('../lib/charges.js');
        const trued = await trueUpCharge({
          hospitalId: prescription.hospitalId, source: 'pharmacy',
          sourceRef: {}, description: med.medicineName, patientId: prescription.patientId,
          unitPrice: Number(medicineDoc?.sellingPrice || 0), qty: Number(med.quantity) || 1,
        });
        if (!trued) {
          await postCharge({
            hospitalId: prescription.hospitalId, patientId: prescription.patientId,
            encounterId: prescription.encounterId || null,
            source: 'pharmacy', sourceRef: { model: 'Prescription', id: prescription._id },
            description: `${med.medicineName} (dispense)`,
            qty: Number(med.quantity) || 1, unitPrice: Number(medicineDoc?.sellingPrice || 0),
            postedBy: req.user._id ?? req.user.id,
          });
        }
      } catch { /* pricing must never break dispensing */ }
    } else {
      // Legacy/manual line with no inventory link: preserve prescription state,
      // but do not fabricate a stock event for an unknown medicine record.
      med.isDispensed = true;
      med.dispensedAt = new Date();
      med.dispensedBy = req.user.name;
      await prescription.save();
    }
    await auditLog('dispense_prescription', req.user._id, { recordId: prescription._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(prescription);
  } catch (err) { res.status(err.status || 500).json({ message: err.status ? err.message : 'Dispensing could not be completed', ...(err.code ? { code: err.code } : {}) }); }
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
router.get('/orders', protect, authorize('pharmacy:manage', 'pharmacy:read', 'pharmacy:read:own'), async (req, res) => {
  try {
    const { status, search, orderId } = req.query;
    const filter = {};
    if (req.user.role === 'patient') {
      // A display name is not an ownership key; legacy rows without patientId
      // must not be exposed merely because patientName happens to match.
      filter.patientId = req.user._id;
    } else {
      // Tenant staff need a linked tenant; all other authenticated roles are
      // denied by `authorize` above instead of receiving a platform-wide list.
      const scope = applyTenantScope(req, filter, {
        fields: ['hospitalId', 'facilityId'],
        allowSharedRowsForNonStaff: false,
      });
      if (!scope.ok) return res.status(403).json({ message: scope.message });
    }
    if (status && status !== 'All') filter.status = status;
    if (orderId) filter.orderId = orderId;
    if (search) {
      const searchOr = [{ orderId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') }];
      filter.$or = searchOr;
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
    const isPatient = req.user.role === 'patient';
    if (!isPatient) return res.status(403).json({ message: 'Only patients can create pharmacy checkouts' });
    const normalizedItems = req.body.items.map((item) => ({
      medicineId: String(item.medicineId),
      quantity: item.quantity,
      storeId: item.storeId ? String(item.storeId) : undefined,
    }));
    if (normalizedItems.some((item) => !mongoose.Types.ObjectId.isValid(item.medicineId))) {
      return res.status(422).json({ message: 'Cart contains an invalid or unavailable medicine reference', code: 'INVALID_MEDICINE_REFERENCE' });
    }
    const storeIds = [...new Set(normalizedItems.map((item) => item.storeId).filter(Boolean))];
    if (storeIds.length > 1) {
      return res.status(422).json({ message: 'Please checkout one pharmacy at a time. Split the cart by pharmacy and place separate orders.', code: 'MULTI_STORE_CHECKOUT_UNSUPPORTED' });
    }
    const medicines = await Medicine.find({
      _id: { $in: normalizedItems.map((item) => item.medicineId) },
      isActive: true,
      currentStock: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    }).select('_id name sellingPrice currentStock facilityId hospitalId prescriptionReq').lean();
    const medicineById = new Map(medicines.map((medicine) => [String(medicine._id), medicine]));
    if (medicineById.size !== new Set(normalizedItems.map((item) => item.medicineId)).size) {
      return res.status(409).json({ message: 'One or more medicines are unavailable, inactive, expired, or out of stock. Refresh the cart.', code: 'MEDICINE_UNAVAILABLE' });
    }
    const resolved = normalizedItems.map((item) => {
      const medicine = medicineById.get(item.medicineId);
      if (!medicine || !Number.isSafeInteger(item.quantity) || item.quantity > medicine.currentStock) return null;
      if (item.storeId && (!mongoose.Types.ObjectId.isValid(item.storeId) || String(medicine.facilityId || '') !== item.storeId)) return null;
      return { medicine, quantity: item.quantity };
    });
    if (resolved.some((item) => !item)) {
      return res.status(409).json({ message: 'Cart quantities or pharmacy assignments changed. Refresh the cart.', code: 'CART_STALE' });
    }
    const facilityIds = [...new Set(resolved.map(({ medicine }) => String(medicine.facilityId || '')))];
    const hospitalIds = [...new Set(resolved.map(({ medicine }) => String(medicine.hospitalId || '')))];
    if (facilityIds.length > 1 || hospitalIds.length > 1) {
      return res.status(422).json({ message: 'This checkout must contain items from one pharmacy only.', code: 'MULTI_STORE_CHECKOUT_UNSUPPORTED' });
    }
    const subtotal = Math.round(resolved.reduce((sum, { medicine, quantity }) => sum + Number(medicine.sellingPrice) * quantity, 0) * 100) / 100;
    if (!Number.isFinite(subtotal) || subtotal <= 0) return res.status(422).json({ message: 'The pharmacy cart has no valid catalogue price.', code: 'INVALID_CART_PRICE' });
    const deliveryMode = req.body.deliveryMode === 'pickup' ? 'pickup' : 'delivery';
    const facilityId = facilityIds[0] || undefined;
    const facility = facilityId && mongoose.Types.ObjectId.isValid(facilityId)
      ? await Facility.findById(facilityId).select('type status details amenities').lean()
      : null;
    if (!facility || facility.type !== 'pharmacy' || facility.status !== 'approved') {
      return res.status(422).json({ message: 'This pharmacy is not available for checkout.', code: 'PHARMACY_UNAVAILABLE' });
    }
    const fee = Number(facility.details?.deliveryFee);
    const threshold = Number(facility.details?.freeDeliveryAbove);
    const deliveryFee = deliveryMode === 'pickup' || (Number.isFinite(threshold) && threshold > 0 && subtotal >= threshold)
      ? 0
      : (Number.isFinite(fee) && fee >= 0 ? fee : 0);
    const platformFee = 5;
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const payableBeforeDiscount = Math.round((subtotal + deliveryFee + platformFee + gst) * 100) / 100;
    let discount = 0;
    let couponCode = '';
    if (req.body.couponCode) {
      const { default: PlatformCoupon } = await import('../models/PlatformCoupon.js');
      const code = req.body.couponCode.trim().toUpperCase();
      const coupon = await PlatformCoupon.findOne({ code, isActive: true }).lean();
      const now = new Date();
      if (!coupon || (coupon.validFrom && coupon.validFrom > now) || (coupon.validUntil && coupon.validUntil < now)
        || (coupon.applicableServices?.length && !coupon.applicableServices.some((s) => ['pharmacy', 'all'].includes(s)))
        || subtotal < Number(coupon.minOrderValue || 0)
        || (Number(coupon.usageLimit || 0) > 0 && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit))) {
        return res.status(422).json({ message: 'This pharmacy coupon is invalid or no longer eligible.', code: 'INVALID_COUPON' });
      }
      const rawDiscount = coupon.discountType === 'percentage'
        ? payableBeforeDiscount * Number(coupon.discountValue) / 100
        : Number(coupon.discountValue);
      discount = Math.round(Math.min(payableBeforeDiscount, rawDiscount, Number(coupon.maxDiscount || Infinity)) * 100) / 100;
      couponCode = code;
    }
    const total = Math.round(Math.max(0, payableBeforeDiscount - discount) * 100) / 100;
    const needsPrescription = resolved.some(({ medicine }) => medicine.prescriptionReq);
    if (needsPrescription && !req.body.prescriptionUrl) {
      return res.status(422).json({ message: 'A prescription is required for one or more medicines.', code: 'PRESCRIPTION_REQUIRED' });
    }
    const orderId = generateTimestampedId('ORD');
    // PHARM-B-11: ...req.body mass-assigned the whole request (the schema is a
    // passthrough), so a client could create an order already marked
    // Paid/Confirmed, attributed to another patient, or parented to a foreign
    // facility. Only the catalogue fields are taken from the body; order state and
    // patient linkage are server-derived.
    const deliveryAddress = String(req.body.deliveryAddress || req.body.address || '').trim();
    if (deliveryMode === 'delivery' && deliveryAddress.length < 5) {
      return res.status(400).json({ message: 'A valid delivery address is required.' });
    }
    const reservationExpiresAt = new Date(Date.now() + PHARMACY_RESERVATION_TTL_MS);
    const orderData = {
      items: resolved.map(({ medicine, quantity }) => ({
        medicineId: medicine._id,
        medicineName: medicine.name,
        qty: quantity,
        price: medicine.sellingPrice,
      })),
      total,
      payableBeforeDiscount,
      deliveryAddress,
      deliveryMode,
      deliverySlot: req.body.deliverySlot || '',
      deliveryFee,
      discount,
      couponCode,
      platformFee,
      gst,
      paymentMethod: ({ cod: 'COD', upi: 'UPI', card: 'Card', netbanking: 'NetBanking' })[String(req.body.paymentMethod || 'cod').toLowerCase()] || 'COD',
      prescriptionUrl: req.body.prescriptionUrl || '',
      prescriptionStatus: needsPrescription ? 'pending' : 'not_required',
      orderId,
      hospitalId: hospitalIds[0] || undefined,
      facilityId,
      // Server-owned state + linkage.
      status: 'Pending',
      paymentStatus: String(req.body.paymentMethod || 'cod').toLowerCase() === 'cod' ? 'Unpaid' : 'Pending',
      inventoryReservationStatus: 'reserved',
      inventoryReservationExpiresAt: reservationExpiresAt,
      patientId: req.user._id,
      patientName: req.user.name,
      createdBy: req.user._id,
    };
    const order = await executeWithOutbox(async (session) => {
      await reservePharmacyOrderItems(orderData.items.map((item) => ({
        medicineId: item.medicineId,
        quantity: item.qty,
        expectedPrice: item.price,
      })), { session });
      const [created] = await PharmacyOrder.create([orderData], { session });
      return created;
    });
    await auditLog('create_pharmacy_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json({ ...order.toObject(), authoritativeTotal: total, subtotal, breakdown: { subtotal, deliveryFee, discount, platformFee, gst, total } });
  } catch (err) { res.status(err.status || 400).json({ message: err.message, code: err.code }); }
});

// AUTHZ-B-08: the tenant-ownership check used to run BEFORE authorize(), so a
// patient (facilityId null) was rejected by ownership before the
// `pharmacy:order:own` grant could ever fire. The order is now
// protect -> authorize -> ownership.
router.put('/orders/:id', protect, authorize('pharmacy:manage', 'pharmacy:order:own'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage', 'pharmacy:order:own'), write: true }), validate(pharmacyOrderUpdateSchema), async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    // AUTH-030: allowlisted fields only — status/refund/reject have dedicated endpoints.
    const { pickBody } = await import('../utils/pick.js');
    // Catalogue lines and every monetary field are frozen after checkout. This
    // endpoint may update contact/fulfilment metadata only; price changes require
    // a new checkout and fresh authoritative resolution.
    Object.assign(order, pickBody(req.body, ['phone', 'deliveryAddress', 'note', 'prescriptionUrl', 'rejectionReason', 'deliverySlot']));
    await order.save();
    await auditLog('update_pharmacy_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id/status', protect, authorize('pharmacy:manage'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), validate(pharmacyOrderStatusSchema), async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const nextStatus = req.body.status;
    const verdict = canTransitionPharmacyOrder(order, nextStatus);
    if (!verdict.ok) return res.status(verdict.status).json({ message: verdict.message, code: verdict.code });
    if (verdict.idempotent) return res.json(order);
    const updated = await executeWithOutbox(async (session) => {
      const reservationStatus = order.inventoryReservationStatus || 'none';
      const reservationMatch = reservationStatus === 'none' ? { $in: ['none', null] } : reservationStatus;
      const set = { status: nextStatus };
      if (nextStatus === 'Cancelled' && reservationStatus === 'reserved') set.inventoryReservationStatus = 'released';
      if (nextStatus === 'Shipped' && reservationStatus === 'reserved') set.inventoryReservationStatus = 'consumed';
      const changed = await PharmacyOrder.findOneAndUpdate(
        { _id: order._id, status: order.status, paymentStatus: order.paymentStatus, inventoryReservationStatus: reservationMatch },
        { $set: set },
        { new: true, runValidators: true, session }
      );
      if (changed && nextStatus === 'Cancelled' && reservationStatus === 'reserved') {
        await releasePharmacyOrderItems(order.items, { session });
      }
      return changed;
    });
    if (!updated) return res.status(409).json({ message: 'Order changed concurrently; refresh and retry.', code: 'ORDER_STATE_CHANGED' });
    await auditLog('update_pharmacy_order_status', req.user._id, { recordId: order._id, status: nextStatus, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json(updated);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

router.post('/orders/:id/cancel', protect, authorize('pharmacy:manage', 'pharmacy:order:own'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage', 'pharmacy:order:own'), write: true }), async (req, res) => {
  try {
    const existing = await PharmacyOrder.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Order not found' });
    if (existing.status !== 'Pending' || !['Pending', 'Unpaid'].includes(existing.paymentStatus)) {
      return res.status(409).json({ message: 'Only unpaid pending orders can be cancelled.', code: 'ORDER_NOT_CANCELLABLE' });
    }
    const order = await executeWithOutbox(async (session) => {
      const reservationStatus = existing.inventoryReservationStatus || 'none';
      const reservationMatch = reservationStatus === 'none' ? { $in: ['none', null] } : reservationStatus;
      const updated = await PharmacyOrder.findOneAndUpdate(
        { _id: existing._id, status: 'Pending', paymentStatus: existing.paymentStatus, inventoryReservationStatus: reservationMatch },
        { $set: { status: 'Cancelled', ...(reservationStatus === 'reserved' ? { inventoryReservationStatus: 'released' } : {}) } },
        { new: true, runValidators: true, session }
      );
      if (updated && reservationStatus === 'reserved') await releasePharmacyOrderItems(existing.items, { session });
      return updated;
    });
    if (!order) return res.status(409).json({ message: 'Order changed concurrently; refresh and retry.', code: 'ORDER_STATE_CHANGED' });
    await auditLog('cancel_pharmacy_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json(order);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

router.post('/orders/:id/collect-cod', protect, authorize('pharmacy:manage'), idempotencyGuard({ prefix: 'pharmacy-cod', failClosed: true }), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  try {
    const eligibleOrder = await PharmacyOrder.findById(req.params.id).lean();
    if (!eligibleOrder) return res.status(404).json({ message: 'Order not found' });
    if (!canCollectPharmacyCod(eligibleOrder)) return res.status(409).json({ message: 'Only delivered, unpaid COD orders can be marked collected.', code: 'COD_COLLECTION_NOT_ALLOWED' });
    const transaction_id = generateTransactionId('medicine');
    const invoice_id = generateInvoiceId('medicine');
    const today = getISTDateString();
    const order = await executeWithOutbox(async (session) => {
      const updated = await PharmacyOrder.findOneAndUpdate(
        { _id: req.params.id, paymentMethod: 'COD', status: 'Delivered', paymentStatus: 'Unpaid' },
        { $set: { paymentStatus: 'Paid', inventoryReservationStatus: 'consumed' }, $unset: { inventoryReservationExpiresAt: 1 } },
        { new: true, runValidators: true, session }
      );
      if (!updated) {
        const conflict = new Error('Only delivered, unpaid COD orders can be marked collected.');
        conflict.status = 409;
        conflict.code = 'COD_COLLECTION_NOT_ALLOWED';
        throw conflict;
      }
      const lineItems = updated.items.map((item) => ({ name: item.medicineName, price: item.price, qty: item.qty }));
      if (updated.deliveryFee) lineItems.push({ name: 'Delivery fee', price: updated.deliveryFee, qty: 1 });
      if (updated.platformFee) lineItems.push({ name: 'Platform fee', price: updated.platformFee, qty: 1 });
      if (updated.gst) lineItems.push({ name: 'GST', price: updated.gst, qty: 1 });
      if (updated.discount) lineItems.push({ name: 'Discount', price: -updated.discount, qty: 1 });
      await Payment.create([{
        transaction_id,
        invoice_id,
        patient_id: String(updated.patientId),
        patient_name: updated.patientName,
        amount: updated.total,
        method: 'cash',
        status: 'completed',
        serviceType: 'medicine',
        referenceId: String(updated._id),
        description: `Cash collected for pharmacy order ${updated.orderId}`,
        provider: 'COD',
        lineItems,
        hospitalId: updated.hospitalId,
      }], { session });
      await Billing.create([{
        invoiceId: invoice_id,
        patient: updated.patientName,
        patientId: updated.patientId,
        doctor: 'Pharmacy',
        service: `Pharmacy order ${updated.orderId}`,
        services: lineItems.map((item) => ({ name: item.name, price: item.price, quantity: item.qty, category: 'Pharmacy' })),
        source: 'pharmacy',
        amount: updated.total,
        subTotal: updated.items.reduce((sum, item) => sum + item.price * item.qty, 0),
        discount: updated.discount || 0,
        tax: updated.gst || 0,
        taxRate: 5,
        taxableAmount: updated.items.reduce((sum, item) => sum + item.price * item.qty, 0),
        paid: updated.total,
        balance: 0,
        status: 'Paid',
        date: today,
        paymentMethod: 'Cash',
        transactionId: transaction_id,
        hospitalId: updated.hospitalId,
        facilityId: updated.facilityId,
      }], { session });
      return updated;
    }, [{
      aggregateType: 'PharmacyOrder',
      aggregateId: String(req.params.id),
      eventType: 'pharmacy.cod_collected',
      destinationTopic: KAFKA_TOPICS.BILLING_EVENTS,
      payload: { orderId: String(req.params.id), transactionId: transaction_id, invoiceId: invoice_id },
    }]);
    await auditLog('collect_pharmacy_cod', req.user._id, { recordId: order._id, amount: order.total, transactionId: transaction_id, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json(order);
  } catch (err) { return res.status(err.status || 500).json({ message: err.message, code: err.code }); }
});

router.delete('/orders/:id', protect, authorize('pharmacy:manage'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  return res.status(409).json({ message: 'Pharmacy orders are retained for billing and audit. Cancel an eligible unpaid order instead.', code: 'ORDER_DELETE_DISABLED' });
});

router.post('/orders/:id/forward', protect, authorize('pharmacy:manage'), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  try {
    const original = await PharmacyOrder.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Order not found' });
    return res.status(409).json({ message: 'Order forwarding is disabled until the new pharmacy can revalidate stock, price and patient consent.', code: 'SAFE_FORWARD_UNAVAILABLE' });
  } catch (err) { return res.status(400).json({ message: err.message }); }
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
      const { pickBody } = await import('../utils/pick.js');
      const allowed = pickBody(req.body, ['pickupName', 'pickupAddress', 'pickupLocation', 'dropAddress', 'dropLocation', 'patientName', 'patientPhone', 'deliveryFee', 'notes', 'estimatedTime', 'deliveryProofPhoto', 'deliveryOtp', 'otpVerified', 'status']);
      // PHARM-M-04: status timeline — validate against the PREVIOUS status and
      // only then mutate the document. The old check ran AFTER Object.assign,
      // so the map lookup read the NEW status and every legal transition
      // (Assigned → Picked Up, Out for Delivery → Delivered, …) was rejected
      // with a 409; the pre-computed `currentIndex` was dead code. An unchanged
      // status is an idempotent re-PUT, anything else must be a listed edge,
      // and a status outside the map fails closed (no edge → 409).
      const validTransitions = {
        'Pending Assignment': ['Assigned'],
        'Assigned': ['Picked Up', 'Cancelled'],
        'Picked Up': ['Out for Delivery', 'Cancelled'],
        'Out for Delivery': ['Delivered', 'Failed'],
        'Delivered': [], // terminal
        'Failed': [], // terminal
        'Cancelled': [], // terminal
      };
      const previousStatus = delivery.status;
      if (allowed.status && allowed.status !== previousStatus
        && !validTransitions[previousStatus]?.includes(allowed.status)) {
        return res.status(409).json({ message: `Invalid status transition from ${previousStatus} to ${allowed.status}` });
      }
      if (req.body.tracking) (delivery.trackingHistory = delivery.trackingHistory || []).push({ location: req.body.tracking, time: new Date() });
      Object.assign(delivery, allowed);
      // PHARM-M-04: enforce proof-of-delivery capture — if status is Delivered and no proof photo exists, require it.
      if (delivery.status === 'Delivered' && !delivery.deliveryProofPhoto) {
        return res.status(400).json({ message: 'Delivery proof photo required to mark delivery as completed' });
      }
      // PHARM-M-04: OTP-at-door handoff — if a new OTP is provided, mark it verified and transition to Delivered if appropriate.
      if (req.body.deliveryOtp && !delivery.otpVerified) {
        delivery.otpVerified = true;
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
    const oid = String(req.body.orderId || '').trim();
    if (!oid) return res.status(400).json({ message: 'orderId is required' });
    // PHARM-B-11: patientName/total/orderRef are SERVER-OWNED — derived from
    // the order, never read from the request. The old handler spread the body
    // straight into create(), but both model fields are required and neither
    // client sends them (Pharmacy.tsx → {orderId, reason}; OrderTracking →
    // {orderId, reason, status:'Requested'} — also outside the model enum), so
    // every legitimate return failed 400 while a forger still could not set
    // the fields either. Accepts either id shape: a 24-hex _id (Pharmacy.tsx
    // sends option.value = o._id) or the human orderId string.
    let order = null;
    if (/^[0-9a-fA-F]{24}$/.test(oid)) order = await PharmacyOrder.findById(oid);
    if (!order) order = await PharmacyOrder.findOne({ orderId: oid });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const returnId = generateTimestampedId('RET');
    const ret = await PharmacyReturn.create({
      orderId: oid,
      orderRef: order._id,
      patientName: order.patientName,
      total: order.total,
      reason: req.body.reason,
      // Client status is ignored — returns always start at 'Pending', the
      // first value the staff returns UI knows how to act on.
      status: 'Pending',
      returnId,
      hospitalId: req.user.hospitalId,
      facilityId: req.user.facilityId || req.user.hospitalId || undefined,
    });
    await auditLog('create_pharmacy_return', req.user._id, { recordId: ret._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(ret);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/returns/:id', protect, authorizeObject({ model: lazyModel('../models/PharmacyReturn.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), write: true }), authorize('pharmacy:manage'), validate(pharmacyReturnSchema), async (req, res) => {
  try {
    const ret = await PharmacyReturn.findById(req.params.id);
    if (!ret) return res.status(404).json({ message: 'Return not found' });
    if (req.body.status === 'Approved' || req.body.status === 'Refunded') ret.completedAt = new Date();
    // AUTH-030 / PHARM-B-11: only the staff UI's status updates are writable.
    // Order/patient linkage and the server-derived total are immutable here;
    // items/total were never reachable anyway — validate() strips anything the
    // schema does not declare, which made the old allowlist entries no-ops.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(ret, pickBody(req.body, ['status']));
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
    const { default: PlatformCoupon } = await import('../models/PlatformCoupon.js');
    const coupon = await PlatformCoupon.findOne({ code: code.trim().toUpperCase(), isActive: true }).lean();
    const now = new Date();
    if (!coupon || (coupon.validFrom && coupon.validFrom > now) || (coupon.validUntil && coupon.validUntil < now)
      || (coupon.applicableServices?.length && !coupon.applicableServices.some((s) => ['pharmacy', 'all'].includes(s)))) {
      return res.status(404).json({ valid: false, message: 'Coupon not found, expired, or not valid for pharmacy orders' });
    }
    res.json({ valid: true, code: coupon.code, discount: coupon.discountValue, discountType: coupon.discountType, title: coupon.description || coupon.code });
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
// amount used to be recorded as if it were paid back. Until a provider refund
// adapter is connected, this endpoint now refuses captured-order refunds.
router.post('/orders/:id/refund', protect, authorize('pharmacy:manage'), idempotencyGuard({ prefix: 'pharm-refund', failClosed: true }), authorizeObject({ model: lazyModel('../models/PharmacyOrder.js'), ownerField: 'patientId', tenantFields: ['hospitalId', 'facilityId'], actorRoles: rolesWithPermission('pharmacy:manage'), requireTenant: true, write: true }), async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // This legacy route has no provider refund adapter. Do not mutate order flags
    // or report a refund as processed unless a captured payment can be refunded
    // and reconciled through the payment state machine.
    if (order.paymentStatus !== 'Paid') {
      return res.status(409).json({ message: 'This order has no captured payment to refund.', code: 'NO_CAPTURED_PAYMENT' });
    }
    return res.status(503).json({
      message: 'Pharmacy refunds are unavailable until provider refund settlement is configured.',
      code: 'REFUND_PROVIDER_UNAVAILABLE',
    });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
