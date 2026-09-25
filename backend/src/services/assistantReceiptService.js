import PDFDocument from 'pdfkit';
import { signTxnRef } from '../lib/receiptSecurity.js';

const C = {
  primary: '#0f766e',
  primaryDark: '#0e4f48',
  indigo: '#4338ca',
  ink: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  soft: '#f9fafb',
  success: '#15803d',
  accent: '#0284c7',
};

const money = (v = 0) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`;

const CATEGORY_NAMES = {
  paperwork: 'Paperwork & Admission Help',
  medicine: 'Medicine Pickup & Delivery',
  reports: 'Report Collection',
  errand: 'Errand & General Needs',
  full_attendant: 'Full-Time Attendant',
  elderly_care: 'Elderly/Special Care Support'
};

export async function generateAssistantReceiptPdf(booking, patient, assistant, profile) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header banner with branding
    doc.rect(0, 0, doc.page.width, 105).fill(C.primaryDark);

    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('FindMedi Assistant Care', 40, 28);
    doc.fontSize(11).font('Helvetica').text('Hospital Attendant & Personal Caretaker Service', 40, 56);
    doc.fontSize(10).text('Official Care Receipt', doc.page.width - 160, 32, { align: 'right' });
    doc.fontSize(9).text(`Booking #${booking.bookingNumber || String(booking._id).slice(-6).toUpperCase()}`, doc.page.width - 160, 50, { align: 'right' });

    doc.fillColor(C.ink);
    let y = 125;

    // Booking Summary Card
    doc.rect(40, y, doc.page.width - 80, 105).fillAndStroke(C.soft, C.border);

    doc.fillColor(C.ink).fontSize(12).font('Helvetica-Bold').text('Assistance Details', 55, y + 14);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Hospital: ${booking.hospital || 'Hospital Campus'}`, 55, y + 36);
    doc.text(`Scheduled Date: ${new Date(booking.scheduledDate || Date.now()).toLocaleDateString('en-IN')}`, 55, y + 54);
    doc.text(`Time / Shift: ${booking.startTime || '10:00 AM'} (${(booking.durationType || '4hr').toUpperCase()})`, 55, y + 72);

    const patientName = patient?.name || 'Valued Patient';
    const assistantName = assistant?.name || 'Assigned Assistant';
    const assistantPhone = assistant?.phone || 'Verified on platform';

    doc.text(`Patient: ${patientName}`, 320, y + 36);
    doc.text(`Assistant: ${assistantName}`, 320, y + 54);
    doc.text(`Contact: ${assistantPhone}`, 320, y + 72);

    y += 125;

    // Services Requested & Tasks Log Card
    const serviceList = (booking.serviceCategories || []).map(c => CATEGORY_NAMES[c] || c).join(', ');
    const completedTasks = (booking.taskChecklist || []).filter(t => t.isDone).length;
    const totalTasks = (booking.taskChecklist || []).length;

    doc.rect(40, y, doc.page.width - 80, 100).fillAndStroke('#ffffff', C.border);
    doc.fillColor(C.ink).fontSize(12).font('Helvetica-Bold').text('Services & Completed Tasks', 55, y + 14);

    doc.fontSize(10).font('Helvetica');
    doc.fillColor(C.accent).text('Services Booked: ', 55, y + 36, { continued: true });
    doc.fillColor(C.ink).text(serviceList || 'General Assistance', { width: doc.page.width - 150 });

    doc.fillColor(C.success).text('Task Checklist: ', 55, y + 66, { continued: true });
    doc.fillColor(C.ink).text(`${completedTasks} of ${totalTasks} hospital tasks verified and completed`);

    y += 120;

    // Fare Breakdown Table
    doc.rect(40, y, doc.page.width - 80, 140).fillAndStroke('#ffffff', C.border);
    doc.fillColor(C.primaryDark).rect(40, y, doc.page.width - 80, 26).fill();

    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('Fare & Cost Breakdown', 55, y + 7);
    doc.text('Amount', doc.page.width - 120, y + 7, { align: 'right' });

    let itemY = y + 36;
    const rate = booking.cost?.rate || 150;
    const hours = booking.cost?.hours || 4;
    const total = booking.cost?.total || (rate * hours);

    doc.fillColor(C.ink).fontSize(10).font('Helvetica');
    doc.text(`Base Service Rate (${money(rate)}/hr x ${hours} hrs)`, 55, itemY);
    doc.text(money(total), doc.page.width - 120, itemY, { align: 'right' });

    itemY += 22;
    doc.text('Platform & Hospital Coordination Surcharge', 55, itemY);
    doc.text('Included (Rs. 0)', doc.page.width - 120, itemY, { align: 'right' });

    itemY += 24;
    doc.moveTo(55, itemY).lineTo(doc.page.width - 55, itemY).stroke(C.border);

    itemY += 10;
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.primaryDark);
    doc.text('Total Amount Paid', 55, itemY);
    doc.text(money(total), doc.page.width - 120, itemY, { align: 'right' });

    y += 160;

    // Payment Information
    const paymentStatus = (booking.payment?.status || 'paid').toUpperCase();
    const paymentMethod = (booking.payment?.method || 'Demo Wallet').replace('_', ' ').toUpperCase();
    const txnRef = booking.payment?.transactionRef || `DEMO-TXN-${booking._id}`;

    doc.rect(40, y, doc.page.width - 80, 65).fillAndStroke(C.soft, C.border);
    doc.fillColor(C.ink).fontSize(11).font('Helvetica-Bold').text('Payment Information', 55, y + 12);
    doc.fontSize(9).font('Helvetica').fillColor(C.muted);
    doc.text(`Status: ${paymentStatus}   |   Method: ${paymentMethod}   |   Txn Ref: ${txnRef}`, 55, y + 32);
    doc.text('Note: This is a verified simulated transaction receipt generated by FindMedi Assistant Care.', 55, y + 48);
    doc.fontSize(8).text(`Authenticity Hash: ${signTxnRef(txnRef)}`, 55, y + 58);

    // Footer
    const footerY = doc.page.height - 50;
    doc.fontSize(8).fillColor(C.muted).text('FindMedi Care & Hospital Management System — Need help? Contact support@findmedi.online', 40, footerY, { align: 'center', width: doc.page.width - 80 });

    doc.end();
  });
}
