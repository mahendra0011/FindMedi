/**
 * Hospital MIS & Analytics Dashboard with operational census and financial reports
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('mis_reporting') || getHmsDashboardSpec('hospital_admin')!;

export const misReportingConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function MisReportingDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('mis_reporting'), misReportingConfig.kpis);

  return (
    <div data-testid="misreportingdashboard-container">
      <RoleDashboardShell config={{ ...misReportingConfig, kpis }} />
    </div>
  );
}
