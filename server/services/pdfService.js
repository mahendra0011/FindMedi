import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
 
const HOSPITAL = {
  name: 'FindMedi Hospital',
  tagline: 'Hospital Management System',
  address: '123 Medical Center Drive, Healthcare City',
  phone: '+1 (555) 123-4567',
  email: 'info@findmedihospital.com',
};
 
const COLORS = {
  primary: '#0f766e',
  primaryDark: '#134e4a',
  accent: '#2563eb',
  ink: '#111827',
  muted: '#6b7280',
  border: '#d1d5db',
  soft: '#f3f4f6',
  success: '#15803d',
  warning: '#b45309',
  danger: '#b91c1c',
};
 
const money = (value = 0) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const valueOrDash = (value) => (value === undefined || value === null || value === '' ? '-' : String(value).trim() || '-');
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};
const doctorName = (name) => {
  const cleaned = valueOrDash(name);
  if (cleaned === '-') return '-';
  return /^dr\.?\s/i.test(cleaned) ? cleaned : `Dr. ${cleaned}`;
};
const cleanRows = (rows, fallback) => (rows || []).filter(Boolean).length ? rows.filter(Boolean) : [fallback];
 
const createDocument = () => new PDFDocument({
  size: 'A4',
  margin: 36,
  bufferPages: true,
});
 
const collectPdf = (draw) => new Promise((resolve, reject) => {
  const doc = createDocument();
  const chunks = [];
 
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
 
  try {
    draw(doc);
    drawFooter(doc);
    doc.end();
  } catch (error) {
    reject(error);
  }
});
 
const bottomLimit = (doc) => doc.page.height - doc.page.margins.bottom - 56;
 
const ensureSpace = (doc, height = 100) => {
  if (doc.y + height > bottomLimit(doc)) {
    doc.addPage();
  }
};
 
const drawHeader = (doc, documentTitle, meta = {}) => {
  const { left, right } = doc.page.margins;
  const width = doc.page.width - left - right;
 
  doc.save();
  doc.roundedRect(left, 28, width, 82, 8).fill(COLORS.primary);
  doc.circle(left + 30, 69, 17).fill('#ffffff');
  doc.strokeColor(COLORS.primary).lineWidth(2.2)
    .moveTo(left + 18, 69)
    .lineTo(left + 25, 69)
    .lineTo(left + 29, 59)
    .lineTo(left + 36, 79)
    .lineTo(left + 40, 69)
    .lineTo(left + 47, 69)
    .stroke();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(HOSPITAL.name, left + 58, 46);
  doc.font('Helvetica').fontSize(8.5).text(HOSPITAL.tagline, left + 58, 71);
  doc.fontSize(7.5).text(`${HOSPITAL.address} | ${HOSPITAL.phone} | ${HOSPITAL.email}`, left + 58, 91);
 
  doc.font('Helvetica-Bold').fontSize(15).text(documentTitle, left, 48, { width: width - 18, align: 'right' });
  if (meta.id) doc.font('Helvetica').fontSize(8.5).text(`# ${meta.id}`, left, 71, { width: width - 18, align: 'right' });
  if (meta.date) doc.fontSize(8.5).text(`Date: ${formatDate(meta.date)}`, left, 91, { width: width - 18, align: 'right' });
  doc.restore();
 
  doc.y = 128;
};
 
const drawFooter = (doc) => {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    const y = doc.page.height - 58;
    const { left, right } = doc.page.margins;
    const width = doc.page.width - left - right;
    doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(left, y).lineTo(left + width, y).stroke();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8);
    doc.text('Computer-generated document. Please contact FindMedi Hospital for corrections.', left, y + 10, { width: width * 0.72 });
    doc.text(`Page ${i + 1} of ${pages.count}`, left, y + 10, { width, align: 'right' });
  }
};
 
const drawSectionTitle = (doc, title) => {
  ensureSpace(doc, 34);
  doc.moveDown(0.2);
  doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(12).text(title.toUpperCase());
  doc.moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .strokeColor(COLORS.border)
    .lineWidth(0.6)
    .stroke();
  doc.moveDown(0.55);
};
 
const drawInfoGrid = (doc, groups) => {
  const gap = 12;
  const { left, right } = doc.page.margins;
  const width = doc.page.width - left - right;
  const cardWidth = (width - gap) / 2;
  const startY = doc.y;
  const cardHeight = 96;
 
  groups.slice(0, 2).forEach((group, index) => {
    const x = left + index * (cardWidth + gap);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 6).fillAndStroke('#ffffff', COLORS.border);
    doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(10).text(group.title, x + 12, startY + 12);
    group.rows.slice(0, 4).forEach((row, rowIndex) => {
      const y = startY + 32 + rowIndex * 15;
      doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(`${row.label}:`, x + 12, y, { width: 72 });
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.5).text(valueOrDash(row.value), x + 84, y, {
        width: cardWidth - 96,
        ellipsis: true,
      });
    });
  });
 
  doc.y = startY + cardHeight + 18;
};
 
const drawTextBlock = (doc, title, text) => {
  const content = valueOrDash(text);
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font('Helvetica').fontSize(9.5);
  const contentHeight = doc.heightOfString(content, { width, lineGap: 2 });
  ensureSpace(doc, Math.max(42, contentHeight + 24));
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(9).text(title);
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9.5).text(content, {
    width,
    lineGap: 2,
  });
  doc.moveDown(0.55);
};
 
const drawTable = (doc, columns, rows, options = {}) => {
  ensureSpace(doc, 58);
  const { left, right } = doc.page.margins;
  const tableWidth = doc.page.width - left - right;
  const widths = columns.map(col => Math.round(tableWidth * col.width));
  let y = doc.y;
  const headerHeight = options.headerHeight || 24;
  const minRowHeight = options.rowHeight || 24;
  const fontSize = options.fontSize || 8.5;
 
  const drawHeaderRow = () => {
    doc.roundedRect(left, y, tableWidth, headerHeight, 4).fill(COLORS.primaryDark);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    let x = left;
    columns.forEach((column, index) => {
      doc.text(column.label, x + 8, y + 8, { width: widths[index] - 12 });
      x += widths[index];
    });
    y += headerHeight;
  };
 
  drawHeaderRow();
  doc.font('Helvetica').fontSize(fontSize);
 
  rows.forEach((row, rowIndex) => {
    const cellHeights = columns.map((column, colIndex) => {
      doc.font(column.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
      return doc.heightOfString(valueOrDash(row[column.key]), {
        width: widths[colIndex] - 12,
        align: column.align || 'left',
        lineGap: 1,
      });
    });
    const rowHeight = Math.max(minRowHeight, Math.max(...cellHeights) + 12);
 
    if (y + rowHeight > bottomLimit(doc)) {
      doc.addPage();
      y = doc.y;
      drawHeaderRow();
    }
 
    doc.rect(left, y, tableWidth, rowHeight).fill(rowIndex % 2 === 0 ? '#ffffff' : COLORS.soft);
    doc.strokeColor(COLORS.border).lineWidth(0.4).rect(left, y, tableWidth, rowHeight).stroke();
 
    let x = left;
    columns.forEach((column, colIndex) => {
      doc.fillColor(COLORS.ink).font(column.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).text(
        valueOrDash(row[column.key]),
        x + 8,
        y + 7,
        { width: widths[colIndex] - 12, align: column.align || 'left', lineGap: 1 }
      );
      x += widths[colIndex];
    });
    y += rowHeight;
  });
 
  doc.y = y + 10;
};
 
const drawStatusPill = (doc, status, x, y) => {
  const normalized = String(status || 'Pending');
  const color = normalized === 'Paid' ? COLORS.success
    : normalized === 'Overdue' ? COLORS.danger
      : normalized === 'Partial' ? COLORS.accent
        : COLORS.warning;
  doc.roundedRect(x, y, 84, 22, 11).fill(color);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(normalized, x, y + 6, { width: 84, align: 'center' });
};
 
const fetchImageBuffer = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.buffer();
    return buffer;
  } catch { return null; }
};
 
const drawSignature = (doc, label = 'Authorized Signatory', signatureBuffer = null) => {
  ensureSpace(doc, 64);
  const { right } = doc.page.margins;
  const width = 170;
  const x = doc.page.width - right - width;
  const y = doc.y + 18;
 
  if (signatureBuffer) doc.image(signatureBuffer, x + 35, y - 42, { width: 100, height: 40 });
  doc.strokeColor(COLORS.border).lineWidth(0.6).moveTo(x, y).lineTo(x + width, y).stroke();
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(label, x, y + 8, { width, align: 'center' });
  doc.y = y + 28;
};
 
export const generatePrescriptionPDF = async (data) => {
  const signatureBuffer = data.doctor?.signatureUrl ? await fetchImageBuffer(data.doctor.signatureUrl) : null;
  return collectPdf((doc) => {
    const now = new Date(); const rxId = data.prescriptionId || data.reportId || `RX-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${uuidv4()}`;
    drawHeader(doc, 'Prescription', { id: rxId, date: data.date || new Date() });
    drawInfoGrid(doc, [
      {
        title: 'Patient',
        rows: [
          { label: 'Name', value: data.patient?.name },
          { label: 'Age', value: data.patient?.age },
          { label: 'Gender', value: data.patient?.gender },
          { label: 'Phone', value: data.patient?.phone },
        ],
      },
      {
        title: 'Doctor',
        rows: [
          { label: 'Name', value: doctorName(data.doctor?.name) },
          { label: 'Speciality', value: data.doctor?.specialization },
          { label: 'Email', value: data.doctor?.email },
          { label: 'Follow-up', value: data.followUp },
        ],
      },
    ]);
 
    drawSectionTitle(doc, 'Clinical Notes');
    drawTextBlock(doc, 'Chief Complaints', data.chiefComplaints);
    drawTextBlock(doc, 'Diagnosis', data.diagnosis);
 
    drawSectionTitle(doc, 'Medications');
    drawTable(doc, [
      { key: 'index', label: '#', width: 0.08, align: 'center' },
      { key: 'name', label: 'Medicine', width: 0.34, bold: true },
      { key: 'dosage', label: 'Dosage', width: 0.18 },
      { key: 'frequency', label: 'Frequency', width: 0.18 },
      { key: 'instructions', label: 'Instructions', width: 0.22 },
    ], cleanRows((data.medications || []).filter(med => med?.name).map((med, index) => ({
      index: index + 1,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      instructions: med.instructions,
    })), { index: '-', name: 'No medications prescribed', dosage: '-', frequency: '-', instructions: '-' }));
 
    drawSectionTitle(doc, 'Advice');
    drawTextBlock(doc, 'Instructions for Patient', data.advice || 'No specific advice');
    drawSignature(doc, doctorName(data.doctor?.name), signatureBuffer);
  });
};
 
export const generateLabReportPDF = async (data) => collectPdf((doc) => {
  const labNow = new Date(); const labId = data.reportId || `LAB-${labNow.getFullYear()}-${String(labNow.getMonth()+1).padStart(2,'0')}-${String(labNow.getDate()).padStart(2,'0')}-${String(labNow.getHours()).padStart(2,'0')}-${String(labNow.getMinutes()).padStart(2,'0')}-${uuidv4()}`;
  drawHeader(doc, 'Laboratory Report', { id: labId, date: data.reportDate || new Date() });
  drawInfoGrid(doc, [
    {
      title: 'Patient',
      rows: [
        { label: 'Name', value: data.patient?.name },
        { label: 'Age', value: data.patient?.age },
        { label: 'Gender', value: data.patient?.gender },
        { label: 'Phone', value: data.patient?.phone },
      ],
    },
    {
      title: 'Report',
      rows: [
        { label: 'Doctor', value: doctorName(data.doctor?.name) },
        { label: 'Speciality', value: data.doctor?.specialization },
        { label: 'Test Date', value: formatDate(data.testDate) },
        { label: 'Report Date', value: formatDate(data.reportDate || new Date()) },
      ],
    },
  ]);
 
  drawSectionTitle(doc, 'Test Results');
  drawTable(doc, [
    { key: 'name', label: 'Test', width: 0.34, bold: true },
    { key: 'result', label: 'Result', width: 0.22 },
    { key: 'unit', label: 'Unit', width: 0.14 },
    { key: 'referenceRange', label: 'Reference Range', width: 0.30 },
  ], cleanRows((data.tests || []).filter(test => test?.name).map(test => ({
    name: test.name,
    result: test.result,
    unit: test.unit,
    referenceRange: test.referenceRange,
  })), { name: 'No test results entered', result: '-', unit: '-', referenceRange: '-' }));
 
  drawSectionTitle(doc, 'Clinical Notes');
  drawTextBlock(doc, 'Notes', data.notes || 'No additional notes');
  drawSignature(doc, 'Lab In-charge / Pathologist');
});
 
export const generateDischargeSummaryPDF = async (data) => collectPdf((doc) => {
  const dsNow = new Date(); const dsId = data.admissionId || `DS-${dsNow.getFullYear()}-${String(dsNow.getMonth()+1).padStart(2,'0')}-${String(dsNow.getDate()).padStart(2,'0')}-${String(dsNow.getHours()).padStart(2,'0')}-${String(dsNow.getMinutes()).padStart(2,'0')}-${uuidv4()}`;
  drawHeader(doc, 'Discharge Summary', { id: dsId, date: data.dischargeDate || new Date() });
  drawInfoGrid(doc, [
    {
      title: 'Patient',
      rows: [
        { label: 'Name', value: data.patient?.name },
        { label: 'Age', value: data.patient?.age },
        { label: 'Gender', value: data.patient?.gender },
        { label: 'Phone', value: data.patient?.phone },
      ],
    },
    {
      title: 'Admission',
      rows: [
        { label: 'Doctor', value: doctorName(data.doctor?.name) },
        { label: 'Admit Date', value: formatDate(data.admissionDate) },
        { label: 'Discharge', value: formatDate(data.dischargeDate) },
        { label: 'Admission ID', value: data.admissionId },
      ],
    },
  ]);
 
  drawSectionTitle(doc, 'Hospital Course');
  drawTextBlock(doc, 'Chief Complaints on Admission', data.chiefComplaints);
  drawTextBlock(doc, 'Final Diagnosis', data.diagnosis);
  drawTextBlock(doc, 'Treatment Given', data.treatment);
  drawTextBlock(doc, 'Surgery or Procedure', data.surgery || 'None');
 
  drawSectionTitle(doc, 'Discharge Medications');
  drawTable(doc, [
    { key: 'index', label: '#', width: 0.08, align: 'center' },
    { key: 'name', label: 'Medicine', width: 0.42, bold: true },
    { key: 'dosage', label: 'Dosage', width: 0.24 },
    { key: 'frequency', label: 'Frequency', width: 0.26 },
  ], cleanRows((data.medications || []).filter(med => med?.name).map((med, index) => ({
    index: index + 1,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
  })), { index: '-', name: 'No discharge medications entered', dosage: '-', frequency: '-' }));
 
  drawSectionTitle(doc, 'Aftercare');
  drawTextBlock(doc, 'Discharge Advice', data.dischargeAdvice || 'No specific advice');
  drawTextBlock(doc, 'Follow-up Instructions', data.followUpInstructions || 'Not specified');
  drawSignature(doc, doctorName(data.doctor?.name));
});
 
export const generateInvoicePDF = async (bill) => collectPdf((doc) => {
  const patient = bill.patientId && typeof bill.patientId === 'object' ? bill.patientId : {};
  const doctor = bill.doctorId && typeof bill.doctorId === 'object' ? bill.doctorId : {};
  const amount = Number(bill.amount || 0);
  const paid = Number(bill.paid || 0);
  const outstanding = Math.max(amount - paid, 0);
  const lineItems = Array.isArray(bill.services) && bill.services.length > 0
    ? bill.services.map((service, index) => ({
      index: index + 1,
      service: service.name,
      category: service.category || bill.source || 'Service',
      date: formatDate(bill.date),
      amount: money(service.price),
    }))
    : [{
      index: 1,
      service: bill.service,
      category: bill.source || 'Service',
      date: formatDate(bill.date),
      amount: money(amount),
    }];
 
  drawHeader(doc, 'Tax Invoice', { id: bill.invoiceId, date: bill.date || new Date() });
  drawStatusPill(doc, bill.status, doc.page.width - doc.page.margins.right - 84, 118);
 
  drawInfoGrid(doc, [
    {
      title: 'Billed To',
      rows: [
        { label: 'Patient', value: bill.patient || patient.name },
        { label: 'Email', value: patient.email },
        { label: 'Phone', value: patient.phone },
        { label: 'Due Date', value: formatDate(bill.dueDate) },
      ],
    },
    {
      title: 'Provider',
      rows: [
        { label: 'Provider', value: bill.doctor === 'Lab Services' ? 'Lab Services' : doctorName(doctor.name || bill.doctor) },
        { label: 'Speciality', value: doctor.specialization },
        { label: 'Method', value: bill.paymentMethod || 'Pending' },
        { label: 'Txn ID', value: bill.transactionId },
      ],
    },
  ]);
 
  drawSectionTitle(doc, 'Invoice Details');
  drawTable(doc, [
    { key: 'index', label: '#', width: 0.08, align: 'center' },
    { key: 'service', label: 'Service', width: 0.44, bold: true },
    { key: 'category', label: 'Category', width: 0.18 },
    { key: 'date', label: 'Date', width: 0.16 },
    { key: 'amount', label: 'Amount', width: 0.14, align: 'right' },
  ], lineItems);
 
  const { left, right } = doc.page.margins;
  const width = doc.page.width - left - right;
  const boxWidth = 220;
  const x = left + width - boxWidth;
  ensureSpace(doc, 126);
  const y = doc.y + 4;
 
  doc.roundedRect(x, y, boxWidth, 96, 6).fillAndStroke(COLORS.soft, COLORS.border);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10);
  doc.text('Subtotal', x + 14, y + 16, { width: 100 });
  doc.text(money(amount), x + 112, y + 16, { width: 90, align: 'right' });
  doc.font('Helvetica').fillColor(COLORS.muted);
  doc.text('Paid', x + 14, y + 40, { width: 100 });
  doc.text(money(paid), x + 112, y + 40, { width: 90, align: 'right' });
  doc.moveTo(x + 14, y + 64).lineTo(x + boxWidth - 14, y + 64).strokeColor(COLORS.border).stroke();
  doc.fillColor(outstanding > 0 ? COLORS.warning : COLORS.success).font('Helvetica-Bold');
  doc.text('Outstanding', x + 14, y + 72, { width: 100 });
  doc.text(money(outstanding), x + 112, y + 72, { width: 90, align: 'right' });
  doc.y = y + 118;
 
drawSectionTitle(doc, 'Payment Notes');
drawTextBlock(doc, 'Instructions', outstanding > 0
  ? 'Please clear the outstanding amount by the due date. Keep this invoice for your records.'
  : 'Payment received. Thank you for choosing FindMedi Hospital.');
if (bill.transactionId) {
  drawTextBlock(doc, 'Transaction ID', bill.transactionId);
}
if (bill.invoiceId) {
  drawTextBlock(doc, 'Invoice ID', bill.invoiceId);
}
});
 
export const generatePaymentInvoicePDF = async (payment, reference = null, user = null, documentTitle = 'Payment Invoice') => collectPdf((doc) => {
  const typePrefix = { appointment: 'APT', test: 'TST', medicine: 'MED' };
  const year = new Date(payment.createdAt || Date.now()).getFullYear();
  const numericPart = (payment.transaction_id || payment._id?.toString() || '00000').replace(/\D/g, '');
  const digitPart = numericPart.slice(-16).padStart(16, '0');
  const isMedicine = payment.serviceType === 'medicine';
  const invType = typePrefix[payment.serviceType] || 'GEN';
  const invDigit = isMedicine ? digitPart.slice(-12) : digitPart;
  const invoiceId = payment.invoice_id || `INV-${invType}-${year}-${String(new Date().getMonth() + 1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}-${String(new Date().getHours()).padStart(2,'0')}-${String(new Date().getMinutes()).padStart(2,'0')}-${invDigit}`;
  const transactionId = payment.transaction_id || `TXN-${year}-${digitPart}`;

  const isBill = documentTitle.toLowerCase().includes('bill');
  const billDigit = isMedicine ? digitPart.slice(-12) : digitPart.slice(-12);
  const docId = isBill ? (payment.invoice_id || `BILL-${invType}-${year}-${String(new Date().getMonth() + 1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}-${String(new Date().getHours()).padStart(2,'0')}-${String(new Date().getMinutes()).padStart(2,'0')}-${billDigit}`) : invoiceId;

  drawHeader(doc, documentTitle, { id: docId, date: payment.createdAt || new Date() });
  drawStatusPill(doc, 'Paid', doc.page.width - doc.page.margins.right - 84, 118);

  // ── Data Extraction ──
  let patientName = payment.patient_name || user?.name || 'Patient';
  let patientPhone = payment.patient_phone || user?.phone || '';
  let patientAddr = user?.address || '';
  if (reference) {
    patientName = reference.patientName || reference.patient || patientName;
    if (payment.serviceType === 'appointment') {
      patientPhone = reference.patientId?.phone || patientPhone;
      patientAddr = reference.patientId?.address || patientAddr;
    } else if (payment.serviceType === 'test') {
      patientPhone = reference.patientPhone || patientPhone;
      patientAddr = reference.homeCollectionAddress || patientAddr;
    } else if (payment.serviceType === 'medicine') {
      patientPhone = reference.phone || patientPhone;
      patientAddr = reference.deliveryAddress ? `${reference.deliveryAddress} (Delivery)` : patientAddr;
    }
  }

  let providerName = payment.provider || 'FindMedi';
  let providerAddr = '';
  let providerLic = '';
  if (reference?.hospitalId && typeof reference.hospitalId === 'object') {
    const h = reference.hospitalId;
    providerName = h.name || providerName;
    providerAddr = [h.address, h.city, h.state, h.pincode].filter(Boolean).join(', ');
    providerLic = payment.serviceType === 'test' ? (h.nablNo || '-') : (h.licenseNo || '-');
  } else if (reference?.doctorId && typeof reference.doctorId === 'object') {
    providerAddr = reference.doctorId.location || '';
  }
  const licLabel = payment.serviceType === 'test' ? 'NABL No.' : 'License';

  let serviceTitle = 'Service Details';
  let serviceRows = [];
  if (payment.serviceType === 'appointment') {
    serviceTitle = 'Appointment Details';
    const d = reference?.doctorId || {};
    const fallbackDate = formatDate(reference?.date || payment.createdAt);
    const fallbackTime = reference?.time ? `, ${reference.time}` : '';
    serviceRows = [
      { label: 'Doctor', value: `Dr. ${d.name || reference?.doctor || payment.provider || 'Doctor'}${d.specialization ? ` (${d.specialization})` : ''}` },
      { label: 'Date & Time', value: `${fallbackDate}${fallbackTime}` },
    ];
  } else if (payment.serviceType === 'test') {
    serviceTitle = 'Booking Details';
    serviceRows = [
      { label: 'Booking ID', value: reference?.bookingId || `BK-${year}-${digitPart}` },
      { label: 'Mode', value: reference?.visitType || 'Lab Visit' },
      { label: 'Slot', value: `${formatDate(reference?.bookingDate)}${reference?.timeSlot ? `, ${reference.timeSlot}` : ''}` },
      { label: 'Prescription', value: reference?.prescriptionVerified ? 'Verified' : 'Not Required' },
    ];
  } else if (payment.serviceType === 'medicine') {
    serviceTitle = 'Order Details';
    const ps = reference?.prescriptionStatus;
    serviceRows = [
      { label: 'Order ID', value: reference?.orderId || `ORD-${year}-${digitPart}` },
      { label: 'Delivery', value: reference?.deliveryMode === 'delivery' ? 'Home Delivery' : 'Store Pickup' },
      { label: 'Prescription', value: ps === 'verified' ? 'Verified' : ps === 'pending' ? 'Pending' : ps === 'rejected' ? 'Rejected' : 'Not Required' },
    ];
  }

  const methodRef = payment.method_ref || payment.utr || payment.gateway_ref || null;
  const methodLine = methodRef ? `${(payment.method || '-').toUpperCase()} (${methodRef})` : (payment.method || '-').toUpperCase();

  // ── Info Grids ──
  drawInfoGrid(doc, [
    {
      title: 'Bill To',
      rows: [
        { label: 'Patient', value: patientName },
        patientPhone ? { label: 'Phone', value: patientPhone } : null,
        patientAddr ? { label: 'Address', value: patientAddr } : null,
      ].filter(Boolean),
    },
    {
      title: 'Billed By',
      rows: [
        { label: 'Provider', value: providerName },
        providerAddr ? { label: 'Address', value: providerAddr } : null,
        (providerLic && providerLic !== '-') ? { label: licLabel, value: providerLic } : null,
      ].filter(Boolean),
    },
  ]);


  drawInfoGrid(doc, [
    {
      title: serviceTitle,
      rows: serviceRows,
    },
    {
      title: 'Payment Info',
      rows: [
        { label: 'Method', value: methodLine },
        { label: 'Status', value: 'Paid (Completed)' },
        { label: 'Txn ID', value: transactionId },
        { label: isBill ? 'Bill ID' : 'Invoice ID', value: docId },
      ],
    },
  ]);

  // ── Items Table ──
  drawSectionTitle(doc, isBill ? 'Billing Items' : 'Invoice Items');
  const lineItems = (payment.lineItems || []).filter(Boolean);
  let cols, rows;

  if (payment.serviceType === 'medicine') {
    const packLookup = {};
    if (reference?.items) {
      reference.items.forEach(item => {
        const name = item.medicineName || item.name;
        if (item.medicineId && typeof item.medicineId === 'object') {
          packLookup[name] = { pack: item.medicineId.form || '-', rx: (item.medicineId.rxRequired || item.medicineId.rx) ? ' [Rx]' : '' };
        } else {
          packLookup[name] = { pack: item.packSize || item.form || '-', rx: item.type === 'rx' ? ' [Rx]' : '' };
        }
      });
    }
    cols = [
      { key: 'item', label: 'Item Description', width: 0.38, bold: true },
      { key: 'pack', label: 'Pack Size', width: 0.18 },
      { key: 'qty', label: 'Qty', width: 0.10, align: 'center' },
      { key: 'price', label: 'Price', width: 0.17, align: 'right' },
      { key: 'total', label: 'Total', width: 0.17, align: 'right', bold: true },
    ];
    rows = lineItems.length > 0
      ? lineItems.map((item) => {
          const info = packLookup[item.name] || {};
          return {
            item: `${item.name || 'Item'}${info.rx || ''}`,
            pack: info.pack || '-',
            qty: item.qty || 1,
            price: money(item.price || 0),
            total: money((item.price || 0) * (item.qty || 1)),
          };
        })
      : [{ item: 'Medicine Order', pack: '-', qty: 1, price: money(payment.amount), total: money(payment.amount) }];
  } else if (payment.serviceType === 'test') {
    const reportLookup = {};
    if (reference?.testIds) {
      reference.testIds.forEach(t => {
        if (t && t._id) reportLookup[t._id.toString()] = t.reportTime || '-';
        if (t && t.name) reportLookup[t.name] = t.reportTime || '-';
      });
    }
    cols = [
      { key: 'item', label: 'Test / Service Name', width: 0.50, bold: true },
      { key: 'reportTime', label: 'Report Time', width: 0.25 },
      { key: 'amount', label: 'Amount', width: 0.25, align: 'right', bold: true },
    ];
    rows = lineItems.length > 0
      ? lineItems.map((item) => ({
          item: item.name || 'Test',
          reportTime: reportLookup[item.name] || item.reportTime || '-',
          amount: money(item.price || item.discountedPrice || 0),
        }))
      : [{ item: 'Lab Test', reportTime: '-', amount: money(payment.amount) }];
  } else {
    cols = [
      { key: 'item', label: 'Service Name', width: 0.70, bold: true },
      { key: 'amount', label: 'Amount', width: 0.30, align: 'right', bold: true },
    ];
    rows = lineItems.length > 0
      ? lineItems.map((item) => ({ item: item.name || 'Service', amount: money(item.price || 0) }))
      : [{ item: 'Consultation Fee', amount: money(payment.amount) }];
  }

  drawTable(doc, cols, rows);

  // ── Totals Box ──
  const discount = reference?.discount || reference?.discountAmount || 0;
  const discountCode = reference?.couponCode || '';
  const deliveryCharges = payment.serviceType === 'medicine' ? (reference?.deliveryFee || 0) : 0;
  const platformFee = payment.serviceType === 'appointment' ? (reference?.platformFee || 0) : 0;
  const showDelivery = payment.serviceType === 'medicine';
  const showPlatform = payment.serviceType === 'appointment';
  const subtotal = (payment.amount || 0) + discount + (showDelivery ? deliveryCharges : 0) + (showPlatform ? platformFee : 0);
  const discountLabel = discountCode ? `Discount (${discountCode})` : 'Discount';

  const totalLines = [['Subtotal', money(subtotal)]];
  if (payment.serviceType === 'appointment') {
    if (discount > 0) totalLines.push([discountLabel, `-${money(discount)}`, COLORS.warning]);
    if (platformFee > 0) totalLines.push(['Platform Fee', money(platformFee)]);
  } else if (payment.serviceType === 'medicine') {
    if (deliveryCharges > 0) totalLines.push(['Delivery Charges', money(deliveryCharges)]);
    if (discount > 0) totalLines.push([discountLabel, `-${money(discount)}`, COLORS.warning]);
  } else {
    if (discount > 0) totalLines.push([discountLabel, `-${money(discount)}`, COLORS.warning]);
  }

  const { left, right } = doc.page.margins;
  const pw = doc.page.width - left - right;
  const boxWidth = 240;
  const boxHeight = 24 + totalLines.length * 18 + 36;
  const x = left + pw - boxWidth;
  
  ensureSpace(doc, boxHeight + 20);
  const y = doc.y + 8;

  doc.roundedRect(x, y, boxWidth, boxHeight, 8).fillAndStroke(COLORS.soft, COLORS.border);
  let ty = y + 18;
  
  totalLines.forEach(([label, value, accent]) => {
    doc.fillColor(accent || COLORS.muted).font('Helvetica-Bold').fontSize(9.5).text(label, x + 16, ty, { width: 110 });
    doc.fillColor(accent || COLORS.ink).font('Helvetica-Bold').fontSize(9.5).text(value, x + 126, ty, { width: 98, align: 'right' });
    ty += 18;
  });
  
  doc.moveTo(x + 16, ty + 8).lineTo(x + boxWidth - 16, ty + 8).strokeColor(COLORS.border).stroke();
  ty += 22;

  doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(12).text('Total Paid', x + 16, ty, { width: 110 });
  doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(12).text(money(payment.amount), x + 126, ty, { width: 98, align: 'right' });
  
  doc.y = y + boxHeight + 20;
});