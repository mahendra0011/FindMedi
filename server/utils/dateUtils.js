const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function toISTShifted(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

export function getISTDateString(date = new Date()) {
  const ist = toISTShifted(date);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${M}-${D}`;
}

export function getISTDateTimeParts(date = new Date()) {
  const ist = toISTShifted(date);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  const h = String(ist.getUTCHours()).padStart(2, '0');
  const m = String(ist.getUTCMinutes()).padStart(2, '0');
  return { y, M, D, h, m, str: `${y}-${M}-${D}-${h}-${m}` };
}
