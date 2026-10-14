/**
 * Anaesthesiologist Dashboard with PAC clearance and PACU recovery tracker
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('anaesthetist') || getHmsDashboardSpec('hospital_admin')!;

export const anaesthesiologistConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function AnaesthesiologistDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('anaesthetist'), anaesthesiologistConfig.kpis);

  return (
    <div data-testid="anaesthesiologistdashboard-container">
      <RoleDashboardShell config={{ ...anaesthesiologistConfig, kpis }} />
    </div>
  );
}
