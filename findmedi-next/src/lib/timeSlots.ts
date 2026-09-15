/**
 * Time-slot utilities for the Today Appointments 3-column layout.
 *
 * Ported from client/src/lib/timeSlots.js.
 *
 * Two levels of slots are used:
 *   1. HOUR boxes     — 9:00, 10:00, 11:00 … 5:00 PM (working hours)
 *   2. 15-min sub-slots — 9:00-9:15, 9:15-9:30, 9:30-9:45, 9:45-10:00 …
 *
 * Appointment.time is stored as a display string like "9:00 AM" / "10:30 AM".
 */

// Working hours: 9 AM to 5 PM (configurable). Hours are in 24h here.
export const WORKING_START_HOUR = 9;
export const WORKING_END_HOUR = 17; // 5 PM

/**
 * Convert a 24h (hour, minute) into a 12h display label: "9:00 AM".
 */
export function to12h(hour: number, minute: number = 0): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * List of HOUR box labels for the working window.
 * e.g. ["9:00 AM", "10:00 AM", … "5:00 PM"]
 */
export function getHourSlots(
  startHour: number = WORKING_START_HOUR,
  endHour: number = WORKING_END_HOUR,
): string[] {
  const out: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    out.push(to12h(h, 0));
  }
  return out;
}

/**
 * For a given hour label like "9:00 AM", return its 15-minute sub-slots
 * spanning the full hour. e.g. ["9:00-9:15 AM", "9:15-9:30 AM", "9:30-9:45 AM", "9:45-10:00 AM"]
 */
export function getSubSlotsForHour(hourLabel: string): string[] {
  const { hour } = parseTime(hourLabel);
  if (hour == null) return [];
  const out: string[] = [];
  for (let m = 0; m < 60; m += 15) {
    const startH = hour;
    const startM = m;
    let endH = hour;
    let endM = m + 15;
    if (endM === 60) {
      endM = 0;
      endH = hour + 1;
    }
    out.push(`${to12h(startH, startM).replace(/ (AM|PM)$/, '')}-${to12h(endH, endM)}`);
  }
  return out;
}

export interface ParsedTime {
  hour: number | null;
  minute: number;
  period: string;
}

/**
 * Parse a display time like "9:30 AM" or "9:00 AM" into { hour, minute, period }.
 * Returns { hour: null } when it cannot parse.
 */
export function parseTime(label: string | null | undefined): ParsedTime {
  if (!label || typeof label !== 'string') return { hour: null, minute: 0, period: '' };
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hour: null, minute: 0, period: '' };
  let hour = parseInt(match[1]!, 10);
  const minute = parseInt(match[2]!, 10);
  const period = (match[3] || '').toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return { hour, minute, period };
}

/**
 * Which HOUR box does an appointment's time fall into?
 * "9:30 AM" → "9:00 AM", "10:15 AM" → "10:00 AM", "2:45 PM" → "2:00 PM"
 */
export function hourBoxFor(timeLabel: string | null | undefined): string | null {
  const { hour } = parseTime(timeLabel);
  if (hour == null) return null;
  return to12h(hour, 0);
}

/**
 * Which sub-slot label does an appointment's time fall into?
 * "9:20 AM" → "9:15-9:30 AM", "9:00 AM" → "9:00-9:15 AM"
 */
export function subSlotFor(timeLabel: string | null | undefined): string | null {
  const { hour, minute } = parseTime(timeLabel);
  if (hour == null) return null;
  const slotStart = Math.floor((minute || 0) / 15) * 15;
  const slotEnd = slotStart + 15;
  let endH = hour;
  let endM = slotEnd;
  if (endM === 60) {
    endM = 0;
    endH = hour + 1;
  }
  return `${to12h(hour, slotStart).replace(/ (AM|PM)$/, '')}-${to12h(endH, endM)}`;
}

/**
 * Generate all working hours from startHour to endHour.
 * Default: 9:00 AM to 5:00 PM
 */
export function generateWorkingHours(
  startHour: number = WORKING_START_HOUR,
  endHour: number = WORKING_END_HOUR,
): { label: string; hour: number }[] {
  const hours: { label: string; hour: number }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push({
      label: to12h(h, 0),
      hour: h,
    });
  }
  return hours;
}

/**
 * Generate 15-min sub-slots for a given hour (24h format).
 * e.g. hour=9 → ["9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM"]
 */
export function generateSubSlots(hour: number): string[] {
  const slots: string[] = [];
  for (let m = 0; m < 60; m += 15) {
    slots.push(to12h(hour, m));
  }
  return slots;
}
