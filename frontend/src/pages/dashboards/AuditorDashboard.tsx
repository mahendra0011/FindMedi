/** Wave 2 — AuditorDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'auditor',
  title: '🔍 Clinical & Compliance Auditor Dashboard',
  subtitle: 'Audit trails, tamper detection, break-glass reviews & statutory checks',
  permissions: ['audit:read', 'reports:read', 'records:read'],
  kpis: [
    { label: 'Audit Trail Events', value: '48,210', hint: 'Immutable hashed log stream' },
    { label: 'Break-Glass Grants', value: '4', hint: '2 approved · 2 under review' },
    { label: 'Security Discrepancies', value: '0', hint: 'All checksums verified' },
    { label: 'Prescription Audits', value: '100%', hint: 'Zero unverified schedule H1' },
  ],
  tasks: [
    { id: 't1', text: 'Validate cryptographic signatures on today’s death certificates' },
    { id: 't2', text: 'Cross-examine emergency break-glass event #BG-2026-881' },
    { id: 't3', text: 'Generate NABH chapter-wise compliance summary report' },
  ],
  alerts: [
    { id: 'a1', text: 'Break-glass record access performed in ICU at 02:14 AM (Emergency)', level: 'warn' },
    { id: 'a2', text: 'Quarterly statutory ledger export generated and archived', level: 'info' },
  ],
  domainModules: [
    { key: 'audit-logs', emoji: '📜', label: 'System Audit Logs', description: 'Searchable, filterable audit records of all patient, user and billing actions.', ctaLabel: 'View Audit Logs', ctaHref: '/audit-logs' },
    { key: 'safety-desk', emoji: '🛡️', label: 'Clinical Safety & Incidents', description: 'Adverse event reporting, sentinel incident analysis and root cause trees.', ctaLabel: 'Safety Desk', ctaHref: '/hospital/safety' },
    { key: 'reports-studio', emoji: '📑', label: 'Statutory Reports Studio', description: 'Export regulatory PDFs, accreditation compliance metrics and registries.', ctaLabel: 'Report Studio', ctaHref: '/hospital/reports' },
  ],
};

export default function AuditorDashboard() {
  return <RoleDashboardShell config={config} />;
}
