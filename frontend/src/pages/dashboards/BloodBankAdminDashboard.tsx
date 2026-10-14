/** R1 — Blood Bank & Component Inventory dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'blood-bank-admin',
  title: '🩸 Blood Bank & Component Inventory Dashboard',
  subtitle: 'Component units, crossmatching, donor camps, cold-chain & TTI safety',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Total Units in Stock', value: '318', hint: '142 PRBC · 94 FFP · 82 Platelets' },
    { label: 'O-Negative Reserve', value: '14 Units', hint: 'Emergency Reserve Safe' },
    { label: 'Crossmatch Requisitions', value: '11', hint: '6 Urgent OT Requisitions' },
    { label: 'Units Expiring in 48h', value: '5 Units', hint: 'Platelets FIFO Priority' },
  ],
  tasks: [
    { id: 't1', text: 'Validate daily cold-chain temperature logs (PRBC 2-6°C, FFP <-30°C)' },
    { id: 't2', text: 'Dispatch Mobile Blood Donation Van for Saturday Rotary Club camp' },
    { id: 't3', text: 'Review automated NAT/ELISA Transfusion Transmissible Infection (TTI) test runs' },
  ],
  alerts: [
    { id: 'a1', text: 'B-Negative platelet inventory critical (<4 units in buffer)', level: 'urgent' },
    { id: 'a2', text: 'Blood component centrifuge annual AMC inspection due this Thursday', level: 'info' },
  ],
  domainModules: [
    { key: 'component-inventory', emoji: '🧪', label: 'Component Stock Ledger', description: 'Real-time PRBC, FFP, Platelet Concentrate, Cryoprecipitate units with barcode tracking.', ctaLabel: 'View Stock', ctaHref: '/dashboard/blood-bank-admin?tab=bookings' },
    { key: 'crossmatch-inbox', emoji: '🔬', label: 'Crossmatching & Requisitions', description: 'Emergency hospital blood requests, major/minor crossmatch signoff & issue slips.', ctaLabel: 'Requisitions Queue', ctaHref: '/dashboard/blood-bank-admin?tab=calendar' },
    { key: 'donor-camps', emoji: '🚐', label: 'Voluntary Donor Camps', description: 'Blood donation camp scheduler, pre-donation hemoglobin screen & donor certificates.', ctaLabel: 'Manage Camps', ctaHref: '/dashboard/blood-bank-admin?tab=docs' },
    { key: 'tti-regulatory', emoji: '📜', label: 'TTI Screening & Form 28D Log', description: 'Mandatory HIV 1/2, HBV, HCV, Syphilis, Malaria screening registry with FDA compliance.', ctaLabel: 'Regulatory Log', ctaHref: '/dashboard/blood-bank-admin?tab=staff' },
  ],
};

export default function BloodBankAdminDashboard() {
  return <RoleDashboardShell config={config} />;
}
