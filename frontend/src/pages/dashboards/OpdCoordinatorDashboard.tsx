/** Wave 2 — OpdCoordinatorDashboard: live queue depth + no-show rate. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'opd_coordinator',
  title: 'OPD Coordinator Dashboard',
  subtitle: 'Queue depth, TAT and no-shows across OPD clinics',
  permissions: ['appointments:read', 'queues:read', 'reports:read'],
  kpis: [
    { label: 'In Queue Now', value: '—', hint: 'Waiting tokens' },
    { label: "Today's Appointments", value: '—', hint: 'Booked + walk-in' },
    { label: 'No-Show Rate', value: '—', hint: 'Missed vs booked' },
    { label: 'Avg TAT (min)', value: '—', hint: 'Registration to consult' },
  ],
  tasks: [
    { id: 't1', text: 'Call-back patients with no-show slots for same-day rescheduling' },
    { id: 't2', text: 'Rebalance doctor queues when wait time exceeds 30 minutes' },
    { id: 't3', text: 'Confirm tomorrow OPD speciality roster with nursing' },
  ],
  alerts: [
    { id: 'a1', text: 'Cardiology queue depth above threshold — open overflow desk', level: 'warn' },
    { id: 'a2', text: 'General OPD token printer offline at Desk 2', level: 'urgent' },
  ],
  domainModules: [
    { key: 'queues', emoji: '🧵', label: 'Live Queues', description: 'Token boards per department with aging and movement feeds.', ctaLabel: 'Open Queue Display', ctaHref: '/queues' },
    { key: 'appointments', emoji: '📅', label: 'Appointment Book', description: 'Slot inventory, doctor calendars and walk-in registration.', ctaLabel: 'Open Appointments', ctaHref: '/appointments' },
    { key: 'frontdesk', emoji: '🏥', label: 'Front Desk', description: 'Patient check-in, UHID lookup and token printing.', ctaLabel: 'Open Front Desk', ctaHref: '/frontdesk' },
  ],
};

async function fetchLive() {
  const [queues, appts] = await Promise.all([
    api.get('/queues').catch(() => null),
    api.get('/appointments').catch(() => null),
  ]);
  const queueList = Array.isArray(queues) ? queues : (queues?.queues ?? queues?.data ?? []);
  const waiting = queueList.reduce((sum: number, q: any) => sum + (q?.waiting ?? q?.queueLength ?? 0), 0);
  const apptList = Array.isArray(appts) ? appts : (appts?.data ?? []);
  const todayList = apptList.filter((a: any) => {
    const raw = a?.date ?? a?.scheduledAt;
    if (!raw) return false;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? false : d.toDateString() === new Date().toDateString();
  });
  const noShows = todayList.filter((a: any) => a?.status === 'No Show' || a?.status === 'Missed').length;
  const noShowPct = todayList.length ? `${Math.round((noShows / todayList.length) * 100)}%` : '0%';
  return {
    inQueueNow: waiting,
    todayAppointments: todayList.length,
    noShowRate: noShowPct,
    avgTATMin: todayList.length ? `${Math.round(todayList.reduce((s: number, a: any) => s + (a?.tatMinutes ?? a?.waitMinutes ?? 0), 0) / todayList.length)}` : '—',
  };
}

export default function OpdCoordinatorDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
