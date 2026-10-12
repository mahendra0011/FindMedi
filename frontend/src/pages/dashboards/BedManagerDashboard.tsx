/** Wave 2 — BedManagerDashboard: live occupancy from /beds/stats. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'bed_manager',
  title: 'Bed Manager Dashboard',
  subtitle: 'Live occupancy, cleaning SLA & blocked beds across the hospital',
  permissions: ['beds:read', 'beds:manage', 'housekeeping:read', 'reports:read'],
  kpis: [
    { label: 'Total Beds', value: '—', hint: 'All categories' },
    { label: 'Occupied', value: '—', hint: 'Currently in use' },
    { label: 'Available', value: '—', hint: 'Ready for admission' },
    { label: 'Under Cleaning', value: '—', hint: 'Housekeeping SLA' },
  ],
  tasks: [
    { id: 't1', text: 'Review beds blocked for maintenance and release when fixed' },
    { id: 't2', text: 'Chase housekeeping on beds over the 45-minute turnaround SLA' },
    { id: 't3', text: 'Confirm isolation beds are kept free for infectious admissions' },
  ],
  alerts: [
    { id: 'a1', text: 'Occupancy above 85% — consider opening surge beds', level: 'warn' },
    { id: 'a2', text: 'Reserved beds expiring today need confirmation', level: 'info' },
  ],
  domainModules: [
    { key: 'bed-board', emoji: '🛏️', label: 'Bed Board', description: 'Real-time floor-wise bed status with cleaning and maintenance states.', ctaLabel: 'Open Bed Board', ctaHref: '/hospital/beds' },
    { key: 'housekeeping', emoji: '🧹', label: 'Cleaning Queue', description: 'Auto-triggered cleaning tasks for vacated beds with SLA timers.', ctaLabel: 'Open Housekeeping', ctaHref: '/housekeeping' },
    { key: 'admissions', emoji: '🏥', label: 'Admission Requests', description: 'Pending ward transfers and new admission bed assignments.', ctaLabel: 'Open IPD', ctaHref: '/ipd' },
  ],
};

async function fetchLive() {
  const s = await api.get('/beds/stats').catch(() => null);
  if (!s) return {};
  const pct = s.total ? `${Math.round((s.occupied / s.total) * 100)}%` : '0%';
  return {
    totalBeds: s.total ?? 0,
    occupied: `${s.occupied ?? 0} (${pct})`,
    available: s.available ?? 0,
    underCleaning: s.maintenance ?? 0,
  };
}

export default function BedManagerDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
