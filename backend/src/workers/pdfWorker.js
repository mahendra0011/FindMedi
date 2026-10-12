// PDF worker: drains findmedi-pdf (heavy report/invoice generation).
// Job data: { kind: 'prescription'|'lab-report'|'discharge-summary'|'invoice', data }
// Returns: { filename, base64 } — polled via GET /api/reports/jobs/:id.
// Validation errors are Unrecoverable (no pointless retries).

import crypto from 'node:crypto';
import logger from '../config/logger.js';
import { QUEUE_NAMES } from '../lib/queues.js';

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const CACHE_TTL_SECONDS = 3600; // 1 hour

let worker = null;

async function generatePdf(kind, data, UnrecoverableError, job) {
  const pdf = await import('../services/pdfService.js');
  switch (kind) {
    case 'template': {
      const { docType, templateVersion, payload, html, css, duplicate, lang } = data || {};
      const printEngine = await import('../lib/printEngine.js');
      const pdfRender = await import('../lib/pdfRender.js');
      try {
        const rendered = printEngine.renderTemplate(html || '', css || '', payload || {}, { duplicate, lang });
        const buffer = await pdfRender.renderHtmlToPdf({ html: rendered.html, css });
        return { buffer, filename: `${docType || 'document'}-${templateVersion || Date.now()}.pdf` };
      } catch (err) {
        if (job?.log) job.log(`[pdfWorker] template render failed (${err.message}), falling back to pdfkit`);
        logger.warn(`[pdfWorker] template render fallback for ${docType}: ${err.message}`);
        if (docType && ['prescription', 'lab-report', 'discharge-summary', 'invoice'].includes(docType)) {
          return generatePdf(docType, payload || data, UnrecoverableError, job);
        }
        throw err;
      }
    }
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

        // Redis cache check for template jobs
        let cacheKey = null;
        if (kind === 'template' && data?.docType) {
          const rawHash = `${data.docType}|${data.templateVersion || ''}|${JSON.stringify(data.payload || {})}`;
          const dataHash = crypto.createHash('sha256').update(rawHash).digest('hex');
          cacheKey = `pdf:cache:${dataHash}`;
          try {
            const cached = await connection.get(cacheKey);
            if (cached) {
              return { filename: `${data.docType}-${Date.now()}.pdf`, base64: cached, fromCache: true };
            }
          } catch {}
        }

        const { buffer, filename } = await generatePdf(kind, data || {}, UnrecoverableError, job);
        if (!buffer?.length) throw new Error('empty pdf buffer');
        if (buffer.length > MAX_PDF_BYTES) throw new UnrecoverableError('pdf exceeds 10MB result cap');
        const base64 = Buffer.from(buffer).toString('base64');

        if (cacheKey) {
          try {
            await connection.setex(cacheKey, CACHE_TTL_SECONDS, base64);
          } catch {}
        }

        return { filename, base64 };
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
