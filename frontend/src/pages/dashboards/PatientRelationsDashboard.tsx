/** Wave 2 — PatientRelationsDashboard: live NPS + open complaint count. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'patient_relations',
  title: 'Patient Relations Dashboard',
  subtitle: 'NPS, complaint SLA and follow-up pipeline',
  permissions: ['feedback:read', 'crm:read', 'reports:read'],
  kpis: [
    { label: 'NPS Score', value: '—', hint: 'Net promoter score' },
    { label: 'Total Feedback', value: '—', hint: 'All-time responses' },
    { label: 'Detractors', value: '—', hint: 'Score 0–6' },
    { label: 'Promoters', value: '—', hint: 'Score 9–10' },
  ],
  tasks: [
    { id: 't1', text: 'Call back detractor feedback within 24-hour SLA' },
    { id: 't2', text: 'Close open complaints escalated from the front desk' },
    { id: 't3', text: 'Send discharge follow-up survey for yesterday discharges' },
  ],
  alerts: [
    { id: 'a1', text: 'NPS dropped below target this month — review detractor themes', level: 'warn' },
    { id: 'a2', text: '3 complaints approaching escalation SLA', level: 'urgent' },
  ],
  domainModules: [
    { key: 'feedback', emoji: '💬', label: 'Feedback & NPS', description: 'Patient satisfaction surveys, NPS trends and verbatim themes.', ctaLabel: 'Open Feedback', ctaHref: '/hospital/feedback' },
    { key: 'crm', emoji: '🤝', label: 'CRM Follow-ups', description: 'Post-discharge calls, review requests and lost-patient recovery.', ctaLabel: 'Open CRM', ctaHref: '/hospital/crm' },
    { key: 'helpdesk', emoji: '🎧', label: 'Complaint Desk', description: 'Complaint tickets with SLA timers and escalation chains.', ctaLabel: 'Open Helpdesk', ctaHref: '/hospital/helpdesk' },
  ],
};

async function fetchLive() {
  const s = await api.get('/feedback/summary').catch(() => null);
  if (!s) return {};
  return {
    npsScore: s.nps ?? '—',
    totalFeedback: s.total ?? 0,
    detractors: s.detractors ?? 0,
    promoters: s.promoters ?? 0,
  };
}

export default function PatientRelationsDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
