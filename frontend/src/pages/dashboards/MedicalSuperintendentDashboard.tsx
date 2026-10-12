/** Wave 2 — MedicalSuperintendentDashboard: hospital-wide live cockpit KPIs. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'medical_director',
  title: 'Medical Superintendent Dashboard',
  subtitle: 'Hospital-wide occupancy, staffing & quality at a glance',
  permissions: ['reports:read', 'dashboard:view', 'staff:read', 'beds:read', 'quality:read'],
  kpis: [
    { label: 'Bed Occupancy', value: '—', hint: 'Occupied / total' },
    { label: 'Active Staff', value: '—', hint: 'On duty roster' },
    { label: 'Open Quality Events', value: '—', hint: 'Incidents / CAPA' },
    { label: 'Today Admissions', value: '—', hint: 'IPD admissions' },
  ],
  tasks: [
    { id: 't1', text: 'Review morning occupancy and staffing variance report' },
    { id: 't2', text: 'Sign off on open sentinel-event investigation updates' },
    { id: 't3', text: 'Approve departmental budget realignment requests' },
  ],
  alerts: [
    { id: 'a1', text: 'Occupancy above 90% in medical wards — activate surge plan', level: 'urgent' },
    { id: 'a2', text: 'Nursing shortage in ICU night shift this week', level: 'warn' },
  ],
  domainModules: [
    { key: 'cockpit', emoji: '📊', label: 'Executive Cockpit', description: 'Real-time revenue, occupancy, LOS and TAT KPIs.', ctaLabel: 'Open V2 Dashboard', ctaHref: '/dashboard/v2' },
    { key: 'quality', emoji: '🛡️', label: 'Quality & Safety', description: 'Sentinel events, CAPA workflow and NABH checklist status.', ctaLabel: 'Open Safety Desk', ctaHref: '/hospital/safety' },
    { key: 'reports', emoji: '📈', label: 'MIS Reports', description: 'Departmental performance, referral mix and financial summaries.', ctaLabel: 'Open Reports', ctaHref: '/hospital/reports' },
  ],
};

async function fetchLive() {
  const [beds, staff, quality] = await Promise.all([
    api.get('/beds/stats').catch(() => null),
    api.get('/staff/stats').catch(() => null),
    api.get('/quality/capa?status=Open').catch(() => null),
  ]);
  const occupancy = beds?.total ? `${Math.round((beds.occupied / beds.total) * 100)}%` : '—';
  const openQuality = Array.isArray(quality) ? quality.length : (quality?.total ?? quality?.events?.length ?? 0);
  return {
    bedOccupancy: occupancy,
    activeStaff: staff?.total ?? 0,
    openQualityEvents: openQuality,
    todayAdmissions: '—',
  };
}

export default function MedicalSuperintendentDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
