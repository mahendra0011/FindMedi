/**
 * ICU Bedside Nurse Dashboard with hourly monitoring and continuous infusion tracker
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('icu_nurse') || getHmsDashboardSpec('hospital_admin')!;

export const icuNurseConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function IcuNurseDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('icu_nurse'), icuNurseConfig.kpis);

  return (
    <div data-testid="icunursedashboard-container">
      <RoleDashboardShell config={{ ...icuNurseConfig, kpis }} />
    </div>
  );
}
