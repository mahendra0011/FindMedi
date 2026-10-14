/** R1 — Insurance & TPA Cashless Desk dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'tpa-agent',
  title: '📑 Insurance & TPA Cashless Desk Dashboard',
  subtitle: 'Cashless pre-authorization, query settlement, GIPSA tariff & claim discharges',
  permissions: ['profile:view', 'bookings:manage', 'earnings:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Pending Pre-Auth Requests', value: '14', hint: 'Avg TAT: 52 Minutes' },
    { label: 'Settled Claims (MTD)', value: '₹42,80,000', hint: '186 Inpatient Claims' },
    { label: 'Active Hospital Queries', value: '6', hint: 'Document re-submission' },
    { label: 'Network Hospital Empanelment', value: '48 Hospitals', hint: 'Tier 1/2 Cities' },
  ],
  tasks: [
    { id: 't1', text: 'Issue final cashless discharge approval letter for Max Super Specialty claim' },
    { id: 't2', text: 'Request detailed surgical implant invoice & barcoded stickers from hospital' },
    { id: 't3', text: 'Audit GIPSA Preferred Provider Network (PPN) packaged tariff compliance' },
  ],
  alerts: [
    { id: 'a1', text: 'Pre-auth claim #PA-8820 approaching IRDAI 2-hour emergency TAT threshold', level: 'urgent' },
    { id: 'a2', text: 'CGHS tariff rate revision notification effective next calendar quarter', level: 'info' },
  ],
  domainModules: [
    { key: 'preauth-workbench', emoji: '⚡', label: 'Cashless Pre-Auth Workbench', description: 'Review planned/emergency admission requests, verify policy cover & grant initial approval.', ctaLabel: 'Pre-Auth Queue', ctaHref: '/dashboard/tpa-agent?tab=bookings' },
    { key: 'query-management', emoji: '💬', label: 'Hospital Query & Deficiencies Desk', description: 'Raise itemized medical necessity queries, indoor case sheets and lab report demands.', ctaLabel: 'Query Desk', ctaHref: '/dashboard/tpa-agent?tab=support' },
    { key: 'tariff-benchmark', emoji: '📊', label: 'PPN Package Tariffs & Rates', description: 'Compare hospital billing against agreed GIPSA / private TPA package cost ceilings.', ctaLabel: 'Tariff Matrix', ctaHref: '/dashboard/tpa-agent?tab=docs' },
    { key: 'discharge-settlement', emoji: '💵', label: 'Final Discharge & Deductions', description: 'Verify non-medical item deductions, co-pay clauses and issue final cashless claim voucher.', ctaLabel: 'Discharge Approvals', ctaHref: '/dashboard/tpa-agent?tab=earnings' },
  ],
};

export default function TpaAgentDashboard() {
  return <RoleDashboardShell config={config} />;
}
