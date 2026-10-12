/** Wave 2 — CorporateBillingDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'corporate_billing',
  title: '💳 Corporate & TPA Billing Dashboard',
  subtitle: 'Credit receivables, rate contracts, e-Invoicing & reconciliation',
  permissions: ['billing:read', 'billing:write', 'insurance:read', 'reports:read', 'commission:read'],
  kpis: [
    { label: 'Credit Outstanding', value: '₹42.8 L', hint: 'Across 14 active TPAs' },
    { label: 'Claims Submitted Today', value: '28', hint: '₹14.2 L claim value' },
    { label: 'Reconciliation Cleared', value: '94.6%', hint: 'Bank-settled this week' },
    { label: 'IRN Generated', value: '100%', hint: 'Zero e-Invoice rejections' },
  ],
  tasks: [
    { id: 't1', text: 'Dispatch batch invoices with IRN QR codes for CGHS panel' },
    { id: 't2', text: 'Reconcile deduction short-payment on Medi Assist settlement #912' },
    { id: 't3', text: 'Renew PSU rate contract agreement for NTPC before month end' },
  ],
  alerts: [
    { id: 'a1', text: '₹3.4 L claim payment overdue beyond 45 days (Vidal Health)', level: 'warn' },
    { id: 'a2', text: 'All e-Invoices uploaded successfully to GST sandbox', level: 'info' },
  ],
  domainModules: [
    { key: 'rcm-billing', emoji: '📈', label: 'Revenue Cycle (RCM)', description: 'Denial management, unbilled charges, claim status and cash collections.', ctaLabel: 'RCM Studio', ctaHref: '/hospital/rcm' },
    { key: 'recon-workbench', emoji: '⚖️', label: 'Reconciliation Workbench', description: 'Match bank receipts, TPA settlement sheets and patient ledger lines.', ctaLabel: 'Recon Workbench', ctaHref: '/hospital/recon' },
    { key: 'package-billing', emoji: '🏷️', label: 'Tariff & Package Billing', description: 'Configure corporate tariff slabs, surgical bundles and co-pay rules.', ctaLabel: 'Package Engine', ctaHref: '/hospital/package-billing' },
  ],
};

export default function CorporateBillingDashboard() {
  return <RoleDashboardShell config={config} />;
}
