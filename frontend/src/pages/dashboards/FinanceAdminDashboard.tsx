/** R1 — Platform Finance & Payouts Administrator dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'finance-admin',
  title: '💳 Platform Finance, TDS & Payouts Dashboard',
  subtitle: 'Doctor settlements, marketplace commissions, dual-approval & tax compliance',
  permissions: ['profile:view', 'earnings:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's Payout Batch", value: '₹18,42,000', hint: '142 Doctors & Facilities' },
    { label: 'Platform Take-Rate (MTD)', value: '₹4,12,500', hint: 'Net Commission' },
    { label: 'TDS Deducted (Sec 194-O)', value: '₹18,420', hint: 'Quarterly Form 26AS' },
    { label: 'High-Value Holds', value: '2 Pending', hint: 'Dual-approval required' },
  ],
  tasks: [
    { id: 't1', text: 'Execute NEFT/RTGS batch transfer for verified doctor payout cycle' },
    { id: 't2', text: 'Dual-approve hospital payout > ₹1,00,000 for Fortis OPD batch' },
    { id: 't3', text: 'Reconcile gateway settlement ledger vs bank deposit for past 48 hours' },
  ],
  alerts: [
    { id: 'a1', text: 'Penny-drop bank verification failed for new clinic account: Payout on hold', level: 'warn' },
    { id: 'a2', text: 'Monthly GST return (GSTR-1 & GSTR-8 TCS) filing due in 5 days', level: 'info' },
  ],
  domainModules: [
    { key: 'payout-runs', emoji: '💸', label: 'Automated Payout Engine', description: 'Batch payouts via RazorpayX / Banking API with bank account penny-drop confirmation.', ctaLabel: 'Run Payout Batch', ctaHref: '/dashboard/finance-admin?tab=earnings' },
    { key: 'dual-approval-desk', emoji: '🔐', label: 'Dual-Approval Authorization Desk', description: 'Mandatory two-person cryptographic sign-off for settlements above ₹50,000 threshold.', ctaLabel: 'Approvals Queue', ctaHref: '/dashboard/finance-admin?tab=support' },
    { key: 'tax-tds-gst', emoji: '📊', label: 'Taxation, TDS & GST Invoicing', description: 'Download Section 194-O TDS summaries, Form 16A certificates and B2B GST invoices.', ctaLabel: 'Tax Ledgers', ctaHref: '/dashboard/finance-admin?tab=docs' },
    { key: 'gateway-reconciliation', emoji: '📑', label: 'Bank & Gateway Reconciliation', description: 'Automated 3-way match between payment gateway capture, platform escrow and ledger.', ctaLabel: 'Reconciliation', ctaHref: '/dashboard/finance-admin?tab=profile' },
  ],
};

export default function FinanceAdminDashboard() {
  return <RoleDashboardShell config={config} />;
}
