/**
 * File 07 §3.28 — Corporate wellness & B2B programs dashboard.
 * Corporate packages, employee enrollment, webinars, fitness challenges & k-anonymous aggregate reports.
 *
 * KPIs below are File 07 spec figures: no endpoint exists for corporate
 * enrolment counts, participation rates, contract value or wellness scores
 * (/memberships is a patient membership list, not B2B contracts), so this
 * stays static until one does — wire it with useLiveKpis like ElderCareDashboard.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'corporate_admin',
  title: '🏢 Corporate Wellness & B2B Admin Dashboard',
  subtitle: 'Corporate health packages, employee wellness drives & privacy-first k-anonymous reports',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Enrolled Corporates', value: '14', hint: '3,200 active employees' },
    { label: 'Program Participation', value: '78%', hint: 'Annual health screenings' },
    { label: 'Active Corporate Contracts', value: '₹18.5L', hint: 'Annual billing value' },
    { label: 'Aggregate Wellness Score', value: '82/100', hint: 'k-anonymous index' },
  ],
  tasks: [
    { id: 'cw-t1', text: 'Generate GST consolidated invoice for TechCorp Q3 wellness drive' },
    { id: 'cw-t2', text: 'Approve dates for upcoming on-site ergonomic workshop' },
    { id: 'cw-t3', text: 'Publish aggregated health risk assessment report for Acme Labs' },
  ],
  alerts: [
    { id: 'cw-a1', text: '3 corporate contracts due for renewal next month', level: 'info' },
    { id: 'cw-a2', text: 'Zero individual health data shared with employers (DPDP compliant)', level: 'info' },
  ],
  domainModules: [
    {
      key: 'corporate-programs',
      emoji: '💼',
      label: 'Corporate Program Catalogue',
      description: 'Annual employee health checks, doctor webinars, ergonomic reviews, and CPR/first-aid training sessions.',
      ctaLabel: 'Manage Programs',
      ctaHref: '/dashboard/corporate-wellness?tab=docs',
    },
    {
      key: 'employee-bookings',
      emoji: '📅',
      label: 'Employee Slot & Voucher Dispatch',
      description: 'Corporate employee appointment booking via sponsored vouchers with redemption and attendance tracking.',
      ctaLabel: 'View Corporate Bookings',
      ctaHref: '/dashboard/corporate-wellness?tab=bookings',
    },
    {
      key: 'anonymous-insights',
      emoji: '📊',
      label: 'k-Anonymous Aggregate Reports',
      description: 'Strictly privacy-preserving aggregate workforce wellness trends, participation rates and lifestyle metrics.',
      ctaLabel: 'Open Aggregate Analytics',
      ctaHref: '/dashboard/corporate-wellness?tab=bookings',
    },
  ],
};

export default function CorporateWellnessDashboard() {
  return <RoleDashboardShell config={config} />;
}
