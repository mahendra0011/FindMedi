/**
 * File 07 §3.26 — Vaccination centre & cold-chain operations dashboard.
 * Cold-chain monitoring, stock levels, UIP vs optional vaccines, AEFI reports & digital certs.
 *
 * KPIs below are File 07 spec figures: nothing on the backend aggregates
 * cold-chain temperature, vaccine doses or issued certificates (the inventory
 * stats count items, not doses; /certificates is a per-patient record list),
 * so this stays static until such an endpoint exists — wire it with
 * useLiveKpis exactly like ElderCareDashboard when one does.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'vaccination_admin',
  title: '💉 Vaccination Centre & Cold-Chain Dashboard',
  subtitle: 'Vaccine stocks, cold-chain temperature logs, beneficiary registry & digital certificates',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's Vaccinations", value: '36', hint: '24 Pediatric · 12 Adult' },
    { label: 'Cold-Chain Temperature', value: '3.8°C', hint: 'ILR safe range (2°–8°C)' },
    { label: 'Vaccine Doses in Stock', value: '840', hint: '14 antigens available' },
    { label: 'Certificates Issued', value: '36', hint: '100% digital QR certs' },
  ],
  tasks: [
    { id: 'vc-t1', text: 'Log morning and evening ILR temperature readings' },
    { id: 'vc-t2', text: 'Verify stock batch expiration for MMR vaccine vials' },
    { id: 'vc-t3', text: 'Send reminder SMS to parents with 9-month immunization due' },
  ],
  alerts: [
    { id: 'vc-a1', text: 'Hepatitis B vaccine stock below 15 doses threshold', level: 'warn' },
    { id: 'vc-a2', text: 'Zero AEFI incidents reported in the last 30 days', level: 'info' },
  ],
  domainModules: [
    {
      key: 'cold-chain-log',
      emoji: '❄️',
      label: 'Cold-Chain Telemetry & Logs',
      description: 'Continuous temperature records for ice-lined refrigerators (ILR) and vaccine carrier transit boxes.',
      ctaLabel: 'View Temp Logs',
      ctaHref: '/dashboard/vaccination-centre?tab=docs',
    },
    {
      key: 'beneficiary-registry',
      emoji: '👶',
      label: 'Immunization Registry & Schedule',
      description: 'National UIP timeline and optional vaccines (Flu, HPV, Pneumococcal) with parent reminder broadcast.',
      ctaLabel: 'Open Beneficiary List',
      ctaHref: '/dashboard/vaccination-centre?tab=bookings',
    },
    {
      key: 'aefi-reporting',
      emoji: '⚠️',
      label: 'AEFI Surveillance & Reporting',
      description: 'Adverse Events Following Immunization surveillance, case classification, and state portal sync.',
      ctaLabel: 'Log AEFI Event',
      ctaHref: '/dashboard/vaccination-centre?tab=support',
    },
  ],
};

export default function VaccinationCentreDashboard() {
  return <RoleDashboardShell config={config} />;
}
