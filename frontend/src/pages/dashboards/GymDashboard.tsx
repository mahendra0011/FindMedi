/** R1 — Gym dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'gym',
  title: '🏋️ Gym Dashboard',
  subtitle: 'Members, trainers & floor load',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active members', value: '340' },
    { label: 'Floor load now', value: 'Moderate' },
    { label: "Month's earnings", value: '₹1,90,000' },
    { label: 'Rating', value: '4.6 ★', hint: '310 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Roster evening trainers (6–9 PM peak)' },
    { id: 't2', text: 'Service treadmill #3 (belt slipping)' },
  ],
  alerts: [{ id: 'a1', text: '23 memberships expire this week', level: 'warn' }],
  domainModules: [
    { key: 'membership-plans', emoji: '💳', label: 'Membership plans', description: 'Monthly / quarterly / annual + day-pass stub.', ctaLabel: 'Edit plans', ctaHref: '/dashboard/gym?tab=bookings' },
    { key: 'trainer-roster', emoji: '🧑‍🏋️', label: 'Trainer roster', description: 'Shift & PT allocation stub.', ctaLabel: 'View roster', ctaHref: '/dashboard/gym?tab=staff' },
  ],
};

export default function GymDashboard() {
  return <RoleDashboardShell config={config} />;
}
