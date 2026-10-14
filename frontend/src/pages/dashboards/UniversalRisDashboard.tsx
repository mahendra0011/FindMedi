/**
 * Universal RIS (Radiology / PACS) Dashboard Component
 *
 * Renders any role dashboard from the 41-Section, 8-Modality RIS/PACS Blueprint
 * using RoleDashboardShell. Can be rendered directly with a `roleKey` prop
 * or mounted on a route with useParams (`/radiology/dashboard/:roleKey` or `/dashboards/:roleKey`).
 */
import { useParams } from 'react-router-dom';
import RoleDashboardShell from './RoleDashboardShell';
import { getRisDashboardSpec } from '@/lib/risDashboardSpec';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';

export interface UniversalRisDashboardProps {
  roleKey?: string;
}

export default function UniversalRisDashboard({ roleKey: propRoleKey }: UniversalRisDashboardProps) {
  const { roleKey: paramRoleKey } = useParams<{ roleKey?: string }>();
  const activeRole = propRoleKey || paramRoleKey || 'radiology_manager';

  const spec = getRisDashboardSpec(activeRole);
  const kpis = useLiveKpis(() => fetchRoleLiveKpis(activeRole), spec.kpis);

  return (
    <div data-testid="universal-ris-dashboard" data-role-key={activeRole}>
      <RoleDashboardShell config={{ ...spec, kpis }} />
    </div>
  );
}
