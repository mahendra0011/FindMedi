/**
 * Checklist L5 — GSTIN format + modulus-36 checksum (Luhn variant, base 36).
 *
 * Source: public GSTN algorithm — walk the first 14 chars left→right with
 * alternating weights 1,2,1,2…, fold each product as floor(p/36) + p%36, and
 * the 15th char must be the alphabet index (36 - sum%36) % 36.
 *
 * Catches every single-character typo; it does NOT prove the registration
 * exists (that needs a government lookup).
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 2-digit state code · 10-char PAN · entity code (never 0) · literal Z · check char.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const STATE_CODES = (() => {
  const set = new Set();
  for (let i = 1; i <= 38; i += 1) set.add(String(i).padStart(2, '0'));
  for (const c of ['96', '97', '99']) set.add(c); // SEZ / export / other territory
  return set;
})();

export function gstinChecksum(first14) {
  let sum = 0;
  let weight = 1;
  for (const ch of first14) {
    const value = ALPHABET.indexOf(ch);
    const product = value * weight;
    sum += Math.floor(product / 36) + (product % 36);
    weight = weight === 1 ? 2 : 1;
  }
  return ALPHABET[(36 - (sum % 36)) % 36];
}

/**
 * @returns {{ valid: boolean, gstin?: string, reason?: 'format'|'state_code'|'checksum' }}
 * Empty/missing GSTIN is treated as "not provided" → { valid: false, reason: 'format' }.
 */
export function validateGstin(raw) {
  const gstin = String(raw || '').trim().toUpperCase();
  if (!GSTIN_RE.test(gstin)) return { valid: false, reason: 'format' };
  if (!STATE_CODES.has(gstin.slice(0, 2))) return { valid: false, reason: 'state_code' };
  if (gstinChecksum(gstin.slice(0, 14)) !== gstin[14]) return { valid: false, reason: 'checksum' };
  return { valid: true, gstin };
}