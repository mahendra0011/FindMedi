import PDFDocument from 'pdfkit';
import { LEGAL_CATEGORIES_INFO } from './lawyerService.js';

const C = {
  primary: '#1e3a8a',
  primaryDark: '#172554',
  indigo: '#4338ca',
  ink: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  soft: '#f8fafc',
  success: '#15803d',
  accent: '#2563eb',
};

const money = (v = 0) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`;

export async function generateLawyerReceiptPdf(booking, client, lawyer, profile) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header banner with branding
    doc.rect(0, 0, doc.page.width, 105).fill(C.primaryDark);

    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('FindMedi Legal Services', 40, 28);
    doc.fontSize(11).font('Helvetica').text('In-App Legal Consultation & Case Advisory', 40, 56);
    doc.fontSize(10).text('Official Consultation Receipt', doc.page.width - 180, 32, { align: 'right' });
    doc.fontSize(9).text(`Booking #${booking.bookingNumber || String(booking._id).slice(-6).toUpperCase()}`, doc.page.width - 180, 50, { align: 'right' });

    doc.fillColor(C.ink);
    let y = 125;

    // Consultation Summary Card
    doc.rect(40, y, doc.page.width - 80, 115).fillAndStroke(C.soft, C.border);

    doc.fillColor(C.ink).fontSize(12).font('Helvetica-Bold').text('Consultation Details', 55, y + 14);

    doc.fontSize(10).font('Helvetica');
    const catLabel = LEGAL_CATEGORIES_INFO[booking.category]?.label || booking.category;
    doc.text(`Legal Category: ${catLabel}`, 55, y + 36);
    doc.text(`Consultation Mode: ${(booking.consultationMode || 'Video Call').toUpperCase()}`, 55, y + 54);
    doc.text(`Scheduled Date: ${new Date(booking.scheduledDate || Date.now()).toLocaleDateString('en-IN')}`, 55, y + 72);
    doc.text(`Scheduled Time: ${booking.scheduledTime || 'Scheduled Slot'}`, 55, y + 90);

    const clientName = client?.name || 'Client';
    const lawyerName = lawyer?.name ? `Adv. ${lawyer.name}` : 'Advocate';
    const barReg = profile?.barCouncilNumber || 'Enrolled Advocate';

    doc.text(`Client: ${clientName}`, 310, y + 36);
    doc.text(`Advocate: ${lawyerName}`, 310, y + 54);
    doc.text(`Bar Council Reg: ${barReg}`, 310, y + 72);
    doc.text(`Status: ${(booking.status || 'Completed').toUpperCase()}`, 310, y + 90);

    y += 135;

    // Case Description & Final Summary
    doc.rect(40, y, doc.page.width - 80, 140).fillAndStroke('#ffffff', C.border);
    doc.fillColor(C.ink).fontSize(11).font('Helvetica-Bold').text('Case Overview & Legal Advisory Summary', 55, y + 14);

    doc.fillColor(C.muted).fontSize(9).font('Helvetica');
    doc.text('Client Issue Description:', 55, y + 34);
    doc.fillColor(C.ink).fontSize(10).text(booking.caseDescription ? `"${booking.caseDescription.slice(0, 180)}..."` : 'Consultation requested on platform.', 55, y + 48, { width: 480 });

    doc.fillColor(C.muted).fontSize(9).font('Helvetica');
    doc.text('Advocate Advice & Next Steps:', 55, y + 80);
    doc.fillColor(C.ink).fontSize(10).text(booking.finalCaseSummary ? `"${booking.finalCaseSummary.slice(0, 220)}"` : 'Advice and guidance delivered during session.', 55, y + 94, { width: 480 });

    y += 160;

    // Payment Breakdown
    doc.rect(40, y, doc.page.width - 80, 95).fillAndStroke(C.soft, C.border);
    doc.fillColor(C.ink).fontSize(12).font('Helvetica-Bold').text('Fee & Payment Breakdown', 55, y + 14);

    const feeAmount = booking.fee || 800;

    doc.fontSize(10).font('Helvetica');
    doc.text('Consultation Fee', 55, y + 38);
    doc.text(money(feeAmount), doc.page.width - 150, y + 38, { align: 'right' });

    doc.text('Platform Convenience Fee', 55, y + 54);
    doc.text('Rs. 0 (Waived)', doc.page.width - 150, y + 54, { align: 'right' });

    doc.font('Helvetica-Bold');
    doc.text('Total Paid', 55, y + 72);
    doc.text(money(feeAmount), doc.page.width - 150, y + 72, { align: 'right' });

    y += 115;

    // Payment verification badge
    const txnRef = booking.payment?.transactionRef || `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    doc.rect(40, y, doc.page.width - 80, 36).fillAndStroke('#ecfdf5', '#a7f3d0');
    doc.fillColor(C.success).fontSize(10).font('Helvetica-Bold').text(`Payment Verified (Demo Mode) · Ref: ${txnRef}`, 55, y + 12);

    y += 55;

    // Legal Disclaimer & Footer
    doc.fillColor(C.muted).fontSize(8).font('Helvetica');
    doc.text(
      'CONFIDENTIALITY NOTICE: This document and case records are privileged communications under legal ethics standards. ' +
        'FindMedi provides an intermediary platform for verified advocates and clients. This consultation was facilitated digitally.',
      40,
      y,
      { width: doc.page.width - 80, align: 'justify' }
    );

    doc.end();
  });
}
