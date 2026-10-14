/**
 * Doctor Consultation Dashboard with OPD queue, IPD rounds and prescription orders
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('doctor') || getHmsDashboardSpec('hospital_admin')!;

export const doctorRoleConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function DoctorRoleDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('doctor'), doctorRoleConfig.kpis);

  return (
    <div data-testid="doctorroledashboard-container">
      <RoleDashboardShell config={{ ...doctorRoleConfig, kpis }} />
    </div>
  );
}
