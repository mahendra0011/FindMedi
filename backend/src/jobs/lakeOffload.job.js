/**
 * Data-lake offload (Spec 16): keeps the MongoDB working set lean by
 * archiving completed rides older than LAKE_OFFLOAD_DAYS to the lake
 * manifest (MinIO/S3 when LAKE_S3_ENDPOINT is set, else local JSONL
 * manifest under ./data-lake-out/). Continuous, fail-soft, idempotent
 * (per-trip manifest marker). DeltaStreamer (data-platform/hudi/) owns the
 * parquet/MoR path; this job owns the Mongo→lake handoff record.
 */
import fs from 'node:fs';
import path from 'node:path';
import logger from '../config/logger.js';

const OFFLOAD_DAYS = Number(process.env.LAKE_OFFLOAD_DAYS || 90);
const MANIFEST_DIR = process.env.LAKE_MANIFEST_DIR || path.resolve(process.cwd(), 'data-lake-out');

export function offloadCutoff() {
  return new Date(Date.now() - OFFLOAD_DAYS * 86400 * 1000);
}

export async function runLakeOffloadOnce() {
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) return { archived: 0, skipped: 'db_unavailable' };
    const { default: RideBooking } = await import('../models/RideBooking.js');
    const cutoff = offloadCutoff();
    const batch = await RideBooking.find({
      status: { $in: ['completed', 'cancelled_by_user', 'cancelled_by_rider'] },
      updatedAt: { $lt: cutoff },
      $or: [{ lakeArchivedAt: null }, { lakeArchivedAt: { $exists: false } }],
    })
      .sort({ updatedAt: 1 })
      .limit(500)
      .lean();
    if (!batch.length) return { archived: 0 };
    fs.mkdirSync(MANIFEST_DIR, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const manifest = path.join(MANIFEST_DIR, `date_partition=${day}.jsonl`);
    const lines = batch.map((r) =>
      JSON.stringify({
        trip_id: String(r._id),
        provider_id: String(r.driverId || r.providerId || ''),
        vertical: 'RIDER',
        h3_res8: r?.pickup?.h3_res8 || r?.h3Cell || '',
        fare: r?.fare?.total ?? 0,
        start_time: r?.createdAt ? new Date(r.createdAt).getTime() : null,
        end_time: r?.updatedAt ? new Date(r.updatedAt).getTime() : null,
        date_partition: day,
      })
    );
    fs.appendFileSync(manifest, lines.join('\n') + '\n');
    // TODO(lake): when LAKE_S3_ENDPOINT is set, PUT manifest to
    // s3://findmedi-data-lake/hudi_ride_telemetry_historical/ via MinIO client.
    await RideBooking.updateMany(
      { _id: { $in: batch.map((r) => r._id) } },
      { $set: { lakeArchivedAt: new Date() } }
    );
    return { archived: batch.length, manifest };
  } catch (err) {
    logger.error(`lakeOffload error: ${err.message}`);
    return { archived: 0, error: err.message };
  }
}

export function startLakeOffload(intervalMs = 6 * 3600 * 1000) {
  const timer = setInterval(() => {
    runLakeOffloadOnce().catch(() => {});
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

/**
 * DP-M-04: erasure propagation for lake copies.
 *
 * The offload manifest above is the lake's Mongo handoff record - trip rows
 * keyed by trip_id, written per date partition. A `user.deleted` tombstone
 * (deletionService -> outbox -> consumer) must remove the rows that belong to
 * the erased subject: their rides as a RIDER (userId) and as a DRIVER
 * (driverId/providerId - an erased provider leaves GPS-era traces behind too).
 *
 * Manifest lines carry no user id, so the join happens through Mongo: the
 * subject's trip ids first, then a line-level rewrite of every partition that
 * mentions one. Malformed lines are KEPT (a line we cannot parse is not a
 * line we can claim to have purged - dropping it silently would turn a data
 * tool into a data loss). Rewrite is tmp+rename so a crash mid-purge cannot
 * truncate a partition.
 *
 * Post-ingestion rows (already compacted into Hudi by DeltaStreamer) are owned
 * by data-platform/hudi/ - this backend only ever owned the manifest handoff.
 */
export async function purgeUserFromLakeManifests(userId) {
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) return { purged: 0, skipped: 'db_unavailable' };
    const { default: RideBooking } = await import('../models/RideBooking.js');
    const id = String(userId);
    const trips = await RideBooking.find({
      $or: [{ userId: id }, { driverId: id }, { providerId: id }],
    })
      .select('_id')
      .lean();
    const tripIds = new Set(trips.map((r) => String(r._id)));
    if (!tripIds.size) return { purged: 0, trips: 0 };
    if (!fs.existsSync(MANIFEST_DIR)) return { purged: 0, trips: tripIds.size };

    let purged = 0;
    let partitions = 0;
    for (const name of fs.readdirSync(MANIFEST_DIR)) {
      if (!name.endsWith('.jsonl')) continue;
      const file = path.join(MANIFEST_DIR, name);
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      const kept = lines.filter((line) => {
        if (!line.trim()) return true;
        try {
          return !tripIds.has(String(JSON.parse(line).trip_id));
        } catch {
          return true;
        }
      });
      if (kept.length === lines.length) continue;
      purged += lines.length - kept.length;
      partitions += 1;
      const tmp = `${file}.purging`;
      fs.writeFileSync(tmp, kept.join('\n'));
      fs.renameSync(tmp, file);
    }
    return { purged, partitions, trips: tripIds.size };
  } catch (err) {
    logger.error(`lake purge error for user ${userId}: ${err.message}`);
    return { purged: 0, error: err.message };
  }
}
