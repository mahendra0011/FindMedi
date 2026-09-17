/**
 * Dashboard layout — wraps all authenticated role-specific pages.
 *
 * Includes the dashboard sidebar + header shell. The sidebar items are
 * role-dependent (patient, doctor, hospital_admin, etc.) and will be
 * populated in Phase 4 with proper components.
 *
 * Client Component because:
 *   - Sidebar state (collapsed/expanded) uses Redux (uiSlice)
 *   - User data comes from Redux store (authSlice)
 *   - Real-time notifications use socket.io
 */
'use client';

import type { ReactNode } from 'react';
import { useAppSelector } from '@/store';
import { selectCurrentUser, selectAuthLoading } from '@/store/slices/authSlice';
import { selectSidebarCollapsed } from '@/store/slices/uiSlice';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const user = useAppSelector(selectCurrentUser);
  const loading = useAppSelector(selectAuthLoading);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`border-r bg-muted/30 transition-all duration-300 ${
          sidebarCollapsed ? 'w-14' : 'w-64'
        }`}
      >
        <div className="h-full overflow-y-auto p-4">
          <div className="mb-6">
            {!sidebarCollapsed && <h2 className="font-heading text-lg font-bold">FindMedi</h2>}
          </div>
          {/* Sidebar items will be populated per-role in Phase 4 */}
          <p className="text-xs text-muted-foreground">
            {sidebarCollapsed ? '↑' : 'Sidebar loading...'}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="border-b px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Logged in as: {user?.name || 'User'} ({user?.role})
          </p>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
