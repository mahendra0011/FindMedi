import PDFDocument from 'pdfkit';

const HOSPITAL = {
  name: 'MediCore Hospital',
  tagline: 'Hospital Management System',
  address: '123 Medical Center Drive, Healthcare City',
  phone: '+1 (555) 123-4567',
  email: 'info@medicorehospital.com',
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

const money = (value = 0) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const valueOrDash = (value) => (value === undefined || value === null || value === '' ? '-' : String(value));

const createDocument = () => new PDFDocument({
  size: 'A4',
  margin: 42,
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

const ensureSpace = (doc, height = 120) => {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom - 30) {
    doc.addPage();
  }
};

const drawHeader = (doc, documentTitle, meta = {}) => {
  const { left, right } = doc.page.margins;
  const width = doc.page.width - left - right;

  doc.save();
  doc.roundedRect(left, 32, width, 92, 8).fill(COLORS.primary);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text(HOSPITAL.name, left + 22, 48);
  doc.font('Helvetica').fontSize(9).text(HOSPITAL.tagline, left + 22, 75);
  doc.fontSize(8).text(`${HOSPITAL.address} | ${HOSPITAL.phone} | ${HOSPITAL.email}`, left + 22, 96);

  doc.font('Helvetica-Bold').fontSize(16).text(documentTitle, left, 52, { width: width - 22, align: 'right' });
  if (meta.id) doc.font('Helvetica').fontSize(9).text(`# ${meta.id}`, left, 76, { width: width - 22, align: 'right' });
  if (meta.date) doc.fontSize(9).text(`Date: ${meta.date}`, left, 96, { width: width - 22, align: 'right' });
  doc.restore();

  doc.y = 148;
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
    doc.text('This is a computer-generated document. Please contact MediCore Hospital for corrections.', left, y + 10, { width: width * 0.72 });
    doc.text(`Page ${i + 1} of ${pages.count}`, left, y + 10, { width, align: 'right' });
  }
};

const drawSectionTitle = (doc, title) => {
  ensureSpace(doc, 50);
  doc.moveDown(0.4);
  doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(12).text(title.toUpperCase());
  doc.moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .strokeColor(COLORS.border)
    .lineWidth(0.6)
    .stroke();
  doc.moveDown(0.8);
};

const drawInfoGrid = (doc, groups) => {
  const gap = 12;
  const { left, right } = doc.page.margins;
  const width = doc.page.width - left - right;
  const cardWidth = (width - gap) / 2;
  const startY = doc.y;

  groups.slice(0, 2).forEach((group, index) => {
    const x = left + index * (cardWidth + gap);
    doc.roundedRect(x, startY, cardWidth, 108, 6).fillAndStroke('#ffffff', COLORS.border);
    doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(10).text(group.title, x + 12, startY + 12);
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9);
    group.rows.forEach((row, rowIndex) => {
      const y = startY + 34 + rowIndex * 18;
      doc.fillColor(COLORS.muted).font('Helvetica-Bold').text(`${row.label}:`, x + 12, y, { width: 70, continued: true });
      doc.fillColor(COLORS.ink).font('Helvetica').text(` ${valueOrDash(row.value)}`, { width: cardWidth - 94 });
    });
  });

  doc.y = startY + 126;
};

const drawTextBlock = (doc, title, text) => {
  ensureSpace(doc, 70);
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(9).text(title);
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10).text(valueOrDash(text), {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    lineGap: 3,
  });
  doc.moveDown(0.8);
};

const drawTable = (doc, columns, rows, options = {}) => {
  ensureSpace(doc, 78);
  const { left, right } = doc.page.margins;
  const tableWidth = doc.page.width - left - right;
  const widths = columns.map(col => Math.round(tableWidth * col.width));
  let y = doc.y;
  const rowHeight = options.rowHeight || 26;

  const drawHeaderRow = () => {
    doc.roundedRect(left, y, tableWidth, rowHeight, 4).fill(COLORS.primaryDark);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    let x = left;
    columns.forEach((column, index) => {
      doc.text(column.label, x + 8, y + 8, { width: widths[index] - 12 });
      x += widths[index];
    });
    y += rowHeight;
  };

  drawHeaderRow();
  doc.font('Helvetica').fontSize(9);

  rows.forEach((row, rowIndex) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 50) {
      doc.addPage();
      y = doc.y;
      drawHeaderRow();
    }

    doc.rect(left, y, tableWidth, rowHeight).fill(rowIndex % 2 === 0 ? '#ffffff' : COLORS.soft);
    doc.strokeColor(COLORS.border).lineWidth(0.4).rect(left, y, tableWidth, rowHeight).stroke();

    let x = left;
    columns.forEach((column, colIndex) => {
      doc.fillColor(COLORS.ink).font(column.bold ? 'Helvetica-Bold' : 'Helvetica').text(
        valueOrDash(row[column.key]),
        x + 8,
        y + 8,
        { width: widths[colIndex] - 12, align: column.align || 'left' }
      );
      x += widths[colIndex];
    });
    y += rowHeight;
  });

  doc.y = y + 14;
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

export const generatePrescriptionPDF = async (data) => collectPdf((doc) => {
  drawHeader(doc, 'Prescription', { id: data.prescriptionId || data.reportId || `RX-${Date.now()}`, date: new Date().toLocaleDateString() });
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
        { label: 'Name', value: data.doctor?.name ? `Dr. ${data.doctor.name}` : '' },
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
  ], (data.medications || []).filter(med => med?.name).map((med, index) => ({
    index: index + 1,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    instructions: med.instructions,
  })).concat((data.medications || []).some(med => med?.name) ? [] : [{ index: '-', name: 'No medications prescribed', dosage: '-', frequency: '-', instructions: '-' }]));

  drawSectionTitle(doc, 'Advice');
  drawTextBlock(doc, 'Instructions for Patient', data.advice || 'No specific advice');
});

export const generateLabReportPDF = async (data) => collectPdf((doc) => {
  drawHeader(doc, 'Laboratory Report', { id: data.reportId || `LAB-${Date.now()}`, date: data.reportDate || new Date().toLocaleDateString() });
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
        { label: 'Doctor', value: data.doctor?.name ? `Dr. ${data.doctor.name}` : '' },
        { label: 'Speciality', value: data.doctor?.specialization },
        { label: 'Test Date', value: data.testDate },
        { label: 'Report Date', value: data.reportDate || new Date().toLocaleDateString() },
      ],
    },
  ]);

  drawSectionTitle(doc, 'Test Results');
  drawTable(doc, [
    { key: 'name', label: 'Test', width: 0.34, bold: true },
    { key: 'result', label: 'Result', width: 0.22 },
    { key: 'unit', label: 'Unit', width: 0.14 },
    { key: 'referenceRange', label: 'Reference Range', width: 0.30 },
  ], (data.tests || []).filter(test => test?.name).map(test => ({
    name: test.name,
    result: test.result,
    unit: test.unit,
    referenceRange: test.referenceRange,
  })).concat((data.tests || []).some(test => test?.name) ? [] : [{ name: 'No test results entered', result: '-', unit: '-', referenceRange: '-' }]));

  drawSectionTitle(doc, 'Clinical Notes');
  drawTextBlock(doc, 'Notes', data.notes || 'No additional notes');
});

export const generateDischargeSummaryPDF = async (data) => collectPdf((doc) => {
  drawHeader(doc, 'Discharge Summary', { id: data.admissionId || `DS-${Date.now()}`, date: data.dischargeDate || new Date().toLocaleDateString() });
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
        { label: 'Doctor', value: data.doctor?.name ? `Dr. ${data.doctor.name}` : '' },
        { label: 'Admit Date', value: data.admissionDate },
        { label: 'Discharge', value: data.dischargeDate },
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
  ], (data.medications || []).filter(med => med?.name).map((med, index) => ({
    index: index + 1,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
  })).concat((data.medications || []).some(med => med?.name) ? [] : [{ index: '-', name: 'No discharge medications entered', dosage: '-', frequency: '-' }]));

  drawSectionTitle(doc, 'Aftercare');
  drawTextBlock(doc, 'Discharge Advice', data.dischargeAdvice || 'No specific advice');
  drawTextBlock(doc, 'Follow-up Instructions', data.followUpInstructions || 'Not specified');
});

export const generateInvoicePDF = async (bill) => collectPdf((doc) => {
  const patient = bill.patientId && typeof bill.patientId === 'object' ? bill.patientId : {};
  const doctor = bill.doctorId && typeof bill.doctorId === 'object' ? bill.doctorId : {};
  const outstanding = Number(bill.amount || 0) - Number(bill.paid || 0);

  drawHeader(doc, 'Tax Invoice', { id: bill.invoiceId, date: bill.date || new Date().toLocaleDateString() });
  drawStatusPill(doc, bill.status, doc.page.width - doc.page.margins.right - 84, 136);

  drawInfoGrid(doc, [
    {
      title: 'Billed To',
      rows: [
        { label: 'Patient', value: bill.patient || patient.name },
        { label: 'Email', value: patient.email },
        { label: 'Phone', value: patient.phone },
        { label: 'Due Date', value: bill.dueDate },
      ],
    },
    {
      title: 'Provider',
      rows: [
        { label: 'Doctor', value: doctor.name || bill.doctor },
        { label: 'Speciality', value: doctor.specialization },
        { label: 'Method', value: bill.paymentMethod || 'Pending' },
        { label: 'Txn ID', value: bill.transactionId },
      ],
    },
  ]);

  drawSectionTitle(doc, 'Invoice Details');
  drawTable(doc, [
    { key: 'service', label: 'Service', width: 0.52, bold: true },
    { key: 'date', label: 'Date', width: 0.16 },
    { key: 'amount', label: 'Amount', width: 0.16, align: 'right' },
    { key: 'paid', label: 'Paid', width: 0.16, align: 'right' },
  ], [{
    service: bill.service,
    date: bill.date,
    amount: money(bill.amount),
    paid: money(bill.paid),
  }]);

  const { left, right } = doc.page.margins;
  const width = doc.page.width - left - right;
  const boxWidth = 220;
  const x = left + width - boxWidth;
  const y = doc.y + 4;

  doc.roundedRect(x, y, boxWidth, 96, 6).fillAndStroke(COLORS.soft, COLORS.border);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10);
  doc.text('Subtotal', x + 14, y + 16, { width: 100 });
  doc.text(money(bill.amount), x + 112, y + 16, { width: 90, align: 'right' });
  doc.font('Helvetica').fillColor(COLORS.muted);
  doc.text('Paid', x + 14, y + 40, { width: 100 });
  doc.text(money(bill.paid), x + 112, y + 40, { width: 90, align: 'right' });
  doc.moveTo(x + 14, y + 64).lineTo(x + boxWidth - 14, y + 64).strokeColor(COLORS.border).stroke();
  doc.fillColor(outstanding > 0 ? COLORS.warning : COLORS.success).font('Helvetica-Bold');
  doc.text('Outstanding', x + 14, y + 72, { width: 100 });
  doc.text(money(outstanding), x + 112, y + 72, { width: 90, align: 'right' });
  doc.y = y + 118;

  drawSectionTitle(doc, 'Payment Notes');
  drawTextBlock(doc, 'Instructions', outstanding > 0
    ? 'Please clear the outstanding amount by the due date. Keep this invoice for your records.'
    : 'Payment received. Thank you for choosing MediCore Hospital.');
});
