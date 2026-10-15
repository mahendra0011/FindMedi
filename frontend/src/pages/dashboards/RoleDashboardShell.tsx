/**
 * R1 & File 07 — Generic role-dashboard shell.
 * Sidebar is derived from the role's `permissions`; the body shows
 * Today + KPIs + Tasks + Alerts, then standard modules
 * (profile/verification, calendar, bookings, earnings, reviews, staff, docs,
 * support) filtered by permission, plus role-specific domain modules.
 * Includes interactive module views, top bar with facility switcher,
 * URL query param synchronization (?tab=), and strict T3 PHI shielding.
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle2, Clock, DollarSign, FileText,
  HelpCircle, MapPin, Shield, Star, Users, AlertTriangle,
  Search, Bell, PhoneCall, ChevronRight, Download, Eye,
  Lock, ArrowLeft, Plus, Check, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import WorkQueueTable from './WorkQueueTable';

export const QUICK_ACTION_ROUTES: Record<string, string> = {
  // Doctor
  'Start Next Consultation': '/doctor/consultation',
  'Write Prescription': '/doctor/consultation?tab=prescription',
  'Order Lab Investigation': '/hospital/lab?action=order',
  'Sign Discharge Summary': '/ipd?tab=discharge',
  // Hospital Admin
  'Authorize Refund / Waiver': '/hospital/rcm?tab=refunds',
  'Assign Staff Shift': '/hr/roster',
  'Review Bed Board': '/hospital/beds',
  'Manage Masters': '/admin/settings',
  // Nurse
  'Record Patient Vitals': '/hospital/nursing?tab=vitals',
  'Log Medication Administration': '/hospital/nursing?tab=mar',
  'Add Nursing Note': '/hospital/nursing?tab=notes',
  'Request Doctor Review': '/hospital/nursing?tab=escalation',
  // Receptionist
  'Register New Patient (UHID)': '/hospital/frontdesk?tab=register',
  'Book OPD Appointment': '/hospital/frontdesk?tab=book',
  'Issue Queue Token': '/hospital/queue?action=issue',
  'Print OPD Slip / Barcode': '/hospital/frontdesk?tab=slips',
  // Bed Manager
  'Allocate Bed & Room': '/hospital/beds?action=allocate',
  'Initiate Bed Cleaning': '/housekeeping?tab=beds',
  'Release Blocked Bed': '/hospital/beds?action=release',
  'Generate Bed Occupancy Report': '/reports?type=beds',
  // Emergency
  'Rapid Patient Triage': '/hospital/emergency?tab=triage',
  'Initiate Code Blue': '/hospital/emergency?tab=codeblue',
  'Register Emergency MLC': '/hospital/emergency?tab=mlc',
  'Request Urgent ICU Bed': '/hospital/beds?ward=icu',
  // Cashier / Billing
  'New Cash Receipt': '/hospital/cashier?action=receipt',
  'Process Bill Settlement': '/hospital/cashier?action=settle',
  'Issue IPD Deposit Receipt': '/hospital/cashier?tab=advance',
  'Reconcile Shift Till Cash': '/hospital/cashier?tab=reconcile',
  // Lab
  'Accept Sample Batch': '/hospital/lab?tab=accession',
  'Enter Test Results': '/hospital/lab?tab=results',
  'Import Analyzer File': '/hospital/lab?tab=qc',
  'Flag Panic Value': '/hospital/lab?tab=critical',
  // Radiology
  'Start Imaging Study': '/hospital/radiology?tab=worklist',
  'Complete DICOM Transfer': '/hospital/radiology?tab=pacs',
  'Log Contrast Administration': '/hospital/radiology?tab=safety',
  'Report Tube Fault': '/hospital/radiology?tab=equipment',
  // Pharmacy
  'Dispense Digital Prescription': '/hospital/pharmacy?tab=dispense',
  'Fulfill Ward Indent': '/hospital/pharmacy?tab=indents',
  'Scan Medicine Barcode': '/hospital/pharmacy?tab=pos',
  'Generate Pharmacy Bill': '/hospital/pharmacy?tab=billing',
  // Cashier Desk
  'Collect Payment': '/hospital/cashier?action=settle',
  'Print Official Receipt': '/hospital/cashier?action=receipt',
  'Initiate Shift Cash Closing': '/hospital/cashier?tab=reconcile',
  'Scan UPI Dynamic QR': '/hospital/cashier?action=settle',
  // ICU Intensivist & Nurse
  'Review ICU Patient Chart': '/ipd?ward=icu',
  'Order Critical Infusion': '/hospital/nursing?tab=mar',
  'Record Procedure Note (Central Line)': '/ipd?tab=notes',
  'Plan Ward Step-Down': '/hospital/beds?ward=stepdown',
  'Log Hourly ICU Vitals': '/hospital/nursing?tab=vitals',
  'Document Infusion Rate Change': '/hospital/nursing?tab=mar',
  'Record Endotracheal Care': '/hospital/nursing?tab=notes',
  'Acknowledge Monitor Alarm': '/hospital/nursing?tab=vitals',
  // Operation Theatre Coordinator & Teams
  'Schedule New Surgery': '/ot?action=schedule',
  'Assign OT Room & Team': '/ot?tab=rooms',
  'Verify WHO Surgical Checklist': '/ot?tab=checklist',
  'Mark Theatre Available': '/ot?tab=rooms',
  // Surgeon
  'Start Operative Note': '/ot?tab=operative-note',
  'Verify Pre-Op Consent': '/ot?tab=consent',
  'Enter Post-Op Orders': '/ipd?tab=orders',
  'Check PAC Clearance': '/ot?tab=pac',
  // Anaesthetist / Anaesthesiologist
  'Complete Pre-Anaesthesia PAC': '/ot?tab=pac',
  'Start Intra-Op Log': '/ot?tab=intraop',
  'Discharge from PACU': '/ot?tab=pacu',
  'Flag Difficult Airway': '/ot?tab=alerts',
  // Radiologist
  'Launch Web PACS Viewer': '/hospital/radiology?tab=pacs',
  'Dictate Radiology Report': '/hospital/radiology?tab=reporting',
  'Sign & Release Diagnostic Report': '/hospital/radiology?tab=signoff',
  'Flag Urgent Finding': '/hospital/radiology?tab=critical',
  // Discharge Coordinator
  'Check Clearance Status': '/ipd?tab=discharge',
  'Notify Pharmacy / Billing': '/hospital/cashier',
  'Print Discharge Folder': '/ipd?tab=discharge-summary',
  'Mark Discharge Completed': '/hospital/beds?action=release',
  // Housekeeping & Sanitization
  'Assign Cleaning Task': '/housekeeping?tab=tasks',
  'Verify & Release Clean Bed': '/hospital/beds?action=release',
  'Log Biohazard Disinfection': '/housekeeping?tab=biohazard',
  'Report Plumbing/AC Fault': '/admin/settings',
  // Biomedical Engineering
  'Log Breakdown Work Order': '/biomedical?action=breakdown',
  'Record Equipment Calibration': '/biomedical?action=calibrate',
  'Release Equipment to Clinical Service': '/biomedical?action=release',
  'Schedule Preventive Service': '/biomedical?action=pm',
  // Central Sterile Supply Department (CSSD)
  'Log Autoclave Cycle Start': '/cssd?action=autoclave',
  'Record Chemical Indicator Result': '/cssd?action=indicator',
  'Issue Sterile Tray to OT': '/cssd?action=dispatch',
  'Receive Soiled Instrument Set': '/cssd?action=receive',
  // Ambulance & Transport
  'Dispatch Emergency Ambulance': '/ambulanceTrips',
  'Log Vehicle Inspection Checklist': '/ambulanceTrips',
  'Complete Trip & Generate Bill': '/ambulanceTrips',
  'Mark Vehicle Available': '/ambulanceTrips',
  // Quality & Patient Safety
  'Log Patient Safety Incident': '/hospital/quality',
  'Initiate Root Cause Analysis': '/hospital/quality',
  'Assign Corrective Action (CAPA)': '/hospital/quality',
  'Export NABH Quality Report': '/hospital/quality',
  // Infection Control
  'Place Patient on Isolation Protocol': '/hospital/quality',
  'Record Hand Hygiene Audit': '/hospital/quality',
  'Log HAI Infection Event': '/hospital/quality',
  'Generate BMW Waste Manifest': '/hospital/quality',
  // Hospital Security
  'Issue Visitor Pass': '/hospital/frontdesk',
  'Scan Visitor Exit': '/hospital/frontdesk',
  'Log Security Incident': '/admin/settings',
  'Revoke Access Badge': '/admin/settings',
  // Mortuary & Death Records
  'Log Deceased Intake': '/mortuary',
  'Allocate Storage Cabinet': '/mortuary',
  'Verify Release Documentation': '/mortuary',
  'Complete Handover': '/mortuary',
  // Hospital IT Admin
  'Unlock Staff User Account': '/admin/settings',
  'Restart HL7 Gateway Bridge': '/admin/settings',
  'Run On-Demand DB Snapshot': '/admin/settings',
  'Test Network Printer': '/admin/settings',
  // Hospital MIS & Analytics
  'Export Daily Operations Summary': '/reports',
  'Generate Monthly Financial P&L': '/reports',
  'Analyze Bed Occupancy Trends': '/reports',
  'Schedule Automated Report': '/reports',
  // Purchase & Procurement
  'Create Purchase Order': '/admin/settings',
  'Request Quotation (RFQ)': '/admin/settings',
  'Verify Goods Receipt Note (GRN)': '/admin/settings',
  'Add Approved Vendor': '/admin/settings',
};

export interface Kpi {
  label: string;
  value: string;
  hint?: string;
}

export interface TaskItem {
  id: string;
  text: string;
  done?: boolean;
}

export interface AlertItem {
  id: string;
  text: string;
  level?: 'info' | 'warn' | 'urgent';
}

export interface DomainModule {
  /** stable key, e.g. "dental-chart" */
  key: string;
  emoji: string;
  label: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface RoleDashboardConfig {
  roleKey: string;
  title: string;
  subtitle: string;
  accent?: string;
  permissions: string[];
  kpis: Kpi[];
  tasks?: TaskItem[];
  alerts?: (AlertItem | { id?: string; level?: string; message?: string; text?: string })[];
  domainModules: DomainModule[];
  sidebarSections?: string[];
  workQueues?: string[];
  quickActions?: (string | { label: string; route?: string })[];
}

export function getSectionEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n === 'dashboard' || n === 'today') return '🏠';
  if (n.includes('queue') || n.includes('waiting')) return '⏳';
  if (n.includes('appointment')) return '🗓️';
  if (n.includes('patient') || n.includes('resident') || n.includes('donor')) return '👥';
  if (n.includes('emr') || n.includes('record') || n.includes('note') || n.includes('chart')) return '📋';
  if (n.includes('prescript') || n.includes('rx') || n.includes('medicat') || n.includes('dispens') || n.includes('infusion')) return '💊';
  if (n.includes('order')) return '📑';
  if (n.includes('bed') || n.includes('ipd') || n.includes('admission')) return '🛏️';
  if (n.includes('opd') || n.includes('clinic')) return '🩺';
  if (n.includes('report') || n.includes('mis') || n.includes('analyt')) return '📊';
  if (n.includes('billing') || n.includes('revenue') || n.includes('cash') || n.includes('account') || n.includes('claim') || n.includes('earning') || n.includes('charge')) return '💰';
  if (n.includes('staff') || n.includes('doctor') || n.includes('nurse') || n.includes('roster')) return '🧑‍⚕️';
  if (n.includes('emergency') || n.includes('triage') || n.includes('resus')) return '🚨';
  if (n.includes('icu')) return '🫁';
  if (n.includes('ot') || n.includes('surger') || n.includes('theatre') || n.includes('recovery')) return '🔪';
  if (n.includes('lab') || n.includes('sample') || n.includes('patholog') || n.includes('workbench') || n.includes('qc')) return '🔬';
  if (n.includes('radiolog') || n.includes('imag') || n.includes('x-ray') || n.includes('ct') || n.includes('mri') || n.includes('pacs') || n.includes('scan')) return '🩻';
  if (n.includes('blood')) return '🩸';
  if (n.includes('dialysis')) return '🔄';
  if (n.includes('clean') || n.includes('housekeep') || n.includes('sanit')) return '🧹';
  if (n.includes('cssd') || n.includes('sterile')) return '🧼';
  if (n.includes('device') || n.includes('equipment') || n.includes('biomedical') || n.includes('machine')) return '⚙️';
  if (n.includes('security') || n.includes('guard')) return '🛡️';
  if (n.includes('quality') || n.includes('audit') || n.includes('approval') || n.includes('checklist')) return '✅';
  if (n.includes('mortuary') || n.includes('death')) return '🕊️';
  if (n.includes('it') || n.includes('system') || n.includes('server') || n.includes('log') || n.includes('tech')) return '💻';
  if (n.includes('diet') || n.includes('food') || n.includes('kitchen')) return '🥗';
  if (n.includes('handover') || n.includes('transfer')) return '🔄';
  return '📁';
}

interface NavEntry {
  perm: string;
  tabKey: string;
  label: string;
  emoji: string;
  href: (roleKey: string) => string;
}

const MODULE_NAV: NavEntry[] = [
  { perm: 'profile:view', tabKey: 'profile', label: 'Profile & Verification', emoji: '🪪', href: (r) => `/dashboard/${r}?tab=profile` },
  { perm: 'calendar:view', tabKey: 'calendar', label: 'Calendar', emoji: '📅', href: (r) => `/dashboard/${r}?tab=calendar` },
  { perm: 'bookings:manage', tabKey: 'bookings', label: 'Bookings', emoji: '📋', href: (r) => `/dashboard/${r}?tab=bookings` },
  { perm: 'appointments:read', tabKey: 'appointments', label: 'Appointments', emoji: '🗓️', href: (r) => `/dashboard/${r}?tab=appointments` },
  { perm: 'earnings:view', tabKey: 'earnings', label: 'Earnings', emoji: '💰', href: (r) => `/dashboard/${r}?tab=earnings` },
  { perm: 'reviews:view', tabKey: 'reviews', label: 'Reviews', emoji: '⭐', href: (r) => `/dashboard/${r}?tab=reviews` },
  { perm: 'staff:manage', tabKey: 'staff', label: 'Staff', emoji: '👥', href: (r) => `/dashboard/${r}?tab=staff` },
  { perm: 'docs:upload', tabKey: 'docs', label: 'Documents', emoji: '📄', href: (r) => `/dashboard/${r}?tab=docs` },
  { perm: 'records:read', tabKey: 'records', label: 'Records', emoji: '📁', href: (r) => `/dashboard/${r}?tab=records` },
  { perm: 'reports:read', tabKey: 'reports', label: 'Reports', emoji: '📊', href: (r) => `/dashboard/${r}?tab=reports` },
  { perm: 'approvals:manage', tabKey: 'approvals', label: 'Approvals', emoji: '✅', href: (r) => `/dashboard/${r}?tab=approvals` },
  { perm: 'support:contact', tabKey: 'support', label: 'Support', emoji: '🎧', href: (r) => `/dashboard/${r}?tab=support` },
];

/** T3 non-clinical roles strictly shielded from patient medical history (PHI) */
const T3_ROLES = new Set([
  'gym', 'gym_owner', 'trainer',
  'yoga', 'yoga_instructor', 'yoga_studio_admin',
  'wellness', 'wellness_admin', 'therapist',
  'equipment', 'equipment_vendor',
  'product-vendor', 'product_vendor',
  'trainer-org', 'trainer_org',
  'content-editor', 'content_editor', 'medical_reviewer'
]);

export default function RoleDashboardShell({ config }: { config: RoleDashboardConfig }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'today';
  const [activeTab, setActiveTab] = useState<string>(rawTab);
  const [tasks, setTasks] = useState<TaskItem[]>(config.tasks || []);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('Main Facility / Studio');
  const [activeDomainTool, setActiveDomainTool] = useState<DomainModule | null>(null);

  // Sync state if URL search query changes
  useEffect(() => {
    if (rawTab) {
      setActiveTab(rawTab);
    }
  }, [rawTab]);

  const navigate = useNavigate();

  const handleQuickAction = (action: string | { label: string; route?: string }) => {
    if (typeof action === 'object') {
      if (action.route) {
        toast.info(`Opening ${action.label}...`);
        navigate(action.route);
      } else {
        toast.success(`Action initiated: ${action.label}`);
      }
      return;
    }
    const route = QUICK_ACTION_ROUTES[action];
    if (route) {
      toast.info(`Opening ${action}...`);
      navigate(route);
    } else {
      toast.success(`Action initiated: ${action}`);
    }
  };

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams(tab === 'today' ? {} : { tab });
  };

  const allowed = MODULE_NAV.filter((m) => config.permissions.includes(m.perm));
  const isT3 = T3_ROLES.has(config.roleKey.toLowerCase());

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const item: TaskItem = {
      id: `task-${Date.now()}`,
      text: newTaskInput.trim(),
      done: false,
    };
    setTasks((prev) => [item, ...prev]);
    setNewTaskInput('');
    toast.success('Task added to today’s agenda');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // Resolve current active module item if not on today
  const currentModule = allowed.find(
    (m) => m.perm === activeTab || m.tabKey === activeTab
  );

  // Resolve current active module item or section if not on today
  const matchedSection = config.sidebarSections?.find(
    (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-') === activeTab || s.toLowerCase() === activeTab.toLowerCase()
  );
  const currentSectionName = matchedSection || currentModule?.label || activeTab;
  const currentSectionEmoji = matchedSection
    ? getSectionEmoji(matchedSection)
    : (currentModule?.emoji || '📁');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Global Role Top Bar */}
      <header className="rounded-2xl border bg-card/60 backdrop-blur-md p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base md:text-lg leading-tight text-foreground">FindMedi Operations Console</span>
              {isT3 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" title="Zero PHI Access · DPDP Act Compliant">
                  <Shield className="w-3 h-3 text-emerald-600" /> PHI Shield Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20" title="Clinical Establishment · End-to-End Encrypted">
                  <Lock className="w-3 h-3 text-blue-600" /> Tier 1 Clinical
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Facility / Branch Switcher */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-xs rounded-lg border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="Main Facility / Studio">Main Facility / Studio</option>
            <option value="North Extension Clinic">North Extension Clinic</option>
            <option value="Virtual Telehealth Hub">Virtual Telehealth Hub</option>
          </select>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search appointments, orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-44 md:w-56"
            />
          </div>

          {/* Quick SOS / Help */}
          <button
            type="button"
            onClick={() => toast.info('FindMedi Provider Hotline: 1800-FINDMEDI (24x7 Priority Support)')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-muted/50 hover:bg-muted text-foreground transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Priority Line</span>
          </button>
        </div>
      </header>

      {/* 2. Main Shell Layout: Sidebar + Dynamic Workspace */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Role-based Sidebar (Title appears here uniquely for tests and clarity) */}
        <aside data-testid="role-sidebar" className="md:w-64 shrink-0 space-y-4">
          <div className={`rounded-xl border p-4 ${config.accent ?? 'bg-card'}`}>
            <h1 className="font-bold text-base leading-snug">{config.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
          </div>

          <nav className="space-y-1">
            {config.sidebarSections && config.sidebarSections.length > 0 ? (
              config.sidebarSections.map((sec) => {
                const isDashboard = sec.toLowerCase() === 'dashboard' || sec.toLowerCase() === 'today';
                const slug = isDashboard ? 'today' : sec.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const isSelected =
                  (isDashboard && (activeTab === 'today' || activeTab === 'dashboard')) ||
                  activeTab === slug ||
                  activeTab.toLowerCase() === sec.toLowerCase() ||
                  (slug === 'appointments' && (activeTab === 'appointments' || activeTab === 'bookings')) ||
                  (slug === 'staff' && (activeTab === 'staff' || activeTab === 'staff:manage')) ||
                  (slug === 'reports' && (activeTab === 'reports' || activeTab === 'reports:read')) ||
                  (slug === 'records' && (activeTab === 'records' || activeTab === 'records:read'));
                const emoji = getSectionEmoji(sec);
                const displayLabel = isDashboard
                  ? (sec.toLowerCase() === 'today' ? 'Today' : `${sec} / Today`)
                  : sec;

                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => switchTab(slug)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{emoji} {displayLabel}</span>
                    </span>
                    {isDashboard ? (
                      <span className="text-[11px] opacity-80">{config.kpis[0]?.value || '•'}</span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'translate-x-0.5' : ''}`} />
                    )}
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => switchTab('today')}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    activeTab === 'today'
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                      : 'hover:bg-muted/80 text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">🏠 Today</span>
                  <span className="text-[11px] opacity-80">{config.kpis[0]?.value || '•'}</span>
                </button>

                {allowed.map((m) => {
                  const isSelected = activeTab === m.perm || activeTab === m.tabKey;
                  return (
                    <button
                      key={m.perm}
                      type="button"
                      onClick={() => switchTab(m.tabKey)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                          : 'hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{m.emoji}</span>
                        <span>{m.label}</span>
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'translate-x-0.5' : ''}`} />
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* Quick Compliance Card */}
          <div className="rounded-xl border p-3 bg-muted/40 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" /> Compliance
              </span>
              <span className="text-emerald-600 font-bold">100% OK</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Registration, license & certificates verified for 2026.
            </p>
          </div>
        </aside>

        {/* Dynamic Main Workspace */}
        <main className="flex-1 space-y-5 min-w-0">
          {/* Breadcrumb if inside an active module tab */}
          {activeTab !== 'today' && activeTab !== 'dashboard' && (
            <div className="flex items-center justify-between bg-muted/40 border rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => switchTab('today')}
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Today Overview
                </button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold text-foreground">
                  {currentSectionEmoji} {currentSectionName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toast.success('Module data refreshed')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          )}

          {/* Tab 1: Today Overview (Default) */}
          {activeTab === 'today' && (
            <div className="space-y-5">
              {/* Today + KPIs */}
              <section data-testid="role-today" className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-base">Today</h2>
                    <p className="text-xs text-muted-foreground">Operational summary and real-time activity metrics</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Live Sync
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {config.kpis.map((k) => (
                    <div key={k.label} data-testid="role-kpi" className="rounded-xl border bg-background/50 p-3.5 hover:border-primary/40 transition-colors">
                      <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                      <p className="text-2xl font-bold mt-1 text-foreground">{k.value}</p>
                      {k.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{k.hint}</p>}
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Actions Bar */}
              {config.quickActions && config.quickActions.length > 0 && (
                <section data-testid="role-quick-actions" className="rounded-xl border bg-card p-4 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-sm flex items-center gap-1.5">
                      <span>⚡</span> Quick Actions
                    </h2>
                    <span className="text-xs text-muted-foreground">One-click operational triggers</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.quickActions.map((action: any, idx) => {
                      const label = typeof action === 'string' ? action : action?.label;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickAction(action)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-foreground font-medium border shadow-xs transition-colors hover:border-primary/40 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="text-primary font-bold">▶</span> {label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Tasks & Alerts Split */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Tasks List */}
                <section data-testid="role-tasks" className="rounded-xl border bg-card p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b">
                      <h2 className="font-semibold text-sm">Tasks</h2>
                      <span className="text-[11px] text-muted-foreground">{tasks.filter((t) => !t.done).length} pending</span>
                    </div>

                    <ul className="mt-3 space-y-2">
                      {tasks.map((x) => (
                        <li key={x.id} className="flex items-start gap-2.5 text-sm p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                          <input
                            type="checkbox"
                            checked={!!x.done}
                            onChange={() => toggleTask(x.id)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <span className={`text-xs md:text-sm leading-snug cursor-pointer ${x.done ? 'line-through text-muted-foreground' : 'text-foreground'}`} onClick={() => toggleTask(x.id)}>
                            {x.text}
                          </span>
                        </li>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2 text-center">All clear ✅</p>
                      )}
                    </ul>
                  </div>

                  {/* Quick Task Input Form */}
                  <form onSubmit={handleAddTask} className="mt-3 pt-2 border-t flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a new task..."
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border bg-background flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </form>
                </section>

                {/* Alerts List */}
                <section data-testid="role-alerts" className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <h2 className="font-semibold text-sm">Alerts</h2>
                    <span className="text-[11px] text-muted-foreground">{(config.alerts || []).length} notifications</span>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {(config.alerts || []).map((a: any, idx) => {
                      const alertText = a.text || a.message;
                      const isUrgent = a.level === 'urgent' || a.level === 'danger';
                      const isWarn = a.level === 'warn' || a.level === 'warning';
                      const key = a.id || `alert-${idx}`;
                      return (
                        <li
                          key={key}
                          className={`text-xs md:text-sm rounded-lg border p-2.5 flex items-start gap-2.5 ${
                            isUrgent
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200'
                              : isWarn
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                              : 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
                          }`}
                        >
                          <span className="text-base shrink-0 leading-none mt-0.5">
                            {isUrgent ? '🔴' : isWarn ? '🟡' : '🔵'}
                          </span>
                          <div className="flex-1">
                            <p className="leading-snug">{alertText}</p>
                          </div>
                        </li>
                      );
                    })}
                    {(!config.alerts || config.alerts.length === 0) && (
                      <p className="text-sm text-muted-foreground py-2 text-center">No alerts.</p>
                    )}
                  </ul>
                </section>
              </div>

              {/* Work Queues Section with Interactive Real Table */}
              {config.workQueues && config.workQueues.length > 0 && (
                <WorkQueueTable roleKey={config.roleKey} workQueues={config.workQueues} />
              )}

              {/* Standard Modules Grid */}
              <section data-testid="role-modules" className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm">Modules</h2>
                  <span className="text-xs text-muted-foreground">Permission-gated tools</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {allowed.map((m) => (
                    <Link
                      key={m.perm}
                      to={m.href(config.roleKey)}
                      className="rounded-xl border bg-background/60 p-3 text-center hover:bg-muted/70 hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-1 group"
                    >
                      <div className="text-2xl group-hover:scale-110 transition-transform">{m.emoji}</div>
                      <div className="text-xs font-semibold mt-1 text-foreground">{m.label}</div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Role-Specific Domain Modules */}
              {(config.domainModules?.length ?? 0) > 0 && (
                <section data-testid="role-domain-modules" className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm">Specialty tools</h2>
                    <span className="text-xs text-muted-foreground">Domain specific utilities</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {config.domainModules.map((d) => (
                      <div key={d.key} data-testid={`domain-${d.key}`} className="rounded-xl border bg-background/60 p-3.5 hover:border-primary/40 transition-colors flex flex-col justify-between">
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                            <span>{d.emoji}</span>
                            <span>{d.label}</span>
                            <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-primary/10 text-primary">Specialty</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{d.description}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs">
                          <Link to={d.ctaHref} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                            {d.ctaLabel} →
                          </Link>
                          <button
                            type="button"
                            onClick={() => setActiveDomainTool(d)}
                            className="px-2 py-0.5 rounded border text-[11px] hover:bg-muted font-medium text-muted-foreground"
                          >
                            Preview Tool
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Tab 2: Profile & Verification */}
          {(activeTab === 'profile' || activeTab === 'profile:view') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      🪪 Profile & Verification Console
                    </h2>
                    <p className="text-xs text-muted-foreground">Manage your credentials, clinic registrations, and council verifications.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fully Verified Provider
                  </span>
                </div>

                {/* Completeness Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Profile Strength</span>
                    <span className="text-primary font-bold">92% Complete</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Add your auxiliary clinic timings to reach 100% visibility.</p>
                </div>

                {/* Verification Card */}
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                  <div className="rounded-xl border p-3.5 bg-background space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Regulatory Registration</p>
                    <p className="text-sm font-bold text-foreground">Registered Practitioner / Establishment</p>
                    <p className="text-xs text-muted-foreground">Council: State Medical / Health Council</p>
                    <p className="text-xs font-mono text-muted-foreground">Reg#: MED-****8912 (Verified)</p>
                    <div className="pt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Council audit approved on 12-Jan-2026
                    </div>
                  </div>

                  <div className="rounded-xl border p-3.5 bg-background space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Practice Locations</p>
                    <p className="text-sm font-bold text-foreground">{selectedBranch}</p>
                    <p className="text-xs text-muted-foreground">Civil Lines, Sector 4, Metro City</p>
                    <p className="text-xs text-muted-foreground">Modes: In-Person · Video Consultation · Emergency</p>
                    <button
                      type="button"
                      onClick={() => toast.info('Branch details are synchronized with platform listing.')}
                      className="text-xs text-primary font-medium hover:underline pt-1 block"
                    >
                      Manage practice hours & fees →
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => toast.success('Profile update request submitted to FindMedi review queue.')}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  >
                    Request Information Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Calendar & Availability */}
          {(activeTab === 'calendar' || activeTab === 'calendar:view') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      📅 Availability & Schedule Matrix
                    </h2>
                    <p className="text-xs text-muted-foreground">Configure weekly consultation hours, slot duration, and leave blocks.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Calendar synced with Google & iCal')}
                    className="px-3 py-1.5 rounded-lg border bg-background text-xs font-semibold hover:bg-muted inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3 text-primary" /> Sync External Calendar
                  </button>
                </div>

                {/* Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 bg-background">
                    <label className="text-xs font-semibold text-muted-foreground block">Slot Duration</label>
                    <select defaultValue="30 Minutes (Recommended)" className="mt-1 w-full text-xs rounded border bg-background px-2 py-1.5 font-medium">
                      <option>15 Minutes</option>
                      <option>30 Minutes (Recommended)</option>
                      <option>45 Minutes</option>
                      <option>60 Minutes</option>
                    </select>
                  </div>
                  <div className="rounded-lg border p-3 bg-background">
                    <label className="text-xs font-semibold text-muted-foreground block">Buffer Between Slots</label>
                    <select defaultValue="5 Minutes" className="mt-1 w-full text-xs rounded border bg-background px-2 py-1.5 font-medium">
                      <option>0 Minutes</option>
                      <option>5 Minutes</option>
                      <option>10 Minutes</option>
                    </select>
                  </div>
                  <div className="rounded-lg border p-3 bg-background">
                    <label className="text-xs font-semibold text-muted-foreground block">Advance Booking Window</label>
                    <select defaultValue="7 Days" className="mt-1 w-full text-xs rounded border bg-background px-2 py-1.5 font-medium">
                      <option>7 Days</option>
                      <option>14 Days</option>
                      <option>30 Days</option>
                    </select>
                  </div>
                </div>

                {/* Days of Week */}
                <div className="space-y-2 mt-2">
                  <p className="text-xs font-semibold text-muted-foreground">Weekly Template</p>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border bg-background text-xs gap-2">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked={idx < 6} className="rounded" />
                        <span className="font-semibold w-24">{day}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>09:30 AM – 01:30 PM</span>
                        <span>·</span>
                        <span>05:00 PM – 08:30 PM</span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {idx < 6 ? 'Active' : 'Closed / Off'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => toast.success('Weekly availability schedule saved.')}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  >
                    Save Schedule Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Bookings & Orders */}
          {(activeTab === 'bookings' || activeTab === 'bookings:manage' || activeTab === 'appointments' || activeTab === 'appointments:read') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      📋 Bookings & Orders Roster
                      <span data-testid="bookings-demo-badge" title="Illustrative layout preview — connect the bookings API for live rows" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                        Sample layout
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">View incoming appointments, manage patient attendance, and record completions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Exporting filtered bookings to encrypted CSV...')}
                    className="px-3 py-1.5 rounded-lg border bg-background text-xs font-semibold hover:bg-muted inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" /> Export CSV (Audited)
                  </button>
                </div>

                {isT3 && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span><strong>Privacy Shield Active:</strong> This is a non-clinical role. Only service order details and membership schedules are displayed. Zero access to medical records.</span>
                  </div>
                )}

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  {['All Bookings', 'Upcoming Today', 'Pending Approval', 'Completed', 'Cancelled'].map((tab, idx) => (
                    <button
                      key={tab}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg border transition-colors ${idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Booking Cards / List */}
                <div className="space-y-2.5">
                  {[
                    { id: 'FM-9481', client: 'Aarav Sharma', service: 'Standard Consultation', time: '10:30 AM', mode: 'In-Person', status: 'Confirmed', fee: '₹800' },
                    { id: 'FM-9482', client: 'Pooja Verma', service: 'Specialty Assessment', time: '11:45 AM', mode: 'Video Consult', status: 'Confirmed', fee: '₹1,200' },
                    { id: 'FM-9483', client: 'Vikram Mehta', service: 'Follow-up Session', time: '02:15 PM', mode: 'In-Person', status: 'Pending Approval', fee: '₹600' },
                  ].map((b) => (
                    <div key={b.id} className="p-3.5 rounded-xl border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{b.client}</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b.id}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            b.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {b.service} · <span className="font-medium text-foreground">{b.time}</span> · Mode: {b.mode}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="font-bold text-sm mr-2">{b.fee}</span>
                        <button
                          type="button"
                          onClick={() => toast.success(`Checked-in ${b.client}`)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20"
                        >
                          Check In
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info(`Viewing details for ${b.id}`)}
                          className="px-2.5 py-1 rounded-lg border text-xs font-semibold hover:bg-muted"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Earnings & Payouts */}
          {(activeTab === 'earnings' || activeTab === 'earnings:view') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      💰 Earnings & Payout Settlement
                      <span data-testid="earnings-demo-badge" title="Illustrative layout preview — connect the payouts API for live figures" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                        Sample layout
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">Track gross receipts, platform commissions, TDS deductions, and auto-settlements.</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Next Payout: Wednesday, 10:00 AM
                  </span>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border bg-background p-3.5">
                    <p className="text-xs text-muted-foreground">Gross Receipts (30d)</p>
                    <p className="text-xl font-bold mt-1">₹78,400</p>
                    <p className="text-[11px] text-emerald-600 font-medium">↑ 14% vs last month</p>
                  </div>
                  <div className="rounded-xl border bg-background p-3.5">
                    <p className="text-xs text-muted-foreground">Platform Fee (10%)</p>
                    <p className="text-xl font-bold mt-1 text-muted-foreground">₹7,840</p>
                    <p className="text-[11px] text-muted-foreground">Contracted tier rate</p>
                  </div>
                  <div className="rounded-xl border bg-background p-3.5">
                    <p className="text-xs text-muted-foreground">TDS Deducted (1%)</p>
                    <p className="text-xl font-bold mt-1 text-muted-foreground">₹784</p>
                    <p className="text-[11px] text-muted-foreground">Form 16A filed</p>
                  </div>
                  <div className="rounded-xl border bg-primary/5 border-primary/20 p-3.5">
                    <p className="text-xs text-primary font-semibold">Net Payout Balance</p>
                    <p className="text-2xl font-bold mt-1 text-primary">₹69,776</p>
                    <p className="text-[11px] text-muted-foreground">Ready for settlement</p>
                  </div>
                </div>

                {/* Bank Account Guardrail */}
                <div className="rounded-xl border p-4 bg-background space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Settlement Bank Account</span>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                      🔒 Step-Up 2FA Protected
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-sm">HDFC Bank Limited</p>
                      <p className="text-muted-foreground font-mono">Account#: ************4921 · IFSC: HDFC0001824</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.info('To modify payout account, please complete 2FA verification.')}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
                    >
                      Update Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Reviews & Ratings */}
          {(activeTab === 'reviews' || activeTab === 'reviews:view') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      ⭐ Patient & Client Feedback
                    </h2>
                    <p className="text-xs text-muted-foreground">Genuine verified patient reviews, satisfaction trends, and replies.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-foreground">4.8</span>
                    <span className="text-amber-500 font-bold ml-1">★★★★★</span>
                    <p className="text-[11px] text-muted-foreground">Based on 210 verified visits</p>
                  </div>
                </div>

                {/* Review Cards */}
                <div className="space-y-3">
                  {[
                    { author: 'Neha R.', rating: '5 ★', date: 'Yesterday', text: 'Extremely polite, explained the condition clearly and gave practical recommendations.', reply: 'Thank you Neha! Wishing you speedy recovery.' },
                    { author: 'Rahul K.', rating: '5 ★', date: '3 days ago', text: 'On time, clean facility, and very professional consultation.', reply: null },
                  ].map((rev, i) => (
                    <div key={i} className="p-3.5 rounded-xl border bg-background space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{rev.author}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-600">{rev.rating}</span>
                          <span className="text-muted-foreground">{rev.date}</span>
                        </div>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{rev.text}</p>
                      {rev.reply ? (
                        <div className="p-2.5 rounded-lg bg-muted/60 text-xs text-muted-foreground space-y-0.5">
                          <span className="font-semibold text-foreground">Your Reply:</span> {rev.reply}
                        </div>
                      ) : (
                        <div className="pt-1 flex gap-2">
                          <input
                            type="text"
                            placeholder="Write a public reply..."
                            className="text-xs px-2.5 py-1 rounded border bg-background flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => toast.success('Reply published to public profile.')}
                            className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold"
                          >
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Staff & Access Control */}
          {(activeTab === 'staff' || activeTab === 'staff:manage') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      👥 Staff Roster & Access Control
                    </h2>
                    <p className="text-xs text-muted-foreground">Manage authorized staff, shifts, and 2FA compliance.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Enter staff email to send FindMedi console invitation.')}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Invite Staff Member
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[
                    { name: 'Dr. Ramesh Kumar', role: 'Associate Practitioner', shift: 'Morning (09 AM - 02 PM)', twoFa: true },
                    { name: 'Sunita Devi', role: 'Front Desk Receptionist', shift: 'General (09 AM - 06 PM)', twoFa: true },
                    { name: 'Manoj Patel', role: 'Clinical Assistant', shift: 'Evening (02 PM - 09 PM)', twoFa: false },
                  ].map((s, i) => (
                    <div key={i} className="p-3 rounded-xl border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-foreground text-sm">{s.name}</p>
                        <p className="text-muted-foreground">{s.role} · {s.shift}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          s.twoFa ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {s.twoFa ? '2FA Active' : '2FA Pending'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toast.info(`Viewing permissions for ${s.name}`)}
                          className="px-2.5 py-1 rounded border hover:bg-muted font-medium"
                        >
                          Permissions
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 8: Documents & Compliance */}
          {(activeTab === 'docs' || activeTab === 'docs:upload') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      📄 Compliance Vault & Regulatory Certificates
                    </h2>
                    <p className="text-xs text-muted-foreground">Official documents verified for platform compliance.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Select PDF or image file to upload updated certificate.')}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload Document
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[
                    { title: 'State Council / Regulatory Registration', number: 'REG-82914-2024', status: 'Verified ✅', expiry: 'Valid till Dec 2028' },
                    { title: 'Clinical Establishment / Commercial License', number: 'EST-91823-A', status: 'Verified ✅', expiry: 'Valid till March 2027' },
                    { title: 'Professional Indemnity Insurance Policy', number: 'POL-ICICI-9281', status: 'Active ✅', expiry: 'Valid till Nov 2026' },
                  ].map((d, i) => (
                    <div key={i} className="p-3 rounded-xl border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-foreground text-sm">{d.title}</p>
                        <p className="text-muted-foreground">{d.number} · {d.expiry}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-semibold">{d.status}</span>
                        <button
                          type="button"
                          onClick={() => toast.success(`Viewing ${d.title}`)}
                          className="px-2.5 py-1 rounded border hover:bg-muted font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 9: Support & Emergency Helpline */}
          {(activeTab === 'support' || activeTab === 'support:contact') && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      🎧 Provider Support & Escalation Desk
                    </h2>
                    <p className="text-xs text-muted-foreground">Dedicated 24x7 relationship manager and technical helpdesk.</p>
                  </div>
                  <span className="text-xs font-semibold text-rose-600 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                    SLA: Under 15 Min Response
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border bg-background space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Priority Partner Line</p>
                    <p className="text-lg font-bold text-primary flex items-center gap-2">
                      <PhoneCall className="w-4 h-4" /> 1800-FINDMEDI
                    </p>
                    <p className="text-xs text-muted-foreground">Toll free direct line for doctors, clinic admins & partners.</p>
                  </div>
                  <div className="p-4 rounded-xl border bg-background space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Dispute Resolution Desk</p>
                    <p className="text-lg font-bold text-foreground">Grievance & Review Appeals</p>
                    <p className="text-xs text-muted-foreground">Raise disputes for fraudulent reviews or patient chargebacks.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => toast.success('Support ticket draft opened.')}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  >
                    Raise Support Ticket
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Catch-all for operational modules (Records, Reports, Approvals) */}
          {['records', 'records:read', 'reports', 'reports:read', 'approvals', 'approvals:manage'].includes(activeTab) && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-bold text-lg">{currentModule?.emoji} {currentModule?.label} Console</h2>
              <p className="text-xs text-muted-foreground">Operational management interface for departmental {currentModule?.label.toLowerCase()}.</p>
              <div className="p-6 rounded-xl border bg-background text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">Operational Dataset Active</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {currentModule?.label} are synchronized in real-time with the central hospital information system (HIS).
                </p>
                <button
                  type="button"
                  onClick={() => toast.success('Synchronized with backend service.')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Fetch Latest Logs
                </button>
              </div>
            </div>
          )}

          {/* Section Workspace View for HMS Sidebar Sections */}
          {!['today', 'dashboard', 'profile', 'profile:view', 'calendar', 'calendar:view', 'bookings', 'bookings:manage', 'appointments', 'appointments:read', 'earnings', 'earnings:view', 'reviews', 'reviews:view', 'staff', 'staff:manage', 'docs', 'docs:upload', 'support', 'support:contact', 'records', 'records:read', 'reports', 'reports:read', 'approvals', 'approvals:manage'].includes(activeTab) && (
            <div data-testid={`section-${activeTab}`} className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      <span>{currentSectionEmoji}</span>
                      <span>{currentSectionName} Workspace</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {config.title} · Live operational module for {currentSectionName.toLowerCase()}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Operational Feed
                    </span>
                    <button
                      type="button"
                      onClick={() => toast.success(`${currentSectionName} synced with hospital HIS.`)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border hover:bg-muted font-medium inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Sync
                    </button>
                  </div>
                </div>

                {/* Relevant Section Quick Actions if available */}
                {config.quickActions && config.quickActions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fast Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      {config.quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickAction(action)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors border border-primary/20 flex items-center gap-1.5"
                        >
                          <span className="font-bold">⚡</span> {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relevant Work Queues Table */}
                <div className="pt-2">
                  <WorkQueueTable roleKey={config.roleKey} workQueues={config.workQueues || []} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Interactive Domain Tool Modal */}
      {activeDomainTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeDomainTool.emoji}</span>
                <div>
                  <h3 className="font-bold text-base text-foreground">{activeDomainTool.label}</h3>
                  <p className="text-xs text-muted-foreground">Specialty Clinical Tool</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDomainTool(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-foreground leading-relaxed">
              {activeDomainTool.description}
            </p>

            <div className="p-4 rounded-xl border bg-background/80 space-y-2 text-xs">
              <p className="font-semibold text-primary">Tool Preview & Actions:</p>
              <p className="text-muted-foreground">
                This domain module connects directly with the provider clinical & operational records. Any inputs recorded here are verified and appended to patient or member tracking.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveDomainTool(null)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
              >
                Close Preview
              </button>
              <Link
                to={activeDomainTool.ctaHref}
                onClick={() => setActiveDomainTool(null)}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1"
              >
                {activeDomainTool.ctaLabel} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
