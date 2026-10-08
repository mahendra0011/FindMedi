/** R1 — Phlebotomist dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'phlebotomist',
  title: '💉 Phlebotomist Dashboard',
  subtitle: 'Collections, route & cold-chain',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Collections today', value: '18' },
    { label: 'Coverage area', value: '12 km' },
    { label: "Week's earnings", value: '₹14,200' },
    { label: 'Rating', value: '4.8 ★', hint: '141 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Plan morning collection route (18 stops)' },
    { id: 't2', text: 'Restock vacutainers & cold packs' },
  ],
  alerts: [{ id: 'a1', text: 'Cold-bag temperature log pending', level: 'warn' }],
  domainModules: [
    { key: 'route-map', emoji: '🗺️', label: 'Collection route map', description: 'Stop-ordered home-collection route stub.', ctaLabel: 'View route map', ctaHref: '/dashboard/phlebotomist?tab=calendar' },
    { key: 'sample-handover', emoji: '🧪', label: 'Sample handover', description: 'Lab drop-off checklist stub.', ctaLabel: 'Open checklist', ctaHref: '/dashboard/phlebotomist?tab=bookings' },
  ],
};

export default function PhlebotomistDashboard() {
  return <RoleDashboardShell config={config} />;
}
