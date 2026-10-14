/** R1 — Health Food, Supplements & Product Vendor dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'product-vendor',
  title: '📦 Health Food & Supplements Vendor Dashboard',
  subtitle: 'FSSAI/CDSCO compliance, batch expiry, order fulfillment & claim moderation',
  permissions: ['profile:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's Orders", value: '42', hint: '28 Packed · 14 In transit' },
    { label: 'Pending Dispatch', value: '7', hint: 'SLA < 4 hours' },
    { label: 'Active SKUs', value: '118', hint: '100% FSSAI verified' },
    { label: 'Banned Claims Flags', value: '0', hint: 'Drugs & Magic Remedies OK' },
  ],
  tasks: [
    { id: 't1', text: 'Upload renewed FSSAI Central Food Business License copy' },
    { id: 't2', text: 'Generate dispatch manifest for BlueDart courier pickup (22 parcels)' },
    { id: 't3', text: 'Review customer replacement request for damaged protein shaker' },
  ],
  alerts: [
    { id: 'a1', text: 'Batch ASH-24A (Ashwagandha capsules) expires in 45 days (24 units)', level: 'warn' },
    { id: 'a2', text: 'New FSSAI organic nutraceutical packaging guideline notice', level: 'info' },
  ],
  domainModules: [
    { key: 'product-catalog', emoji: '🛍️', label: 'Product & SKU Catalogue', description: 'Manage nutraceuticals, herbal supplements, health foods with ingredient breakdown.', ctaLabel: 'Manage SKUs', ctaHref: '/dashboard/product-vendor?tab=bookings' },
    { key: 'batch-expiry', emoji: '📅', label: 'Batch & Expiry Tracker', description: 'Monitor manufacturing dates, batch lot numbers and auto-delist expiring items.', ctaLabel: 'View Batches', ctaHref: '/dashboard/product-vendor?tab=docs' },
    { key: 'claims-checker', emoji: '🛡️', label: 'Compliant Claims Checker', description: 'Automated scan ensuring product copy complies with ASCI and Consumer Protection rules.', ctaLabel: 'Audit Claims', ctaHref: '/dashboard/product-vendor?tab=support' },
    { key: 'vendor-payouts', emoji: '💰', label: 'Marketplace Settlements', description: 'Review net order earnings, marketplace commission deductions and GST credit notes.', ctaLabel: 'Payout Ledger', ctaHref: '/dashboard/product-vendor?tab=earnings' },
  ],
};

export default function ProductVendorDashboard() {
  return <RoleDashboardShell config={config} />;
}
