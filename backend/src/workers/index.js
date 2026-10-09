// Worker bootstrap — called once after Mongo connects (see src/index.js).
// All workers are fail-soft: no REDIS_URL (or any startup error) means the
// API keeps serving with direct-send fallbacks, no crash, no hang.

import logger from '../config/logger.js';
import { startNotificationWorker, stopNotificationWorker } from './notificationWorker.js';
import { startPdfWorker, stopPdfWorker } from './pdfWorker.js';
import { startExportWorker, stopExportWorker } from './exportWorker.js';
import { startScheduler, stopScheduler } from './scheduler.js';

let started = false;

export async function startWorkers() {
  if (started) return;
  started = true;
  try {
    await Promise.all([startNotificationWorker(), startPdfWorker(), startExportWorker()]);
    startScheduler(); // cron-based sweeps; self-disables unless SCHEDULER_ENABLED=1
  } catch (err) {
    logger.warn(`[workers] startWorkers failed (non-fatal): ${err.message}`);
  }
}

export async function stopWorkers() {
  started = false;
  try {
    await Promise.all([stopNotificationWorker(), stopPdfWorker(), stopExportWorker()]);
    stopScheduler();
  } catch {}
}
