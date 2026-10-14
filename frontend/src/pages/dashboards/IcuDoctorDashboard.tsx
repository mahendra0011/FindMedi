/**
 * ICU Intensivist Dashboard with live bed board and ventilator weaning tracker
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('icu_doctor') || getHmsDashboardSpec('hospital_admin')!;

export const icuDoctorConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function IcuDoctorDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('icu_doctor'), icuDoctorConfig.kpis);

  return (
    <div data-testid="icudoctordashboard-container">
      <RoleDashboardShell config={{ ...icuDoctorConfig, kpis }} />
    </div>
  );
}
