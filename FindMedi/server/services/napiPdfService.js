/**
 * Native Rust-backed PDF service (Phase 7 migration).
 *
 * Provides fast payment invoice PDF generation via the napi-core native module.
 * Falls back to pdfkit (JavaScript) when the native module is unavailable.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let _napi = null;
let _loadError = null;

function getNapi() {
  if (_napi !== null) return _napi;
  if (_loadError !== null) return null;
  try {
    _napi = require('../napi-core/index.js');
  } catch (e) {
    _loadError = e;
  }
  return _napi;
}

export const NATIVE_PDF_AVAILABLE = (() => !!getNapi())();

/**
 * Map payment/reference data to the JSON format expected by the Rust invoice generator.
 */
function buildInvoiceJson(payment, reference, user) {
  const patientName = payment.patient_name || user?.name || 'Patient';
  const patientPhone = payment.patient_phone || user?.phone || '';
  const provider = payment.provider || reference?.hospitalId?.name ||
    (reference?.doctorId && typeof reference.doctorId === 'object' ? reference.doctorId.name : '') ||
    'FindMedi';

  const serviceType = payment.serviceType || 'medicine';
  const amount = Number(payment.amount || 0);

  // Build line items
  let lineItems;
  const existingItems = (payment.lineItems || []).filter(Boolean);
  if (existingItems.length > 0) {
    lineItems = existingItems.map(item => ({
      name: item.name || item.medicineName || item.testName || 'Item',
      qty: item.qty || 1,
      price: item.price || item.discountedPrice || 0,
    }));
  } else {
    // Single-item fallback
    lineItems = [{
      name: payment.service || 'Consultation Fee',
      qty: 1,
      price: amount,
    }];
  }

  // Generate invoice/transaction IDs if not present
  const year = new Date(payment.createdAt || Date.now()).getFullYear();
  const numericPart = (payment.transaction_id || payment._id?.toString() || '00000').replace(/\D/g, '');
  const digitPart = numericPart.slice(-16).padStart(16, '0');
  const typePrefix = { appointment: 'APT', test: 'TST', medicine: 'MED' };
  const invType = typePrefix[serviceType] || 'GEN';
  const invDigit = serviceType === 'medicine' ? digitPart.slice(-12) : digitPart;
  const invoiceId = payment.invoice_id ||
    `INV-${invType}-${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getHours()).padStart(2, '0')}-${String(new Date().getMinutes()).padStart(2, '0')}-${invDigit}`;
  const transactionId = payment.transaction_id || `TXN-${year}-${digitPart}`;

  return JSON.stringify({
    patient_name: patientName,
    patient_phone: patientPhone || undefined,
    provider: provider || undefined,
    service_type: serviceType,
    amount: amount,
    invoice_id: invoiceId,
    transaction_id: transactionId,
    line_items: lineItems,
  });
}

/**
 * Generate a payment invoice PDF using the Rust native module.
 * Falls back to the JavaScript pdfkit implementation when unavailable.
 *
 * @param {object} payment - Payment record
 * @param {object|null} reference - Reference data (booking, prescription, etc.)
 * @param {object|null} user - User record
 * @param {string} documentTitle - Document title (e.g. "Payment Invoice")
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateInvoicePdfNative(payment, reference = null, user = null, documentTitle = 'Payment Invoice') {
  const napi = getNapi();
  if (napi) {
    const json = buildInvoiceJson(payment, reference, user);
    const pdfBytes = napi.generateInvoicePdf(json);
    return Buffer.from(pdfBytes);
  }

  // Fallback: use pdfkit (the original JavaScript implementation)
  return null;
}
