import Medicine from '../models/Medicine.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import { executeWithOutbox } from '../lib/transactionalOutbox.js';
import logger from '../config/logger.js';

export const PHARMACY_RESERVATION_TTL_MS = 15 * 60 * 1000;

/** Atomically removes sellable stock while the caller creates the order. */
export async function reservePharmacyOrderItems(items, { session, now = new Date() } = {}) {
  if (!session) throw new TypeError('A Mongo transaction session is required for stock reservation');
  // Coalesce duplicate cart lines so each medicine is conditionally updated
  // once and price consistency is enforced for the aggregate quantity.
  const byMedicine = new Map();
  for (const item of items) {
    const key = String(item.medicineId);
    const existing = byMedicine.get(key);
    if (existing && item.expectedPrice !== undefined && existing.expectedPrice !== item.expectedPrice) {
      const err = new Error('Cart contains inconsistent catalogue prices for the same medicine.');
      err.status = 409;
      err.code = 'CART_STALE';
      throw err;
    }
    byMedicine.set(key, {
      medicineId: item.medicineId,
      quantity: (existing?.quantity || 0) + item.quantity,
      expectedPrice: item.expectedPrice ?? existing?.expectedPrice,
    });
  }
  for (const item of byMedicine.values()) {
    const result = await Medicine.updateOne(
      {
        _id: item.medicineId,
        isActive: true,
        expiryDate: { $gt: now },
        currentStock: { $gte: item.quantity },
        ...(item.expectedPrice === undefined ? {} : { sellingPrice: item.expectedPrice }),
      },
      { $inc: { currentStock: -item.quantity } },
      { session }
    );
    if (result.modifiedCount !== 1) {
      const err = new Error('Medicine price or sellable stock changed before checkout completed. Refresh your cart.');
      err.status = 409;
      err.code = item.expectedPrice === undefined ? 'MEDICINE_STOCK_RACE' : 'CART_STALE';
      throw err;
    }
  }
}

/** Restores stock only while cancelling/releasing a still-reserved order. */
export async function releasePharmacyOrderItems(items, { session } = {}) {
  if (!session) throw new TypeError('A Mongo transaction session is required for stock release');
  for (const item of items || []) {
    const result = await Medicine.updateOne(
      { _id: item.medicineId },
      { $inc: { currentStock: item.qty } },
      { session }
    );
    if (result.matchedCount !== 1) {
      throw new Error(`Cannot release pharmacy inventory: medicine ${item.medicineId} no longer exists`);
    }
  }
}

/**
 * Recover pending unpaid orders whose stock hold expired. CAS + stock release
 * share one transaction, so payment/cancel/expiry races cannot double release.
 */
export async function expirePharmacyOrderReservations({ now = new Date(), batchSize = 50 } = {}) {
  const expired = await PharmacyOrder.find({
    status: 'Pending',
    paymentStatus: { $in: ['Pending', 'Unpaid'] },
    inventoryReservationStatus: 'reserved',
    inventoryReservationExpiresAt: { $lte: now },
    'items.0': { $exists: true },
  }).select('_id').sort({ inventoryReservationExpiresAt: 1 }).limit(batchSize).lean();

  let released = 0;
  for (const candidate of expired) {
    try {
      const didRelease = await executeWithOutbox(async (session) => {
        const order = await PharmacyOrder.findOneAndUpdate(
          {
            _id: candidate._id,
            status: 'Pending',
            paymentStatus: { $in: ['Pending', 'Unpaid'] },
            inventoryReservationStatus: 'reserved',
            inventoryReservationExpiresAt: { $lte: now },
            'items.0': { $exists: true },
          },
          { $set: { status: 'Cancelled', inventoryReservationStatus: 'released' } },
          { new: true, session }
        );
        if (!order) return false;
        await releasePharmacyOrderItems(order.items, { session });
        return true;
      });
      if (didRelease) released += 1;
    } catch (err) {
      logger.error(`pharmacy reservation expiry failed order=${candidate._id}: ${err.message}`);
    }
  }
  return released;
}

let expiryTimer;
export function startPharmacyReservationExpiry({ intervalMs = 60_000 } = {}) {
  if (expiryTimer) return expiryTimer;
  const tick = () => expirePharmacyOrderReservations().catch((err) => {
    logger.error(`pharmacy reservation expiry scan failed: ${err.message}`);
  });
  expiryTimer = setInterval(tick, intervalMs);
  expiryTimer.unref?.();
  tick();
  return expiryTimer;
}

export function stopPharmacyReservationExpiry() {
  if (expiryTimer) clearInterval(expiryTimer);
  expiryTimer = null;
}
