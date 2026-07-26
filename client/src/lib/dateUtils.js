const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getISTDateString(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${M}-${D}`;
}
