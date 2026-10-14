/**
 * Consultant Surgeon Dashboard with operative notes and surgical schedules
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('surgeon') || getHmsDashboardSpec('hospital_admin')!;

export const surgeonConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function SurgeonDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('surgeon'), surgeonConfig.kpis);

  return (
    <div data-testid="surgeondashboard-container">
      <RoleDashboardShell config={{ ...surgeonConfig, kpis }} />
    </div>
  );
}
