// BullMQ job queues over the existing Redis (Phase 3 roadmap).
// Fail-soft by design: without REDIS_URL everything degrades to direct
// execution — the API never depends on the queue being up.
//
// Queues:
//   findmedi-notifications — email sending (Brevo), incl. PDF attachments
//   findmedi-pdf          — reserved: heavy PDF generation (wired next)
//   findmedi-exports      — reserved: bulk CSV/Excel exports (wired next)
//
// Retry policy: 3 attempts, exponential backoff. Completed jobs are trimmed,
// failed jobs are kept (failed set = dead-letter visibility in Bull Board).

import logger from '../config/logger.js';

export const QUEUE_NAMES = {
  notifications: 'findmedi-notifications',
  pdf: 'findmedi-pdf',
  exports: 'findmedi-exports',
};

const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

let connection = null;
let queues = {};
let disabledReason = null;

function redisUrl() {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

export function isQueuesEnabled() {
  return !!process.env.REDIS_URL;
}

async function getConnection() {
  if (connection) return connection;
  if (disabledReason) return null;
  if (!isQueuesEnabled()) {
    disabledReason = 'REDIS_URL unset';
    return null;
  }
  try {
    const { default: IORedis } = await import('ioredis');
    connection = new IORedis(redisUrl(), {
      // Required by BullMQ (blocking connections must not time out commands)
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => logger.warn(`[queues] redis error: ${err.message}`));
    return connection;
  } catch (err) {
    disabledReason = err.message;
    logger.warn(`[queues] disabled: ${err.message}`);
    return null;
  }
}

export async function getQueue(name) {
  if (queues[name]) return queues[name];
  const conn = await getConnection();
  if (!conn) return null;
  try {
    const { Queue } = await import('bullmq');
    queues[name] = new Queue(name, { connection: conn, defaultJobOptions: DEFAULT_JOB_OPTS });
    return queues[name];
  } catch (err) {
    logger.warn(`[queues] Queue(${name}) unavailable: ${err.message}`);
    return null;
  }
}

/** Generic enqueue. Never throws — returns { queued:false } when down. */
export async function enqueue(queueName, jobName, payload, opts = {}) {
  try {
    const q = await getQueue(queueName);
    if (!q) return { queued: false, reason: disabledReason || 'queues disabled' };
    const job = await q.add(jobName, payload, opts.jobId ? { jobId: opts.jobId } : undefined);
    return { queued: true, jobId: job.id };
  } catch (err) {
    logger.warn(`[queues] enqueue(${queueName}) failed: ${err.message}`);
    return { queued: false, reason: err.message };
  }
}

/** Enqueue an email job. Never throws — returns { queued:false } when down. */
export async function enqueueEmail(payload) {
  try {
    const q = await getQueue(QUEUE_NAMES.notifications);
    if (!q) return { queued: false, reason: disabledReason || 'queues disabled' };
    const job = await q.add('send-email', payload, { jobId: payload.jobId });
    return { queued: true, jobId: job.id };
  } catch (err) {
    logger.warn(`[queues] enqueueEmail failed, caller should send directly: ${err.message}`);
    return { queued: false, reason: err.message };
  }
}

/**
 * Preferred call-site helper: queue the email when possible, otherwise send
 * it inline. Response contract matches sendEmail ({ success }).
 */
export async function queueEmailOrSend(payload) {
  const res = await enqueueEmail(payload);
  if (res.queued) return { success: true, queued: true, jobId: res.jobId };
  const { sendEmail } = await import('../services/notificationService.js');
  return sendEmail(payload);
}

export async function enqueuePdf(payload) {
  return enqueue(QUEUE_NAMES.pdf, 'generate-pdf', payload);
}

export async function enqueueExport(payload) {
  return enqueue(QUEUE_NAMES.exports, 'run-export', payload);
}

/** Poll a job: { state, result?, failedReason? } — null when queue/job missing. */
export async function getJobState(queueName, jobId) {
  try {
    const q = await getQueue(queueName);
    if (!q || !jobId) return null;
    const job = await q.getJob(jobId);
    if (!job) return { state: 'unknown' };
    const state = await job.getState();
    const out = { state };
    if (state === 'completed') out.result = job.returnvalue || null;
    if (state === 'failed') out.failedReason = job.failedReason || 'failed';
    if (job.timestamp) out.enqueuedAt = new Date(job.timestamp).toISOString();
    if (job.processedOn) out.startedAt = new Date(job.processedOn).toISOString();
    if (job.finishedOn) out.finishedAt = new Date(job.finishedOn).toISOString();
    return out;
  } catch (err) {
    logger.warn(`[queues] getJobState failed: ${err.message}`);
    return null;
  }
}

export async function queueStatus() {
  if (!isQueuesEnabled()) return { enabled: false, reason: 'REDIS_URL unset' };
  try {
    const out = { enabled: true, queues: {} };
    for (const name of Object.values(QUEUE_NAMES)) {
      const q = await getQueue(name);
      if (!q) {
        out.queues[name] = { error: 'unavailable' };
        continue;
      }
      const [waiting, active, delayed, failed] = await Promise.all([
        q.getWaitingCount(),
        q.getActiveCount(),
        q.getDelayedCount(),
        q.getFailedCount(),
      ]);
      out.queues[name] = { waiting, active, delayed, failed };
    }
    return out;
  } catch (err) {
    return { enabled: true, error: err.message };
  }
}

export async function closeQueues() {
  for (const q of Object.values(queues)) {
    try { await q.close(); } catch {}
  }
  queues = {};
  if (connection) {
    try { await connection.quit(); } catch {}
    connection = null;
  }
}
