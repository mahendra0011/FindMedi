/**
 * Operation Theatre Coordinator Dashboard with daily OT board and WHO checklist verification
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('ot_coordinator') || getHmsDashboardSpec('hospital_admin')!;

export const otCoordinatorConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function OtCoordinatorDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('ot_coordinator'), otCoordinatorConfig.kpis);

  return (
    <div data-testid="otcoordinatordashboard-container">
      <RoleDashboardShell config={{ ...otCoordinatorConfig, kpis }} />
    </div>
  );
}
