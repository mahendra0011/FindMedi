/**
 * Cashier Desk Dashboard with unpaid invoices queue and shift closing till ledger
 * Connected to live backend APIs, master HMS specification and interactive work queues.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';

const masterSpec = getHmsDashboardSpec('cashier') || getHmsDashboardSpec('hospital_admin')!;

export const cashierConfig: RoleDashboardConfig = {
  ...masterSpec,
};

export default function CashierDashboard() {
  const kpis = useLiveKpis(() => fetchRoleLiveKpis('cashier'), cashierConfig.kpis);

  return (
    <div data-testid="cashierdashboard-container">
      <RoleDashboardShell config={{ ...cashierConfig, kpis }} />
    </div>
  );
}
