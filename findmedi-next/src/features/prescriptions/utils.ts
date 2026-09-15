/**
 * Prescriptions feature — utility helpers.
 */
import type { Medicine } from '@/types/models/prescription';

export function countMedicationItems(medicines: Medicine[]): number {
  return medicines.reduce((sum, med) => sum + (med.quantity ?? 0), 0);
}
