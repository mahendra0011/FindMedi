/** R1 — Dietitian dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'dietitian',
  title: '🥗 Dietitian Dashboard',
  subtitle: 'Plans, follow-ups & transformations',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active plans', value: '34' },
    { label: 'Follow-ups today', value: '8' },
    { label: "Month's earnings", value: '₹62,000' },
    { label: 'Rating', value: '4.9 ★', hint: '180 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Send week-4 meal plans to 6 clients' },
    { id: 't2', text: 'Review 3 weight-plateau cases' },
  ],
  alerts: [{ id: 'a1', text: '2 diabetic clients missed log-ins', level: 'warn' }],
  domainModules: [
    { key: 'diet-plan-builder', emoji: '🥗', label: 'Diet plan builder', description: 'Drag-and-drop meal plan stub — calories, macros, regional thalis.', ctaLabel: 'Open plan builder', ctaHref: '/dashboard/dietitian?tab=bookings' },
    { key: 'body-metrics', emoji: '📊', label: 'Client metrics', description: 'Weight / HbA1c trend stub per client.', ctaLabel: 'View trends', ctaHref: '/dashboard/dietitian?tab=bookings' },
  ],
};

export default function DietitianDashboard() {
  return <RoleDashboardShell config={config} />;
}
