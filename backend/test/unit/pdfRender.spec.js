import { describe, it, expect, afterAll } from '@jest/globals';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { renderHtmlToPdf, closeBrowser, isPdfRenderAvailable } from '../../src/lib/pdfRender.js';
import { lintTemplate, renderTemplate } from '../../src/lib/printEngine.js';

// The render tests need the Playwright Chromium binary, which CI installs only
// in the frontend e2e job. Skip them when it is missing (fresh checkout, no
// `npx playwright install`) instead of failing the backend suite.
const require = createRequire(import.meta.url);
function chromiumBinaryPresent() {
  try {
    const { chromium } = require('playwright');
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

describe('D6 Headless-Chromium Print Render Unit Tests', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  const shouldSkip = process.env.PDF_RENDER_DISABLED === '1' || !chromiumBinaryPresent();

  (shouldSkip ? it.skip : it)('renders valid HTML to a PDF buffer with %PDF magic header', async () => {
    const html = `
      <!doctype html>
      <html>
        <head><title>Prescription</title></head>
        <body>
          <h1>FindMedi Clinic</h1>
          <p>Patient: Ramesh Kumar</p>
          <p>Rx: Paracetamol 500mg TDS</p>
        </body>
      </html>
    `;

    const pdfBuffer = await renderHtmlToPdf({ html });
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    // Standard PDF file starts with %PDF- (hex: 25 50 44 46 2d)
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  }, 60000);

  (shouldSkip ? it.skip : it)('blocks external network requests and permits inline data URLs', async () => {
    const html = `
      <!doctype html>
      <html>
        <body>
          <h2>External Request Block Test</h2>
          <!-- External image should be aborted by network route filter -->
          <img src="https://example.com/unreachable-beacon.png" alt="tracker" />
          <!-- Data URI should be permitted -->
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="dot" />
        </body>
      </html>
    `;

    const pdfBuffer = await renderHtmlToPdf({ html });
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  (shouldSkip ? it.skip : it)('renders Hindi Devanagari medical records without crashing', async () => {
    const rendered = renderTemplate(
      '<h2>चिकित्सा सारांश</h2><p>रोगी: {{patient.name}}</p><p>रक्तचाप: 120/80 mmHg</p>',
      'h2 { color: #1e3a8a; }',
      { patient: { name: 'राम प्रकाश' } },
      { lang: 'hi' }
    );

    const pdfBuffer = await renderHtmlToPdf({ html: rendered.html });
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('blocks template injection attacks before rendering via lintTemplate', () => {
    // Malicious payload trying to access constructor or prototype
    const maliciousHtml = '<p>{{constructor.name}}</p><p>{{patient.name}}</p>';
    const lintErrors = lintTemplate('prescription', maliciousHtml);

    expect(lintErrors).toContain('constructor.name');
    expect(lintErrors).not.toContain('patient.name');
  });

  it('rejects empty HTML with an informative error', async () => {
    await expect(renderHtmlToPdf({ html: '' })).rejects.toThrow('html string is required');
  });

  it('reports PDF render availability status', () => {
    expect(typeof isPdfRenderAvailable()).toBe('boolean');
  });
});
