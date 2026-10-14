/**
 * Housekeeping & Sanitization Dashboard with bed cleaning queue and biohazard disinfection
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('housekeeping_supervisor') || getHmsDashboardSpec('hospital_admin')!;

export const housekeepingConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function HousekeepingDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('housekeeping_supervisor'), housekeepingConfig.kpis);

  return (
    <div data-testid="housekeepingdashboard-container">
      <RoleDashboardShell config={{ ...housekeepingConfig, kpis }} />
    </div>
  );
}
