function getDateParts() {
  const d = new Date();
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${M}-${D}-${h}-${m}`;
}

export function generate16DigitId() {
  return String(Math.floor(Math.random() * 10 ** 16)).padStart(16, '0');
}

export function generate12DigitId() {
  return String(Math.floor(Math.random() * 10 ** 12)).padStart(12, '0');
}

const invoicePrefixMap = {
  appointment: 'APT', test: 'TST', medicine: 'MED',
  lab: 'TST', physio: 'PHY', diet: 'DIE', ipd: 'IPD',
  ot: 'OT', radiology: 'RAD', mentalhealth: 'MHT', manual: 'GEN',
};

const billPrefixMap = { appointment: 'APT', test: 'TST', medicine: 'MED', lab: 'TST' };

const orderPrefixMap = { DIET: 'DIE', LAB: 'LAB', RAD: 'RAD', PHY: 'PHY', MH: 'MHT' };

export function generateBillId(serviceType = 'GEN') {
  const prefix = billPrefixMap[serviceType] || 'GEN';
  return `BILL-${prefix}-${getDateParts()}-${generate12DigitId()}`;
}

export function generateInvoiceId(serviceType = 'GEN') {
  const prefix = invoicePrefixMap[serviceType] || 'GEN';
  const digitId = (serviceType === 'medicine' || serviceType === 'pharmacy') ? generate12DigitId() : generate16DigitId();
  return `INV-${prefix}-${getDateParts()}-${digitId}`;
}

export function generateTransactionId(serviceType = 'GEN') {
  return `TXN-${getDateParts()}-${generate16DigitId()}`;
}

export function generateOrderId(type = 'ORD') {
  const prefix = orderPrefixMap[type] || type || 'ORD';
  return `ORD-${prefix}-${getDateParts()}-${generate16DigitId()}`;
}

export function generateTimestampedId(prefix) {
  return `${prefix}-${getDateParts()}-${generate16DigitId()}`;
}

export function generateAdmissionId() {
  return `IPD-${getDateParts()}-${generate16DigitId()}`;
}

export function generateTokenNumber() {
  return `TKN-${getDateParts()}-${generate16DigitId()}`;
}

export function generatePrescriptionId() {
  return `RX-${getDateParts()}-${generate16DigitId()}`;
}

export function generateReportId() {
  return `RPT-${getDateParts()}-${generate16DigitId()}`;
}

export function generateEmergencyId() {
  return `ER-${getDateParts()}-${generate16DigitId()}`;
}

export function generateMLCNumber() {
  return `MLC-${getDateParts()}-${generate16DigitId()}`;
}

export function generateSampleId() {
  return `SMP-${getDateParts()}-${generate16DigitId()}`;
}

export function generateUHID() {
  return generate16DigitId();
}
