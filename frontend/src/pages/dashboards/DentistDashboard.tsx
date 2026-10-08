/** R1 — Dentist dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'dentist',
  title: '🦷 Dentist Dashboard',
  subtitle: 'Chair, calendar & cases at a glance',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's patients", value: '12', hint: '4 RCT · 3 scaling' },
    { label: 'Chair occupancy', value: '78%' },
    { label "Week's earnings", value: '₹48,200' },
    { label: 'Rating', value: '4.8 ★', hint: '212 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Confirm tomorrow’s implant follow-ups' },
    { id: 't2', text: 'Renew AERB X-ray registration (due in 30 days)' },
    { id: 't3', text: 'Reply to 2 pending reviews' },
  ],
  alerts: [
    { id: 'a1', text: 'OPG machine service due this week', level: 'warn' },
    { id: 'a2', text: 'Sterilisation log pending for today', level: 'info' },
  ],
  domainModules: [
    { key: 'dental-chart', emoji: '🦷', label: 'Dental chart', description: 'FDI notation chart per patient — link out to the charting tool.', ctaLabel: 'Open dental chart', ctaHref: '/dashboard/dentist?tab=bookings' },
    { key: 'treatment-plans', emoji: '📝', label: 'Treatment plans', description: 'Multi-visit plan builder stub (RCT, ortho, implants).', ctaLabel: 'Build a plan', ctaHref: '/dashboard/dentist?tab=bookings' },
  ],
};

export default function DentistDashboard() {
  return <RoleDashboardShell config={config} />;
}
