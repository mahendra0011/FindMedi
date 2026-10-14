/**
 * Infection Control Dashboard with HAI surveillance and isolation room audits
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('infection_control_nurse') || getHmsDashboardSpec('hospital_admin')!;

export const infectionControlConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function InfectionControlDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('infection_control_nurse'), infectionControlConfig.kpis);

  return (
    <div data-testid="infectioncontroldashboard-container">
      <RoleDashboardShell config={{ ...infectionControlConfig, kpis }} />
    </div>
  );
}
