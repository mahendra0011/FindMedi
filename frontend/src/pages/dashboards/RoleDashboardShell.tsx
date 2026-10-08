/**
 * R1 — Generic role-dashboard shell.
 * Sidebar is derived from the role's `permissions`; the body always shows
 * Today + KPIs + Tasks + Alerts, then the 8 standard modules
 * (profile/verification, calendar, bookings, earnings, reviews, staff, docs,
 * support) filtered by permission, then any role-specific domain modules.
 * Concrete dashboards (dentist, dietitian, …) are thin wrappers passing a
 * RoleDashboardConfig + domain module stubs.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
  /** e.g. ['profile:view','calendar:view','bookings:manage','earnings:view','reviews:view','staff:manage','docs:upload','support:contact'] */
  permissions: string[];
  kpis: Kpi[];
  tasks: TaskItem[];
  alerts: AlertItem[];
  domainModules: DomainModule[];
}

interface NavEntry {
  perm: string;
  label: string;
  emoji: string;
  href: (roleKey: string) => string;
}

const MODULE_NAV: NavEntry[] = [
  { perm: 'profile:view', label: 'Profile & Verification', emoji: '🪪', href: (r) => `/dashboard/${r}?tab=profile` },
  { perm: 'calendar:view', label: 'Calendar', emoji: '📅', href: (r) => `/dashboard/${r}?tab=calendar` },
  { perm: 'bookings:manage', label: 'Bookings', emoji: '📋', href: (r) => `/dashboard/${r}?tab=bookings` },
  { perm: 'earnings:view', label: 'Earnings', emoji: '💰', href: (r) => `/dashboard/${r}?tab=earnings` },
  { perm: 'reviews:view', label: 'Reviews', emoji: '⭐', href: (r) => `/dashboard/${r}?tab=reviews` },
  { perm: 'staff:manage', label: 'Staff', emoji: '👥', href: (r) => `/dashboard/${r}?tab=staff` },
  { perm: 'docs:upload', label: 'Documents', emoji: '📄', href: (r) => `/dashboard/${r}?tab=docs` },
  { perm: 'support:contact', label: 'Support', emoji: '🎧', href: (r) => `/dashboard/${r}?tab=support` },
];

export default function RoleDashboardShell({ config }: { config: RoleDashboardConfig }) {
  const [activeTab, setActiveTab] = useState('today');
  const [tasks, setTasks] = useState<TaskItem[]>(config.tasks);
  const allowed = MODULE_NAV.filter((m) => config.permissions.includes(m.perm));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
      {/* Sidebar from permissions */}
      <aside data-testid="role-sidebar" className="md:w-60 shrink-0">
        <div className={`rounded-xl border p-4 ${config.accent ?? ''}`}>
          <h1 className="font-bold">{config.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
        </div>
        <nav className="mt-3 space-y-1">
          <button
            type="button" onClick={() => setActiveTab('today')}
            className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'today' ? 'bg-muted font-medium' : 'hover:bg-muted/60'}`}
          >
            🏠 Today
          </button>
          {allowed.map((m) => (
            <button
              key={m.perm} type="button" onClick={() => setActiveTab(m.perm)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === m.perm ? 'bg-muted font-medium' : 'hover:bg-muted/60'}`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 space-y-4 min-w-0">
        {/* Today + KPIs + Tasks + Alerts */}
        <section data-testid="role-today" className="rounded-xl border p-4">
          <h2 className="font-semibold">Today</h2>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {config.kpis.map((k) => (
              <div key={k.label} data-testid="role-kpi" className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold">{k.value}</p>
                {k.hint && <p className="text-[11px] text-muted-foreground">{k.hint}</p>}
              </div>
            ))}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-4">
          <section data-testid="role-tasks" className="rounded-xl border p-4">
            <h2 className="font-semibold text-sm">Tasks</h2>
            <ul className="mt-2 space-y-1.5">
              {tasks.map((x) => (
                <li key={x.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox" checked={!!x.done}
                      onChange={() => setTasks((prev) => prev.map((p) => (p.id === x.id ? { ...p, done: !p.done } : p)))}
                    />
                    <span className={x.done ? 'line-through text-muted-foreground' : ''}>{x.text}</span>
                  </label>
                </li>
              ))}
              {tasks.length === 0 && <p className="text-sm text-muted-foreground">All clear ✅</p>}
            </ul>
          </section>

          <section data-testid="role-alerts" className="rounded-xl border p-4">
            <h2 className="font-semibold text-sm">Alerts</h2>
            <ul className="mt-2 space-y-1.5">
              {config.alerts.map((a) => (
                <li key={a.id} className="text-sm rounded-lg border px-2.5 py-1.5">
                  {a.level === 'urgent' ? '🔴' : a.level === 'warn' ? '🟡' : '🔵'} {a.text}
                </li>
              ))}
              {config.alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts.</p>}
            </ul>
          </section>
        </div>

        {/* Standard modules (permission-filtered) */}
        <section data-testid="role-modules" className="rounded-xl border p-4">
          <h2 className="font-semibold text-sm">Modules</h2>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allowed.map((m) => (
              <Link key={m.perm} to={m.href(config.roleKey)} className="rounded-xl border p-3 text-center hover:bg-muted">
                <div className="text-xl">{m.emoji}</div>
                <div className="text-xs font-medium mt-1">{m.label}</div>
              </Link>
            ))}
          </div>
          {activeTab !== 'today' && (
            <p className="mt-3 text-sm text-muted-foreground">
              Open module: <span className="font-medium text-foreground">{MODULE_NAV.find((m) => m.perm === activeTab)?.label}</span> — stub view, wire to the real list page next.
            </p>
          )}
        </section>

        {/* Role-specific domain modules */}
        {config.domainModules.length > 0 && (
          <section data-testid="role-domain-modules" className="rounded-xl border p-4">
            <h2 className="font-semibold text-sm">Specialty tools</h2>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {config.domainModules.map((d) => (
                <div key={d.key} data-testid={`domain-${d.key}`} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{d.emoji} {d.label} <span className="text-[10px] font-normal text-muted-foreground">· stub</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                  <Link to={d.ctaHref} className="mt-2 inline-block text-xs underline">{d.ctaLabel} →</Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
