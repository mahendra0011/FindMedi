import express from 'express';
import Rental from '../models/Rental.js';
import AssetUnit from '../models/AssetUnit.js';
import Provider from '../models/Provider.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import {
  validate, createAssetUnitSchema, updateAssetUnitSchema, assetSanitiseSchema,
  createRentalSchema, rentalActionSchema,
} from '../utils/validate.js';
import { protect } from '../middleware/auth.js';
import {
  RENTAL_STATUS, RENTAL_TRANSITIONS, ASSET_STATUS,
  canTransition, rentalDays, computeRentalTotals, computeDepositRefund,
} from '../lib/flowStates.js';

// FLOW-G (5.md 8) — equipment rental.
//
//   REQUESTED -> APPROVED -> ACTIVE -> RETURNED -> INSPECTION -> CLOSED
//   | REJECTED | CANCELLED, and CLOSED -> DEPOSIT_REFUNDED on close.
//
// Three rules carry the flow:
//   1. SERVER-OWNED PRICING (5.md 15): ratePerDay and deposit are read from the
//      AssetUnit at creation; the body carries only dates. A renter cannot send
//      a price and a vendor cannot retroactively reprice an existing rental.
//   2. ONE transition = one CAS on `status` (same shape as routes/quotes.js):
//      two approve clicks cannot double-write history, and an illegal move is a
//      409 from the transition table in lib/flowStates.js, not a silent enum
//      failure.
//   3. SANITISATION before close: when the unit carries a cycle, the vendor
//      must have recorded a sanitisation AFTER the return, or close is refused
//      — the record is what 5.md 8 asks for, and a record that may predate the
//      return proves nothing.
//
// Deposit: the row computes what the customer gets back (computeDepositRefund,
// clamped to the held deposit minus assessed damage) at CLOSED and moves the
// money as its own step at DEPOSIT_REFUNDED. The actual ledger transfer is the
// same open seam as quotes.js escrow (no escrow ledger entry exists yet) —
// `depositPaymentId` is the field that will carry it.

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;

const denyTransition = (res, from, to) => res.status(409).json({
  message: `Rental cannot move from ${from} to ${to}`,
  code: 'ILLEGAL_STATE_TRANSITION',
  from,
  to,
});

const historyEntry = (req, from, to) => ({
  from, to, by: actorId(req), role: String(req.user.role || ''), at: new Date(),
});

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The caller's own providers, or [] when they own none. */
const ownedProviderIds = async (req) => {
  const owned = await Provider.find({ ownerUserId: actorId(req) }).select('_id').lean();
  return owned.map((p) => String(p._id));
};

/** Load + assert the transition + CAS it. Returns the updated row or null. */
async function runTransition(req, item, to, set = {}) {
  if (!canTransition(RENTAL_TRANSITIONS, item.status, to)) return { conflict: item.status };
  const updated = await Rental.findOneAndUpdate(
    { _id: item._id, status: item.status },
    {
      $set: { ...set, status: to },
      $push: { history: historyEntry(req, item.status, to) },
    },
    { new: true, runValidators: true },
  );
  if (!updated) return { conflict: item.status };
  return { item: updated };
}

/** Keep the unit's status honest for the transitions that own it. */
async function setAssetStatus(assetUnitId, status) {
  await AssetUnit.updateOne(
    { _id: assetUnitId, status: { $ne: status } },
    { $set: { status } },
  );
}

// ─── Assets (the catalogue half) ────────────────────────────────────────────

// authz: public
//
// The rentable inventory anyone may browse. Only listed, available units; the
// rate shown is the unit's stored rate (the same one the rental will charge).
router.get('/assets', async (req, res) => {
  try {
    const filter = { isListed: true };
    if (req.query.status) filter.status = String(req.query.status);
    else filter.status = ASSET_STATUS.AVAILABLE;
    if (req.query.vendorId && OBJECT_ID.test(String(req.query.vendorId))) {
      filter.vendorId = String(req.query.vendorId);
    }
    if (req.query.kind) filter.kind = String(req.query.kind);
    if (req.query.q) filter.productName = { $regex: escapeRegex(String(req.query.q)), $options: 'i' };

    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? 20), 10) || 20, 1), 100);
    const page = Math.max(Number.parseInt(String(req.query.page ?? 1), 10) || 1, 1);
    const [assets, total] = await Promise.all([
      AssetUnit.find(filter)
        .select('-maintenance -__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AssetUnit.countDocuments(filter),
    ]);
    return res.json({ assets, total, page, pages: Math.ceil(total / limit) || 1, limit });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

//
// A vendor lists a unit. `vendorId` names the provider; the handler proves the
// CALLER owns that provider (session identity vs ownerUserId), so a renter
// cannot list inventory under somebody else's shop. Serial is the unit's
// identity - uniqueness is the model's unique index, not a pre-read.
// authz: self
router.post('/assets', protect, bookingLimiter, validate(createAssetUnitSchema), async (req, res) => {
  try {
    const provider = await Provider.findById(req.body.vendorId).lean();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    if (String(provider.ownerUserId) !== String(actorId(req)) && req.user.role !== 'superadmin') {
      return res.status(404).json({ message: 'Provider not found' });
    }
    if (!['approved', 'live'].includes(provider.status)) {
      return res.status(409).json({ message: 'Provider is not accepting listings', code: 'PROVIDER_NOT_TAKING_LISTINGS' });
    }
    const { vendorId, ...data } = req.body;
    const asset = await AssetUnit.create({ ...data, vendorId, status: ASSET_STATUS.AVAILABLE });
    await auditLog('asset_unit_created', actorId(req), {
      assetUnitId: asset._id, vendorId, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(asset);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Serial already exists', code: 'DUPLICATE_SERIAL' });
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.patch('/assets/:id', protect, requireObjectId, validate(updateAssetUnitSchema), authorizeObject({
  model: AssetUnit,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.vendorId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    Object.assign(req.scoped, req.body);
    await req.scoped.save();
    await auditLog('asset_unit_updated', actorId(req), { assetUnitId: req.scoped._id, ip: req.ip });
    return res.json(req.scoped);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// The sanitisation record 5.md 8 asks for: stamping it is what later lets
// `POST /:id/close` prove the unit was cleaned AFTER it came back.
router.post('/assets/:id/sanitise', protect, requireObjectId, bookingLimiter, validate(assetSanitiseSchema), authorizeObject({
  model: AssetUnit,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.vendorId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const asset = req.scoped;
    asset.lastSanitisedAt = req.body.performedAt ? new Date(req.body.performedAt) : new Date();
    await asset.save();
    await auditLog('asset_unit_sanitised', actorId(req), {
      assetUnitId: asset._id, lastSanitisedAt: asset.lastSanitisedAt, ip: req.ip,
    });
    return res.json(asset);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// ─── Rentals (the lifecycle) ────────────────────────────────────────────────

//
// Either half of the conversation sees their own rentals: the renter (userId)
// or the vendor's owner (vendorOwnerId), never somebody else's.
// authz: self
router.get('/', protect, async (req, res) => {
  try {
    const me = actorId(req);
    const filter = {};
    if (req.user.role !== 'superadmin') {
      const scopes = [{ userId: me }];
      const providerIds = await ownedProviderIds(req);
      if (providerIds.length) scopes.push({ vendorOwnerId: { $in: providerIds } });
      filter.$or = scopes;
    }
    if (req.query.status && RENTAL_TRANSITIONS[req.query.status]) filter.status = String(req.query.status);
    if (req.query.vendorId) filter.vendorId = String(req.query.vendorId);

    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? 20), 10) || 20, 1), 100);
    const page = Math.max(Number.parseInt(String(req.query.page ?? 1), 10) || 1, 1);
    const [rentals, total] = await Promise.all([
      Rental.find(filter)
        .select('-updatedAt -__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Rental.countDocuments(filter),
    ]);
    return res.json({ rentals, total, page, pages: Math.ceil(total / limit) || 1, limit });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.get('/:id', protect, requireObjectId, authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerFields: ['userId', 'vendorOwnerId'],
  actorRoles: [],
  read: true,
}), (req, res) => res.json(req.scoped));

//
// The renter creates the request; the DATES are the only variable part of the
// price. Days, rate, deposit and total all come from the unit via
// computeRentalTotals — `rentalAmount` in the body is a 400 from the strict
// schema. An overlap check keeps two REQUESTED rows on the same unit for the
// same window from both being approvable later; the vendor's approve re-checks
// availability because that is when the unit actually leaves the shelf.
// authz: self
router.post('/', protect, bookingLimiter, idempotencyGuard({ prefix: 'rental-request' }), validate(createRentalSchema), async (req, res) => {
  try {
    const unit = await AssetUnit.findById(req.body.assetUnitId).lean();
    if (!unit || !unit.isListed) return res.status(404).json({ message: 'Not found' });
    if (unit.status !== ASSET_STATUS.AVAILABLE) {
      return res.status(409).json({ message: 'Unit is not available', code: 'UNIT_UNAVAILABLE' });
    }
    const startAt = new Date(req.body.startAt);
    const endAt = new Date(req.body.endAt);

    const overlap = await Rental.findOne({
      assetUnitId: unit._id,
      status: { $in: [RENTAL_STATUS.REQUESTED, RENTAL_STATUS.APPROVED, RENTAL_STATUS.ACTIVE] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    }).lean();
    if (overlap) return res.status(409).json({ message: 'Unit already booked for these dates', code: 'DATE_CONFLICT' });

    const provider = await Provider.findById(unit.vendorId).lean();
    if (!provider || !['approved', 'live'].includes(provider.status) || !provider.ownerUserId) {
      return res.status(409).json({ message: 'Vendor is not taking rentals', code: 'VENDOR_NOT_TAKING_RENTALS' });
    }

    const totals = computeRentalTotals({
      ratePerDay: unit.ratePerDay,
      days: rentalDays(startAt, endAt),
      deposit: unit.deposit,
    });
    const rental = await Rental.create({
      userId: actorId(req),
      vendorId: provider._id,
      vendorOwnerId: provider.ownerUserId,
      assetUnitId: unit._id,
      startAt,
      endAt,
      days: totals.days,
      ratePerDay: totals.ratePerDay,
      rentalAmount: totals.rentalAmount,
      deposit: totals.deposit,
      status: RENTAL_STATUS.REQUESTED,
      requestedAt: new Date(),
      conditionOut: req.body.conditionOut || [],
      sanitisation: { requiredCycleDays: unit.sanitisationCycleDays || 0 },
    });
    await auditLog('rental_requested', actorId(req), {
      rentalId: rental._id, assetUnitId: unit._id, days: totals.days, rentalAmount: totals.rentalAmount, ip: req.ip,
    });
    return res.status(201).json(rental);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Vendor approves. Availability is re-checked HERE (the approve is the moment
// the unit leaves the shelf): the unit must still be available and the window
// must not overlap another live rental — a REQUESTED row racing another one
// cannot both be approved.
router.post('/:id/approve', protect, requireObjectId, bookingLimiter, validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerField: 'vendorOwnerId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    const unit = await AssetUnit.findById(current.assetUnitId).lean();
    if (!unit || unit.status !== ASSET_STATUS.AVAILABLE) {
      return res.status(409).json({ message: 'Unit is no longer available', code: 'UNIT_UNAVAILABLE' });
    }
    const overlap = await Rental.findOne({
      _id: { $ne: current._id },
      assetUnitId: current.assetUnitId,
      status: { $in: [RENTAL_STATUS.APPROVED, RENTAL_STATUS.ACTIVE] },
      startAt: { $lt: current.endAt },
      endAt: { $gt: current.startAt },
    }).lean();
    if (overlap) return res.status(409).json({ message: 'Unit already booked for these dates', code: 'DATE_CONFLICT' });

    const out = await runTransition(req, current, RENTAL_STATUS.APPROVED, { approvedAt: new Date() });
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.APPROVED);
    await setAssetStatus(current.assetUnitId, ASSET_STATUS.RESERVED);
    await auditLog('rental_approved', actorId(req), { rentalId: out.item._id, ip: req.ip });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.post('/:id/reject', protect, requireObjectId, bookingLimiter, validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerField: 'vendorOwnerId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const out = await runTransition(req, req.scoped, RENTAL_STATUS.REJECTED, {
      cancelReason: req.body.reason || 'Rejected by vendor',
    });
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.REJECTED);
    await auditLog('rental_rejected', actorId(req), { rentalId: out.item._id, reason: req.body.reason, ip: req.ip });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Either party may walk away while the rental has not started. From APPROVED
// the unit's reserved status goes back to available.
router.post('/:id/cancel', protect, requireObjectId, bookingLimiter, validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerFields: ['userId', 'vendorOwnerId'],
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    const wasReserved = current.status === RENTAL_STATUS.APPROVED;
    const out = await runTransition(req, current, RENTAL_STATUS.CANCELLED, {
      cancelReason: req.body.reason || 'Cancelled',
    });
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.CANCELLED);
    if (wasReserved) await setAssetStatus(current.assetUnitId, ASSET_STATUS.AVAILABLE);
    await auditLog('rental_cancelled', actorId(req), {
      rentalId: out.item._id, by: req.user.role, reason: req.body.reason, ip: req.ip,
    });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Handover begins: the unit is now OUT (asset -> rented) and the sanitisation
// cycle it must satisfy before close is copied onto the row.
router.post('/:id/activate', protect, requireObjectId, bookingLimiter, validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerField: 'vendorOwnerId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    const unit = await AssetUnit.findById(current.assetUnitId).lean();
    const out = await runTransition(req, current, RENTAL_STATUS.ACTIVE, {
      activatedAt: new Date(),
      'sanitisation.requiredCycleDays': unit?.sanitisationCycleDays || 0,
      ...(req.body.conditionOut?.length ? { conditionOut: req.body.conditionOut } : {}),
    });
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.ACTIVE);
    await setAssetStatus(current.assetUnitId, ASSET_STATUS.RENTED);
    await auditLog('rental_activated', actorId(req), { rentalId: out.item._id, ip: req.ip });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// The unit comes back (either side may confirm the handover). The asset stays
// `rented` until close: an uninspected unit is not rentable to the next
// customer, which is the whole point of the INSPECTION step.
router.post('/:id/return', protect, requireObjectId, bookingLimiter, validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerFields: ['userId', 'vendorOwnerId'],
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const out = await runTransition(req, req.scoped, RENTAL_STATUS.RETURNED, {
      returnedAt: new Date(),
      ...(req.body.conditionIn?.length ? { conditionIn: req.body.conditionIn } : {}),
    });
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.RETURNED);
    await auditLog('rental_returned', actorId(req), { rentalId: out.item._id, by: req.user.role, ip: req.ip });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// The vendor inspects and records damage. `damageAmount` is an assessment, not
// a refund instruction: the number that reaches the customer is decided at
// close by computeDepositRefund (clamped to the held deposit).
router.post('/:id/inspect', protect, requireObjectId, bookingLimiter, validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerField: 'vendorOwnerId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const set = { inspectedAt: new Date() };
    if (req.body.damageNotes !== undefined) set['damage.notes'] = req.body.damageNotes;
    if (req.body.damageAmount !== undefined) set['damage.amount'] = req.body.damageAmount;
    if (req.body.conditionIn?.length) set.conditionIn = req.body.conditionIn;
    const out = await runTransition(req, req.scoped, RENTAL_STATUS.INSPECTION, set);
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.INSPECTION);
    await auditLog('rental_inspected', actorId(req), {
      rentalId: out.item._id, damageAmount: out.item.damage?.amount ?? 0, ip: req.ip,
    });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Close decides the money: deposit minus assessed damage, never below zero.
// When the unit carries a sanitisation cycle, a sanitisation stamped BEFORE the
// return does not count — the record has to postdate the handover, or it
// proves nothing about THIS rental.
router.post('/:id/close', protect, requireObjectId, bookingLimiter, validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerField: 'vendorOwnerId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    const unit = await AssetUnit.findById(current.assetUnitId).lean();
    const cycle = unit?.sanitisationCycleDays || 0;
    if (cycle > 0) {
      const last = unit?.lastSanitisedAt ? new Date(unit.lastSanitisedAt) : null;
      const returnedAt = current.returnedAt ? new Date(current.returnedAt) : null;
      if (!last || (returnedAt && last.getTime() < returnedAt.getTime())) {
        return res.status(409).json({
          message: 'Unit must be sanitised after the return before it can be closed',
          code: 'SANITISATION_REQUIRED',
        });
      }
    }
    const refund = computeDepositRefund({ deposit: current.deposit, damageAmount: current.damage?.amount ?? 0 });
    const out = await runTransition(req, current, RENTAL_STATUS.CLOSED, {
      closedAt: new Date(),
      depositRefundAmount: refund,
      ...(cycle > 0 ? { 'sanitisation.performedAt': unit.lastSanitisedAt, 'sanitisation.performedBy': actorId(req) } : {}),
    });
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.CLOSED);
    await setAssetStatus(current.assetUnitId, ASSET_STATUS.AVAILABLE);
    await auditLog('rental_closed', actorId(req), {
      rentalId: out.item._id, depositRefundAmount: refund, damageAmount: current.damage?.amount ?? 0, ip: req.ip,
    });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// The money step is its own state (CLOSED -> DEPOSIT_REFUNDED), so "closed" and
// "deposit returned" are separately auditable. Idempotent: a replayed request
// after the fact is the 409 below, not a second refund.
router.post('/:id/deposit-refund', protect, requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'rental-deposit' }), validate(rentalActionSchema), authorizeObject({
  model: Rental,
  idFrom: (req) => req.params.id,
  ownerField: 'vendorOwnerId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    const amount = current.depositRefundAmount ?? computeDepositRefund({
      deposit: current.deposit, damageAmount: current.damage?.amount ?? 0,
    });
    const out = await runTransition(req, current, RENTAL_STATUS.DEPOSIT_REFUNDED, {
      depositRefundedAt: new Date(),
      depositRefundAmount: amount,
    });
    if (out.conflict) return denyTransition(res, out.conflict, RENTAL_STATUS.DEPOSIT_REFUNDED);
    await auditLog('rental_deposit_refunded', actorId(req), {
      rentalId: out.item._id, amount, depositPaymentId: current.depositPaymentId ?? null, ip: req.ip,
    });
    return res.json(out.item);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
