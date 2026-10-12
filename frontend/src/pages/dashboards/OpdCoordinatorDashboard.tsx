/** Wave 2 — OpdCoordinatorDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'opd_coordinator',
  title: '🎫 OPD Coordinator Dashboard',
  subtitle: 'Live queue depth, token turnaround time & clinic throughput',
  permissions: ['appointments:read', 'appointments:write', 'patients:read', 'tokens:manage'],
  kpis: [
    { label: 'Active Tokens', value: '84', hint: 'Across 12 consultation chambers' },
    { label: 'Avg Wait Time', value: '18 min', hint: 'Within 25 min SLA' },
    { label: 'Completed Today', value: '264', hint: '88% of planned' },
    { label: 'No-Show Rate', value: '4.2%', hint: '11 patients missed' },
  ],
  tasks: [
    { id: 't1', text: 'Rebalance token flow from Chamber 4 (Dr. Sharma delay)' },
    { id: 't2', text: 'Verify senior citizen fast-track token queue' },
    { id: 't3', text: 'Review afternoon walk-in registration quota' },
  ],
  alerts: [
    { id: 'a1', text: 'Chamber 2 queue aging exceeded 35 minutes', level: 'warn' },
    { id: 'a2', text: 'Token display screen in Wing B reconnected', level: 'info' },
  ],
  domainModules: [
    { key: 'opd-token', emoji: '🎟️', label: 'Token Management', description: 'Monitor live token calling, reassign chambers and manage priority passes.', ctaLabel: 'Token Console', ctaHref: '/opd-token' },
    { key: 'queue-aging', emoji: '⏳', label: 'Queue Aging Matrix', description: 'Identify bottlenecks and patients waiting past SLA thresholds.', ctaLabel: 'Aging Dashboard', ctaHref: '/hospital/queue-aging' },
    { key: 'front-desk', emoji: '🏢', label: 'Front Desk Counter', description: 'Counter registrations, triage assignments and fee collections.', ctaLabel: 'Front Desk', ctaHref: '/frontdesk' },
  ],
};

export default function OpdCoordinatorDashboard() {
  return <RoleDashboardShell config={config} />;
}
