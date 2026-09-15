/**
 * Appointment feature — utility helpers.
 */
import type { Appointment } from '@/types/models/appointment';

/**
 * Filter appointments by a status string (case-insensitive).
 */
export function filterByStatus(appointments: Appointment[], status: string): Appointment[] {
  const lower = status.toLowerCase();
  return appointments.filter((apt) => apt.status?.toLowerCase() === lower);
}

/**
 * Sort appointments chronologically by their time field.
 */
export function sortByTime(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => {
    const ta = a.time ?? '';
    const tb = b.time ?? '';
    return ta.localeCompare(tb);
  });
}
