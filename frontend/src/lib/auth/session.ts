/**
 * Client-safe session types (Phase 2 — Todo 16).
 *
 * Server-only implementations (getSession, getServerSession,
 * getServerUserRole, createAuthCookies, clearAuthCookies) live in
 * '@/lib/server-only/session.ts'.
 * server-only: do not import from client components (for the server file).
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
