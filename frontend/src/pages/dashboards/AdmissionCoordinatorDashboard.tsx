/** Wave 2 — AdmissionCoordinatorDashboard: live pre-auth queue + bed availability. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'admission_coordinator',
  title: 'Admission Coordinator Dashboard',
  subtitle: 'Pre-auth queue, bed availability & TPA coordination at a glance',
  permissions: ['appointments:read', 'beds:read', 'insurance:read', 'reports:read'],
  kpis: [
    { label: 'Pending Pre-Auth', value: '—', hint: 'Insurance authorisations' },
    { label: 'Available Beds', value: '—', hint: 'Ready to admit' },
    { label: 'Today Admissions', value: '—', hint: 'Scheduled + walk-in' },
    { label: 'TPA Queries Open', value: '—', hint: 'Awaiting response' },
  ],
  tasks: [
    { id: 't1', text: 'Follow up on pre-auth requests pending > 24 hours' },
    { id: 't2', text: 'Confirm bed assignment for tomorrow elective admissions' },
    { id: 't3', text: 'Reconcile TPA query responses before discharge cut-off' },
  ],
  alerts: [
    { id: 'a1', text: 'ICU beds running low — route critical admissions to step-down', level: 'warn' },
    { id: 'a2', text: '3 pre-auth requests approaching insurer SLA breach', level: 'urgent' },
  ],
  domainModules: [
    { key: 'preauth-desk', emoji: '🧾', label: 'Pre-Auth Desk', description: 'Cashless authorisation requests with insurer status and query threads.', ctaLabel: 'Open Insurance Desk', ctaHref: '/insurance/desk' },
    { key: 'bed-assign', emoji: '🛏️', label: 'Bed Assignment', description: 'Assign available beds to pending admissions by ward and category.', ctaLabel: 'Open Bed Board', ctaHref: '/hospital/beds' },
    { key: 'frontdesk', emoji: '🏥', label: 'Front Desk', description: 'Patient registration, UHID creation and admission paperwork.', ctaLabel: 'Open Front Desk', ctaHref: '/frontdesk' },
  ],
};

async function fetchLive() {
  const [beds, appts, tpa] = await Promise.all([
    api.get('/beds/stats').catch(() => null),
    api.get('/appointments').catch(() => null),
    api.get('/tpa/preauth').catch(() => null),
  ]);
  const apptList = Array.isArray(appts) ? appts : (appts?.data ?? []);
  const today = apptList.filter((a: any) => {
    if (!a?.date && !a?.scheduledAt) return false;
    const d = new Date(a.date ?? a.scheduledAt);
    return Number.isNaN(d.getTime()) ? false : d.toDateString() === new Date().toDateString();
  }).length;
  const tpaOpen = Array.isArray(tpa) ? tpa.length : (tpa?.queries?.length ?? tpa?.open ?? 0);
  return {
    pendingPreAuth: tpaOpen,
    availableBeds: beds?.available ?? 0,
    todayAdmissions: today,
    tpaQueriesOpen: tpaOpen,
  };
}

export default function AdmissionCoordinatorDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
