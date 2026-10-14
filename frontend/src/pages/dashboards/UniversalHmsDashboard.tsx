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
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';

export interface UniversalHmsDashboardProps {
  roleKey?: string;
}

export default function UniversalHmsDashboard({ roleKey: propRoleKey }: UniversalHmsDashboardProps) {
  const { roleKey: paramRoleKey } = useParams<{ roleKey?: string }>();
  const activeRole = propRoleKey || paramRoleKey || 'hospital_admin';
  const spec = getHmsDashboardSpec(activeRole) || getHmsDashboardSpec('hospital_admin')!;

  // Role-aware live KPI hook: dynamically fetches metrics for doctor, admin, nurse, etc.
  const kpis = useLiveKpis(() => fetchRoleLiveKpis(activeRole), spec.kpis);

  return (
    <div data-testid="universal-hms-dashboard" data-role-key={activeRole}>
      <RoleDashboardShell config={{ ...spec, kpis }} />
    </div>
  );
}
