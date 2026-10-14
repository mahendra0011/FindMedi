/** R1 — Wellness & Spa Centre dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'wellness',
  title: '🌿 Wellness & Holistic Centre Dashboard',
  subtitle: 'Therapies, massage rooms, therapist roster & hygiene protocols',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's Bookings", value: '16', hint: '6 Abhyanga · 5 Deep Tissue' },
    { label: 'Therapy Room Utilisation', value: '84%', hint: '5/6 Rooms booked' },
    { label: "Week's Revenue", value: '₹62,400' },
    { label: 'Client Rating', value: '4.9 ★', hint: '148 verified reviews' },
  ],
  tasks: [
    { id: 't1', text: 'Restock Ayurvedic essential herbal oils (Mahanarayan, Kshirabala)' },
    { id: 't2', text: 'Confirm couple therapy package appointment for 4:00 PM' },
    { id: 't3', text: 'Inspect evening steam room autoclave & hygiene sanitisation log' },
  ],
  alerts: [
    { id: 'a1', text: 'Room 2 sanitisation cycle required before next 3:00 PM slot', level: 'warn' },
    { id: 'a2', text: '1 client requested female therapist preference re-confirmation', level: 'info' },
  ],
  domainModules: [
    { key: 'therapy-menu', emoji: '🧘', label: 'Therapy Catalogue & Pricing', description: 'Configure Ayurvedic Panchakarma, Naturopathy, Swedish & Deep Tissue sessions.', ctaLabel: 'Edit Menu', ctaHref: '/dashboard/wellness?tab=bookings' },
    { key: 'therapist-roster', emoji: '👥', label: 'Therapist Shift Roster', description: 'Schedule certified massage therapists, manage gender preferences & commission.', ctaLabel: 'Roster & Shifts', ctaHref: '/dashboard/wellness?tab=staff' },
    { key: 'wellness-packages', emoji: '🎁', label: 'Retreats & Session Packs', description: 'Manage 5-session detox passes, sound bath workshops & corporate gift vouchers.', ctaLabel: 'View Packages', ctaHref: '/dashboard/wellness?tab=earnings' },
    { key: 'hygiene-audit', emoji: '🧼', label: 'Hygiene & Cleanliness Log', description: 'Document fresh linen changes, hot towel sterilisation & aromatherapy diffusers.', ctaLabel: 'Hygiene Checklist', ctaHref: '/dashboard/wellness?tab=docs' },
  ],
};

export default function WellnessDashboard() {
  return <RoleDashboardShell config={config} />;
}
