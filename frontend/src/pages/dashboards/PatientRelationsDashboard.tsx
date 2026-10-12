/** Wave 2 — PatientRelationsDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'patient_relations',
  title: '🤝 Patient Experience & Relations Dashboard',
  subtitle: 'Patient satisfaction, Net Promoter Score (NPS) & grievance redressal',
  permissions: ['support:read', 'support:write', 'reviews:read', 'patients:read', 'reports:read'],
  kpis: [
    { label: 'Overall NPS', value: '+68', hint: 'Promoters 76% · Detractors 8%' },
    { label: 'Open Grievances', value: '3', hint: 'All assigned within 15 min' },
    { label: 'Avg Resolution Time', value: '2.4 hrs', hint: 'Target < 4 hrs' },
    { label: 'Feedback Forms Done', value: '184', hint: '92% discharge feedback rate' },
  ],
  tasks: [
    { id: 't1', text: 'Call relative regarding billing clarity on Room 304 discharge' },
    { id: 't2', text: 'Close food quality ticket escalated from Ward 4C' },
    { id: 't3', text: 'Review weekly patient feedback summary for executive committee' },
  ],
  alerts: [
    { id: 'a1', text: '1 high-priority grievance pending patient contact: Ward 2B delay', level: 'warn' },
    { id: 'a2', text: 'Outpatient satisfaction score improved +4.2 points this month', level: 'info' },
  ],
  domainModules: [
    { key: 'feedback-nps', emoji: '⭐', label: 'Feedback & NPS Hub', description: 'Analyze department-wise rating breakdowns, promoter ratios and open comments.', ctaLabel: 'NPS Dashboard', ctaHref: '/hospital/feedback' },
    { key: 'helpdesk', emoji: '🎧', label: 'Call Console & Support', description: 'Manage incoming patient inquiries, requests and emergency callbacks.', ctaLabel: 'Call Console', ctaHref: '/hospital/calls' },
    { key: 'reviews', emoji: '💬', label: 'Doctor & Hospital Reviews', description: 'Public and verified patient reviews with moderation and reply capabilities.', ctaLabel: 'Review Manager', ctaHref: '/admin/reviews' },
  ],
};

export default function PatientRelationsDashboard() {
  return <RoleDashboardShell config={config} />;
}
