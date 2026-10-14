/**
 * File 07 §3.27 — Therapeutic diet kitchen operations dashboard.
 * Clinical diet types, allergen tagging, subscription meals, hospital IPD orders & FSSAI hygiene.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'diet_kitchen_admin',
  title: '🍲 Therapeutic Diet Kitchen Dashboard',
  subtitle: 'Clinical meal prep, allergen safety tagging, hospital diet feeds & subscription delivery',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Meal Plans', value: '88', hint: 'Diabetic, Renal & Cardiac' },
    { label: "Today's Meals Dispatched", value: '142', hint: 'Breakfast, Lunch & Dinner' },
    { label: 'Kitchen Hygiene Score', value: '98%', hint: 'FSSAI audit compliant' },
    { label: 'Weekly Meal Revenue', value: '₹94,500', hint: 'Direct & hospital orders' },
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

export default function DietKitchenDashboard() {
  return <RoleDashboardShell config={config} />;
}
