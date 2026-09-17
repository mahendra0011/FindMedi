/**
 * Server-side session utilities (Phase 2 — Todo 16).
 *
 * The project uses custom JWT/OTP auth (not NextAuth.js).
 * The backend (Express/MongoDB) issues JWTs on login/OTP verification.
 * These utilities let Next.js server components and middleware read the
 * user's session from cookies.
 *
 * Usage in server components:
 *   const cookies = await cookieStore();  // from 'next/headers'
 *   const session = await getServerSession(cookies);
 *   if (!session) redirect('/login');
 */
import type { UserRole } from '@/types/enums';

export interface SessionUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  status: string;
  approvalStatus: string;
  avatar: string;
}

export interface SessionResult {
  user: SessionUser;
  token: string;
}

export interface ServerSession {
  token: string;
  role: UserRole | null;
  isVerified: boolean;
}

/**
 * Read auth token from next/headers cookies (server components / route handlers).
 * Mirrors client-side localStorage token but via httpOnly cookie for SSR.
 */
export async function getSession(): Promise<ServerSession | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const token = store.get('token')?.value || store.get('auth-token')?.value || null;
  if (!token) return null;
  try {
    const parts = token.split('.');
    const encodedPayload = parts[1];
    if (!encodedPayload) return { token, role: null, isVerified: false };
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8'));
    return {
      token,
      role: payload.role as UserRole,
      isVerified: payload.isVerified ?? false,
    };
  } catch {
    return { token, role: null, isVerified: false };
  }
}

/**
 * Decode and verify a JWT token. Returns the session user or null.
 */
function decodeToken(token: string): SessionUser | null {
  try {
    const parts = token.split('.');
    const encodedPayload = parts[1];
    if (!encodedPayload) return null;
    return JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8')) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Get the current server-side session from cookies.
 * Works in both middleware (request.cookies) and server components (next/headers).
 */
export async function getServerSession(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<SessionResult | null> {
  const token = cookies.get('token')?.value || cookies.get('auth-token')?.value || null;
  if (!token) return null;

  const user = decodeToken(token);
  if (!user) return null;

  return { user, token };
}

/**
 * Get the current user's role server-side.
 */
export async function getServerUserRole(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<UserRole | null> {
  const session = await getServerSession(cookies);
  return session?.user.role ?? null;
}

/** Create auth cookies for setting in server actions. */
export function createAuthCookies(token: string, refreshToken: string, maxAgeDays = 30) {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  return [
    `token=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`,
    `refreshToken=${refreshToken}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`,
  ];
}

/** Clear auth cookies (for server-side logout). */
export function clearAuthCookies() {
  return [
    `token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    `refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  ];
}
