/**
 * Quality & Patient Safety Dashboard with incident reports and CAPA tracking
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('quality_officer') || getHmsDashboardSpec('hospital_admin')!;

export const qualityManagerConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function QualityManagerDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('quality_officer'), qualityManagerConfig.kpis);

  return (
    <div data-testid="qualitymanagerdashboard-container">
      <RoleDashboardShell config={{ ...qualityManagerConfig, kpis }} />
    </div>
  );
}
