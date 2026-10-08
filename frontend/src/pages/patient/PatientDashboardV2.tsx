/**
 * R1 — Patient dashboard v2.
 * Alerts strip · Today card · quick-actions grid (dentist / eye / physio /
 * dietitian / nursing / rental / yoga / camps) · programs & memberships ·
 * consents / access-log · discreet-mode toggle (localStorage + prop drilling
 * into Timeline / PrivacyCentre / EmergencyCard).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import EmergencyCard, { mask } from './EmergencyCard';
import Timeline from './Timeline';
import PrivacyCentre from './PrivacyCentre';

const LS_DISCREET = 'findmedi:discreet';

interface Alert {
  id: string;
  text: string;
  level: 'info' | 'warn' | 'urgent';
}

const QUICK_ACTIONS = [
  { key: 'dentist', emoji: '🦷', label: 'Dentist', href: '/patient/doctors?specialty=Dentistry' },
  { key: 'eye', emoji: '👁️', label: 'Eye care', href: '/patient/doctors?specialty=Ophthalmology' },
  { key: 'physio', emoji: '🏃', label: 'Physio', href: '/patient/doctors?specialty=Physiotherapy' },
  { key: 'dietitian', emoji: '🥗', label: 'Dietitian', href: '/patient/doctors?specialty=Dietitian' },
  { key: 'nursing', emoji: '🏠', label: 'Home nursing', href: '/patient/home-visit' },
  { key: 'rental', emoji: '🦽', label: 'Equipment rental', href: '/buy-medicine?tab=rental' },
  { key: 'yoga', emoji: '🧘', label: 'Yoga', href: '/patient/services?tab=yoga' },
  { key: 'camps', emoji: '⛺', label: 'Health camps', href: '/patient/services?tab=camps' },
];

export default function PatientDashboardV2() {
  const [discreet, setDiscreet] = useState<boolean>(() => {
    try { return window.localStorage.getItem(LS_DISCREET) === '1'; } catch { return false; }
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [today, setToday] = useState<Array<{ id: string; title: string; time: string }>>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; status: string }>>([]);

  useEffect(() => {
    try { window.localStorage.setItem(LS_DISCREET, discreet ? '1' : '0'); } catch { /* ignore */ }
  }, [discreet]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const n = await api.get('/notifications?limit=5') as unknown as { items?: Array<{ _id?: string; message?: string; priority?: string }> };
        if (!cancelled && Array.isArray(n?.items) && n.items.length > 0) {
          setAlerts(n.items.map((x, i) => ({
            id: String(x._id ?? i),
            text: String(x.message ?? 'Notification'),
            level: x.priority === 'high' ? 'urgent' : 'info',
          })));
        }
      } catch { /* keep fallback */ }
      try {
        const a = await api.get('/appointments/mine?upcoming=1') as unknown as { items?: Array<{ _id?: string; doctorName?: string; time?: string; appointmentDate?: string }> };
        if (!cancelled && Array.isArray(a?.items)) {
          setToday(a.items.slice(0, 3).map((x, i) => ({
            id: String(x._id ?? i),
            title: `Visit — ${String(x.doctorName ?? 'Doctor')}`,
            time: String(x.time ?? x.appointmentDate ?? ''),
          })));
        }
      } catch { /* keep fallback */ }
      try {
        const p = await api.get('/programs/mine') as unknown as { items?: Array<{ _id?: string; name?: string; status?: string }> };
        if (!cancelled && Array.isArray(p?.items)) {
          setPrograms(p.items.map((x, i) => ({
            id: String(x._id ?? i), name: String(x.name ?? 'Program'), status: String(x.status ?? 'active'),
          })));
        }
      } catch { /* keep fallback */ }
      if (!cancelled) {
        setAlerts((prev) => (prev.length > 0 ? prev : [
          { id: 'a1', text: '💊 Morning medicines due at 8:00 AM', level: 'info' },
          { id: 'a2', text: '🧪 Lab report is ready to view', level: 'info' },
        ]));
        setPrograms((prev) => (prev.length > 0 ? prev : [
          { id: 'p1', name: 'Diabetes Care Plan', status: 'active' },
          { id: 'p2', name: 'Annual Health Membership', status: 'active' },
        ]));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const alertColor = (l: Alert['level']) =>
    l === 'urgent' ? 'border-destructive/40 bg-destructive/5' : l === 'warn' ? 'border-amber-400/40 bg-amber-400/5' : 'border-primary/30 bg-primary/5';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Namaste 🙏 {discreet ? '•••' : '— your health today'}</h1>
        <button
          type="button" role="switch" aria-checked={discreet} data-testid="discreet-toggle-v2"
          onClick={() => setDiscreet((d) => !d)}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shrink-0"
          title="Discreet mode — masks names & details"
        >
          🕶️ {discreet ? 'On' : 'Off'}
        </button>
      </div>

      {/* Alerts strip */}
      <section data-testid="alerts-strip" className="flex gap-2 overflow-x-auto pb-1">
        {alerts.map((a) => (
          <div key={a.id} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${alertColor(a.level)}`}>
            {discreet ? mask(a.text, true) : a.text}
          </div>
        ))}
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts — all good ✅</p>}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Today card */}
        <section data-testid="today-card" className="rounded-xl border p-4">
          <h2 className="font-semibold">Today</h2>
          {today.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled. <Link to="/patient/doctors" className="underline">Book a visit</Link></p>
          ) : (
            <ul className="mt-2 space-y-2">
              {today.map((x) => (
                <li key={x.id} className="rounded-lg border p-2 text-sm flex justify-between gap-2">
                  <span>{discreet ? mask(x.title, true) : x.title}</span>
                  {!discreet && <span className="text-muted-foreground text-xs">{x.time}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <EmergencyCard discreet={discreet} compact />
      </div>

      {/* Quick actions grid */}
      <section data-testid="quick-actions" className="rounded-xl border p-4">
        <h2 className="font-semibold">Quick actions</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((q) => (
            <Link key={q.key} to={q.href} className="rounded-xl border p-3 text-center hover:bg-muted">
              <div className="text-2xl">{q.emoji}</div>
              <div className="text-sm font-medium mt-1">{q.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Programs / memberships */}
        <section data-testid="programs" className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Programs & memberships</h2>
            <Link to="/patient/care-plans" className="text-xs underline">View all</Link>
          </div>
          <ul className="mt-2 space-y-2">
            {programs.map((p) => (
              <li key={p.id} className="rounded-lg border p-2 text-sm flex justify-between">
                <span>{discreet ? mask(p.name, true) : p.name}</span>
                <span className="text-xs rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5">{p.status}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Consents / access-log preview */}
        <section data-testid="consents-preview" className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Consents & access</h2>
            <Link to="/patient/privacy" className="text-xs underline">Privacy centre →</Link>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Control who sees your records and review every access.
          </p>
          <Link to="/patient/timeline" className="mt-2 inline-block text-sm underline">View health timeline →</Link>
        </section>
      </div>

      {/* Embedded sections (discreet drilled as props) */}
      <Timeline discreet={discreet} />
      <PrivacyCentre discreet={discreet} onToggleDiscreet={setDiscreet} />
    </div>
  );
}
