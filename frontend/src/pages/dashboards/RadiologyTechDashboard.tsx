/**
 * Radiology Technician Dashboard with modality worklist and PACS push monitoring
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('radiology_technician') || getHmsDashboardSpec('hospital_admin')!;

export const radiologyTechConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function RadiologyTechDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('radiology_technician'), radiologyTechConfig.kpis);

  return (
    <div data-testid="radiologytechdashboard-container">
      <RoleDashboardShell config={{ ...radiologyTechConfig, kpis }} />
    </div>
  );
}
