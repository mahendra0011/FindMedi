/**
 * Purchase & Procurement Dashboard with requisitions queue and vendor quotations
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('purchase_officer') || getHmsDashboardSpec('hospital_admin')!;

export const purchaseOfficerConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function PurchaseOfficerDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('purchase_officer'), purchaseOfficerConfig.kpis);

  return (
    <div data-testid="purchaseofficerdashboard-container">
      <RoleDashboardShell config={{ ...purchaseOfficerConfig, kpis }} />
    </div>
  );
}
