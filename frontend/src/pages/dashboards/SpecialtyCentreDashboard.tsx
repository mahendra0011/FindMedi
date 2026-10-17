/**
 * File 07 §3.30 — Single-specialty & daycare medical centre dashboard.
 * Cancer, cardiac, ortho-spine, sleep, pain daycare suites, procedure catalogues & referral inbox.
 *
 * KPIs below are File 07 spec figures: there is no procedures route (the
 * /procedures mount does not exist), /referral/stats is the patient referral
 * programme rather than a centre inbox, and /beds/stats has no stay-turnover
 * measure — so this stays static until a real aggregate lands. Wire it with
 * useLiveKpis like ElderCareDashboard when one does.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'specialty_centre_admin',
  title: '🏥 Specialty Daycare Centre Dashboard',
  subtitle: 'Cancer, cardiac, spine & daycare suites, specialized procedure catalogues & referral inbox',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Daycare Procedures Today', value: '16', hint: 'Chemo, Endoscopy & Spine' },
    { label: 'Specialist Consultants', value: '12', hint: 'On-duty faculty & visiting' },
    { label: 'Referral Inbox', value: '7', hint: 'Second-opinion requests' },
    { label: 'Daycare Bed Turnover', value: '2.4x', hint: 'Average stay: 4.5 hours' },
  ],
  tasks: [
    { id: 'sc-t1', text: 'Sign off on afternoon chemotherapy infusion protocols' },
    { id: 'sc-t2', text: 'Respond to 3 incoming second-opinion case reviews from primary care' },
    { id: 'sc-t3', text: 'Review endoscopic equipment sanitisation and bio-burden clearance log' },
  ],
  alerts: [
    { id: 'sc-a1', text: 'Linear accelerator / C-Arm preventive maintenance scheduled for Saturday', level: 'info' },
    { id: 'sc-a2', text: '2 cashless TPA pre-authorization requests awaiting discharge summary', level: 'warn' },
  ],
  domainModules: [
    {
      key: 'procedure-catalogue',
      emoji: '🩺',
      label: 'Specialty Procedures & Packages',
      description: 'Chemotherapy regimens, minimally invasive daycare procedures, cardiac rehab packages and TPA cashless rates.',
      ctaLabel: 'Manage Procedures',
      ctaHref: '/dashboard/specialty-centre?tab=docs',
    },
    {
      key: 'referral-inbox',
      emoji: '📨',
      label: 'Second Opinion & Referral Inbox',
      description: 'Incoming specialist referral requests, patient diagnostic imaging summaries and tele-consult triage.',
      ctaLabel: 'Open Referral Queue',
      ctaHref: '/dashboard/specialty-centre?tab=bookings',
    },
    {
      key: 'equipment-amc',
      emoji: '⚙️',
      label: 'Biomedical Assets & AMC Log',
      description: 'High-end diagnostic equipment AMC maintenance contracts, AERB calibration certificates and breakdown logs.',
      ctaLabel: 'Equipment Status',
      ctaHref: '/dashboard/specialty-centre?tab=docs',
    },
  ],
};

export default function SpecialtyCentreDashboard() {
  return <RoleDashboardShell config={config} />;
}
