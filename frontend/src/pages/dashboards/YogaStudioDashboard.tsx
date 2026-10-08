/** R1 — Yoga studio dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'yoga',
  title: '🧘 Yoga Studio Dashboard',
  subtitle: 'Batches, members & retreats',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active members', value: '120' },
    { label: 'Batches today', value: '5' },
    { label: "Month's earnings", value: '₹84,000' },
    { label: 'Rating', value: '4.9 ★', hint: '240 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Open prenatal batch admissions (March)' },
    { id: 't2', text: 'Confirm weekend retreat venue' },
  ],
  alerts: [{ id: 'a1', text: 'Studio mats need replacement (12 pcs)', level: 'info' }],
  domainModules: [
    { key: 'batch-planner', emoji: '🗓️', label: 'Batch planner', description: 'Hatha / Ashtanga / prenatal batch grid stub.', ctaLabel: 'Plan batches', ctaHref: '/dashboard/yoga?tab=calendar' },
    { key: 'member-passes', emoji: '🎟️', label: 'Passes & memberships', description: 'Monthly / quarterly pass stub with pause support.', ctaLabel: 'Manage passes', ctaHref: '/dashboard/yoga?tab=bookings' },
  ],
};

export default function YogaStudioDashboard() {
  return <RoleDashboardShell config={config} />;
}
