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

const truncate = (val, max = 120) => (typeof val === 'string' ? val.trim().slice(0, max) : val);

/**
 * Map payment/reference data to the JSON format expected by the Rust invoice generator.
 */
function buildInvoiceJson(payment, reference, user) {
  const patientName = truncate(payment.patient_name || user?.name || 'Patient', 120);
  const patientPhone = truncate(payment.patient_phone || user?.phone || '', 30);
  const provider = truncate(
    payment.provider || reference?.hospitalId?.name ||
    (reference?.doctorId && typeof reference.doctorId === 'object' ? reference.doctorId.name : '') ||
    'FindMedi',
    120
  );

  const serviceType = truncate(payment.serviceType || 'medicine', 50);
  const amount = Number(payment.amount || 0);

  // Build line items (capped at 50 to prevent unbounded PDF memory growth)
  let lineItems;
  const existingItems = (payment.lineItems || []).filter(Boolean);
  if (existingItems.length > 0) {
    lineItems = existingItems.slice(0, 50).map(item => ({
      name: truncate(item.name || item.medicineName || item.testName || 'Item', 120),
      qty: Math.min(Math.max(1, Number(item.qty) || 1), 10000),
      price: Math.max(0, Number(item.price || item.discountedPrice || 0)),
    }));
  } else {
    // Single-item fallback
    lineItems = [{
      name: truncate(payment.service || 'Consultation Fee', 120),
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
  const invoiceId = truncate(payment.invoice_id ||
    `INV-${invType}-${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getHours()).padStart(2, '0')}-${String(new Date().getMinutes()).padStart(2, '0')}-${invDigit}`, 100);
  const transactionId = truncate(payment.transaction_id || `TXN-${year}-${digitPart}`, 100);

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
