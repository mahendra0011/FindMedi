import type { UserRole } from '@/types/enums';
import { ROLE_CONFIG } from '@/config/roles';

/** Minimal cookie interface so getServerSession works in both Next.js
 * middleware (request.cookies) and server components (next/headers cookies()).
 * Client-safe type (re-used by '@/lib/server-only/guards.ts'). */
export interface CookieStoreLike {
  get(name: string): { value: string } | undefined;
}

export interface RoleCheckResult {
  allowed: boolean;
  redirectTo: string;
  reason?: 'not_authenticated' | 'role_mismatch' | 'needs_approval' | 'blocked' | 'needs_otp';
}

/**
 * Check if a user role is allowed to access a route.
 * Returns a result with redirect path and reason.
 */
export function checkRoleAccess(
  userRole: UserRole | null | undefined,
  allowedRoles: UserRole[] | undefined,
  userStatus?: string,
  isVerified?: boolean,
  doctorApproved?: boolean,
  approvalStatus?: string,
): RoleCheckResult {
  // Not authenticated → redirect to login
  if (!userRole) {
    return { allowed: false, redirectTo: '/login', reason: 'not_authenticated' };
  }

  // Blocked account → redirect to login (and logout)
  if (userStatus === 'blocked') {
    return { allowed: false, redirectTo: '/login', reason: 'blocked' };
  }

  // Unverified account → redirect to OTP verification
  if (!isVerified) {
    return { allowed: false, redirectTo: '/verify-otp', reason: 'needs_otp' };
  }

  // Doctor not yet approved
  if (
    (userRole === 'doctor' || userRole === 'clinic_doctor') &&
    !doctorApproved &&
    approvalStatus !== 'approved'
  ) {
    const status = approvalStatus === 'rejected' ? 'rejected' : 'pending';
    return { allowed: false, redirectTo: `/pending-approval?status=${status}`, reason: 'needs_approval' };
  }

  // Delivery boy not yet approved
  if (userRole === 'delivery_boy' && approvalStatus !== 'approved') {
    return { allowed: false, redirectTo: '/delivery/documents', reason: 'needs_approval' };
  }

  // Role-based access control
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    const config = ROLE_CONFIG[userRole];
    return { allowed: false, redirectTo: config ? config.routePrefix : '/dashboard', reason: 'role_mismatch' };
  }

  return { allowed: true, redirectTo: '' };
}

/** Path-to-required-role mapping for middleware. */
export const PUBLIC_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/login/,
  /^\/signup/,
  /^\/join-platform/,
  /^\/forgot-password/,
  /^\/verify-otp/,
  /^\/pending-approval/,
  /^\/doctor-setup/,
  /^\/register\/delivery-partner/,
  /^\/about/,
  /^\/contact/,
  /^\/privacy/,
  /^\/terms/,
  /^\/disclaimer/,
  /^\/doctors/,
  /^\/hospitals/,
  /^\/hospital-doctors/,
  /^\/clinic-doctors/,
  /^\/clinic\//,
  /^\/clinic$/,
  /^\/book-test/,
  /^\/diagnostic-centers/,
  /^\/all-tests/,
  /^\/lab\//,
  /^\/lab$/,
  /^\/technician/,
  /^\/imaging/,
  /^\/buy-medicine/,
  /^\/medicine-store/,
  /^\/cart/,
  /^\/checkout/,
  /^\/order-confirmation/,
  /^\/order-tracking/,
  /^\/payment-gateway/,
  /^\/api\//,
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((re) => re.test(pathname));
}
