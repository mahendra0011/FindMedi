/** Wave 2 — CorporateBillingDashboard: live credit outstanding + rate-contract expiries. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'corporate_billing',
  title: 'Corporate Billing Dashboard',
  subtitle: 'Credit outstanding, rate contracts & corporate invoicing',
  permissions: ['billing:read', 'billing:manage', 'enterprise:read', 'reports:read'],
  kpis: [
    { label: 'Credit Outstanding', value: '—', hint: 'Corporate receivables' },
    { label: 'Active Corporates', value: '—', hint: 'Empanelled companies' },
    { label: 'Rate Contracts Expiring', value: '—', hint: 'Next 30 days' },
    { label: 'Invoices This Month', value: '—', hint: 'Raised to corporates' },
  ],
  tasks: [
    { id: 't1', text: 'Chase corporates with outstanding > 30 days' },
    { id: 't2', text: 'Renew rate contracts expiring within the next month' },
    { id: 't3', text: 'Reconcile credit-billed claims against pre-auth approvals' },
  ],
  alerts: [
    { id: 'a1', text: '2 rate contracts expiring this month — start renewal', level: 'warn' },
    { id: 'a2', text: 'Corporate credit exposure above policy cap', level: 'urgent' },
  ],
  domainModules: [
    { key: 'corporates', emoji: '🏢', label: 'Corporate Ledger', description: 'Empanelled companies with credit limits, utilisation and ageing.', ctaLabel: 'Open Enterprise Hub', ctaHref: '/hospital/enterprise' },
    { key: 'billing', emoji: '🧾', label: 'Credit Billing', description: 'Corporate invoices, credit notes and settlement tracking.', ctaLabel: 'Open Billing', ctaHref: '/billing' },
    { key: 'rate-contracts', emoji: '📄', label: 'Rate Contracts', description: 'Package and tariff agreements with expiry monitoring.', ctaLabel: 'Open Tariffs', ctaHref: '/billing/tariffs' },
  ],
};

async function fetchLive() {
  const [billing, licenses] = await Promise.all([
    api.get('/billing').catch(() => null),
    api.get('/licenses/expiring').catch(() => null),
  ]);
  const invoices = Array.isArray(billing) ? billing : (billing?.data ?? billing?.bills ?? []);
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const thisMonth = invoices.filter((b: any) => {
    const raw = b?.createdAt ?? b?.date;
    if (!raw) return false;
    const d = new Date(raw);
    return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year;
  }).length;
  const outstanding = invoices
    .filter((b: any) => b?.status === 'Unpaid' || b?.status === 'Pending')
    .reduce((sum: number, b: any) => sum + (Number(b?.total ?? b?.grandTotal ?? b?.amount) || 0), 0);
  const expiring = Array.isArray(licenses?.licenses) ? licenses.licenses.length : 0;
  const corporates = invoices.length ? new Set(invoices.map((b: any) => String(b?.corporateId ?? b?.companyId ?? b?.customerId ?? ''))).size : 0;
  return {
    creditOutstanding: outstanding ? `₹${outstanding.toLocaleString('en-IN')}` : '₹0',
    activeCorporates: corporates,
    rateContractsExpiring: expiring,
    invoicesThisMonth: thisMonth,
  };
}

export default function CorporateBillingDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
