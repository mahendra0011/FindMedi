// PDF worker: drains findmedi-pdf (heavy report/invoice generation).
// Job data: { kind: 'prescription'|'lab-report'|'discharge-summary'|'invoice', data }
// Returns: { filename, base64 } — polled via GET /api/reports/jobs/:id.
// Validation errors are Unrecoverable (no pointless retries).

import logger from '../config/logger.js';
import { QUEUE_NAMES } from '../lib/queues.js';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

let worker = null;

async function generatePdf(kind, data, UnrecoverableError) {
  const pdf = await import('../services/pdfService.js');
  switch (kind) {
    case 'prescription':
      return { buffer: await pdf.generatePrescriptionPDF(data), filename: `prescription-${Date.now()}.pdf` };
    case 'lab-report':
      return { buffer: await pdf.generateLabReportPDF(data), filename: `lab-report-${Date.now()}.pdf` };
    case 'discharge-summary':
      return { buffer: await pdf.generateDischargeSummaryPDF(data), filename: `discharge-summary-${Date.now()}.pdf` };
    case 'invoice':
      return { buffer: await pdf.generateInvoicePDF(data), filename: `invoice-${Date.now()}.pdf` };
    default:
      throw new UnrecoverableError(`unknown pdf kind: ${kind}`);
  }
}

export async function startPdfWorker() {
  if (worker) return worker;
  if (!process.env.REDIS_URL) {
    logger.info('[workers] REDIS_URL unset — pdf worker not started.');
    return null;
  }
  try {
    const [{ Worker, UnrecoverableError }, { default: IORedis }] = await Promise.all([
      import('bullmq'),
      import('ioredis'),
    ]);
    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => logger.warn(`[workers] pdf redis error: ${err.message}`));

    worker = new Worker(
      QUEUE_NAMES.pdf,
      async (job) => {
        const { kind, data } = job.data || {};
        if (!kind) throw new UnrecoverableError('pdf job missing kind');
        const { buffer, filename } = await generatePdf(kind, data || {}, UnrecoverableError);
        if (!buffer?.length) throw new Error('empty pdf buffer');
        if (buffer.length > MAX_PDF_BYTES) throw new UnrecoverableError('pdf exceeds 10MB result cap');
        return { filename, base64: Buffer.from(buffer).toString('base64') };
      },
      { connection, concurrency: 2 }
    );
    worker.on('completed', (job) => logger.info(`[workers] pdf done (job ${job.id})`));
    worker.on('failed', (job, err) =>
      logger.warn(`[workers] pdf job ${job?.id} attempt ${job?.attemptsMade} failed: ${err.message}`)
    );
    worker.on('error', (err) => logger.warn(`[workers] pdf worker error: ${err.message}`));
    logger.info('[workers] pdf worker started (concurrency 2).');
    return worker;
  } catch (err) {
    logger.warn(`[workers] pdf worker not started: ${err.message}`);
    return null;
  }
}

export async function stopPdfWorker() {
  if (!worker) return;
  try { await worker.close(); } catch {}
  worker = null;
}
