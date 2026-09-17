import type { UserRole } from '@/types/enums';

/**
 * Single source of truth for role-to-dashboard mapping.
 * Maps each dashboard role to its route prefix and display name.
 */
export interface RoleConfig {
  role: UserRole;
  label: string;
  routePrefix: string;
  dashboardComponent: string;
  color: string;
}

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  superadmin: {
    role: 'superadmin',
    label: 'Super Admin',
    routePrefix: '/superadmin',
    dashboardComponent: 'SAPlatformKPIs',
    color: 'hsl(var(--primary))',
  },
  hospital_admin: {
    role: 'hospital_admin',
    label: 'Hospital Admin',
    routePrefix: '/admin',
    dashboardComponent: 'Dashboard',
    color: 'hsl(var(--info))',
  },
  doctor: {
    role: 'doctor',
    label: 'Doctor',
    routePrefix: '/doctor',
    dashboardComponent: 'DoctorDashboard',
    color: 'hsl(var(--success))',
  },
  clinic_doctor: {
    role: 'clinic_doctor',
    label: 'Clinic Doctor',
    routePrefix: '/clinic',
    dashboardComponent: 'ClinicDashboard',
    color: 'hsl(var(--warning))',
  },
  patient: {
    role: 'patient',
    label: 'Patient',
    routePrefix: '/patient',
    dashboardComponent: 'PatientDashboard',
    color: 'hsl(var(--primary))',
  },
  lab_owner: {
    role: 'lab_owner',
    label: 'Lab Owner',
    routePrefix: '/lab-business',
    dashboardComponent: 'LabCenterDashboard',
    color: 'hsl(var(--info))',
  },
  pharmacy_owner: {
    role: 'pharmacy_owner',
    label: 'Pharmacy Owner',
    routePrefix: '/pharmacy-business',
    dashboardComponent: 'PharmacyBusinessDashboard',
    color: 'hsl(var(--warning))',
  },
  delivery_boy: {
    role: 'delivery_boy',
    label: 'Delivery Partner',
    routePrefix: '/delivery',
    dashboardComponent: 'DeliveryDashboard',
    color: 'hsl(var(--secondary-foreground))',
  },
};

/** Get the default dashboard path for a given role. */
export function getDefaultDashboardPath(role: UserRole | null | undefined): string {
  if (!role) return '/dashboard';
  const config = ROLE_CONFIG[role];
  if (config) return config.routePrefix;
  if (role === 'hospital_admin' || role === 'superadmin') return '/superadmin/overview';
  if (role === 'doctor') return '/doctor';
  if (role === 'clinic_doctor') return '/clinic/dashboard';
  if (role === 'patient') return '/patient';
  if (role === 'lab_owner') return '/lab-business';
  if (role === 'pharmacy_owner') return '/pharmacy-business';
  if (role === 'delivery_boy') return '/delivery';
  return '/dashboard';
}

/** Roles that can access a given route. Returns true if the user's role is in the allowed list. */
export function canAccess(userRole: UserRole | null | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
