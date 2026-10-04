/**
 * Booking + payment + consent validators (pure, framework-free).
 *
 * UI components (BookingModal, Checkout, BillCheckout) me yahi rules lage hain;
 * yahan extract karne ka maksad: Vitest me bina browser ke validation cover karna
 * (TEST-B-02 / FE-M-01). Server-side source of truth backend me hai — ye client
 * guard sirf UX ke liye hai, security boundary nahi.
 */

export const PAYMENT_METHODS = ['card', 'upi', 'netbanking', 'wallet', 'cash'];

export function validateBookingSlot({ date, time, mode = 'offline', allowedModes = ['offline', 'online', 'video'] } = {}) {
  const errors = {};
  if (!date) errors.date = 'Date chuno';
  else {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) errors.date = 'Valid date chuno';
    else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) errors.date = 'Past date par booking nahi ho sakti';
    }
  }
  if (!time) errors.time = 'Time slot chuno';
  if (!allowedModes.includes(mode)) errors.mode = `Mode ${allowedModes.join('/')} me se chuno`;
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateOtherPatient({ name = '', phone = '', age = '' } = {}) {
  const errors = {};
  if (!String(name).trim()) errors.name = 'Patient naam required hai';
  if (!String(phone).trim()) errors.phone = 'Phone required hai';
  else if (!/^[6-9]\d{9}$/.test(String(phone).trim())) errors.phone = '10-digit mobile number dalo';
  if (age !== '' && age != null) {
    const n = Number(age);
    if (!Number.isFinite(n) || n < 0 || n > 120) errors.age = 'Age 0-120 ke beech honi chahiye';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validatePayment({ method = '', amount = 0, upiId = '' } = {}) {
  const errors = {};
  if (!PAYMENT_METHODS.includes(method)) errors.method = 'Payment method chuno';
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) errors.amount = 'Amount positive hona chahiye';
  if (method === 'upi' && !/^[\w.-]+@[a-zA-Z]+/.test(String(upiId || ''))) errors.upiId = 'Valid UPI ID dalo (name@bank)';
  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Consent gate: telemedicine / ABHA / mental-health confidentiality flows me
 * checkbox tick kiye bina submit allow nahi hota.
 */
export function canSubmitWithConsent({ consentGiven = false, isConfidential = false, shareWithFamily = false, shareWithDoctor = false } = {}) {
  if (!consentGiven) return { ok: false, reason: 'Consent required hai — checkbox tick karo' };
  // Confidential case me kam se kam ek scope explicit hona chahiye (deny bhi explicit hai,
  // par UI me "kuch to chuno" guard UX mistake pakadta hai).
  if (isConfidential && !shareWithFamily && !shareWithDoctor) {
    return { ok: false, reason: 'Confidential case me sharing scope chuno ya explicit deny record karo' };
  }
  return { ok: true, reason: '' };
}

export function validateSOSPayload({ lat, lng, reporterMode = 'self', victimName = '' } = {}) {
  const errors = {};
  // Rule 1: bina real GPS ke SOS create nahi hota (SOSConfirmModal.tsx handleFinalSOS).
  if (!Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90) errors.lat = 'GPS latitude required hai';
  if (!Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180) errors.lng = 'GPS longitude required hai';
  if (!['self', 'other'].includes(reporterMode)) errors.reporterMode = 'Reporter mode self/other hona chahiye';
  if (reporterMode === 'other' && !String(victimName).trim()) errors.victimName = 'Victim naam required hai';
  return { ok: Object.keys(errors).length === 0, errors };
}
