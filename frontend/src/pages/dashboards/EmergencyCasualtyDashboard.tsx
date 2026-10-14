/**
 * Emergency / Casualty Dashboard with triage waiting queue and resuscitation workflow
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('emergency') || getHmsDashboardSpec('hospital_admin')!;

export const emergencyCasualtyConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function EmergencyCasualtyDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('emergency'), emergencyCasualtyConfig.kpis);

  return (
    <div data-testid="emergencycasualtydashboard-container">
      <RoleDashboardShell config={{ ...emergencyCasualtyConfig, kpis }} />
    </div>
  );
}
