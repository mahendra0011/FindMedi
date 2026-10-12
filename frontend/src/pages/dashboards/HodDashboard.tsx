/** Wave 2 — HodDashboard (Department Head) thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'hod',
  title: '🩺 Department Head (HOD) Dashboard',
  subtitle: 'Clinical outcomes, faculty roster & pending approvals at a glance',
  permissions: ['records:read', 'staff:manage', 'appointments:read', 'reports:read', 'approvals:manage'],
  kpis: [
    { label: 'Active Faculty', value: '18', hint: '14 on duty · 4 on call' },
    { label: 'OPD Patients Today', value: '142', hint: 'TAT 24 min avg' },
    { label: 'Pending Approvals', value: '6', hint: '3 clinical leaves · 3 OT slots' },
    { label: 'Clinical Quality', value: '98.2%', hint: 'Zero critical incidents' },
  ],
  tasks: [
    { id: 't1', text: 'Sign off on monthly morbidity & mortality review' },
    { id: 't2', text: 'Approve Junior Resident shift handover roster for next week' },
    { id: 't3', text: 'Review high-value implant purchase requisition' },
  ],
  alerts: [
    { id: 'a1', text: '2 ICU step-down transfer requests pending HOD counter-sign', level: 'warn' },
    { id: 'a2', text: 'Departmental clinical audit scheduled for Thursday', level: 'info' },
  ],
  domainModules: [
    { key: 'dept-approvals', emoji: '📋', label: 'Pending Approvals', description: 'Departmental clinical protocols, leaves, and inventory sign-offs.', ctaLabel: 'Open Approvals', ctaHref: '/hospital/approvals' },
    { key: 'dept-roster', emoji: '📅', label: 'Faculty Roster', description: 'Review on-call duties, shift schedules and emergency coverage.', ctaLabel: 'View Roster', ctaHref: '/hr/roster' },
    { key: 'clinical-reports', emoji: '📊', label: 'Department Analytics', description: 'Morbidity, mortality, average length of stay and bed turnover rate.', ctaLabel: 'Open Reports', ctaHref: '/hospital/reports' },
  ],
};

export default function HodDashboard() {
  return <RoleDashboardShell config={config} />;
}
