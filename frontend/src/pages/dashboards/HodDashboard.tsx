/** Wave 2 — HodDashboard: live faculty headcount + pending departmental approvals. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'hod',
  title: 'Department Head (HOD) Dashboard',
  subtitle: 'Clinical outcomes, faculty roster & pending approvals at a glance',
  permissions: ['records:read', 'staff:manage', 'appointments:read', 'reports:read', 'approvals:manage'],
  kpis: [
    { label: 'Active Faculty', value: '—', hint: 'Loading roster…' },
    { label: 'On Leave Today', value: '—', hint: 'From staff stats' },
    { label: 'Pending Approvals', value: '—', hint: 'Departmental requests' },
    { label: 'Departments Tracked', value: '—', hint: 'Staff by department' },
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

async function fetchLive() {
  const [staff, approvals] = await Promise.all([
    api.get('/staff/stats').catch(() => null),
    api.get('/approvals/requests?status=Pending').catch(() => null),
  ]);
  const pending = Array.isArray(approvals) ? approvals.length : (approvals?.requests?.length ?? approvals?.total ?? 0);
  const deptCount = Array.isArray(staff?.byDepartment) ? staff.byDepartment.length : 0;
  return {
    activeFaculty: staff?.total ?? 0,
    onLeaveToday: staff?.onLeave ?? 0,
    pendingApprovals: pending,
    departmentsTracked: deptCount,
  };
}

export default function HodDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
