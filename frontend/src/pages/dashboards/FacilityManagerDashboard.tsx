/** Wave 2 — FacilityManagerDashboard: live helpdesk SLA + license/AMC expiries. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'facility_manager',
  title: 'Facility Manager Dashboard',
  subtitle: 'Helpdesk SLA, AMC/contract expiries & biomedical work orders',
  permissions: ['support:read', 'licenses:read', 'biomedical:read', 'reports:read'],
  kpis: [
    { label: 'Open Tickets', value: '—', hint: 'Helpdesk backlog' },
    { label: 'In Progress', value: '—', hint: 'Being worked on' },
    { label: 'Licenses Expiring', value: '—', hint: 'AMC / regulatory' },
    { label: 'Urgent Tickets', value: '—', hint: 'SLA-critical' },
  ],
  tasks: [
    { id: 't1', text: 'Escalate urgent tickets breaching the 4-hour SLA' },
    { id: 't2', text: 'Initiate AMC renewal for equipment expiring this quarter' },
    { id: 't3', text: 'Review biomedical preventive-maintenance schedule for the week' },
  ],
  alerts: [
    { id: 'a1', text: 'Oxygen plant service overdue — schedule biomedical visit', level: 'urgent' },
    { id: 'a2', text: '2 AMC contracts expiring within 30 days', level: 'warn' },
  ],
  domainModules: [
    { key: 'helpdesk', emoji: '🎧', label: 'Helpdesk', description: 'Facility tickets with priority, SLA timers and technician assignment.', ctaLabel: 'Open Helpdesk', ctaHref: '/hospital/helpdesk' },
    { key: 'biomedical', emoji: '🩺', label: 'Biomedical Assets', description: 'PPM calendar, breakdown work orders and calibration records.', ctaLabel: 'Open Biomedical', ctaHref: '/hospital/enterprise' },
    { key: 'contracts', emoji: '📄', label: 'AMC / CMC', description: 'Vendor contracts with expiry alerts and auto-renewal prompts.', ctaLabel: 'Open Licenses', ctaHref: '/hospital/licenses' },
  ],
};

async function fetchLive() {
  const [stats, expiring] = await Promise.all([
    api.get('/support-tickets/stats').catch(() => null),
    api.get('/licenses/expiring').catch(() => null),
  ]);
  const expCount = Array.isArray(expiring?.licenses) ? expiring.licenses.length : 0;
  return {
    openTickets: stats?.open ?? 0,
    inProgress: stats?.inProgress ?? 0,
    licensesExpiring: expCount,
    urgentTickets: stats?.urgent ?? 0,
  };
}

export default function FacilityManagerDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
