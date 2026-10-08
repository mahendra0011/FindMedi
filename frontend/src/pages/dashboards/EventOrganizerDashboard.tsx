/** R1 — Event / camp organizer dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'events',
  title: '⛺ Event Organizer Dashboard',
  subtitle: 'Camps, screenings & partners',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Upcoming camps', value: '4' },
    { label: 'Registrations', value: '860' },
    { label: 'Partner facilities', value: '6' },
    { label: 'Rating', value: '4.7 ★', hint: '54 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Upload partner LOA for Sunday eye camp' },
    { id: 't2', text: 'Confirm phlebo team for blood-donation drive' },
  ],
  alerts: [{ id: 'a1', text: 'Event insurance renews in 15 days', level: 'warn' }],
  domainModules: [
    { key: 'camp-planner', emoji: '⛺', label: 'Camp planner', description: 'Screening camp stub — venue, partners, volunteer slots.', ctaLabel: 'Plan a camp', ctaHref: '/dashboard/events?tab=calendar' },
    { key: 'partner-loas', emoji: '🤝', label: 'Partner LOAs', description: 'Facility authorisation letter tracker stub.', ctaLabel: 'View LOAs', ctaHref: '/dashboard/events?tab=docs' },
  ],
};

export default function EventOrganizerDashboard() {
  return <RoleDashboardShell config={config} />;
}
