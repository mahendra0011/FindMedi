const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns current date or specified date formatted as YYYY-MM-DD in Indian Standard Time (IST).
 * Prevents UTC timezone drift issues when comparing appointment dates.
 */
export function getISTDateString(date: Date = new Date()): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats "YYYY-MM-DD" into human-readable "27 Oct 2027".
 * Manually parsed without `new Date()` to prevent browser timezone shifting.
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return String(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}

/**
 * Formats "YYYY-MM-DD" into compact "31/7/26" (DD/M/YY).
 * Used for compact badges and dashboard card headers.
 */
export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return String(dateStr);
  const yy = String(y).slice(-2);
  return `${d}/${m}/${yy}`;
}
