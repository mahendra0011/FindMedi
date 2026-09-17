/**
 * Auth feature — utility helpers.
 */
import type { UserRole } from '@/types/enums';

/**
 * Map a display role name to the canonical UserRole enum value.
 */
const ROLE_ALIASES: Record<string, UserRole> = {
  admin: 'superadmin',
  doctor: 'doctor',
  patient: 'patient',
  clinic: 'clinic_doctor',
  pharmacy: 'pharmacy_owner',
  lab: 'lab_owner',
  delivery: 'delivery_boy',
};

export function normalizeRole(role: string): UserRole {
  return ROLE_ALIASES[role.toLowerCase()] ?? 'patient';
}

/**
 * Check whether a JWT token is expired (returns true for empty/invalid tokens).
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    const payload = parts[1];
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload));
    const exp = (decoded as { exp?: number }).exp;
    return exp !== undefined && exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
