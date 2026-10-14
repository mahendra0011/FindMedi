/**
 * Universal HMS Dashboard Component
 *
 * Renders any role dashboard from the 6-layer HMS Blueprint specification
 * using RoleDashboardShell. Can be rendered directly with a `roleKey` prop
 * or mounted on a route with useParams (`/dashboards/:roleKey`).
 */
import { useParams } from 'react-router-dom';
import RoleDashboardShell from './RoleDashboardShell';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';
import { getCmsDashboardSpec } from '@/lib/cmsDashboardSpec';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';

export interface UniversalHmsDashboardProps {
  roleKey?: string;
}

export default function UniversalHmsDashboard({ roleKey: propRoleKey }: UniversalHmsDashboardProps) {
  const { roleKey: paramRoleKey } = useParams<{ roleKey?: string }>();
  const activeRole = propRoleKey || paramRoleKey || 'hospital_admin';
  const isClinicRole = activeRole.startsWith('clinic_') || activeRole === 'super_admin';
  const spec = (isClinicRole
    ? (getCmsDashboardSpec(activeRole) as any) || getHmsDashboardSpec(activeRole)
    : getHmsDashboardSpec(activeRole) || (getCmsDashboardSpec(activeRole) as any)) || getHmsDashboardSpec('hospital_admin')!;

  // Role-aware live KPI hook: dynamically fetches metrics for doctor, admin, nurse, etc.
  const kpis = useLiveKpis(() => fetchRoleLiveKpis(activeRole), spec.kpis);

  return (
    <div data-testid="universal-hms-dashboard" data-role-key={activeRole}>
      <RoleDashboardShell config={{ ...spec, kpis }} />
    </div>
  );
}
