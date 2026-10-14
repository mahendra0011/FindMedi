/**
 * Universal LIS (Pathology) Dashboard Component
 *
 * Renders any role dashboard from the 46-Section, 8-Department Pathology Blueprint
 * using RoleDashboardShell. Can be rendered directly with a `roleKey` prop
 * or mounted on a route with useParams (`/lab/dashboard/:roleKey` or `/dashboards/:roleKey`).
 */
import { useParams } from 'react-router-dom';
import RoleDashboardShell from './RoleDashboardShell';
import { getLisDashboardSpec } from '@/lib/lisDashboardSpec';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';

export interface UniversalLisDashboardProps {
  roleKey?: string;
}

export default function UniversalLisDashboard({ roleKey: propRoleKey }: UniversalLisDashboardProps) {
  const { roleKey: paramRoleKey } = useParams<{ roleKey?: string }>();
  const activeRole = propRoleKey || paramRoleKey || 'lab_manager';

  const spec = getLisDashboardSpec(activeRole);
  const kpis = useLiveKpis(() => fetchRoleLiveKpis(activeRole), spec.kpis);

  return (
    <div data-testid="universal-lis-dashboard" data-role-key={activeRole}>
      <RoleDashboardShell config={{ ...spec, kpis }} />
    </div>
  );
}
