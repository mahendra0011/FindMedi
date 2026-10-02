import logger from '../config/logger.js';

// ABDM gateway adapter (Spec 26 live path). Endpoints are base-URL relative
// and versioned via env so sandbox → production is a config change, not code:
//   ABDM_BASE_URL=https://<sandbox|prod host>
//   ABDM_CLIENT_ID / ABDM_CLIENT_SECRET (session token)
// Unset credentials → mock fallback (previous behavior), loudly logged so
// nobody mistakes demo OTPs for a live ABDM mint.
const BASE = (process.env.ABDM_BASE_URL || '').replace(/\/+$/, '');
const CLIENT_ID = process.env.ABDM_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ABDM_CLIENT_SECRET || '';

export function isAbdmLive() {
  return Boolean(BASE && CLIENT_ID && CLIENT_SECRET);
}

async function sessionToken() {
  const res = await fetch(`${BASE}/v0.5/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error(`ABDM session HTTP ${res.status}`);
  const data = await res.json();
  if (!data.accessToken) throw new Error('ABDM session: no accessToken');
  return data.accessToken;
}

async function abdmPost(path, token, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ABDM ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Txn-scoped OTP: returns { txnId, mode: 'live'|'mock' }.
export async function gatewayGenerateOtp(aadhaarOrMobile) {
  if (!isAbdmLive()) {
    const { v4: uuidv4 } = await import('uuid');
    logger.warn('[ABDM_GATEWAY] mock mode (ABDM_BASE_URL/CLIENT_ID/SECRET unset) — demo OTP only');
    return { txnId: uuidv4(), mode: 'mock' };
  }
  const token = await sessionToken();
  const isAadhaar = String(aadhaarOrMobile).replace(/\D/g, '').length === 12;
  const path = isAadhaar
    ? '/v1/registration/aadhaar/generateOtp'
    : '/v2/registration/mobile/generateOtp';
  const data = await abdmPost(path, token, isAadhaar
    ? { aadhaar: String(aadhaarOrMobile).replace(/\D/g, '') }
    : { mobile: String(aadhaarOrMobile).replace(/\D/g, '').slice(-10) });
  return { txnId: data.txnId, mode: 'live' };
}

export async function gatewayVerifyOtp(txnId, otp) {
  if (!isAbdmLive()) {
    return { mode: 'mock', ok: otp === '123456' || String(otp).length === 6 };
  }
  const token = await sessionToken();
  const data = await abdmPost('/v1/registration/aadhaar/verifyOTP', token, {
    otp: String(otp),
    txnId,
  });
  return { mode: 'live', ok: true, abhaNumber: data.healthIdNumber || data.abhaNumber, abhaAddress: data.healthId || data.abhaAddress };
}
