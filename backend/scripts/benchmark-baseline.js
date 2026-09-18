/**
 * Baseline performance benchmark for Phase 7 Rust migration targets.
 *
 * Profiles three hot paths under realistic load:
 *  1. Image upload handling  (cloudinaryService.uploadFileToCloudinary + upload.js magic-byte validation + sharp resize)
 *  2. PDF generation        (pdfService.generatePaymentInvoicePDF, generatePrescriptionPDF, etc.)
 *  3. CSV export / import   (export.js toCSV, excelUtils exportToCSV / parseExcelFile)
 *
 * Run:  node server/scripts/benchmark-baseline.js
 */
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import path from 'path';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────
const formatMs = (ms) => `${ms.toFixed(2)} ms`;
const formatMb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
const measure = async (label, fn, iterations) => {
  const times = [];
  const memBefore = process.memoryUsage().heapUsed;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await fn(i);
    times.push(performance.now() - t0);
  }

  const total = performance.now() - start;
  const memAfter = process.memoryUsage().heapUsed;
  const avg = total / iterations;
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const p99 = times[Math.min(times.length - 1, Math.floor(times.length * 0.99))];

  console.log(`\n  ${label}`);
  console.log(`    iterations : ${iterations}`);
  console.log(`    total      : ${formatMs(total)}`);
  console.log(`    avg        : ${formatMs(avg)}  (p50 ${formatMs(p50)}, p95 ${formatMs(p95)}, p99 ${formatMs(p99)})`);
  console.log(`    throughput : ${(iterations / (total / 1000)).toFixed(1)} ops/sec`);
  console.log(`    heap delta : ${formatMb(memAfter - memBefore)}  (${formatMb(memBefore)} → ${formatMb(memAfter)})`);

  return { label, iterations, total, avg, p50, p95, p99, memBefore, memAfter };
};

// ── 1. Image upload path ─────────────────────────────────────────────────
// Magic-byte validation (from server/middleware/upload.js)
const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png':  [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  'image/gif':  [Buffer.from([0x47, 0x49, 0x46, 0x38])],
};
const validateFileContent = (buffer, mimetype) => {
  if (!buffer || buffer.length < 4) return false;
  const sigs = MAGIC_BYTES[mimetype];
  if (!sigs) return true;
  for (const sig of sigs) {
    if (buffer.slice(0, sig.length).equals(sig)) {
      if (mimetype === 'image/webp' && buffer.length >= 12 && buffer.slice(8, 12).toString('ascii') === 'WEBP') return true;
      if (mimetype !== 'image/webp') return true;
    }
  }
  return false;
};

// Generate a realistic JPEG test image
async function makeTestImage(size = { w: 600, h: 400, channels: 3 }) {
  const { w, h, channels } = size;
  const buf = Buffer.alloc(w * h * channels, 0);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return sharp(buf, { raw: { width: w, height: h, channels } }).jpeg({ quality: 85 }).toBuffer();
}

// Simulate server-side avatar processing pipeline:
// magic-byte validate → resize (thumb) → re-encode JPEG
async function processAvatarPipeline(imgBuffer) {
  validateFileContent(imgBuffer, 'image/jpeg');
  const thumb = await sharp(imgBuffer).resize(128, 128).jpeg({ quality: 75 }).toBuffer();
  return thumb;
}

// Cloudinary-style stream upload simulation (buffer → string encode, no network)
async function simulateCloudinaryUpload(buffer) {
  // In production this streams to Cloudinary; locally we simulate the buffer
  // serialization that occurs during the upload_stream call.
  return buffer.toString('base64');
}

const benchmarkImageUpload = async () => {
  console.log('\n' + '═══ 1. IMAGE UPLOAD PATH ═══'.padEnd(60, '═'));
  const results = {};

  // Generate test images of different sizes
  const small = await makeTestImage({ w: 300, h: 200, channels: 3 });  // ~20 KB
  const medium = await makeTestImage({ w: 1200, h: 800, channels: 3 }); // ~300 KB
  const large = await makeTestImage({ w: 3000, h: 2000, channels: 3 });  // ~2 MB

  console.log(`  test images: small ${formatMb(small.length)}, medium ${formatMb(medium.length)}, large ${formatMb(large.length)}`);

  results['magic_byte_validation_small'] = await measure('magic-byte validate (small JPEG)',
    async () => validateFileContent(small, 'image/jpeg'), 10000);

  results['sharp_resize_small'] = await measure('sharp resize 128×128 (small→thumb)',
    async () => await sharp(small).resize(128, 128).jpeg({ quality: 75 }).toBuffer(), 1000);

  results['sharp_resize_medium'] = await measure('sharp resize 256×256 (medium→thumb)',
    async () => await sharp(medium).resize(256, 256).jpeg({ quality: 75 }).toBuffer(), 500);

  results['sharp_resize_large'] = await measure('sharp resize 256×256 (large→thumb)',
    async () => await sharp(large).resize(256, 256).jpeg({ quality: 75 }).toBuffer(), 200);

  results['full_avatar_pipeline'] = await measure('full avatar pipeline (validate+resize+encode)',
    async () => processAvatarPipeline(medium), 500);

  results['cloudinary_sim_medium'] = await measure('cloudinary sim-upload (base64 encode)',
    async () => simulateCloudinaryUpload(medium), 200);

  return results;
};

// ── 2. PDF generation path ────────────────────────────────────────────────
// Mirror the structure used in server/services/pdfService.js
const COLORS = { primary: '#0f766e', primaryDark: '#134e4a', ink: '#111827', border: '#d1d5db', soft: '#f3f4f6' };
const money = (v = 0) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`;

const drawTable = (doc, columns, rows) => {
  const { left, right } = doc.page.margins;
  const tableWidth = doc.page.width - left - right;
  const widths = columns.map(c => Math.round(tableWidth * c.width));
  let y = doc.y;
  const headerH = 24;
  const rowH = 24;
  doc.roundedRect(left, y, tableWidth, headerH, 4).fill(COLORS.primaryDark);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
  let x = left;
  columns.forEach((col, i) => { doc.text(col.label, x + 8, y + 8, { width: widths[i] - 12 }); x += widths[i]; });
  y += headerH;
  doc.font('Helvetica').fontSize(8.5);
  rows.forEach((row, ri) => {
    doc.rect(left, y, tableWidth, rowH).fill(ri % 2 === 0 ? '#fff' : COLORS.soft);
    x = left;
    columns.forEach((col, ci) => {
      doc.fillColor(COLORS.ink).font(col.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
        .text(String(row[col.key] || '-'), x + 8, y + 7, { width: widths[ci] - 12 });
      x += widths[ci];
    });
    y += rowH;
  });
  doc.y = y + 10;
};

// Generate payment data with N line items
const makePaymentData = (numItems) => ({
  lineItems: Array.from({ length: numItems }, (_, i) => ({
    name: `Medicine ${i + 1}`, packSize: '10 tabs', qty: (i % 5) + 1, price: 45.50 + i,
  })),
  patient_name: 'Rajesh Kumar', patient_phone: '+91-9876543210',
  serviceType: 'medicine', amount: 1000 + numItems * 50,
  invoice_id: 'INV-MED-2026-09-0001',
  transaction_id: 'TXN-2026-0001',
});

const makeReferenceData = (numItems) => ({
  items: Array.from({ length: numItems }, (_, i) => ({
    medicineName: `Medicine ${i + 1}`, form: 'Tablet', rxRequired: true, rx: true,
  })),
  deliveryMode: 'delivery', deliveryFee: 40, orderId: 'ORD-2026-0001',
  patientId: { name: 'Rajesh Kumar', phone: '+91-9876543210', address: '123 MG Road, Delhi' },
});

// Simplified version of generatePaymentInvoicePDF (medicine path)
async function genInvoicePDF(numItems) {
  const data = makePaymentData(numItems);
  const ref = makeReferenceData(numItems);
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const chunks = [];
  return new Promise((resolve, reject) => {
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // header
    doc.fillColor(COLORS.primary).rect(0, 0, doc.page.width, 120).fill();
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(20).text('FindMedi Hospital', 58, 46);
    doc.font('Helvetica').fontSize(8.5).text('Medical Center Drive, Healthcare City', 58, 71);

    // info grid
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text('Bill To', 36, 150);
    doc.font('Helvetica').fontSize(9).text(`Patient: ${data.patient_name}`, 36, 170);
    doc.text(`Phone: ${data.patient_phone}`, 36, 185);

    // items table
    const cols = [
      { key: 'item', label: 'Item Description', width: 0.38, bold: true },
      { key: 'pack', label: 'Pack Size', width: 0.18 },
      { key: 'qty', label: 'Qty', width: 0.10, align: 'center' },
      { key: 'price', label: 'Price', width: 0.17, align: 'right' },
      { key: 'total', label: 'Total', width: 0.17, align: 'right', bold: true },
    ];
    const rows = data.lineItems.map((item, i) => ({
      item: `${item.name}`, pack: item.packSize, qty: item.qty,
      price: money(item.price), total: money(item.price * item.qty),
    }));
    drawTable(doc, cols, rows);

    doc.y += 20;
    doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(12).text('Total Paid', 36, doc.y);
    doc.text(money(data.amount), doc.page.width - 100, doc.y);
    doc.end();
  });
}

const benchmarkPDF = async () => {
  console.log('\n' + '═══ 2. PDF GENERATION PATH ═══'.padEnd(60, '═'));
  const results = {};

  results['pdf_5_items'] = await measure('generateInvoicePDF (5 items)',
    async () => await genInvoicePDF(5), 200);
  results['pdf_20_items'] = await measure('generateInvoicePDF (20 items)',
    async () => await genInvoicePDF(20), 100);
  results['pdf_50_items'] = await measure('generateInvoicePDF (50 items)',
    async () => await genInvoicePDF(50), 50);
  results['pdf_100_items'] = await measure('generateInvoicePDF (100 items)',
    async () => await genInvoicePDF(100), 20);

  return results;
};

// ── 3. CSV export / import path ───────────────────────────────────────────

// Replicate the exact toCSV from server/routes/export.js
const toCSV = (data, fields) => {
  const header = fields.map(f => `"${f}"`).join(',');
  const rows = data.map(row => fields.map(f => {
    const val = row[f];
    if (val === null || val === undefined) return '';
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(','));
  return [header, ...rows].join('\n');
};

const exportToCSV_json2csv = (data, fields) => {
  const parser = new Parser({ fields });
  return parser.parse(data);
};

const parseExcelFile = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.worksheets[0];
  const rows = [];
  const headers = [];
  ws.getRow(1).eachCell(cell => headers.push(cell.value));
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const rowData = {};
    row.eachCell(cell => { rowData[headers[cell.colNumber - 1]] = cell.value; });
    rows.push(rowData);
  });
  return rows;
};

// Build mock data arrays
const makePatients = (n) => Array.from({ length: n }, (_, i) => ({
  name: `Patient ${i}`, email: `p${i}@test.com`, phone: `+91-${9000000000 + i}`,
  status: 'active', isVerified: true, approvalStatus: 'approved', createdAt: new Date(),
}));
const makeRevenue = (n) => Array.from({ length: n }, (_, i) => ({
  id: `id${i}`, patient: `Patient ${i}`, email: `p${i}@test.com`,
  amount: 500 + i * 10, paid: 500, due: 0, status: 'Paid', createdAt: new Date(),
}));

// Build an xlsx buffer for parseExcelFile benchmarking
async function makeExcelBuffer(n) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Patients');
  ws.columns = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Age', key: 'age' },
    { header: 'Gender', key: 'gender' },
  ];
  for (let i = 0; i < n; i++) {
    ws.addRow({ name: `Patient ${i}`, email: `p${i}@test.com`, phone: `+91-${9000000000+i}`, age: 30 + (i % 50), gender: i % 2 ? 'Male' : 'Female' });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

const benchmarkCSV = async () => {
  console.log('\n' + '═══ 3. CSV EXPORT / IMPORT PATH ═══'.padEnd(60, '═'));
  const results = {};

  const patients100 = makePatients(100);
  const patients1k = makePatients(1000);
  const patients10k = makePatients(10000);
  const revenue1k = makeRevenue(1000);

  const csvFields = ['name', 'email', 'role', 'phone', 'status', 'isVerified', 'approvalStatus', 'createdAt'];

  results['csv_toCSV_100'] = await measure('toCSV export (100 rows)',
    async () => toCSV(patients100, csvFields), 1000);
  results['csv_toCSV_1000'] = await measure('toCSV export (1k rows)',
    async () => toCSV(patients1k, csvFields), 200);
  results['csv_toCSV_10000'] = await measure('toCSV export (10k rows)',
    async () => toCSV(patients10k, csvFields), 20);

  const revFields = ['id', 'patient', 'email', 'amount', 'paid', 'due', 'status', 'createdAt'];
  results['csv_toCSV_revenue_1k'] = await measure('toCSV revenue (1k rows)',
    async () => toCSV(revenue1k, revFields), 500);

  results['csv_json2csv_1k'] = await measure('json2csv export (1k rows)',
    async () => exportToCSV_json2csv(patients1k, csvFields), 200);
  results['csv_json2csv_10k'] = await measure('json2csv export (10k rows)',
    async () => exportToCSV_json2csv(patients10k, csvFields), 20);

  // Excel parsing benchmark
  const xlsx50 = await makeExcelBuffer(50);
  const xlsx500 = await makeExcelBuffer(500);
  const xlsx5k = await makeExcelBuffer(5000);

  results['excel_parse_50'] = await measure('ExcelJS parse (50 rows)',
    async () => await parseExcelFile(xlsx50), 100);
  results['excel_parse_500'] = await measure('ExcelJS parse (500 rows)',
    async () => await parseExcelFile(xlsx500), 50);
  results['excel_parse_5k'] = await measure('ExcelJS parse (5k rows)',
    async () => await parseExcelFile(xlsx5k), 5);

  return results;
};

// ── main ──────────────────────────────────────────────────────────────────
const main = async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PHASE 7 — BASELINE PERFORMANCE BENCHMARK');
  console.log('  Node:', process.version);
  console.log('  Date:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');

  const all = {};
  Object.assign(all, await benchmarkImageUpload());
  Object.assign(all, await benchmarkPDF());
  Object.assign(all, await benchmarkCSV());

  // Summary table
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  BASELINE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.table(Object.entries(all).map(([k, v]) => ({
    'Path': k,
    'Avg (ms)': v.avg.toFixed(2),
    'P95 (ms)': v.p95.toFixed(2),
    'P99 (ms)': v.p99.toFixed(2),
    'ops/sec': (v.iterations / (v.total / 1000)).toFixed(1),
    'Heap Δ (MB)': ((v.memAfter - v.memBefore) / 1024 / 1024).toFixed(2),
  })));

  console.log('\n  Baseline complete. These numbers are the target for Rust/NAPI migration.');
  process.exit(0);
};

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
