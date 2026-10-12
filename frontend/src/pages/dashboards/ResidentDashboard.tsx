/** Wave 2 — ResidentDashboard: live duty rota + pending clinical tasks. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'resident_doctor',
  title: 'Resident / Duty Doctor Dashboard',
  subtitle: 'Duty rota, pending rounds and cases at a glance',
  permissions: ['records:read', 'appointments:read', 'roster:read', 'tasks:read'],
  kpis: [
    { label: 'Duty This Week', value: '—', hint: 'Shifts assigned' },
    { label: 'Pending Rounds', value: '—', hint: 'IPD patients to review' },
    { label: 'Open Tasks', value: '—', hint: 'Assigned to me' },
    { label: 'Today OPD Slots', value: '—', hint: 'Booked consults' },
  ],
  tasks: [
    { id: 't1', text: 'Complete morning IPD rounds and document progress notes' },
    { id: 't2', text: 'Hand over critical patients to evening duty doctor' },
    { id: 't3', text: 'Sign off pending lab/rad reports needing review' },
  ],
  alerts: [
    { id: 'a1', text: 'Night duty tomorrow — confirm handover notes are updated', level: 'warn' },
    { id: 'a2', text: '2 critical lab values awaiting your acknowledgement', level: 'urgent' },
  ],
  domainModules: [
    { key: 'rounds', emoji: '🏥', label: 'IPD Rounds', description: 'Ward-wise patient list with vitals, charts and progress notes.', ctaLabel: 'Open IPD', ctaHref: '/ipd' },
    { key: 'opd-consult', emoji: '🩺', label: 'OPD Consult', description: 'Today OPD schedule with token queue and e-prescription.', ctaLabel: 'Open Consultation', ctaHref: '/doctor/consultation' },
    { key: 'roster', emoji: '📅', label: 'My Rota', description: 'Duty schedule, shift swaps and on-call coverage.', ctaLabel: 'View Roster', ctaHref: '/hr/roster' },
  ],
};

async function fetchLive() {
  const [shifts, tasks, appts] = await Promise.all([
    api.get('/staff/shifts').catch(() => null),
    api.get('/workflows/inbox').catch(() => null),
    api.get('/appointments').catch(() => null),
  ]);
  const shiftList = Array.isArray(shifts) ? shifts : (shifts?.data ?? shifts?.shifts ?? []);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = shiftList.filter((s: any) => {
    const raw = s?.date ?? s?.shiftDate ?? s?.startTime;
    if (!raw) return false;
    const d = new Date(raw);
    return !Number.isNaN(d.getTime()) && d >= weekStart && d < weekEnd;
  }).length;
  const taskList = Array.isArray(tasks) ? tasks : (tasks?.data ?? tasks?.tasks ?? []);
  const apptList = Array.isArray(appts) ? appts : (appts?.data ?? []);
  const todaySlots = apptList.filter((a: any) => {
    const raw = a?.date ?? a?.scheduledAt;
    if (!raw) return false;
    const d = new Date(raw);
    return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }).length;
  return {
    dutyThisWeek: thisWeek,
    pendingRounds: '—',
    openTasks: taskList.length,
    todayOPDSlots: todaySlots,
  };
}

export default function ResidentDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
