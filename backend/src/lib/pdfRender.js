/**
 * Headless-Chromium print render pipeline (D6).
 * Renders HTML/CSS templates into print-ready PDF buffers via Playwright Chromium.
 *
 * Security & Reliability features:
 * - Network isolation: blocks all outgoing requests except data: and about: schemes.
 * - Strict timeout: 20s execution cap per render job.
 * - Buffer limit: 10MB maximum PDF output size.
 * - Browser lifecycle: reused browser instance with isolated contexts per render.
 */

import logger from '../config/logger.js';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB cap
const RENDER_TIMEOUT_MS = 20000; // 20s timeout

let browserInstance = null;
let browserPromise = null;

/**
 * Checks if PDF rendering is enabled in the current environment.
 */
export function isPdfRenderAvailable() {
  return process.env.PDF_RENDER_DISABLED !== '1';
}

/**
 * Returns the active shared Playwright Chromium browser instance.
 */
export async function getBrowser() {
  if (process.env.PDF_RENDER_DISABLED === '1') {
    throw new Error('PDF_RENDER_DISABLED');
  }

  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  if (browserPromise) {
    return browserPromise;
  }

  browserPromise = (async () => {
    try {
      const { chromium } = await import('playwright');
      const args = [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
      ];

      if (process.env.PDF_RENDER_NO_SANDBOX === '1' || process.platform === 'linux') {
        args.push('--no-sandbox', '--disable-setuid-sandbox');
      }

      const instance = await chromium.launch({
        headless: true,
        args,
      });

      instance.on('disconnected', () => {
        logger.info('[pdfRender] Browser instance disconnected.');
        browserInstance = null;
        browserPromise = null;
      });

      browserInstance = instance;
      return browserInstance;
    } catch (err) {
      browserPromise = null;
      logger.error(`[pdfRender] Failed to launch Chromium browser: ${err.message}`);
      throw err;
    }
  })();

  return browserPromise;
}

/**
 * Cleanly closes the active Chromium browser instance (used during test teardown or worker exit).
 */
export async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (err) {
      logger.warn(`[pdfRender] Error closing browser: ${err.message}`);
    } finally {
      browserInstance = null;
      browserPromise = null;
    }
  }
}

/**
 * Renders HTML + CSS string into a print-ready PDF buffer.
 *
 * @param {object} params
 * @param {string} params.html - Complete HTML string or fragment
 * @param {string} [params.css] - Supplementary stylesheet
 * @param {object} [params.pageSetup] - Page size, margins, orientation
 * @returns {Promise<Buffer>} - Rendered PDF buffer
 */
export async function renderHtmlToPdf({ html, css = '', pageSetup = {} } = {}) {
  if (!html || typeof html !== 'string') {
    throw new Error('html string is required for PDF render');
  }

  if (!isPdfRenderAvailable()) {
    throw new Error('PDF_RENDER_DISABLED');
  }

  const browser = await getBrowser();
  const context = await browser.newContext();

  try {
    const page = await context.newPage();

    // D6 Security Rule: block all outbound network requests except inline data: & about:
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url.startsWith('about:')) {
        return route.continue();
      }
      return route.abort();
    });

    // Assemble final markup
    let finalHtml = html;
    if (css && css.trim()) {
      if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `<style>${css}</style></head>`);
      } else {
        finalHtml = `<style>${css}</style>${finalHtml}`;
      }
    }

    // Set page content with strict timeout
    await page.setContent(finalHtml, {
      waitUntil: 'load',
      timeout: RENDER_TIMEOUT_MS,
    });

    const format = pageSetup.format || 'A4';
    const margin = pageSetup.margin || {
      top: '12mm',
      right: '12mm',
      bottom: '12mm',
      left: '12mm',
    };

    const pdfBuffer = await page.pdf({
      format,
      margin,
      printBackground: true,
      preferCSSPageSize: true,
      timeout: RENDER_TIMEOUT_MS,
    });

    if (!pdfBuffer || !pdfBuffer.length) {
      throw new Error('Empty PDF buffer produced by renderer');
    }

    if (pdfBuffer.length > MAX_PDF_BYTES) {
      throw new Error(`Rendered PDF exceeds 10MB limit (${pdfBuffer.length} bytes)`);
    }

    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  } finally {
    try {
      await context.close();
    } catch {}
  }
}
