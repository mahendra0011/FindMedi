/** Wave 2 — BedManagerDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'bed_manager',
  title: '🛏️ Bed Management Command Center',
  subtitle: 'Live occupancy map, housekeeping turnaround SLA & blocked beds',
  permissions: ['beds:manage', 'beds:read', 'staff:view', 'reports:read'],
  kpis: [
    { label: 'Total Census', value: '186 / 220', hint: '84.5% Hospital Occupancy' },
    { label: 'Ready for Admission', value: '14', hint: 'Sanitized & inspected' },
    { label: 'Cleaning In-Progress', value: '8', hint: 'Avg TAT 32 minutes' },
    { label: 'Discharges Planned', value: '18', hint: 'Expected clearance by 15:00' },
  ],
  tasks: [
    { id: 't1', text: 'Expedite terminal cleaning of ICU Bed 08 (Isolation)' },
    { id: 't2', text: 'Re-assign male medical ward overflow to Wing D' },
    { id: 't3', text: 'Verify release of maintenance hold on Room 214' },
  ],
  alerts: [
    { id: 'a1', text: 'ICU occupancy reached 92% capacity threshold', level: 'warn' },
    { id: 'a2', text: 'Housekeeping turnaround SLA delay on Floor 3 (>45 min)', level: 'warn' },
  ],
  domainModules: [
    { key: 'live-bed-board', emoji: '🛏️', label: 'Live Bed Board', description: 'Interactive ward-by-ward grid with real-time status and patient cards.', ctaLabel: 'Open Bed Board', ctaHref: '/hospital/beds' },
    { key: 'housekeeping', emoji: '🧹', label: 'Housekeeping Dispatch', description: 'Monitor cleaning orders, disinfection rounds and turnover times.', ctaLabel: 'Housekeeping Desk', ctaHref: '/housekeeping' },
    { key: 'linen-tracker', emoji: '🧺', label: 'Linen & Laundry', description: 'Fresh linen inventory by ward, laundry cycles and par-levels.', ctaLabel: 'Linen Tracker', ctaHref: '/hospital/linen' },
  ],
};

export default function BedManagerDashboard() {
  return <RoleDashboardShell config={config} />;
}
