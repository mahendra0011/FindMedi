/**
 * Hospital IT Admin Dashboard with HL7 bridge monitoring and device connectivity
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('it_admin') || getHmsDashboardSpec('hospital_admin')!;

export const itAdminConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function ItAdminDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('it_admin'), itAdminConfig.kpis);

  return (
    <div data-testid="itadmindashboard-container">
      <RoleDashboardShell config={{ ...itAdminConfig, kpis }} />
    </div>
  );
}
