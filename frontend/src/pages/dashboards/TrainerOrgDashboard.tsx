/** R1 — Healthcare Training Organization dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'trainer-org',
  title: '🎓 Emergency Training & CPR Certification Dashboard',
  subtitle: 'BLS, ACLS, First-Aid batches, corporate bookings & QR verified certificates',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Training Batches', value: '8', hint: 'BLS, ACLS, Pediatric' },
    { label: 'Trainees Enrolled', value: '142', hint: '98 Corporate · 44 Open' },
    { label: 'Certificates Issued (MTD)', value: '116', hint: '100% QR Tamper-proof' },
    { label: 'Course Pass Rate', value: '96.4%' },
  ],
  tasks: [
    { id: 't1', text: 'Confirm practical assessment mannequin allocation for Saturday BLS batch' },
    { id: 't2', text: 'Dispatch tamper-proof laminated physical cards for Tech Park batch' },
    { id: 't3', text: 'Review trainer assignment for upcoming Hospital Nursing Orientation' },
  ],
  alerts: [
    { id: 'a1', text: 'Corporate training booking enquiry from DLF CyberCity (60 participants)', level: 'info' },
    { id: 'a2', text: 'AED training simulator replacement battery due for re-order', level: 'warn' },
  ],
  domainModules: [
    { key: 'course-batches', emoji: '📚', label: 'Course Batches & Curriculum', description: 'Schedule AHA / Red Cross aligned BLS, AED, First-Aid & Choking relief workshops.', ctaLabel: 'View Batches', ctaHref: '/dashboard/trainer-org?tab=calendar' },
    { key: 'qr-certificates', emoji: '📜', label: 'Verifiable QR Certificates', description: 'Issue cryptographically signed digital certificates instantly verifiable on-chain.', ctaLabel: 'Issue Certificates', ctaHref: '/dashboard/trainer-org?tab=docs' },
    { key: 'corporate-desk', emoji: '🏢', label: 'Corporate Safety Programs', description: 'Custom workplace emergency response packages, GST invoicing & compliance audit.', ctaLabel: 'Corporate Desk', ctaHref: '/dashboard/trainer-org?tab=earnings' },
    { key: 'instructor-roster', emoji: '🧑‍🏫', label: 'Certified Instructor Pool', description: 'Manage emergency doctor and paramedic instructors with valid instructor credentials.', ctaLabel: 'Instructor Roster', ctaHref: '/dashboard/trainer-org?tab=staff' },
  ],
};

export default function TrainerOrgDashboard() {
  return <RoleDashboardShell config={config} />;
}
