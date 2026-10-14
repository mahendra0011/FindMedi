/** R1 — Community Moderator & User Support dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'moderator',
  title: '🛡️ Community Moderation & User Support Dashboard',
  subtitle: 'UGC reviews queue, Q&A safety, crisis keyword alerts & dispute support',
  permissions: ['profile:view', 'bookings:manage', 'reviews:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Pending Review Flags', value: '11', hint: 'Defamation / PII checks' },
    { label: 'Q&A Posts Moderated', value: '64 Today', hint: '100% Non-medical advice' },
    { label: 'Avg Moderation SLA', value: '18 Minutes' },
    { label: 'Active Crisis Escalations', value: '0', hint: 'Tele-MANAS hotlinks active' },
  ],
  tasks: [
    { id: 't1', text: 'Review provider-reported defamatory review alleging medical negligence without proof' },
    { id: 't2', text: 'Audit community Q&A question containing sensitive phone number leakage' },
    { id: 't3', text: 'Issue official platform warning strike to user for harassment in provider chat' },
  ],
  alerts: [
    { id: 'a1', text: 'Self-harm trigger keyword automatically flagged in public Q&A — Handled with crisis banner', level: 'info' },
    { id: 'a2', text: 'Burst review anomaly detected: 8 reviews from same IP range flagged for ring check', level: 'warn' },
  ],
  domainModules: [
    { key: 'review-queue', emoji: '⭐', label: 'Patient Reviews & Photo Moderation', description: 'Screen verified-visit reviews, mask inadvertent personal contact details & clinical claims.', ctaLabel: 'Moderate Reviews', ctaHref: '/dashboard/moderator?tab=reviews' },
    { key: 'qa-moderation', emoji: '💬', label: 'Health Q&A & Support Group Posts', description: 'Enforce intermediary rules: prevent medical prescribing by laymen & remove spam.', ctaLabel: 'Q&A Queue', ctaHref: '/dashboard/moderator?tab=support' },
    { key: 'crisis-safety', emoji: '🚨', label: 'Crisis Detection & Helpline Dispatch', description: 'Monitor high-severity alerts (self-harm, domestic violence) and provide emergency numbers.', ctaLabel: 'Crisis Desk', ctaHref: '/dashboard/moderator?tab=docs' },
    { key: 'strike-ledger', emoji: '⚠️', label: 'User Warnings & Strike System', description: 'Issue 3-strike warnings, temporary 7-day shadow bans and permanent account suspensions.', ctaLabel: 'Strike Ledger', ctaHref: '/dashboard/moderator?tab=profile' },
  ],
};

export default function ModeratorDashboard() {
  return <RoleDashboardShell config={config} />;
}
