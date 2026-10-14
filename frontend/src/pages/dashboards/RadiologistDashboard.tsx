/**
 * Consultant Radiologist Dashboard with PACS unread queue and voice dictation
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('radiologist') || getHmsDashboardSpec('hospital_admin')!;

export const radiologistConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function RadiologistDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('radiologist'), radiologistConfig.kpis);

  return (
    <div data-testid="radiologistdashboard-container">
      <RoleDashboardShell config={{ ...radiologistConfig, kpis }} />
    </div>
  );
}
