// server-only: do not import from client components
// Server-side session reader moved from '@/lib/auth/guards.ts'.
// Used in middleware and server components (reads auth token from cookies).
// NOTE: `server-only` package is not installed (see package.json), so no
// `import 'server-only'` guard is added — enforce via this header + imports only from server code.
import type { UserRole } from '@/types/enums';
import type { CookieStoreLike } from '@/lib/auth/guards';

/**
 * Server-side session reader — reads the auth token from cookies.
 * Used in middleware and server components.
 */
export async function getServerSession(
  cookieStore: CookieStoreLike,
): Promise<{ user: { role: UserRole; isVerified: boolean; status: string; approvalStatus: string }; token: string | null } | null> {
  const token = cookieStore.get('token')?.value || cookieStore.get('auth-token')?.value || null;
  if (!token) return null;

  try {
    // Decode the JWT payload (simple base64url decode — the backend signs it).
    // Works in both Edge Runtime (middleware) and Node.js (server components).
    const parts = token.split('.');
    const encodedPayload = parts[1];
    if (!encodedPayload) return null;
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64').toString('utf-8'),
    );
    return {
      user: {
        role: payload.role as UserRole,
        isVerified: payload.isVerified ?? false,
        status: payload.status ?? 'active',
        approvalStatus: payload.approvalStatus ?? 'not_required',
      },
      token,
    };
  } catch {
    return null;
  }
}
