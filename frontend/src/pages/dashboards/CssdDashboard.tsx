/**
 * CSSD Sterilization Dashboard with autoclave cycle monitoring and sterile storage inventory
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('cssd_technician') || getHmsDashboardSpec('hospital_admin')!;

export const cssdConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function CssdDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('cssd_technician'), cssdConfig.kpis);

  return (
    <div data-testid="cssddashboard-container">
      <RoleDashboardShell config={{ ...cssdConfig, kpis }} />
    </div>
  );
}
