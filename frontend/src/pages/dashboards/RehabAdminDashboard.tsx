/** R1 — De-Addiction & Rehab Centre dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'rehab-admin',
  title: '🛡️ De-Addiction & Psychiatric Rehab Dashboard',
  subtitle: 'Admissions, withdrawal monitoring, family therapy & MHCA 2017 compliance',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'In-Patient Residents', value: '42/50', hint: '84% Bed Occupancy' },
    { label: 'Detox Phase Residents', value: '8', hint: '24x7 Vitals Monitoring' },
    { label: 'Family Therapy Sessions', value: '16 This Week' },
    { label: '12-Month Relapse Free Rate', value: '64.8%', hint: 'Aftercare Cohort' },
  ],
  tasks: [
    { id: 't1', text: 'Conduct psychiatrist round for 3 newly admitted detoxification patients' },
    { id: 't2', text: 'Audit Mental Healthcare Act (MHCA 2017) Form 1 nominated representative consents' },
    { id: 't3', text: 'Facilitate weekly 12-Step Alcoholics/Narcotics Anonymous group circle' },
  ],
  alerts: [
    { id: 'a1', text: 'Resident CIWA withdrawal score > 15 (alcohol withdrawal tremor): Medical review required', level: 'urgent' },
    { id: 'a2', text: 'Quarterly state Mental Health Review Board inspection report ready for sign-off', level: 'info' },
  ],
  domainModules: [
    { key: 'mhca-admissions', emoji: '📝', label: 'MHCA 2017 Admission Ledger', description: 'Voluntary & supported admissions under Sections 86-89 with nominated representative consent.', ctaLabel: 'Admission Registry', ctaHref: '/dashboard/rehab-admin?tab=bookings' },
    { key: 'detox-charts', emoji: '🩺', label: 'Detoxification & Vitals Charts', description: 'Monitor CIWA-Ar and COWS withdrawal scores, fluid balance & scheduled medications.', ctaLabel: 'Clinical Charts', ctaHref: '/dashboard/rehab-admin?tab=calendar' },
    { key: 'family-counselling', emoji: '👨‍👩‍👧', label: 'Family Therapy & Relapse Prevention', description: 'Schedule co-dependency counseling, trigger mapping & home-transition contracts.', ctaLabel: 'Family Sessions', ctaHref: '/dashboard/rehab-admin?tab=staff' },
    { key: 'aftercare-network', emoji: '🤝', label: '12-Month Aftercare & Helpline', description: 'Post-discharge recovery check-ins, sober companion network & emergency relapse hotline.', ctaLabel: 'Aftercare Network', ctaHref: '/dashboard/rehab-admin?tab=docs' },
  ],
};

export default function RehabAdminDashboard() {
  return <RoleDashboardShell config={config} />;
}
