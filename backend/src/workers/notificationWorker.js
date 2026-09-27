// Notification worker: drains findmedi-notifications via Brevo sendEmail.
// Started from src/workers/index.js (only when REDIS_URL is set).
// A failed job is retried 3x with backoff, then stays in the failed set
// (dead-letter visibility via Bull Board at /admin/queues).

import logger from '../config/logger.js';
import { QUEUE_NAMES } from '../lib/queues.js';

let worker = null;

export async function startNotificationWorker() {
  if (worker) return worker;
  if (!process.env.REDIS_URL) {
    logger.info('[workers] REDIS_URL unset — notification worker not started (direct-send fallback active).');
    return null;
  }
  try {
    const [{ Worker }, { default: IORedis }] = await Promise.all([
      import('bullmq'),
      import('ioredis'),
    ]);
    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => logger.warn(`[workers] redis error: ${err.message}`));
    const { sendEmail } = await import('../services/notificationService.js');

    worker = new Worker(
      QUEUE_NAMES.notifications,
      async (job) => {
        const res = await sendEmail(job.data);
        if (!res?.success) throw new Error(res?.error || 'sendEmail failed');
        return { messageId: res.messageId || null };
      },
      { connection, concurrency: 5 }
    );
    worker.on('completed', (job) => logger.info(`[workers] email sent (job ${job.id})`));
    worker.on('failed', (job, err) =>
      logger.warn(`[workers] email job ${job?.id} attempt ${job?.attemptsMade} failed: ${err.message}`)
    );
    worker.on('error', (err) => logger.warn(`[workers] worker error: ${err.message}`));
    logger.info('[workers] notification worker started (concurrency 5).');
    return worker;
  } catch (err) {
    logger.warn(`[workers] notification worker not started: ${err.message}`);
    return null;
  }
}

export async function stopNotificationWorker() {
  if (!worker) return;
  try { await worker.close(); } catch {}
  worker = null;
}
