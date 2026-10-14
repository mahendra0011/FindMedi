/** R1 — Government Health Facility staff dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'govt-facility',
  title: '🏛️ Government Health Facility Dashboard',
  subtitle: 'Public OPD queues, Jan Aushadhi generic medicines & National Health Mission drives',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's Free OPD Tokens", value: '286', hint: '184 General · 102 MCH' },
    { label: 'Jan Aushadhi Drugs in Stock', value: '412 SKUs', hint: '98% Essential Drugs' },
    { label: 'Free Lab Tests Run Today', value: '148', hint: 'CBC, Sugar, LFT, Malaria' },
    { label: 'Ayushman PM-JAY Cards Made', value: '38 This Week' },
  ],
  tasks: [
    { id: 't1', text: 'Update Jan Aushadhi Kendra Paracetamol & Amoxicillin generic drug batch buffer' },
    { id: 't2', text: 'Broadcast Sunday Pulse Polio & Routine Child Immunization camp details' },
    { id: 't3', text: 'Submit weekly Integrated Disease Surveillance Programme (IDSP) syndromic report' },
  ],
  alerts: [
    { id: 'a1', text: 'Antenatal iron-folic acid tablet stock approaching reorder buffer level', level: 'warn' },
    { id: 'a2', text: 'National Non-Communicable Disease (NCD) screening drive starts Monday', level: 'info' },
  ],
  domainModules: [
    { key: 'public-opd', emoji: '🎫', label: 'Public OPD Token Queue', description: 'Manage computerized and walk-in OPD queue tokens with fast-track senior citizen lane.', ctaLabel: 'View OPD Queue', ctaHref: '/dashboard/govt-facility?tab=bookings' },
    { key: 'jan-aushadhi', emoji: '💊', label: 'Jan Aushadhi Kendra Inventory', description: 'Monitor Pradhan Mantri Bhartiya Janaushadhi Pariyojana generic medicine stocks & prices.', ctaLabel: 'Medicine Inventory', ctaHref: '/dashboard/govt-facility?tab=docs' },
    { key: 'nhm-camps', emoji: '📢', label: 'NHM Outreach Camps & Drives', description: 'Organize rural immunization sessions, TB notification drives and adolescent health days.', ctaLabel: 'Manage Camps', ctaHref: '/dashboard/govt-facility?tab=calendar' },
    { key: 'govt-schemes', emoji: '💳', label: 'PM-JAY & State Scheme Desk', description: 'Verify Ayushman Bharat PM-JAY golden cards, Janani Suraksha Yojana benefits & claims.', ctaLabel: 'Schemes Desk', ctaHref: '/dashboard/govt-facility?tab=profile' },
  ],
};

export default function GovtFacilityDashboard() {
  return <RoleDashboardShell config={config} />;
}
