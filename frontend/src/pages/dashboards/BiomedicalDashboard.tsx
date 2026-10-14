/**
 * Biomedical Engineering Dashboard with breakdown work orders and calibration tracking
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('biomedical_engineer') || getHmsDashboardSpec('hospital_admin')!;

export const biomedicalConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function BiomedicalDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('biomedical_engineer'), biomedicalConfig.kpis);

  return (
    <div data-testid="biomedicaldashboard-container">
      <RoleDashboardShell config={{ ...biomedicalConfig, kpis }} />
    </div>
  );
}
