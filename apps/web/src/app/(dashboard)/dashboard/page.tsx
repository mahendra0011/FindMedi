/**
 * Intentionally shared across roles — do not move.
 */
/**
 * Dashboard root — role-based redirect landing page.
 *
 * After login, users are redirected here. The page detects their role
 * and navigates to their role-specific dashboard.
 *
 * Ported from client/src/pages/Dashboard.jsx (RoleDashboard).
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { selectUserRole } from '@/store/slices/authSlice';
import { getDefaultDashboardPath } from '@/config/roles';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const role = useAppSelector(selectUserRole);

  useEffect(() => {
    const targetPath = getDefaultDashboardPath(role);
    router.replace(targetPath);
  }, [role, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Redirecting to your dashboard...</span>
      </div>
    </div>
  );
}
