/**
 * File 07 §3.29 — Child development & special-education centre dashboard.
 * Child profiles, guardian consent, IEP therapy plans, RCI therapist roster & progress charts.
 *
 * KPIs below are File 07 spec figures: /growth-charts and /care-plans are
 * patient-scoped reads (no centre-wide aggregate), and there is no RCI roster
 * or parent-satisfaction endpoint, so this stays static until one exists —
 * wire it with useLiveKpis like ElderCareDashboard when it does.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'child_dev_admin',
  title: '🧸 Child Development & Therapy Centre Dashboard',
  subtitle: 'Pediatric therapy plans, RCI therapist roster, Autism/ADHD IEPs & parent communication',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Therapy Children', value: '28', hint: 'Speech, OT & Behavioral' },
    { label: 'RCI Certified Therapists', value: '6', hint: '100% verified credentials' },
    { label: 'IEP Milestone Progress', value: '84%', hint: 'Quarterly goals met' },
    { label: 'Parent Satisfaction', value: '4.9 ★', hint: '112 parent reviews' },
  ],
  tasks: [
    { id: 'cd-t1', text: 'Review quarterly speech therapy IEP milestone for Master Vivaan' },
    { id: 'cd-t2', text: 'Upload sensory integration room equipment inspection report' },
    { id: 'cd-t3', text: 'Share home sensory exercise guides with parents via secure portal' },
  ],
  alerts: [
    { id: 'cd-a1', text: 'Guardian consent verification pending for 2 new developmental assessments', level: 'warn' },
    { id: 'cd-a2', text: 'Annual RCI practitioner renewal due next quarter', level: 'info' },
  ],
  domainModules: [
    {
      key: 'iep-plans',
      emoji: '📋',
      label: 'IEP & Developmental Assessments',
      description: 'Individualized Education Programs (IEP) for Autism Spectrum, ADHD, CP and learning differences.',
      ctaLabel: 'Open IEP Manager',
      ctaHref: '/dashboard/child-development?tab=bookings',
    },
    {
      key: 'session-notes',
      emoji: '🔒',
      label: 'Clinical Therapy Session Notes',
      description: 'Occupational therapy, speech-language pathology and behavioral observations stored with strict DPDP encryption.',
      ctaLabel: 'Review Session Logs',
      ctaHref: '/dashboard/child-development?tab=docs',
    },
    {
      key: 'parent-portal',
      emoji: '👨‍👩‍👦',
      label: 'Parent Progress & Home Exercises',
      description: 'Milestone tracking charts, home therapy guides, video demonstration links and direct guardian messaging.',
      ctaLabel: 'Open Parent Hub',
      ctaHref: '/dashboard/child-development?tab=support',
    },
  ],
};

export default function ChildDevDashboard() {
  return <RoleDashboardShell config={config} />;
}
