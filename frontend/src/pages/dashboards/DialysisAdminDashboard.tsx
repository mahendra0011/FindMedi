/** R1 — Dialysis Centre Operations dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'dialysis-admin',
  title: '🧬 Dialysis Centre Operations Dashboard',
  subtitle: 'Station chairs, recurring shifts, RO water quality & infection control logs',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Hemodialysis Stations', value: '18/20', hint: '2 Isolation (HCV/HBV)' },
    { label: 'Sessions Run Today', value: '44', hint: 'Shift 1: 18 · Shift 2: 17 · Shift 3: 9' },
    { label: 'RO Water Endotoxin', value: '<0.03 EU/ml', hint: 'AAMI Standard Pass' },
    { label: 'Recurring Patients', value: '56', hint: '3x weekly schedule' },
  ],
  tasks: [
    { id: 't1', text: 'Calibrate dialyzer clearance and heparin pump on Station #7' },
    { id: 't2', text: 'Log morning RO water daily conductivity, hardness and chemical sanitisation' },
    { id: 't3', text: 'Confirm erythropoietin (EPO) and iron sucrose stock for tomorrow’s shifts' },
  ],
  alerts: [
    { id: 'a1', text: 'Station 12 dialysate temperature sensor variance detected', level: 'warn' },
    { id: 'a2', text: 'Patient Amit Kumar ultrafiltration target exceeded >3.5L — Nephrologist review requested', level: 'urgent' },
  ],
  domainModules: [
    { key: 'chair-roster', emoji: '💺', label: 'Chair & Shift Scheduler', description: 'Manage morning, afternoon, evening shifts with dedicated isolated stations.', ctaLabel: 'Schedule Shifts', ctaHref: '/dashboard/dialysis-admin?tab=calendar' },
    { key: 'session-charts', emoji: '📊', label: 'Dialysis Session Records', description: 'Log pre/post weights, vascular access status (AV fistula/catheter), BP every 30 mins.', ctaLabel: 'Patient Charts', ctaHref: '/dashboard/dialysis-admin?tab=bookings' },
    { key: 'water-ro-logs', emoji: '💧', label: 'RO Water & Endotoxin Registry', description: 'Document daily reverse osmosis logs, microbiological cultures & membrane replacement.', ctaLabel: 'Water Quality Log', ctaHref: '/dashboard/dialysis-admin?tab=docs' },
    { key: 'consumables-dialyzers', emoji: '📦', label: 'Dialyzers & Tubing Inventory', description: 'Track high-flux dialyzer reuse cycles, acid/bicarb concentrates & sterile tubing.', ctaLabel: 'Consumables Stock', ctaHref: '/dashboard/dialysis-admin?tab=earnings' },
  ],
};

export default function DialysisAdminDashboard() {
  return <RoleDashboardShell config={config} />;
}
