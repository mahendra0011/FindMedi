/**
 * Mortuary & Death Records Dashboard with cold chamber status and MLC documentation
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('mortuary_attendant') || getHmsDashboardSpec('hospital_admin')!;

export const mortuaryConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function MortuaryDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('mortuary_attendant'), mortuaryConfig.kpis);

  return (
    <div data-testid="mortuarydashboard-container">
      <RoleDashboardShell config={{ ...mortuaryConfig, kpis }} />
    </div>
  );
}
