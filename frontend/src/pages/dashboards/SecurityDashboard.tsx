/**
 * Hospital Security & Visitor Dashboard with visitor passes and incident tracking
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('security') || getHmsDashboardSpec('hospital_admin')!;

export const securityConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function SecurityDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('security'), securityConfig.kpis);

  return (
    <div data-testid="securitydashboard-container">
      <RoleDashboardShell config={{ ...securityConfig, kpis }} />
    </div>
  );
}
