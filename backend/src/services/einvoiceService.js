/**
 * GST E-Invoice (IRN) Integration Framework
 * NIC e-Invoice Portal integration for Indian hospitals.
 * Generates Invoice Reference Number (IRN) + signed QR code per GSTN spec.
 *
 * Environment variables:
 *   EINVOICE_MODE          - 'sandbox' | 'live' (default: sandbox)
 *   EINVOICE_GSTIN         - Hospital GSTIN
 *   EINVOICE_USERNAME      - NIC portal username
 *   EINVOICE_PASSWORD      - NIC portal password
 *   EINVOICE_CLIENT_ID     - API client ID
 *   EINVOICE_CLIENT_SECRET - API client secret
 *   EINVOICE_BASE_URL      - NIC endpoint (default: sandbox URL)
 */

import crypto from 'crypto';
import logger from '../config/logger.js';

const SANDBOX_URL = 'https://devapi.gst.gov.in/einvoice/v1.0';
const LIVE_URL = 'https://api.einvoice.gov.in/einvoice/v1.0';

export function einvoiceConfig() {
  const mode = process.env.EINVOICE_MODE || 'sandbox';
  return {
    mode,
    gstin: process.env.EINVOICE_GSTIN || '',
    username: process.env.EINVOICE_USERNAME || '',
    password: process.env.EINVOICE_PASSWORD || '',
    clientId: process.env.EINVOICE_CLIENT_ID || '',
    clientSecret: process.env.EINVOICE_CLIENT_SECRET || '',
    baseUrl: process.env.EINVOICE_BASE_URL || (mode === 'live' ? LIVE_URL : SANDBOX_URL),
    enabled: !!(process.env.EINVOICE_GSTIN && process.env.EINVOICE_USERNAME),
  };
}

/**
 * Generate a mock IRN for sandbox mode (64-char hex per GSTN spec).
 * In live mode, this would call the NIC auth + invoice API.
 */
export function generateMockIrn(invoiceNumber, invoiceDate) {
  const data = `${invoiceNumber}|${invoiceDate}|${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').toUpperCase().slice(0, 64);
}

/**
 * Generate Acknowledgement Number (AckNo) in format: AS12345678901234
 */
export function generateAckNo() {
  const num = Math.floor(10000000000000 + Math.random() * 90000000000000);
  return `AS${num}`;
}

/**
 * Build e-invoice JSON payload per GSTN schema (simplified).
 */
export function buildEinvoicePayload({ billing, hospital, patient, lineItems }) {
  const config = einvoiceConfig();
  const invoiceDate = new Date(billing.createdAt || Date.now());
  const dateStr = invoiceDate.toISOString().slice(0, 10).split('-').reverse().join('/'); // DD/MM/YYYY

  let supTyp = 'B2B';
  if (billing?.supplyType) {
    supTyp = billing.supplyType;
  } else if (patient?.supplyType) {
    supTyp = patient.supplyType;
  } else if (patient?.isB2C || billing?.isB2C) {
    supTyp = 'B2C';
  } else if (patient?.gstin && patient.gstin !== 'URP') {
    supTyp = 'B2B';
  }

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: supTyp,
      RegRev: 'N',
      EcmGstin: null,
    },
    DocDtls: {
      Typ: 'INV',
      No: billing.invoiceId || String(billing._id).slice(-10),
      Dt: dateStr,
    },
    SellerDtls: {
      Gstin: config.gstin,
      LglNm: hospital?.name || 'FindMedi Hospital',
      Addr1: hospital?.address || '',
      Loc: hospital?.city || '',
      Pin: hospital?.pincode || '000000',
      Stcd: hospital?.stateCode || '27',
    },
    BuyerDtls: {
      Gstin: patient?.gstin || 'URP', // Unregistered
      LglNm: patient?.name || billing.patient || 'Walk-in Patient',
      Loc: patient?.city || '',
      Pin: patient?.pincode || '000000',
      Stcd: patient?.stateCode || '27',
    },
    ItemList: (lineItems || []).map((item, idx) => ({
      SlNo: String(idx + 1),
      PrdDesc: item.description || item.service || 'Medical Service',
      HsnCd: item.hsnCode || '999316', // Medical services HSN
      Qty: item.quantity || 1,
      Unit: 'NOS',
      UnitPrice: item.unitPrice || item.amount,
      TotAmt: item.amount || 0,
      GstRt: item.gstRate || 0,
      CgstAmt: item.cgst || 0,
      SgstAmt: item.sgst || 0,
      IgstAmt: item.igst || 0,
      TotItemVal: item.amount || 0,
    })),
    ValDtls: {
      AssVal: billing.subTotal || billing.amount || 0,
      CgstVal: billing.cgst || 0,
      SgstVal: billing.sgst || 0,
      IgstVal: billing.igst || 0,
      TotInvVal: billing.amount || 0,
    },
  };
}

/**
 * Generate IRN + signed data for a billing record.
 * Sandbox mode returns mock data; live mode would call NIC API.
 */
export async function generateEinvoice(billing, hospital, patient) {
  const config = einvoiceConfig();

  if (!config.enabled) {
    return {
      success: false,
      error: 'E-INVOICE_NOT_CONFIGURED',
      message: 'EINVOICE_GSTIN and EINVOICE_USERNAME must be set',
    };
  }

  const payload = buildEinvoicePayload({ billing, hospital, patient, lineItems: billing.lineItems });
  const invoiceNo = billing.invoiceId || String(billing._id).slice(-10);
  const invoiceDate = new Date(billing.createdAt || Date.now()).toISOString().slice(0, 10);

  if (config.mode === 'sandbox') {
    const irn = generateMockIrn(invoiceNo, invoiceDate);
    const ackNo = generateAckNo();
    const ackDate = new Date().toISOString();

    logger.info(`E-Invoice sandbox IRN generated: ${irn} for invoice ${invoiceNo}`);

    return {
      success: true,
      mode: 'sandbox',
      irn,
      ackNo,
      ackDate,
      signedInvoice: Buffer.from(JSON.stringify(payload)).toString('base64'),
      qrCode: generateEinvoiceQr({ irn, ackNo, invoiceNo, invoiceDate, total: billing.amount }),
      payload,
    };
  }

  // Live mode: call NIC API (requires valid credentials)
  try {
    // Step 1: Authenticate
    const authRes = await fetch(`${config.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    const authData = await authRes.json();

    if (!authData.access_token) {
      return { success: false, error: 'AUTH_FAILED', message: 'NIC e-invoice authentication failed' };
    }

    // Step 2: Generate IRN
    const invRes = await fetch(`${config.baseUrl}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
        'gstin': config.gstin,
      },
      body: JSON.stringify(payload),
    });
    const invData = await invRes.json();

    if (invData.irn) {
      logger.info(`E-Invoice live IRN generated: ${invData.irn}`);
      return {
        success: true,
        mode: 'live',
        irn: invData.irn,
        ackNo: invData.ackNo,
        ackDate: invData.ackDt,
        signedInvoice: invData.signedInvoice,
        qrCode: invData.qrCode,
        payload,
      };
    }

    return { success: false, error: invData.error?.message || 'IRN_GENERATION_FAILED', details: invData };
  } catch (err) {
    logger.error(`E-Invoice live error: ${err.message}`);
    return { success: false, error: 'NETWORK_ERROR', message: err.message };
  }
}

/**
 * Generate QR code data string (for QR image generation on frontend).
 */
function generateEinvoiceQr({ irn, ackNo, invoiceNo, invoiceDate, total }) {
  // GSTN QR format: IRN|AckNo|Date|Total|GSTIN|Sign (simplified)
  const config = einvoiceConfig();
  const signData = `${irn}|${ackNo}|${invoiceDate}|${total}|${config.gstin}`;
  const sign = crypto.createHash('sha256').update(signData).digest('hex').slice(0, 32);
  return `${irn}|${ackNo}|${invoiceDate}|${total}|${config.gstin}|${sign}`;
}

/**
 * Cancel IRN (within 24 hours of generation per GSTN rules).
 */
export async function cancelEinvoice(irn, cancellationReason = '1', options = {}) {
  const config = einvoiceConfig();

  if (options.generatedAt) {
    const generatedTime = new Date(options.generatedAt).getTime();
    const currentTime = options.now ? new Date(options.now).getTime() : Date.now();
    const ageMs = currentTime - generatedTime;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (ageMs > TWENTY_FOUR_HOURS_MS) {
      return {
        success: false,
        error: 'CANCEL_WINDOW_EXPIRED',
        message: 'E-Invoice cancellation window (24 hours) expired',
      };
    }
  }

  if (config.mode === 'sandbox') {
    return { success: true, mode: 'sandbox', irn, status: 'Cancelled', reason: cancellationReason };
  }
  // Live mode would call NIC cancel API
  return { success: false, error: 'NOT_IMPLEMENTED', message: 'Live cancel not implemented' };
}
