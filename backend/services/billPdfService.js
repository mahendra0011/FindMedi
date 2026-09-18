import PDFDocument from 'pdfkit';
import { generate12DigitId, generate16DigitId, generateInvoiceId, generateAdmissionId, generateTimestampedId } from '../utils/idGenerator.js';
const shortId = (v) => (v ? String(v).replace(/\D/g, '').slice(-5) : '00000');

const C = {
  primary: '#0f766e',
  primaryDark: '#134e4a',
  ink: '#111827',
  muted: '#6b7280',
  border: '#d1d5db',
  soft: '#f3f4f6',
  success: '#15803d',
};

const money = (v = 0) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`;
const val = (v) => (v === undefined || v === null || v === '' ? '-' : String(v).trim());
const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};
const fmtDateTime = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fallbackId = () => generate16DigitId();

const mkDoc = () => new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });

const collect = (draw) => new Promise((resolve, reject) => {
  const doc = mkDoc();
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
  try { draw(doc); footer(doc); doc.end(); } catch (e) { reject(e); }
});

const B = (doc) => doc.page.height - doc.page.margins.bottom - 56;

const ES = (doc, h = 100) => { if (doc.y + h > B(doc)) doc.addPage(); };

const footer = (doc) => {
  const r = doc.bufferedPageRange();
  for (let i = 0; i < r.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - 58;
    const { left, right } = doc.page.margins;
    const w = doc.page.width - left - right;
    doc.strokeColor(C.border).lineWidth(0.5).moveTo(left, y).lineTo(left + w, y).stroke();
    doc.fillColor(C.muted).font('Helvetica', 8)
      .text('Computer-generated document, no signature required.', left, y + 10, { width: w * 0.72 })
      .text(`Page ${i + 1} of ${r.count}`, left, y + 10, { width: w, align: 'right' });
  }
};

// ── Three type-specific generators ──

export const generateAppointmentBillPDF = async (payment, reference) => collect((doc) => {
  const { l, r } = { l: doc.page.margins.left, r: doc.page.margins.right };
  const pw = doc.page.width - l - r;
  const year = new Date(payment.createdAt || Date.now()).getFullYear();
  const invoiceId = payment.invoice_id || payment.transaction_id || fallbackId();

  const patientName = reference?.patientName || reference?.patient || payment.patient_name || 'Patient';
  const patientEmail = reference?.email || '';
  const patientPhone = reference?.patientId?.phone || payment.patient_phone || '';
  const patientId = payment.transaction_id || fallbackId();

  const h = reference?.hospitalId && typeof reference.hospitalId === 'object' ? reference.hospitalId : {};
  const hospName = h.name || payment.provider || 'Hospital';
  const hospAddr = [h.address, h.city, h.state, h.pincode].filter(Boolean).join(', ') || 'Address';
  const hospLic = h.licenseNo || '-';
  const docName = reference?.doctorId?.name || reference?.doctor || payment.provider || 'Doctor';
  const docSpec = reference?.doctorId?.specialization || '';
  const docReg = reference?.doctorId?.registrationNo || generateTimestampedId('MPMC');

  // ── Header box ──
  doc.save();
  doc.rect(l, 28, pw, 92).fillAndStroke('#ffffff', C.border);
  doc.circle(l + 28, 68, 16).fill(C.primary);
  doc.fillColor('#ffffff').font('Helvetica-Bold', 18).text('M', l + 22, 58, { width: 12, align: 'center' });
  doc.fillColor(C.ink).font('Helvetica-Bold', 14).text(hospName, l + 56, 38);
  doc.font('Helvetica', 8).fillColor(C.muted).text(h.tagline || 'Multi-Speciality Hospital', l + 56, 58);
  doc.fontSize(7).text(hospAddr, l + 56, 76);
  doc.fontSize(7).text(`License: ${hospLic}`, l + 56, 92);
  doc.fillColor(C.ink).font('Helvetica-Bold', 14).text('BILL', l, 38, { width: pw - 18, align: 'right' });
  doc.font('Helvetica', 8).fillColor(C.muted).text(`# ${payment.transaction_id || '-'}`, l, 58, { width: pw - 18, align: 'right' });
  doc.fontSize(7).text(`Date: ${fmtDateTime(payment.createdAt || new Date())}`, l, 76, { width: pw - 18, align: 'right' });
  doc.roundedRect(l + pw - 88, 92, 84, 20, 10).fill(C.success);
  doc.fillColor('#ffffff').font('Helvetica-Bold', 9).text('PAID', l + pw - 88, 97, { width: 84, align: 'center' });
  doc.restore();
  doc.y = 138;

  // ── BILLED TO / PROVIDER ──
  const cw = (pw - 12) / 2;
  const sy = doc.y;

  doc.roundedRect(l, sy, cw, 96, 6).fillAndStroke('#ffffff', C.border);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 10).text('BILLED TO', l + 12, sy + 12);
  [
    ['Patient', patientName],
    ['Email', patientEmail || '-'],
    ['Phone', patientPhone || '-'],
    ['Patient ID', patientId],
  ].forEach(([label, value], i) => {
    const yy = sy + 32 + i * 15;
    doc.fillColor(C.muted).font('Helvetica-Bold', 8).text(`${label}:`, l + 12, yy, { width: 56 });
    doc.fillColor(C.ink).font('Helvetica', 8.5).text(val(value), l + 68, yy, { width: cw - 80, ellipsis: true });
  });

  const px = l + cw + 12;
  doc.roundedRect(px, sy, cw, 96, 6).fillAndStroke('#ffffff', C.border);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 10).text('PROVIDER', px + 12, sy + 12);
  [
    ['Doctor', docName],
    ['Speciality', docSpec || '-'],
    ['Reg No', docReg],
    ['Method', `${(payment.method || '').toUpperCase()}`],
    ['Txn ID', payment.transaction_id || '-'],
  ].forEach(([label, value], i) => {
    const yy = sy + 32 + i * 15;
    doc.fillColor(C.muted).font('Helvetica-Bold', 8).text(`${label}:`, px + 12, yy, { width: 48 });
    doc.fillColor(C.ink).font('Helvetica', 8.5).text(val(value), px + 60, yy, { width: cw - 72, ellipsis: true });
  });

  doc.y = sy + 96 + 18;

  // ── BILL DETAILS table ──
  ES(doc, 40);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 11).text('BILL DETAILS');
  doc.moveDown(0.4);

  const cols = [
    { key: 'idx', label: '#', w: 0.06, a: 'center' },
    { key: 'service', label: 'Service', w: 0.40, b: true },
    { key: 'category', label: 'Category', w: 0.22 },
    { key: 'date', label: 'Date', w: 0.16 },
    { key: 'amount', label: 'Amount', w: 0.16, a: 'right' },
  ];
  const items = (payment.lineItems || []).filter(Boolean);
  const rows = items.length > 0
    ? items.map((it, i) => ({
        idx: i + 1,
        service: it.name || 'Service',
        category: it.category || 'Service',
        date: fmtDate(payment.createdAt || new Date()),
        amount: money(it.price || 0),
      }))
    : [{ idx: 1, service: 'Consultation Fee', category: 'Service', date: fmtDate(payment.createdAt || new Date()), amount: money(payment.amount) }];

  drawTable(doc, cols, rows, l, pw);
  doc.moveDown(0.5);

  // ── Totals box ──
  const bw = 200;
  const bx = l + pw - bw;
  ES(doc, 130);
  const ty = doc.y + 4;
  const amount = payment.amount || 0;
  doc.roundedRect(bx, ty, bw, 102, 6).fillAndStroke(C.soft, C.border);
  let cy = ty + 14;
  doc.fillColor(C.ink).font('Helvetica', 9);
  doc.text('Subtotal', bx + 14, cy, { width: 90 }); doc.text(money(amount), bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  doc.text('Paid', bx + 14, cy, { width: 90 }); doc.text(money(amount), bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  doc.moveTo(bx + 14, cy - 6).lineTo(bx + bw - 14, cy - 6).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.fillColor(amount > 0 ? C.success : C.muted).font('Helvetica-Bold', 10);
  doc.text('Outstanding', bx + 14, cy, { width: 90 }); doc.text('Rs. 0', bx + 104, cy, { width: 80, align: 'right' });
  doc.y = ty + 102 + 16;

  // ── Payment Notes ──
  ES(doc, 40);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 11).text('PAYMENT NOTES');
  doc.moveDown(0.4);
  doc.fillColor(C.ink).font('Helvetica', 9).text(`Payment received. Thank you for choosing ${hospName}.`, l, doc.y, { width: pw, lineGap: 4 });
  doc.moveDown(0.3);
  doc.fillColor(C.muted).font('Helvetica-Bold', 8.5).text('Transaction ID:', l, doc.y, { width: 80 });
  doc.fillColor(C.ink).font('Helvetica', 9).text(payment.transaction_id || '-', l + 80, doc.y - 8, { width: pw - 80 });
  doc.moveDown(1.2);

  // ── Signature ──
  ES(doc, 50);
  const sx = l + pw - 180;
  doc.strokeColor(C.border).lineWidth(0.6).moveTo(sx, doc.y).lineTo(sx + 180, doc.y).stroke();
  doc.fillColor(C.muted).font('Helvetica', 8).text(hospName, sx, doc.y + 8, { width: 180, align: 'center' });
  doc.text('Auth Signatory', sx, doc.y + 20, { width: 180, align: 'center' });
});

export const generateTestBillPDF = async (payment, reference) => collect((doc) => {
  const { l, r } = { l: doc.page.margins.left, r: doc.page.margins.right };
  const pw = doc.page.width - l - r;
  const year = new Date(payment.createdAt || Date.now()).getFullYear();
  const invoiceId = payment.invoice_id || generateInvoiceId('test');

  const patientName = reference?.patientName || reference?.patient || payment.patient_name || 'Patient';
  const patientPhone = reference?.patientPhone || payment.patient_phone || '';
  const collectionMode = reference?.visitType || 'Lab Visit';
  const collectionDate = reference?.bookingDate || '';
  const collectionSlot = reference?.timeSlot || '';

  const h = reference?.hospitalId && typeof reference.hospitalId === 'object' ? reference.hospitalId : {};
  const labName = h.name || payment.provider || 'Diagnostics';
  const labAddr = [h.address, h.city, h.state, h.pincode].filter(Boolean).join(', ') || 'Address';
  const nablNo = h.nablNo || '-';
  const bookingId = reference?.bookingId || generateTimestampedId('BK');

  const discount = reference?.discount || reference?.discountAmount || 0;
  const discountCode = reference?.couponCode || '';

  // ── Header ──
  doc.save();
  doc.rect(l, 28, pw, 92).fillAndStroke('#ffffff', C.border);
  doc.circle(l + 28, 68, 16).fill(C.primary);
  doc.fillColor('#ffffff').font('Helvetica-Bold', 18).text('M', l + 22, 58, { width: 12, align: 'center' });
  doc.fillColor(C.ink).font('Helvetica-Bold', 14).text(labName, l + 56, 38);
  doc.font('Helvetica', 8).fillColor(C.muted).text('Pathology Lab', l + 56, 58);
  doc.fontSize(7).text(labAddr, l + 56, 76);
  doc.fontSize(7).text(`NABL No: ${nablNo}`, l + 56, 92);
  doc.fillColor(C.ink).font('Helvetica-Bold', 14).text('BILL', l, 38, { width: pw - 18, align: 'right' });
  doc.font('Helvetica', 8).fillColor(C.muted).text(`# ${payment.transaction_id || '-'}`, l, 58, { width: pw - 18, align: 'right' });
  doc.fontSize(7).text(`Date: ${fmtDateTime(payment.createdAt || new Date())}`, l, 76, { width: pw - 18, align: 'right' });
  doc.roundedRect(l + pw - 88, 92, 84, 20, 10).fill(C.success);
  doc.fillColor('#ffffff').font('Helvetica-Bold', 9).text('PAID', l + pw - 88, 97, { width: 84, align: 'center' });
  doc.restore();
  doc.y = 138;

  // ── BILLED TO / PROVIDER ──
  const cw = (pw - 12) / 2;
  const sy = doc.y;

  doc.roundedRect(l, sy, cw, 96, 6).fillAndStroke('#ffffff', C.border);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 10).text('BILLED TO', l + 12, sy + 12);
  [
    ['Patient', patientName],
    ['Phone', patientPhone || '-'],
    ['Collection', `${collectionMode}${collectionDate ? ` (${fmtDate(collectionDate)}` : ''}${collectionSlot ? `, ${collectionSlot}` : ''}${collectionDate ? ')' : ''}`],
  ].forEach(([label, value], i) => {
    const yy = sy + 32 + i * 15;
    doc.fillColor(C.muted).font('Helvetica-Bold', 8).text(`${label}:`, l + 12, yy, { width: 56 });
    doc.fillColor(C.ink).font('Helvetica', 8.5).text(val(value), l + 68, yy, { width: cw - 80, ellipsis: true });
  });

  const px = l + cw + 12;
  doc.roundedRect(px, sy, cw, 96, 6).fillAndStroke('#ffffff', C.border);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 10).text('PROVIDER', px + 12, sy + 12);
  [
    ['Center', labName],
    ['Booking ID', bookingId],
    ['Method', `${(payment.method || '').toUpperCase()}`],
    ['Txn ID', payment.transaction_id || '-'],
  ].forEach(([label, value], i) => {
    const yy = sy + 32 + i * 15;
    doc.fillColor(C.muted).font('Helvetica-Bold', 8).text(`${label}:`, px + 12, yy, { width: 48 });
    doc.fillColor(C.ink).font('Helvetica', 8.5).text(val(value), px + 60, yy, { width: cw - 72, ellipsis: true });
  });

  doc.y = sy + 96 + 18;

  // ── BILL DETAILS table ──
  ES(doc, 40);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 11).text('BILL DETAILS');
  doc.moveDown(0.4);

  const cols = [
    { key: 'idx', label: '#', w: 0.06, a: 'center' },
    { key: 'service', label: 'Service', w: 0.40, b: true },
    { key: 'category', label: 'Category', w: 0.22 },
    { key: 'date', label: 'Date', w: 0.16 },
    { key: 'amount', label: 'Amount', w: 0.16, a: 'right' },
  ];
  const items = (payment.lineItems || []).filter(Boolean);
  const reportTimes = {};
  if (reference?.testIds) {
    reference.testIds.forEach(t => {
      if (t && t.name) reportTimes[t.name] = t.reportTime || '-';
    });
  }
  const rows = items.length > 0
    ? items.map((it, i) => ({
        idx: i + 1,
        service: it.name || 'Test',
        category: it.category || (it.name?.toLowerCase().includes('home') ? 'Service' : 'Pathology'),
        date: fmtDate(payment.createdAt || new Date()),
        amount: money(it.price || it.discountedPrice || 0),
      }))
    : [{ idx: 1, service: 'Lab Test', category: 'Pathology', date: fmtDate(payment.createdAt || new Date()), amount: money(payment.amount) }];

  drawTable(doc, cols, rows, l, pw);
  doc.moveDown(0.5);

  // ── Totals box ──
  const bw = 200;
  const bx = l + pw - bw;
  ES(doc, 130);
  const ty = doc.y + 4;
  const amount = payment.amount || 0;
  const subtotal = amount + discount;
  const rowsCount = 4;
  doc.roundedRect(bx, ty, bw, 18 + rowsCount * 22, 6).fillAndStroke(C.soft, C.border);
  let cy = ty + 14;
  doc.fillColor(C.ink).font('Helvetica', 9);
  doc.text('Subtotal', bx + 14, cy, { width: 90 }); doc.text(money(subtotal), bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  const dl = discountCode ? `Discount (${discountCode})` : 'Discount';
  doc.fillColor(discount > 0 ? '#b45309' : C.ink).text(dl, bx + 14, cy, { width: 90 });
  doc.fillColor(discount > 0 ? '#b45309' : C.ink).text(`-${money(discount)}`, bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  doc.fillColor(C.ink).text('Paid', bx + 14, cy, { width: 90 }); doc.text(money(amount), bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  doc.moveTo(bx + 14, cy - 6).lineTo(bx + bw - 14, cy - 6).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.fillColor(amount > 0 ? C.success : C.muted).font('Helvetica-Bold', 10);
  doc.text('Outstanding', bx + 14, cy, { width: 90 }); doc.text('Rs. 0', bx + 104, cy, { width: 80, align: 'right' });
  doc.y = ty + 18 + rowsCount * 22 + 16;

  // ── Payment Notes ──
  ES(doc, 40);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 11).text('PAYMENT NOTES');
  doc.moveDown(0.4);
  doc.fillColor(C.ink).font('Helvetica', 9).text('Payment received. Reports will be shared once ready.', l, doc.y, { width: pw, lineGap: 4 });
  doc.moveDown(0.3);
  doc.fillColor(C.muted).font('Helvetica-Bold', 8.5).text('Transaction ID:', l, doc.y, { width: 80 });
  doc.fillColor(C.ink).font('Helvetica', 9).text(payment.transaction_id || '-', l + 80, doc.y - 8, { width: pw - 80 });
  doc.moveDown(1.2);

  // ── Signature ──
  ES(doc, 50);
  const sx = l + pw - 180;
  doc.strokeColor(C.border).lineWidth(0.6).moveTo(sx, doc.y).lineTo(sx + 180, doc.y).stroke();
  doc.fillColor(C.muted).font('Helvetica', 8).text(labName, sx, doc.y + 8, { width: 180, align: 'center' });
  doc.text('Auth Signatory', sx, doc.y + 20, { width: 180, align: 'center' });
});

export const generateMedicineBillPDF = async (payment, reference) => collect((doc) => {
  const { l, r } = { l: doc.page.margins.left, r: doc.page.margins.right };
  const pw = doc.page.width - l - r;
  const year = new Date(payment.createdAt || Date.now()).getFullYear();
  const invoiceId = payment.invoice_id || generateInvoiceId('medicine');

  const patientName = reference?.patientName || reference?.patient || payment.patient_name || 'Patient';
  const patientPhone = reference?.phone || payment.patient_phone || '';
  const deliveryMode = reference?.deliveryMode === 'delivery' ? 'Home Delivery' : 'Store Pickup';

  const h = reference?.hospitalId && typeof reference.hospitalId === 'object' ? reference.hospitalId : {};
  const storeName = h.name || payment.provider || 'Pharmacy';
  const storeAddr = [h.address, h.city, h.state, h.pincode].filter(Boolean).join(', ') || 'Address';
  const storeLic = h.licenseNo || '-';
  const orderId = reference?.orderId || generateTimestampedId('ORD');
  const ps = reference?.prescriptionStatus;
  const rxNote = ps === 'verified' ? 'Verified for Rx items.' : '';

  const discount = reference?.discount || reference?.discountAmount || 0;
  const discountCode = reference?.couponCode || '';
  const deliveryFee = reference?.deliveryFee || 0;

  // ── Header ──
  doc.save();
  doc.rect(l, 28, pw, 92).fillAndStroke('#ffffff', C.border);
  doc.circle(l + 28, 68, 16).fill(C.primary);
  doc.fillColor('#ffffff').font('Helvetica-Bold', 18).text('M', l + 22, 58, { width: 12, align: 'center' });
  doc.fillColor(C.ink).font('Helvetica-Bold', 14).text(storeName, l + 56, 38);
  doc.font('Helvetica', 8).fillColor(C.muted).text('Pharmacy', l + 56, 58);
  doc.fontSize(7).text(storeAddr, l + 56, 76);
  doc.fontSize(7).text(`License: ${storeLic}`, l + 56, 92);
  doc.fillColor(C.ink).font('Helvetica-Bold', 14).text('BILL', l, 38, { width: pw - 18, align: 'right' });
  doc.font('Helvetica', 8).fillColor(C.muted).text(`# ${payment.transaction_id || '-'}`, l, 58, { width: pw - 18, align: 'right' });
  doc.fontSize(7).text(`Date: ${fmtDateTime(payment.createdAt || new Date())}`, l, 76, { width: pw - 18, align: 'right' });
  doc.roundedRect(l + pw - 88, 92, 84, 20, 10).fill(C.success);
  doc.fillColor('#ffffff').font('Helvetica-Bold', 9).text('PAID', l + pw - 88, 97, { width: 84, align: 'center' });
  doc.restore();
  doc.y = 138;

  // ── BILLED TO / PROVIDER ──
  const cw = (pw - 12) / 2;
  const sy = doc.y;

  doc.roundedRect(l, sy, cw, 96, 6).fillAndStroke('#ffffff', C.border);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 10).text('BILLED TO', l + 12, sy + 12);
  [
    ['Patient', patientName],
    ['Phone', patientPhone || '-'],
    ['Delivery', deliveryMode],
  ].forEach(([label, value], i) => {
    const yy = sy + 32 + i * 15;
    doc.fillColor(C.muted).font('Helvetica-Bold', 8).text(`${label}:`, l + 12, yy, { width: 56 });
    doc.fillColor(C.ink).font('Helvetica', 8.5).text(val(value), l + 68, yy, { width: cw - 80, ellipsis: true });
  });

  const px = l + cw + 12;
  doc.roundedRect(px, sy, cw, 96, 6).fillAndStroke('#ffffff', C.border);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 10).text('PROVIDER', px + 12, sy + 12);
  [
    ['Store', storeName],
    ['Order ID', orderId],
    ['Method', `${(payment.method || '').toUpperCase()}`],
    ['Txn ID', payment.transaction_id || '-'],
  ].forEach(([label, value], i) => {
    const yy = sy + 32 + i * 15;
    doc.fillColor(C.muted).font('Helvetica-Bold', 8).text(`${label}:`, px + 12, yy, { width: 48 });
    doc.fillColor(C.ink).font('Helvetica', 8.5).text(val(value), px + 60, yy, { width: cw - 72, ellipsis: true });
  });

  doc.y = sy + 96 + 18;

  // ── BILL DETAILS table (medicine: extra Qty/Price columns) ──
  ES(doc, 40);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 11).text('BILL DETAILS');
  doc.moveDown(0.4);

  const cols = [
    { key: 'idx', label: '#', w: 0.05, a: 'center' },
    { key: 'item', label: 'Item', w: 0.31, b: true },
    { key: 'qty', label: 'Qty', w: 0.07, a: 'center' },
    { key: 'price', label: 'Price', w: 0.11, a: 'right' },
    { key: 'category', label: 'Category', w: 0.11 },
    { key: 'amount', label: 'Amount', w: 0.13, a: 'right' },
  ];

  const packLookup = {};
  if (reference?.items) {
    reference.items.forEach(it => {
      const n = it.medicineName || it.name;
      if (it.medicineId && typeof it.medicineId === 'object') {
        packLookup[n] = { pack: `${it.medicineId.form || '-'}`, rx: (it.medicineId.rxRequired || it.medicineId.rx) ? '🔒' : '' };
      } else {
        packLookup[n] = { pack: it.packSize || it.form || '-', rx: it.type === 'rx' ? '🔒' : '' };
      }
    });
  }

  const items = (payment.lineItems || []).filter(Boolean);
  const rows = items.length > 0
    ? items.map((it, i) => {
        const info = packLookup[it.name] || {};
        const rx = info.rx || '';
        const cat = (it.category || (rx ? 'Rx' : 'OTC'));
        return {
          idx: i + 1,
          item: `${it.name}${rx}`,
          qty: it.qty || 1,
          price: money(it.price || 0),
          category: cat,
          amount: money((it.price || 0) * (it.qty || 1)),
        };
      })
    : [{ idx: 1, item: 'Medicine Order', qty: 1, price: money(payment.amount), category: '-', amount: money(payment.amount) }];

  drawTable(doc, cols, rows, l, pw);
  doc.moveDown(0.5);

  // ── Totals box ──
  const bw = 200;
  const bx = l + pw - bw;
  ES(doc, 130);
  const ty = doc.y + 4;
  const amount = payment.amount || 0;
  const subtotal = amount + discount + deliveryFee;
  const rowsCount = 5;
  doc.roundedRect(bx, ty, bw, 18 + rowsCount * 22, 6).fillAndStroke(C.soft, C.border);
  let cy = ty + 14;
  doc.fillColor(C.ink).font('Helvetica', 9);
  doc.text('Subtotal', bx + 14, cy, { width: 90 }); doc.text(money(subtotal), bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  const dl = discountCode ? `Discount (${discountCode})` : 'Discount';
  doc.fillColor(discount > 0 ? '#b45309' : C.ink).text(dl, bx + 14, cy, { width: 90 });
  doc.fillColor(discount > 0 ? '#b45309' : C.ink).text(`-${money(discount)}`, bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  doc.fillColor(C.ink).text('Delivery', bx + 14, cy, { width: 90 }); doc.text(money(deliveryFee), bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  doc.fillColor(C.ink).text('Paid', bx + 14, cy, { width: 90 }); doc.text(money(amount), bx + 104, cy, { width: 80, align: 'right' }); cy += 22;
  doc.moveTo(bx + 14, cy - 6).lineTo(bx + bw - 14, cy - 6).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.fillColor(amount > 0 ? C.success : C.muted).font('Helvetica-Bold', 10);
  doc.text('Outstanding', bx + 14, cy, { width: 90 }); doc.text('Rs. 0', bx + 104, cy, { width: 80, align: 'right' });
  doc.y = ty + 18 + rowsCount * 22 + 16;

  // ── Payment Notes ──
  ES(doc, 40);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold', 11).text('PAYMENT NOTES');
  doc.moveDown(0.4);
  const note = rxNote ? `Prescription ${rxNote} Thank you for your order.` : 'Thank you for your order.';
  doc.fillColor(C.ink).font('Helvetica', 9).text(note, l, doc.y, { width: pw, lineGap: 4 });
  doc.moveDown(0.3);
  doc.fillColor(C.muted).font('Helvetica-Bold', 8.5).text('Transaction ID:', l, doc.y, { width: 80 });
  doc.fillColor(C.ink).font('Helvetica', 9).text(payment.transaction_id || '-', l + 80, doc.y - 8, { width: pw - 80 });
  doc.moveDown(1.2);

  // ── Signature ──
  ES(doc, 50);
  const sx = l + pw - 180;
  doc.strokeColor(C.border).lineWidth(0.6).moveTo(sx, doc.y).lineTo(sx + 180, doc.y).stroke();
  doc.fillColor(C.muted).font('Helvetica', 8).text(storeName, sx, doc.y + 8, { width: 180, align: 'center' });
  doc.text('Auth Signatory', sx, doc.y + 20, { width: 180, align: 'center' });
});

// ── Shared table drawer ──

const drawTable = (doc, columns, rows, left, tableWidth) => {
  const widths = columns.map(col => Math.round(tableWidth * col.w));
  let y = doc.y;
  const hdrH = 22;
  const rowH = 20;
  const fs = 8;

  const drawHdr = () => {
    doc.rect(left, y, tableWidth, hdrH).fill(C.primaryDark);
    doc.fillColor('#ffffff').font('Helvetica-Bold', 7.5);
    let x = left;
    columns.forEach((col, i) => {
      doc.text(col.label, x + 6, y + 7, { width: widths[i] - 10, align: col.a || 'left' });
      x += widths[i];
    });
    y += hdrH;
  };

  drawHdr();

  rows.forEach((row, ri) => {
    if (y + rowH > B(doc)) { doc.addPage(); drawHdr(); }
    doc.rect(left, y, tableWidth, rowH).fill(ri % 2 === 0 ? '#ffffff' : C.soft);
    doc.strokeColor(C.border).lineWidth(0.4).rect(left, y, tableWidth, rowH).stroke();
    doc.fillColor(C.ink).font('Helvetica', fs);
    let x = left;
    columns.forEach((col, ci) => {
      doc.font(col.b ? 'Helvetica-Bold' : 'Helvetica', fs)
        .text(val(row[col.key]), x + 6, y + 6, { width: widths[ci] - 10, align: col.a || 'left' });
      x += widths[ci];
    });
    y += rowH;
  });

  doc.y = y + 6;
};