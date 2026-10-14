/**
 * Ambulance & Transport Dashboard with active dispatches and vehicle inspection log
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('ambulance') || getHmsDashboardSpec('hospital_admin')!;

export const ambulanceRoleConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function AmbulanceRoleDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('ambulance'), ambulanceRoleConfig.kpis);

  return (
    <div data-testid="ambulanceroledashboard-container">
      <RoleDashboardShell config={{ ...ambulanceRoleConfig, kpis }} />
    </div>
  );
}
