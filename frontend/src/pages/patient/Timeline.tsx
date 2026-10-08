/**
 * R1 — Patient timeline page (also embeddable).
 * Merges appointments / prescriptions / reports / orders into one
 * reverse-chronological feed. Discreet mode is prop-drilled from
 * PatientDashboardV2 (falls back to localStorage when routed directly).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import EmergencyCard, { mask } from './EmergencyCard';

interface FeedItem {
  id: string;
  kind: 'appointment' | 'prescription' | 'report' | 'order' | 'vital' | 'note';
  title: string;
  detail: string;
  date: string;
}

const KIND_EMOJI: Record<FeedItem['kind'], string> = {
  appointment: '📅',
  prescription: '💊',
  report: '🧪',
  order: '🛒',
  vital: '❤️',
  note: '📝',
};

const LS_DISCREET = 'findmedi:discreet';

function readDiscreet(): boolean {
  try { return window.localStorage.getItem(LS_DISCREET) === '1'; } catch { return false; }
}

function toItems(raw: unknown, kind: FeedItem['kind'], titleOf: (x: Record<string, unknown>) => string): FeedItem[] {
  const arr = Array.isArray(raw) ? raw : (raw as { items?: unknown[] })?.items ?? [];
  return (arr as Record<string, unknown>[]).slice(0, 30).map((x, i) => ({
    id: `${kind}-${String(x._id ?? x.id ?? i)}`,
    kind,
    title: titleOf(x),
    detail: String(x.status ?? x.result ?? x.note ?? ''),
    date: String(x.createdAt ?? x.date ?? x.appointmentDate ?? ''),
  }));
}

export default function Timeline({ discreet: discreetProp }: { discreet?: boolean }) {
  const [discreet] = useState<boolean>(discreetProp ?? readDiscreet());
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: FeedItem[] = [];
      const tries: Array<[string, FeedItem['kind'], (x: Record<string, unknown>) => string]> = [
        ['/appointments/mine', 'appointment', (x) => `Visit — ${String(x.doctorName ?? x.facilityName ?? 'Doctor')}`],
        ['/prescriptions/mine', 'prescription', (x) => `Prescription — ${String(x.doctorName ?? 'Doctor')}`],
        ['/reports/mine', 'report', (x) => `Report — ${String(x.testName ?? 'Lab')}`],
        ['/orders/mine', 'order', (x) => `Medicine order — ${String(x.status ?? 'placed')}`],
        ['/vitals/mine', 'vital', (x) => `Vitals — ${String(x.type ?? 'check')}`],
      ];
      for (const [path, kind, titleOf] of tries) {
        try {
          const res = await api.get(path) as unknown;
          out.push(...toItems(res, kind, titleOf));
        } catch { /* endpoint may not exist for this role — skip */ }
      }
      if (out.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        out.push(
          { id: 'note-1', kind: 'note', title: 'Welcome to your health timeline', detail: 'Visits, prescriptions, reports and orders will appear here.', date: today },
        );
      }
      out.sort((a, b) => (a.date < b.date ? 1 : -1));
      if (!cancelled) { setItems(out); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Health Timeline</h1>
        <Link to="/patient/home-v2" className="text-sm underline">← Dashboard v2</Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ol className="relative border-l pl-6 space-y-4">
          {items.map((it) => (
            <li key={it.id} data-testid="timeline-item" className="relative">
              <span className="absolute -left-[31px] top-0 bg-background border rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {KIND_EMOJI[it.kind]}
              </span>
              <div className="rounded-xl border p-3">
                <p className="text-sm font-medium">{discreet ? mask(it.title, true) : it.title}</p>
                {it.detail && !discreet && <p className="text-xs text-muted-foreground">{it.detail}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{it.date ? it.date.slice(0, 10) : ''} · {it.kind}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <EmergencyCard discreet={discreet} compact />
    </div>
  );
}
