const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getISTDateString(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${M}-${D}`;
}

// "2027-10-27" (YYYY-MM-DD string, jaisa <input type="date"> deta hai) ko
// "27 Oct 2027" jaisa human-readable, consistent format me convert karta hai.
// String ko manually parse karte hain (new Date() use nahi) taaki timezone
// ki wajah se date ek din aage/peeche shift na ho.
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}

// "2026-07-31" → "31/7/26"  (DD/M/YY — compact date for dashboard headers)
// Manually parsed to avoid JS Date timezone shifting the day.
export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const yy = String(y).slice(-2);
  return `${d}/${m}/${yy}`;
}
