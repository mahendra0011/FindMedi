/**
 * Hospital Pharmacist Dashboard with OPD dispensing and controlled drug register
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('pharmacist') || getHmsDashboardSpec('hospital_admin')!;

export const pharmacistRoleConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function PharmacistRoleDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('pharmacist'), pharmacistRoleConfig.kpis);

  return (
    <div data-testid="pharmacistroledashboard-container">
      <RoleDashboardShell config={{ ...pharmacistRoleConfig, kpis }} />
    </div>
  );
}
