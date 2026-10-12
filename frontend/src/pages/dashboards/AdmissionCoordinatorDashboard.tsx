/** Wave 2 — AdmissionCoordinatorDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'admission_coordinator',
  title: '🛎️ Admission Coordinator Dashboard',
  subtitle: 'Pre-auth tracking, bed reservations, TPA queries & check-in flow',
  permissions: ['patients:read', 'beds:read', 'insurance:read', 'appointments:read', 'billing:read'],
  kpis: [
    { label: 'Planned Admissions', value: '22', hint: '14 elective · 8 day-care' },
    { label: 'Pre-Auth Approved', value: '18', hint: '81.8% success' },
    { label: 'Pending TPA Queries', value: '4', hint: 'Need clinical justification' },
    { label: 'Avg Check-In Time', value: '12 min', hint: 'Front desk SLA met' },
  ],
  tasks: [
    { id: 't1', text: 'Upload additional indoor case papers for Star Health pre-auth #8492' },
    { id: 't2', text: 'Confirm Deluxe Room 402 reservation for scheduled CABG patient' },
    { id: 't3', text: 'Coordinate emergency bed allocation with triage desk' },
  ],
  alerts: [
    { id: 'a1', text: '2 cashless queries pending insurer response past 4 hours', level: 'warn' },
    { id: 'a2', text: 'Private room tier running at 94% occupancy today', level: 'info' },
  ],
  domainModules: [
    { key: 'insurance-desk', emoji: '🛡️', label: 'TPA & Insurance Desk', description: 'Real-time pre-authorization workflow, enhancement requests and approvals.', ctaLabel: 'Open Insurance Desk', ctaHref: '/insurance/desk' },
    { key: 'bed-board', emoji: '🛏️', label: 'Live Bed Board', description: 'Occupancy visualization across wards, ICUs and private suites.', ctaLabel: 'Bed Board', ctaHref: '/hospital/beds' },
    { key: 'registration', emoji: '📋', label: 'Patient Registration', description: 'Comprehensive IPD demographic and insurance onboarding.', ctaLabel: 'Registration Console', ctaHref: '/patient-registration' },
  ],
};

export default function AdmissionCoordinatorDashboard() {
  return <RoleDashboardShell config={config} />;
}
