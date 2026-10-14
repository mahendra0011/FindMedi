/**
 * Patient Discharge Desk Dashboard with multi-stage clearance board and exit tracking
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('discharge_coordinator') || getHmsDashboardSpec('hospital_admin')!;

export const dischargeCoordinatorConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function DischargeCoordinatorDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('discharge_coordinator'), dischargeCoordinatorConfig.kpis);

  return (
    <div data-testid="dischargecoordinatordashboard-container">
      <RoleDashboardShell config={{ ...dischargeCoordinatorConfig, kpis }} />
    </div>
  );
}
