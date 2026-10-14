/** R1 — Optician & Eye Care dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'optician',
  title: '👓 Eye Care & Optical Shop Dashboard',
  subtitle: 'Vision tests, frame inventory, lab fitting cards & eye screening camps',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's Eye Exams", value: '14', hint: '8 Refraction · 6 Power check' },
    { label: 'Glasses in Lab Fitting', value: '9', hint: '3 Ready for pickup' },
    { label: "Month's Optical Sales", value: '₹1,24,500' },
    { label: 'Cataract Referrals', value: '4', hint: 'Referred to Ophthalmology' },
  ],
  tasks: [
    { id: 't1', text: 'Confirm 3 spectacle orders ready for patient delivery' },
    { id: 't2', text: 'Verify digital refraction prescriptions with optometrist' },
    { id: 't3', text: 'Submit community eye camp requisition for Sunday' },
  ],
  alerts: [
    { id: 'a1', text: 'Anti-glare blue cut lenses low stock (<10 pairs)', level: 'warn' },
    { id: 'a2', text: '3 spectacle orders pending customer collection > 5 days', level: 'info' },
  ],
  domainModules: [
    { key: 'eye-exams', emoji: '👁️', label: 'Eye Exams & Refraction', description: 'Log visual acuity (Snellen 6/6), sphere, cylinder, axis, and pupil distance (PD).', ctaLabel: 'New Refraction Rx', ctaHref: '/dashboard/optician?tab=bookings' },
    { key: 'optical-store', emoji: '👓', label: 'Optical Store & Frames', description: 'Frames, contact lenses & solutions inventory catalogue with brand filters.', ctaLabel: 'View Inventory', ctaHref: '/dashboard/optician?tab=docs' },
    { key: 'lab-jobcards', emoji: '🔬', label: 'Lens Fitting Job Cards', description: 'Track spectacle job cards sent to optical fitting lab (cutting, edging, coating).', ctaLabel: 'Track Lab Orders', ctaHref: '/dashboard/optician?tab=bookings' },
    { key: 'cataract-pipeline', emoji: '🏥', label: 'Cataract Surgery Referrals', description: 'Pre-op cataract triage and direct tie-up with hospital ophthalmic OT.', ctaLabel: 'Referral Pipeline', ctaHref: '/dashboard/optician?tab=support' },
  ],
};

export default function OpticianDashboard() {
  return <RoleDashboardShell config={config} />;
}
