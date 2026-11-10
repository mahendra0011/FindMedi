/**
 * Ride-location purge (5.md 15: "Location data: consent, minimal retention,
 * purge after trip/visit"). Precise pickup/drop coordinates are sensitive;
 * once a ride is completed (or cancelled) and the retention window has
 * elapsed, the lat/lng are nulled and locationPurgedAt is stamped. The row
 * (fare, status, timestamps) survives for billing/audit; only the precise
 * geo point is removed. Idempotent: rows already purged are skipped.
 */
import { schedule } from 'node-cron';
import logger from '../config/logger.js';

const RETENTION_DAYS = Number(process.env.RIDE_LOCATION_RETENTION_DAYS || 7);
const PURGE_STATUSES = ['completed', 'cancelled_by_user', 'cancelled_by_rider', 'no_riders_found'];

let _started = false;

export async function runRideLocationPurgeOnce() {
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) return { purged: 0, skipped: 'db_unavailable' };
    const { default: RideBooking } = await import('../models/RideBooking.js');
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000);
    const filter = {
      status: { $in: PURGE_STATUSES },
      locationPurgedAt: null,
      createdAt: { $lt: cutoff },
    };
    const res = await RideBooking.updateMany(filter, {
      $set: {
        'pickup.lat': null,
        'pickup.lng': null,
        'drop.lat': null,
        'drop.lng': null,
        locationPurgedAt: new Date(),
      },
    });
    const purged = res?.modifiedCount ?? 0;
    if (purged > 0) logger.info(`ride location purge: purged ${purged} rides older than ${RETENTION_DAYS}d`);
    return { purged };
  } catch (e) {
    logger.warn('ride location purge failed: ' + e.message);
    return { purged: 0, error: e.message };
  }
}

export function startRideLocationPurge(cronExpr = '0 4 * * *') {
  if (_started) return;
  _started = true;
  schedule(cronExpr, () => { runRideLocationPurgeOnce().catch(() => {}); }, { timezone: 'UTC' });
  // also run once on boot after a short delay
  setTimeout(() => { runRideLocationPurgeOnce().catch(() => {}); }, 30000);
}
