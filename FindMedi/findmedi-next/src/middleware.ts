import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute, getServerSession, checkRoleAccess } from '@/lib/auth/guards';
import { ROLE_CONFIG } from '@/config/roles';
import type { UserRole } from '@/types/enums';

/** Map a dashboard route prefix to the roles allowed to access it. */
const DASHBOARD_ROLE_PREFIXES: Record<string, UserRole[]> = {
  '/patient': ['patient'],
  '/doctor': ['doctor'],
  '/clinic': ['clinic_doctor'],
  '/admin': ['hospital_admin', 'superadmin'],
  '/superadmin': ['superadmin'],
  '/pharmacy-business': ['pharmacy_owner'],
  '/lab-business': ['lab_owner'],
  '/delivery': ['delivery_boy'],
};

/** Extract the dashboard role prefix from a pathname, if it matches one. */
function extractDashboardRole(pathname: string): string | null {
  return Object.keys(DASHBOARD_ROLE_PREFIXES).find((prefix) => pathname.startsWith(prefix)) ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow public routes to pass through
  if (isPublicRoute(pathname)) return NextResponse.next();

  // Read session from cookies (JWT decode, edge-safe)
  const session = await getServerSession(request.cookies);

  if (!session?.user) {
    // Not authenticated → redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const { user } = session;

  // Check if this is a dashboard route that requires a specific role
  const rolePrefix = extractDashboardRole(pathname);

  if (rolePrefix) {
    const allowedRoles = DASHBOARD_ROLE_PREFIXES[rolePrefix] ?? [];

    // Run full role + approval + status checks
    const result = checkRoleAccess(
      user.role,
      allowedRoles,
      user.status,
      user.isVerified,
      undefined,
      user.approvalStatus,
    );

    if (!result.allowed) {
      // Redirect to the user's own dashboard (or default)
      const config = ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG];
      const redirectPath = config?.routePrefix ?? '/dashboard';
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|_static|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
