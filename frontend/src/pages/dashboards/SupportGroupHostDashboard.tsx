/** R1 — Support Group & Community Host dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'support-group',
  title: '🤝 Support Group & Community Programs Dashboard',
  subtitle: 'Peer support circles, pseudonymous privacy, safe moderation & crisis escalation',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'reviews:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Support Circles', value: '6', hint: 'Anxiety, Caregivers, Grief' },
    { label: 'Registered Participants', value: '84', hint: 'Pseudonymous profiles' },
    { label: 'Weekly Attendance Rate', value: '92%' },
    { label: 'Safety Escalations', value: '0', hint: 'Tele-MANAS hotlinks active' },
  ],
  tasks: [
    { id: 't1', text: 'Prepare discussion prompts for Thursday Caregiver Burnout circle' },
    { id: 't2', text: 'Review anonymous post-session feedback from Saturday Grief group' },
    { id: 't3', text: 'Verify trained peer co-moderator attendance for evening session' },
  ],
  alerts: [
    { id: 'a1', text: 'Circle room #3 capacity reached (max 15 participants per safety guidelines)', level: 'info' },
    { id: 'a2', text: 'Quarterly peer moderator debrief and supervision scheduled for Friday', level: 'info' },
  ],
  domainModules: [
    { key: 'group-sessions', emoji: '🎙️', label: 'Circle Schedule & Audio Rooms', description: 'Schedule LiveKit powered encrypted group video/audio circles with waitlists.', ctaLabel: 'Manage Sessions', ctaHref: '/dashboard/support-group?tab=calendar' },
    { key: 'pseudonymous-privacy', emoji: '🔒', label: 'Privacy & Masked Identities', description: 'Manage participant pseudonyms ensuring zero personal phone/email leaks.', ctaLabel: 'Privacy Settings', ctaHref: '/dashboard/support-group?tab=docs' },
    { key: 'crisis-protocol', emoji: '🆘', label: 'Crisis Escalation Panel', description: '1-click emergency handoff to Tele-MANAS (14416) or licensed clinical psychologists.', ctaLabel: 'Crisis Protocol', ctaHref: '/dashboard/support-group?tab=support' },
    { key: 'group-guidelines', emoji: '📜', label: 'Safe Space Community Rules', description: 'Non-judgmental community pledges, trigger warnings & zero medical advice policy.', ctaLabel: 'View Guidelines', ctaHref: '/dashboard/support-group?tab=profile' },
  ],
};

export default function SupportGroupHostDashboard() {
  return <RoleDashboardShell config={config} />;
}
