/** R1 — Home Nursing & Agency dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'home-nursing',
  title: '🩺 Home Nursing & Care Agency Dashboard',
  subtitle: 'Nurse pool roster, home care plans, 12h/24h shifts & safety SOS',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Care Plans', value: '28', hint: '11 ICU-at-home · 17 Elderly' },
    { label: 'Nurses on Shift Now', value: '19', hint: '100% Geo Check-in OK' },
    { label: "Today's Shift Requests", value: '6', hint: '3 Quotes pending review' },
    { label: 'Safety Incidents', value: '0', hint: 'Zero panic alerts today' },
  ],
  tasks: [
    { id: 't1', text: 'Assign night ICU nurse for post-CABG home patient in Dwarka' },
    { id: 't2', text: 'Verify State Nursing Council license renewal for Nurse Priya' },
    { id: 't3', text: 'Confirm monthly sterile consumable delivery (IV sets, catheters)' },
  ],
  alerts: [
    { id: 'a1', text: 'Nurse attendance alert: Geofence mismatch on Shift #482', level: 'warn' },
    { id: 'a2', text: 'BLS/CPR certificate expiring for 2 staff nurses in 14 days', level: 'info' },
  ],
  domainModules: [
    { key: 'nurse-roster', emoji: '👥', label: 'Nurse Pool & Shift Roster', description: 'Assign 4h/12h/24h shifts, track live GPS check-in/out, and handle replacements.', ctaLabel: 'Manage Roster', ctaHref: '/dashboard/home-nursing?tab=staff' },
    { key: 'care-plans', emoji: '📋', label: 'Patient Care Plans', description: 'Monitor daily bedside vitals, tracheostomy logs, Ryle’s tube feeds & wound dressings.', ctaLabel: 'View Care Plans', ctaHref: '/dashboard/home-nursing?tab=bookings' },
    { key: 'shift-billing', emoji: '💳', label: 'Shift Billing & Quotes', description: 'Calculate daily/weekly caregiver rates, consumable additions & GST invoices.', ctaLabel: 'Invoices & Quotes', ctaHref: '/dashboard/home-nursing?tab=earnings' },
    { key: 'safety-escalation', emoji: '🚨', label: 'Caregiver SOS & Escalation', description: '24x7 safety monitoring with patient family phone escalation and instant doctor connect.', ctaLabel: 'Safety Console', ctaHref: '/dashboard/home-nursing?tab=support' },
  ],
};

export default function HomeNursingDashboard() {
  return <RoleDashboardShell config={config} />;
}
