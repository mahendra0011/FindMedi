/** R1 — Compliance & KYC Reviewer dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'compliance-kyc',
  title: '⚖️ Compliance, Council Registry & KYC Dashboard',
  subtitle: 'Doctor council verification, Clinical Establishment licenses & DPDP requests',
  permissions: ['profile:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Pending Provider Verifications', value: '18', hint: 'SLA < 24 Hours' },
    { label: 'High-Risk Applications', value: '4', hint: 'Ambulance, IVF, Rehab' },
    { label: 'Licenses Expiring in 30d', value: '12', hint: 'NMC / Pharmacy / Fire' },
    { label: 'DPDP Data-Subject Requests', value: '2 Pending', hint: 'Right to erasure' },
  ],
  tasks: [
    { id: 't1', text: 'Cross-verify National Medical Commission (NMC) IMR portal registration for Dr. S. Rao' },
    { id: 't2', text: 'Execute secondary approval on new ALS Ambulance Service provider application' },
    { id: 't3', text: 'Process user DPDP Right-to-Erasure request #DSR-109 within 72h SLA' },
  ],
  alerts: [
    { id: 'a1', text: 'Apollo Pharmacy branch Form 20B drug license expiring in 10 days — Notice sent', level: 'warn' },
    { id: 'a2', text: 'Duplicate PAN card match detected across two diagnostic provider applications', level: 'urgent' },
  ],
  domainModules: [
    { key: 'kyc-queue', emoji: '🪪', label: 'Provider KYC Review Workspace', description: 'Review watermarked degree certificates, state council registrations & clinic establishment proofs.', ctaLabel: 'Open KYC Queue', ctaHref: '/dashboard/compliance-kyc?tab=docs' },
    { key: 'high-risk-lane', emoji: '🛡️', label: 'High-Risk Two-Person Approval Lane', description: 'Mandatory independent dual-reviewer sign-off for ambulances, IVF, de-addiction & peer mentors.', ctaLabel: 'High-Risk Lane', ctaHref: '/dashboard/compliance-kyc?tab=support' },
    { key: 'dpdp-dsr-manager', emoji: '🔒', label: 'DPDP Act Data-Subject Requests (DSR)', description: 'Handle citizen data access, data correction, account erasure and data portability requests.', ctaLabel: 'DSR Queue', ctaHref: '/dashboard/compliance-kyc?tab=profile' },
    { key: 'license-calendar', emoji: '📜', label: 'License Renewal & Expiry Scheduler', description: 'Track AERB X-ray licenses, BMW pollution NOCs, fire safety clearances and clinical permits.', ctaLabel: 'License Tracker', ctaHref: '/dashboard/compliance-kyc?tab=bookings' },
  ],
};

export default function ComplianceKycDashboard() {
  return <RoleDashboardShell config={config} />;
}
