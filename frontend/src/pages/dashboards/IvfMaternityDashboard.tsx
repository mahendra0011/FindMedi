/** R1 — IVF & Maternity Care dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'ivf-maternity',
  title: '🌸 IVF & Maternity Care Operations Dashboard',
  subtitle: 'ART cycle milestones, embryology lab, ANC trimester journeys & delivery records',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active ART/IVF Cycles', value: '34', hint: '12 Stimulation · 8 Transfer' },
    { label: 'Oocyte Retrievals (OPU)', value: '3 Today', hint: 'Embryology lab ready' },
    { label: 'Registered ANC Mothers', value: '78', hint: 'Antenatal care pathway' },
    { label: 'Clinical Pregnancy Rate', value: '58.2%', hint: 'Audited ART Outcome' },
  ],
  tasks: [
    { id: 't1', text: 'Validate Assisted Reproductive Technology (ART) Act legal consent documentation' },
    { id: 't2', text: 'Schedule day-5 blastocyst biopsy and pre-implantation genetic testing (PGT-A)' },
    { id: 't3', text: 'Review high-risk pregnancy anomaly scan reports for 22-week patient' },
  ],
  alerts: [
    { id: 'a1', text: 'Embryo cryo-storage liquid nitrogen tank level check mandatory today', level: 'warn' },
    { id: 'a2', text: 'Gestational diabetes alert: Elevated FBS on ANC patient Priya Sharma', level: 'info' },
  ],
  domainModules: [
    { key: 'art-cycle-tracker', emoji: '🔬', label: 'ART & IVF Cycle Manager', description: 'Step-by-step stimulation, follicular scan, ovum pickup, ICSI, embryo culture & transfer.', ctaLabel: 'View Cycles', ctaHref: '/dashboard/ivf-maternity?tab=bookings' },
    { key: 'anc-pathway', emoji: '🤰', label: 'Antenatal (ANC) Care Pathway', description: 'Trimester visits, fetal anomaly scans, maternal nutrition, tetanus toxoid schedule.', ctaLabel: 'ANC Patients', ctaHref: '/dashboard/ivf-maternity?tab=calendar' },
    { key: 'embryo-cryobank', emoji: '❄️', label: 'Embryo & Gamete Cryobank', description: 'Canister and straw location tracking, consent renewal alerts & liquid nitrogen logs.', ctaLabel: 'Cryobank Registry', ctaHref: '/dashboard/ivf-maternity?tab=docs' },
    { key: 'art-compliance', emoji: '⚖️', label: 'National ART Registry & Ethics', description: 'Surrogacy Regulation Act and ART Act 2021 compliance, counseling records & outcomes.', ctaLabel: 'Compliance Logs', ctaHref: '/dashboard/ivf-maternity?tab=staff' },
  ],
};

export default function IvfMaternityDashboard() {
  return <RoleDashboardShell config={config} />;
}
