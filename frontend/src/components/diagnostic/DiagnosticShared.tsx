import { BarChart3, FlaskConical, CalendarDays, ClipboardList, Syringe, Calendar, FileText, Microscope, Users, Gift, CreditCard, RotateCcw, Star, TrendingUp, Settings } from 'lucide-react';

export const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'catalog', label: 'Test Catalog', icon: FlaskConical },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'rxqueue', label: 'Rx Queue', icon: ClipboardList },
  { id: 'samples', label: 'Sample Collection', icon: Syringe },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'equipment', label: 'Equipment', icon: Microscope },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'packages', label: 'Packages', icon: Gift },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const CATEGORIES = ['Blood Test', 'Urine/Stool', 'Hormone', 'Vitamin', 'Cardiac Basic', 'Basic Imaging', 'Advanced Imaging', 'Health Package', 'Other'];
export const DEPARTMENTS = ['Pathology', 'Radiology', 'Cardiology', 'Health Packages'];
export const REPORT_TIMES = ['30 mins', '1 hr', '2 hrs', '6 hrs', '12 hrs', '24 hrs', '48 hrs', '72 hrs'];

export function StatusBadge({ status, mapping = {} }) {
  const colors = mapping[status] || {
    Confirmed: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Completed: 'bg-success/10 text-success',
    Cancelled: 'bg-destructive/10 text-destructive', Processing: 'bg-info/10 text-info', 'Sample Collected': 'bg-info/10 text-info',
    Operational: 'bg-success/10 text-success', 'Under Maintenance': 'bg-warning/10 text-warning', 'Out of Service': 'bg-destructive/10 text-destructive',
    Paid: 'bg-success/10 text-success', Unpaid: 'bg-warning/10 text-warning', 'Partially Paid': 'bg-info/10 text-info', Refunded: 'bg-destructive/10 text-destructive',
  };
  const c = colors[status] || 'bg-muted text-muted-foreground';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c}`}>{status}</span>;
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
      <div><h2 className="text-xl font-bold text-foreground">{title}</h2>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
