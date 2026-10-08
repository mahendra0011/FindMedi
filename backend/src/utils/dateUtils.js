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

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/**
 * A5: IST wall-clock slot strings ('YYYY-MM-DD', 'HH:MM') -> UTC instant.
 *
 * Same math as jobs/appointmentReminder.job.js#appointmentInstant, kept here
 * because dateUtils is the pure IST home and the reminder job imports this
 * module (importing the job back would be a cycle). The two are pinned
 * together by unit test, so neither can drift.
 *
 * Returns null for anything that is not a real calendar date — 2026-02-31
 * normalises inside Date.UTC and must be rejected, not rolled into March.
 * 00:15 IST legitimately falls on the previous UTC day, so the calendar check
 * runs on the unshifted probe.
 */
export function slotStartAt(dateStr, timeStr) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? '').trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr ?? '').trim());
  if (!d || !t) return null;
  const [, y, mo, day] = d;
  const hour = Number(t[1]);
  const minute = Number(t[2]);
  if (hour > 23 || minute > 59) return null;
  const dayProbe = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(day)));
  if (dayProbe.getUTCFullYear() !== Number(y) || dayProbe.getUTCMonth() !== Number(mo) - 1 || dayProbe.getUTCDate() !== Number(day)) {
    return null;
  }
  // IST is UTC+5:30 with no DST, so the offset is a constant.
  return new Date(dayProbe.getTime() + hour * HOUR_MS + minute * MIN_MS - 5.5 * HOUR_MS);
}
