/** R1 — Physiotherapist dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'physio',
  title: '🏃 Physio Dashboard',
  subtitle: 'Sessions, home visits & recovery',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Sessions today', value: '9', hint: '4 home visits' },
    { label: 'Home-visit radius', value: '8 km' },
    { label: "Week's earnings", value: '₹31,500' },
    { label: 'Rating', value: '4.7 ★', hint: '96 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Plan route for 4 home visits (Sector 62 → 137)' },
    { id: 't2', text: 'Update post-op knee rehab protocol' },
  ],
  alerts: [{ id: 'a1', text: 'TENS machine battery low', level: 'warn' }],
  domainModules: [
    { key: 'route-map', emoji: '🗺️', label: 'Home-visit route map', description: 'Optimised visit order stub — saves fuel & time.', ctaLabel: 'View route map', ctaHref: '/dashboard/physio?tab=calendar' },
    { key: 'exercise-library', emoji: '🤸', label: 'Exercise library', description: 'Prescribe video exercise sets stub.', ctaLabel: 'Browse exercises', ctaHref: '/dashboard/physio?tab=bookings' },
  ],
};

export default function PhysioDashboard() {
  return <RoleDashboardShell config={config} />;
}
