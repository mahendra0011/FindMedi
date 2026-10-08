/** R1 — Equipment vendor dashboard (thin wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'equipment',
  title: '🦽 Equipment Rental / Sale',
  subtitle: 'Catalogue, rentals & service',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Units out on rent', value: '46' },
    { label: 'Available units', value: '112' },
    { label: "Month's earnings", value: '₹74,500' },
    { label: 'Rating', value: '4.5 ★', hint: '88 reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Sanitise 6 returned O2 concentrators' },
    { id: 't2', text: 'Follow up on 3 overdue deposits' },
  ],
  alerts: [{ id: 'a1', text: 'Wheelchair stock low (2 left)', level: 'warn' }],
  domainModules: [
    { key: 'inventory', emoji: '📦', label: 'Inventory', description: 'Rental catalogue stub — wheelchairs, beds, concentrators, deposits.', ctaLabel: 'Open inventory', ctaHref: '/dashboard/equipment?tab=bookings' },
    { key: 'service-log', emoji: '🧰', label: 'Repair & service', description: 'Service ticket stub per unit.', ctaLabel: 'View service log', ctaHref: '/dashboard/equipment?tab=support' },
  ],
};

export default function EquipmentVendorDashboard() {
  return <RoleDashboardShell config={config} />;
}
