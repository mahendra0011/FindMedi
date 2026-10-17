/**
 * File 07 §3.27 — Therapeutic diet kitchen operations dashboard.
 * Clinical diet types, allergen tagging, subscription meals, hospital IPD orders & FSSAI hygiene.
 *
 * Live KPIs: active plans and today's dispatched meals come from the diet
 * stats aggregate. Hygiene score and weekly revenue have no backend source,
 * so those cards keep their placeholder instead of a stale demo figure.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'diet_kitchen_admin',
  title: '🍲 Therapeutic Diet Kitchen Dashboard',
  subtitle: 'Clinical meal prep, allergen safety tagging, hospital diet feeds & subscription delivery',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Meal Plans', value: '—', hint: 'Diabetic, Renal & Cardiac' },
    { label: "Today's Meals Dispatched", value: '—', hint: 'Breakfast, Lunch & Dinner' },
    { label: 'Kitchen Hygiene Score', value: '—', hint: 'FSSAI audit compliant' },
    { label: 'Weekly Meal Revenue', value: '—', hint: 'Direct & hospital orders' },
  ],
  tasks: [
    { id: 'dk-t1', text: 'Prepare renal breakfast batches with controlled potassium/phosphorus' },
    { id: 'dk-t2', text: 'Confirm allergen-free isolation for 4 celiac client lunch packs' },
    { id: 'dk-t3', text: 'Update weekly FSSAI oil testing and refrigerator hygiene log' },
  ],
  alerts: [
    { id: 'dk-a1', text: '3 subscription pauses requested for tomorrow morning', level: 'info' },
    { id: 'dk-a2', text: 'Olive oil inventory below minimum reorder level', level: 'warn' },
  ],
  domainModules: [
    {
      key: 'diet-catalogue',
      emoji: '🥗',
      label: 'Clinical Diet Catalogue & Macros',
      description: 'Diabetic, low-sodium cardiac, renal dialysis, keto and post-bariatric therapeutic menu specifications.',
      ctaLabel: 'Manage Meal Menus',
      ctaHref: '/dashboard/diet-kitchen?tab=docs',
    },
    {
      key: 'hospital-diet-orders',
      emoji: '🏥',
      label: 'Hospital & Dietitian Orders',
      description: 'Synchronized patient meal orders linked directly to physician prescriptions and dietitian consults.',
      ctaLabel: 'View IPD Orders',
      ctaHref: '/dashboard/diet-kitchen?tab=bookings',
    },
    {
      key: 'delivery-dispatch',
      emoji: '🚚',
      label: 'Delivery Zones & Subscriptions',
      description: 'Thermal container dispatch batches, driver route maps, and customer pause/reschedule requests.',
      ctaLabel: 'Open Dispatch Hub',
      ctaHref: '/dashboard/diet-kitchen?tab=bookings',
    },
  ],
};

async function fetchLive(): Promise<Partial<Record<string, number | string>>> {
  const res = await api.get('/diet/stats').catch(() => null);
  const stats = res?.data ?? res;
  if (!stats || typeof stats !== 'object') return {};
  const out: Partial<Record<string, number | string>> = {};
  if (typeof stats.active === 'number') out['Active Meal Plans'] = stats.active;
  if (typeof stats.todayMeals === 'number') out["Today's Meals Dispatched"] = stats.todayMeals;
  return out;
}

export default function DietKitchenDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
